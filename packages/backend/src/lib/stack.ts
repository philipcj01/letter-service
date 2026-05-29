import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import path from 'path';

export class LetterServiceStack extends cdk.Stack {
  private api!: apigateway.RestApi;
  private lettersBucket!: s3.Bucket;
  private lettersTable!: dynamodb.Table;
  private templatesTable!: dynamodb.Table;
  private sendQueue!: sqs.Queue;
  private sendDlq!: sqs.Queue;
  private archiveQueue!: sqs.Queue;
  private archiveDlq!: sqs.Queue;

  constructor(scope: Construct, id: string, description: string) {
    super(scope, id, { description });

    cdk.Tags.of(this).add('ApplicationName', 'LetterService');
    cdk.Tags.of(this).add('ApplicationCode', 'LETTERS');

    this.createStorage();
    this.createQueues();
    this.createApi(id);
    this.createLambdas(id);
  }

  private createStorage() {
    this.lettersBucket = new s3.Bucket(this, 'LettersBucket', {
      bucketName: `letters-archive-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [
        {
          id: 'archive-old-letters',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
        {
          id: 'delete-previews',
          prefix: 'previews/',
          expiration: cdk.Duration.days(1),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.lettersTable = new dynamodb.Table(this, 'LettersTable', {
      tableName: `${this.stackName}-letters`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.lettersTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
    });

    this.templatesTable = new dynamodb.Table(this, 'TemplatesTable', {
      tableName: `${this.stackName}-templates`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.templatesTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
    });
  }

  /**
   * SQS Queues with Dead Letter Queues for enterprise-grade reliability.
   * FIFO queues ensure ordering per letter (MessageGroupId = letterId).
   *
   * Throttling/concurrency is controlled via:
   * - Lambda reserved concurrency (on the worker)
   * - SQS event source mapping batch size + maxConcurrency
   * - Visibility timeout (controls retry window)
   * - DLQ maxReceiveCount (controls retry attempts before DLQ)
   */
  private createQueues() {
    // ─── Send Queue ──────────────────────────────────────────────────────
    this.sendDlq = new sqs.Queue(this, 'SendLetterDLQ', {
      queueName: `${this.stackName}-send-letter-dlq.fifo`,
      fifo: true,
      retentionPeriod: cdk.Duration.days(14),
      // DLQ messages retained 14 days for investigation
    });

    this.sendQueue = new sqs.Queue(this, 'SendLetterQueue', {
      queueName: `${this.stackName}-send-letter.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
      visibilityTimeout: cdk.Duration.seconds(300), // 5 min for processing
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      deadLetterQueue: {
        queue: this.sendDlq,
        maxReceiveCount: 3, // 3 retries before DLQ
      },
    });

    // ─── Archive Queue ───────────────────────────────────────────────────
    this.archiveDlq = new sqs.Queue(this, 'ArchiveLetterDLQ', {
      queueName: `${this.stackName}-archive-letter-dlq.fifo`,
      fifo: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    this.archiveQueue = new sqs.Queue(this, 'ArchiveLetterQueue', {
      queueName: `${this.stackName}-archive-letter.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
      visibilityTimeout: cdk.Duration.seconds(300),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: this.archiveDlq,
        maxReceiveCount: 5, // Retry archive jobs before sending to DLQ
      },
    });
  }

  private createApi(id: string) {
    // Import existing Cognito User Pool (do NOT create a new one)
    const userPoolId = this.node.tryGetContext('cognitoUserPoolId') || 'eu-central-1_SEQRF1WLV';
    const userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', userPoolId);

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
    });

    this.api = new apigateway.RestApi(this, `${id}-api`, {
      restApiName: 'Letter Service API',
      description: 'API for creating, sending and archiving letters',
      deployOptions: {
        stageName: 'v1',
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: cognitoAuthorizer,
      },
    });

    // Ensure CORS headers are returned even on Gateway-level errors (4xx/5xx)
    this.api.addGatewayResponse('GatewayResponseDefault4XX', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'http://localhost:3000'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('GatewayResponseDefault5XX', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'http://localhost:3000'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });
  }

  private createLambdas(id: string) {
    const commonEnv = {
      LETTERS_TABLE: this.lettersTable.tableName,
      LETTERS_BUCKET: this.lettersBucket.bucketName,
      TEMPLATES_TABLE: this.templatesTable.tableName,
      SERVICE_NAME: id,
      CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    };

    // ─── Letter CRUD Lambda (list/get/create) ────────────────────────────
    const createLetterLambda = new NodejsFunction(this, 'CreateLetterLambda', {
      functionName: `${id}-create-letter`,
      entry: path.join(__dirname, '..', 'lambda', 'create-letter', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnv,
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ─── Enqueue Send Lambda (API-facing: validate → render PDF → S3 → SQS) ─
    const enqueueSendLambda = new NodejsFunction(this, 'EnqueueSendLambda', {
      functionName: `${id}-enqueue-send`,
      entry: path.join(__dirname, '..', 'lambda', 'enqueue-send', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(90), // PDF rendering can take time
      memorySize: 1536, // Extra memory for PDF rendering
      environment: {
        ...commonEnv,
        SEND_QUEUE_URL: this.sendQueue.queueUrl,
        ARCHIVE_QUEUE_URL: this.archiveQueue.queueUrl,
      },
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ─── Send Worker Lambda (SQS-triggered: delivers the letter) ─────────
    const sendWorkerLambda = new NodejsFunction(this, 'SendWorkerLambda', {
      functionName: `${id}-send-worker`,
      entry: path.join(__dirname, '..', 'lambda', 'send-letter-worker', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      reservedConcurrentExecutions: 10, // Throttle: max 10 concurrent sends
      environment: commonEnv,
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ─── Archive Worker Lambda (SQS-triggered: archives documents) ────────
    const archiveWorkerLambda = new NodejsFunction(this, 'ArchiveWorkerLambda', {
      functionName: `${id}-archive-worker`,
      entry: path.join(__dirname, '..', 'lambda', 'archive-letter-worker', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      reservedConcurrentExecutions: 5,
      environment: commonEnv,
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ─── Template Registry Lambda (read-only) ────────────────────────────
    const templateRegistryLambda = new NodejsFunction(this, 'TemplateRegistryLambda', {
      functionName: `${id}-template-registry`,
      entry: path.join(__dirname, '..', 'lambda', 'template-registry', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: commonEnv,
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ─── Preview Lambda ──────────────────────────────────────────────────
    const previewLetterLambda = new NodejsFunction(this, 'PreviewLetterLambda', {
      functionName: `${id}-preview-letter`,
      entry: path.join(__dirname, '..', 'lambda', 'preview-letter', 'handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnv,
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
    });

    // ─── SQS Event Source Mappings ───────────────────────────────────────
    // Batch size and maxConcurrency control throughput independently of
    // reserved concurrency. Adjust these for throttling:
    sendWorkerLambda.addEventSource(
      new SqsEventSource(this.sendQueue, {
        batchSize: 5,
        maxConcurrency: 10,
        reportBatchItemFailures: true,
      })
    );

    archiveWorkerLambda.addEventSource(
      new SqsEventSource(this.archiveQueue, {
        batchSize: 3,
        maxConcurrency: 5,
        reportBatchItemFailures: true,
      })
    );

    // ─── Permissions ─────────────────────────────────────────────────────
    // DynamoDB
    this.lettersTable.grantReadWriteData(createLetterLambda);
    this.lettersTable.grantReadWriteData(enqueueSendLambda);
    this.lettersTable.grantReadWriteData(sendWorkerLambda);
    this.lettersTable.grantReadWriteData(archiveWorkerLambda);

    // S3
    this.lettersBucket.grantReadWrite(createLetterLambda);
    this.lettersBucket.grantReadWrite(enqueueSendLambda);
    this.lettersBucket.grantReadWrite(previewLetterLambda);
    this.lettersBucket.grantRead(sendWorkerLambda);
    this.lettersBucket.grantRead(archiveWorkerLambda);

    // SQS
    this.sendQueue.grantSendMessages(enqueueSendLambda);
    this.archiveQueue.grantSendMessages(enqueueSendLambda);
    this.sendQueue.grantConsumeMessages(sendWorkerLambda);
    this.archiveQueue.grantConsumeMessages(archiveWorkerLambda);

    // SES (for future real email sending)
    sendWorkerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendRawEmail', 'ses:SendEmail'],
        resources: ['*'],
      })
    );

    // Secrets Manager (for archive adapter credentials)
    archiveWorkerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['*'],
      })
    );

    // ─── API Routes (Zalando RESTful: resource-based, no verbs in URLs) ──
    const letters = this.api.root.addResource('letters');
    letters.addMethod('GET', new apigateway.LambdaIntegration(createLetterLambda));

    const lettersPreview = letters.addResource('preview');
    lettersPreview.addMethod('POST', new apigateway.LambdaIntegration(previewLetterLambda));

    const letterById = letters.addResource('{letterId}');
    letterById.addMethod('GET', new apigateway.LambdaIntegration(createLetterLambda));

    // POST /letters/{templateId} — creates and enqueues the letter (resource creation)
    letterById.addMethod('POST', new apigateway.LambdaIntegration(enqueueSendLambda));

    const preview = letterById.addResource('preview');
    preview.addMethod('POST', new apigateway.LambdaIntegration(previewLetterLambda));

    // Template routes (read-only registry)
    const templates = this.api.root.addResource('templates');
    templates.addMethod('GET', new apigateway.LambdaIntegration(templateRegistryLambda));

    const templateById = templates.addResource('{templateId}');
    templateById.addMethod('GET', new apigateway.LambdaIntegration(templateRegistryLambda));
  }
}

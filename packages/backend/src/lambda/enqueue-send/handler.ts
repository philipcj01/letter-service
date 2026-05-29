import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { withCors, parseBody } from '../../lib/response';
import { getTemplateById } from '../../templates';
import { renderLetterToPdf } from '../../pdf/renderer';
import { mapTemplateSections } from '../../lib/section-mapper';

const logger = new Logger({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });
const tracer = new Tracer({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });

const sqsClient = tracer.captureAWSv3Client(new SQSClient({}));
const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

const SEND_QUEUE_URL = process.env.SEND_QUEUE_URL!;
const ARCHIVE_QUEUE_URL = process.env.ARCHIVE_QUEUE_URL!;
const TABLE_NAME = process.env.LETTERS_TABLE!;
const BUCKET_NAME = process.env.LETTERS_BUCKET!;

/**
 * API-facing handler for sending letters. Flow:
 * 1. Validate input against template schema (Zod)
 * 2. Render PDF (ensures content is valid)
 * 3. Upload PDF to S3
 * 4. Create letter record in DynamoDB
 * 5. Enqueue send job to SQS
 * 6. Optionally enqueue archive job to SQS
 * 7. Return 202 Accepted
 *
 * If PDF rendering fails, we return 422 — nothing gets queued.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const templateId = event.pathParameters?.letterId; // route: /letters/{templateId}/send
  logger.info('Enqueue send request', { templateId });

  try {
    if (!templateId) {
      return withCors({ statusCode: 400, body: JSON.stringify({ error: 'Missing templateId in path' }) }, origin);
    }

    // 1. Resolve template from registry
    const template = getTemplateById(templateId);
    if (!template) {
      return withCors({ statusCode: 404, body: JSON.stringify({ error: `Template '${templateId}' not found` }) }, origin);
    }

    // 2. Parse and validate input against template's Zod schema
    const { data: body, error: parseErr } = parseBody(event.body);
    if (parseErr) return withCors(parseErr, origin);

    const validationResult = template.inputSchema.safeParse(body);
    if (!validationResult.success) {
      return withCors({
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'Input does not match template schema',
          details: validationResult.error.issues,
        }),
      }, origin);
    }

    const input = validationResult.data;
    const letterId = randomUUID();
    const createdAt = new Date().toISOString();

    // 3. Render PDF — if this fails, we abort and return an error (nothing queued)
    const pdfBuffer = await renderLetterToPdf({
      header: template.header ? {
        companyName: template.header.companyName,
      } : undefined,
      footer: template.footer ? {
        companyName: template.footer.companyName,
        address: template.footer.address,
        phone: template.footer.phone,
        email: template.footer.email,
        website: template.footer.website,
      } : undefined,
      recipient: input.recipient as { name: string; addressLine1: string; addressLine2?: string; postalCode: string; city: string; country?: string },
      sections: mapTemplateSections(template.sections, input, template.constants),
    });

    logger.info('PDF rendered successfully', { letterId, bytes: pdfBuffer.length });

    // 4. Upload PDF to S3
    const s3Key = `letters/${letterId}.pdf`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          letterId,
          templateId,
        },
      })
    );

    // 5. Create letter record in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `LETTER#${letterId}`,
          sk: `LETTER#${letterId}`,
          gsi1pk: `LETTER#${letterId}`,
          gsi1sk: 'STATUS#queued',
          letterId,
          templateId,
          templateName: template.name,
          s3Key,
          status: 'queued',
          archiveEnabled: input.archiveEnabled,
          inputData: input,
          createdAt,
          updatedAt: createdAt,
        },
      })
    );

    // 6. Enqueue SEND job to SQS
    const sendPayload = {
      letterId,
      templateId,
      templateName: template.name,
      s3Key,
      s3Bucket: BUCKET_NAME,
      enqueuedAt: createdAt,
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: SEND_QUEUE_URL,
        MessageBody: JSON.stringify(sendPayload),
        MessageGroupId: letterId,
        MessageDeduplicationId: `send-${letterId}`,
      })
    );

    // 7. If archiveEnabled, also enqueue ARCHIVE job
    if (input.archiveEnabled) {
      const archivePayload = {
        letterId,
        templateId,
        templateName: template.name,
        s3Key,
        s3Bucket: BUCKET_NAME,
        enqueuedAt: createdAt,
      };

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: ARCHIVE_QUEUE_URL,
          MessageBody: JSON.stringify(archivePayload),
          MessageGroupId: letterId,
          MessageDeduplicationId: `archive-${letterId}`,
        })
      );
    }

    logger.info('Letter created and queued', { letterId, archiveEnabled: input.archiveEnabled });

    return withCors({
      statusCode: 202,
      body: JSON.stringify({
        letterId,
        templateId,
        status: 'queued',
        archiveEnabled: input.archiveEnabled,
        message: 'Letter rendered and queued for delivery',
        createdAt,
      }),
    }, origin);
  } catch (error) {
    logger.error('Failed to process send request', error as Error);

    // Distinguish rendering errors from infra errors
    const message = (error as Error).message || 'Unknown error';
    const isRenderError = message.includes('PDF') || message.includes('render');

    return withCors({
      statusCode: isRenderError ? 422 : 500,
      body: JSON.stringify({
        error: isRenderError ? 'RenderError' : 'InternalError',
        message: isRenderError ? `PDF rendering failed: ${message}` : 'Failed to process request',
      }),
    }, origin);
  }
};

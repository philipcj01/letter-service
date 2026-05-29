import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { renderLetterToPdf } from '../../pdf/renderer';
import { CreateLetterRequestSchema } from './schema';
import { withCors, parseBody } from '../../lib/response';

const logger = new Logger({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });
const tracer = new Tracer({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });

const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

const TABLE_NAME = process.env.LETTERS_TABLE!;
const BUCKET_NAME = process.env.LETTERS_BUCKET!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = event.headers?.origin || event.headers?.Origin;
  logger.info('Received letter request', { method: event.httpMethod, path: event.path });

  try {
    if (event.httpMethod === 'GET') {
      const letterId = event.pathParameters?.letterId;
      if (letterId) {
        return withCors(await getLetter(event), origin);
      }
      return withCors(await listLetters(event), origin);
    }

    const { data: body, error: parseErr } = parseBody(event.body);
    if (parseErr) return withCors(parseErr, origin);
    const validationResult = CreateLetterRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return withCors({
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: validationResult.error.message,
        }),
      }, origin);
    }

    const request = validationResult.data;
    const letterId = randomUUID();
    const createdAt = new Date().toISOString();

    // Render PDF
    const pdfBuffer = await renderLetterToPdf({
      header: request.header,
      footer: request.footer,
      recipient: request.recipient,
      sections: request.sections,
    });

    // Store PDF in S3
    const s3Key = `letters/${request.customerId}/${letterId}.pdf`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          customerId: request.customerId,
          letterId,
          subject: request.metadata?.subject || '',
        },
      })
    );

    // Store metadata in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `CUSTOMER#${request.customerId}`,
          sk: `LETTER#${letterId}`,
          gsi1pk: `LETTER#${letterId}`,
          gsi1sk: `STATUS#created`,
          letterId,
          customerId: request.customerId,
          s3Key,
          status: 'created',
          metadata: request.metadata,
          templateId: request.templateId,
          createdAt,
          updatedAt: createdAt,
        },
      })
    );

    logger.info('Letter created successfully', { letterId });

    return withCors({
      statusCode: 201,
      body: JSON.stringify({
        letterId,
        status: 'created',
        pdfUrl: s3Key,
        createdAt,
      }),
    }, origin);
  } catch (error) {
    logger.error('Failed to create letter', error as Error);
    return withCors({
      statusCode: 500,
      body: JSON.stringify({
        error: 'InternalError',
        message: 'Failed to create letter',
      }),
    }, origin);
  }
};

async function getLetter(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const letterId = event.pathParameters?.letterId;
  if (!letterId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing letterId' }) };
  }

  const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': `LETTER#${letterId}` },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Letter not found' }) };
  }

  return { statusCode: 200, body: JSON.stringify(result.Items[0]) };
}

async function listLetters(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const params = event.queryStringParameters || {};
  const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 100);
  const exclusiveStartKey = params.nextToken
    ? JSON.parse(Buffer.from(params.nextToken, 'base64url').toString())
    : undefined;

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'LETTER#' },
      Limit: limit,
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    })
  );

  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
    : undefined;

  return { statusCode: 200, body: JSON.stringify({ letters: result.Items || [], count: result.Count, nextToken }) };
}

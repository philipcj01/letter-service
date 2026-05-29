import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SQSEvent, SQSRecord } from 'aws-lambda';

const logger = new Logger({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });
const tracer = new Tracer({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });

const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

const TABLE_NAME = process.env.LETTERS_TABLE!;

interface SendJobPayload {
  letterId: string;
  templateId: string;
  templateName: string;
  s3Key: string;
  s3Bucket: string;
  enqueuedAt: string;
}

/**
 * SQS Worker: Processes letter send jobs.
 * The PDF is already rendered and in S3 — this worker handles delivery.
 *
 * Currently uses a mock send function. Replace mockSendLetter with your
 * actual delivery integration (email, postal API, etc.).
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info('Processing send batch', { recordCount: event.Records.length });

  const results = await Promise.allSettled(
    event.Records.map((record) => processRecord(record))
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error('Some records failed', { failureCount: failures.length });
    throw new Error(`${failures.length} of ${event.Records.length} messages failed`);
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  const payload: SendJobPayload = JSON.parse(record.body);
  const { letterId, s3Key, s3Bucket } = payload;

  logger.info('Processing send job', { letterId });

  try {
    // Retrieve PDF from S3 for sending
    const pdfObject = await s3Client.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key })
    );
    const pdfBytes = await pdfObject.Body?.transformToByteArray();

    if (!pdfBytes) {
      throw new Error(`Failed to retrieve PDF from S3: ${s3Key}`);
    }

    // ─── MOCK SEND ───────────────────────────────────────────────────────
    // TODO: Replace with actual delivery integration:
    // - Email via SES
    // - Postal mail provider API
    // - Any other delivery channel
    await mockSendLetter({
      letterId,
      pdfBytes,
      templateName: payload.templateName,
    });
    // ─────────────────────────────────────────────────────────────────────

    const sentAt = new Date().toISOString();

    // Update DynamoDB status to 'sent'
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `LETTER#${letterId}`, sk: `LETTER#${letterId}` },
        UpdateExpression: 'SET #status = :status, gsi1sk = :gsi1sk, sentAt = :sentAt, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'sent',
          ':gsi1sk': 'STATUS#sent',
          ':sentAt': sentAt,
          ':updatedAt': sentAt,
        },
      })
    );

    logger.info('Letter sent successfully', { letterId, sentAt });
  } catch (error) {
    logger.error('Failed to send letter', { letterId, error: (error as Error).message });

    // Update status to 'failed' so it's visible in the UI
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `LETTER#${letterId}`, sk: `LETTER#${letterId}` },
        UpdateExpression: 'SET #status = :status, gsi1sk = :gsi1sk, failedAt = :failedAt, failReason = :reason, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'failed',
          ':gsi1sk': 'STATUS#failed',
          ':failedAt': new Date().toISOString(),
          ':reason': (error as Error).message,
          ':updatedAt': new Date().toISOString(),
        },
      })
    ).catch((dbErr) => logger.error('Failed to update status', { letterId, dbErr }));

    throw error; // Re-throw so SQS retries or sends to DLQ
  }
}

/**
 * Mock send function — simulates letter delivery.
 * Replace with actual integration when ready.
 */
async function mockSendLetter(params: {
  letterId: string;
  pdfBytes: Uint8Array;
  templateName: string;
}): Promise<void> {
  logger.info('MOCK: Sending letter', {
    letterId: params.letterId,
    pdfSize: params.pdfBytes.length,
    templateName: params.templateName,
  });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
}

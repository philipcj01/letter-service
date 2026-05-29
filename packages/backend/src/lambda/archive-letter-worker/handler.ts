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

interface ArchiveJobPayload {
  letterId: string;
  templateId: string;
  templateName: string;
  s3Key: string;
  s3Bucket: string;
  enqueuedAt: string;
}

/**
 * SQS Worker: Processes letter archive jobs.
 * The PDF is already in S3 — this worker handles document archival.
 *
 * Currently uses a mock function. Replace mockArchiveDocument with your
 * actual archive adapter (e.g., SharePoint, Box, custom DMS).
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info('Processing archive batch', { recordCount: event.Records.length });

  const results = await Promise.allSettled(
    event.Records.map((record) => processRecord(record))
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error('Some archive records failed', { failureCount: failures.length });
    throw new Error(`${failures.length} of ${event.Records.length} archive messages failed`);
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  const payload: ArchiveJobPayload = JSON.parse(record.body);
  const { letterId, s3Key, s3Bucket, templateName } = payload;

  logger.info('Processing archive job', { letterId });

  try {
    // Retrieve PDF from S3 for archiving
    const pdfObject = await s3Client.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key })
    );
    const pdfBytes = await pdfObject.Body?.transformToByteArray();

    if (!pdfBytes) {
      throw new Error(`Failed to retrieve PDF from S3: ${s3Key}`);
    }

    // ─── MOCK ARCHIVE ────────────────────────────────────────────────────
    // TODO: Replace with your actual archive adapter:
    // import { ArchiveClient } from '../../clients/archive-client';
    // const archiveClient = new ArchiveClient();
    // const result = await archiveClient.archive({ ... });
    const archiveDocumentId = await mockArchiveDocument({
      letterId,
      pdfBytes,
      templateName,
    });
    // ─────────────────────────────────────────────────────────────────────

    const archivedAt = new Date().toISOString();

    // Update DynamoDB — add archive info
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `LETTER#${letterId}`, sk: `LETTER#${letterId}` },
        UpdateExpression: 'SET archivedAt = :archivedAt, archiveDocumentId = :docId, archiveStatus = :archStatus, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':archivedAt': archivedAt,
          ':docId': archiveDocumentId,
          ':archStatus': 'archived',
          ':updatedAt': archivedAt,
        },
      })
    );

    logger.info('Letter archived successfully', { letterId, archiveDocumentId });
  } catch (error) {
    logger.error('Failed to archive letter', { letterId, error: (error as Error).message });

    // Mark archive as failed
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `LETTER#${letterId}`, sk: `LETTER#${letterId}` },
        UpdateExpression: 'SET archiveStatus = :status, archiveFailReason = :reason, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':status': 'archive_failed',
          ':reason': (error as Error).message,
          ':updatedAt': new Date().toISOString(),
        },
      })
    ).catch((dbErr) => logger.error('Failed to update archive status', { letterId, dbErr }));

    throw error; // Re-throw for SQS retry / DLQ
  }
}

/**
 * Mock archive function — returns a fake document ID.
 * Replace with your real archive adapter when integration is available.
 */
async function mockArchiveDocument(params: {
  letterId: string;
  pdfBytes: Uint8Array;
  templateName: string;
}): Promise<string> {
  logger.info('MOCK: Archiving document', {
    letterId: params.letterId,
    pdfSize: params.pdfBytes.length,
  });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Return mock document ID
  return `ARCH-${params.letterId.substring(0, 8).toUpperCase()}`;
}

import { APIGatewayProxyEvent } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const logger = new Logger({ serviceName: 'cloudletters-audit' });

export interface AuditEntry {
  action: 'CREATE_LETTER' | 'SEND_LETTER' | 'ARCHIVE_LETTER' | 'CREATE_TEMPLATE' | 'UPDATE_TEMPLATE' | 'PUBLISH_TEMPLATE' | 'DELETE_TEMPLATE' | 'PREVIEW_LETTER';
  resourceId: string;
  resourceType: 'letter' | 'template';
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function extractUserId(event: APIGatewayProxyEvent): string {
  return (
    event.requestContext.authorizer?.claims?.sub ||
    event.requestContext.authorizer?.principalId ||
    event.headers['x-user-id'] ||
    'anonymous'
  );
}

export function extractUserEmail(event: APIGatewayProxyEvent): string {
  return (
    event.requestContext.authorizer?.claims?.email ||
    event.headers['x-user-email'] ||
    'unknown'
  );
}

export async function writeAuditLog(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  entry: AuditEntry
): Promise<void> {
  try {
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        pk: `AUDIT#${entry.resourceType.toUpperCase()}#${entry.resourceId}`,
        sk: `${entry.timestamp}#${randomUUID().slice(0, 8)}`,
        gsi1pk: `USER#${entry.userId}`,
        gsi1sk: entry.timestamp,
        ...entry,
        ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year retention
      },
    }));
  } catch (error) {
    // Audit failures should not break the main flow
    logger.warn('Failed to write audit log', { error, entry });
  }
}

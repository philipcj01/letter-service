import { Logger } from '@aws-lambda-powertools/logger';

/**
 * Generic archive client — pluggable stub.
 *
 * Replace this mock implementation with your actual archive system
 * (e.g. S3 Glacier, Azure Blob, SharePoint, on-prem DMS, etc.)
 *
 * The interface is intentionally simple so it can wrap any storage backend.
 */

export interface ArchiveDocumentRequest {
  /** Base64-encoded document bytes */
  documentBytes: string;
  /** Human-readable title */
  documentTitle: string;
  /** Customer/owner identifier */
  customerId: string;
  /** Arbitrary metadata to store alongside the document */
  metadata?: Record<string, string>;
}

export interface ArchiveDocumentResponse {
  /** Unique ID in the archive system */
  documentId: string;
  /** ISO timestamp of when it was archived */
  archivedAt: string;
  /** Current status */
  status: 'archived' | 'pending';
}

export class ArchiveClient {
  constructor(
    private logger: Logger,
    private _options: { timeout?: number } = {}
  ) {}

  /**
   * Archives a document. Currently returns a mock response.
   * 👉 Replace this with your actual archive integration.
   */
  async archiveDocument(request: ArchiveDocumentRequest): Promise<ArchiveDocumentResponse> {
    this.logger.info('MOCK: Archiving document', {
      documentTitle: request.documentTitle,
      customerId: request.customerId,
      byteLength: request.documentBytes.length,
    });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      documentId: `ARCH-${Date.now().toString(36).toUpperCase()}`,
      archivedAt: new Date().toISOString(),
      status: 'archived',
    };
  }

  /**
   * Retrieves a document from the archive by ID.
   * 👉 Replace with your actual implementation.
   */
  async getDocument(documentId: string): Promise<Buffer> {
    this.logger.info('MOCK: Retrieving document', { documentId });
    await new Promise((resolve) => setTimeout(resolve, 50));
    return Buffer.from(`Mock content for ${documentId}`);
  }

  /**
   * Deletes a document from the archive.
   * 👉 Replace with your actual implementation.
   */
  async deleteDocument(documentId: string): Promise<void> {
    this.logger.info('MOCK: Deleting document', { documentId });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

import { z } from 'zod';

// ─── Create Letter Request (from template) ─────────────────────────────────────

export const CreateLetterFromTemplateSchema = z.object({
  templateId: z.string(),
  templateVersion: z.number().optional(),   // Defaults to latest published
  customerId: z.string(),
  placeholderValues: z.record(z.unknown()), // Key-value map of filled placeholders
  metadata: z.object({
    subject: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    caseReference: z.string().optional(),   // Link to a case/sag
  }).optional(),
});
export type CreateLetterFromTemplate = z.infer<typeof CreateLetterFromTemplateSchema>;

// ─── Letter Instance (stored in DB after creation) ─────────────────────────────

export const LetterStatusSchema = z.enum(['draft', 'created', 'sent', 'archived', 'failed']);
export type LetterStatus = z.infer<typeof LetterStatusSchema>;

export const LetterInstanceSchema = z.object({
  letterId: z.string(),
  templateId: z.string(),
  templateVersion: z.number(),
  customerId: z.string(),
  status: LetterStatusSchema,
  placeholderValues: z.record(z.unknown()),
  pdfS3Key: z.string().optional(),
  archiveDocumentId: z.string().optional(),
  metadata: z.object({
    subject: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    caseReference: z.string().optional(),
  }).optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sentAt: z.string().optional(),
  archivedAt: z.string().optional(),
});
export type LetterInstance = z.infer<typeof LetterInstanceSchema>;

// ─── Preview Request ───────────────────────────────────────────────────────────

export const PreviewLetterRequestSchema = z.object({
  templateId: z.string(),
  templateVersion: z.number().optional(),
  placeholderValues: z.record(z.unknown()),
});
export type PreviewLetterRequest = z.infer<typeof PreviewLetterRequestSchema>;

// ─── Send Letter Request ───────────────────────────────────────────────────────

export const SendLetterRequestSchema = z.object({
  letterId: z.string(),
  channel: z.enum(['email', 'postal']),
  recipient: z.object({
    email: z.string().email().optional(),
    name: z.string(),
    customerId: z.string().optional(),
  }),
  subject: z.string().optional(),
  message: z.string().optional(),
});
export type SendLetterRequest = z.infer<typeof SendLetterRequestSchema>;

// ─── Archive Letter Request ────────────────────────────────────────────────────

export const ArchiveLetterRequestSchema = z.object({
  letterId: z.string(),
  documentTypeName: z.string().default('Outgoing Letters'),
  documentTitle: z.string().optional(),
  sourceSystem: z.string().default('CloudLetters'),
  archiveReason: z.string().optional(),
});
export type ArchiveLetterRequest = z.infer<typeof ArchiveLetterRequestSchema>;

// ─── API Response Types ────────────────────────────────────────────────────────

export const LetterResponseSchema = z.object({
  letterId: z.string(),
  status: LetterStatusSchema,
  pdfUrl: z.string().optional(),
  archiveDocumentId: z.string().optional(),
  createdAt: z.string(),
});
export type LetterResponse = z.infer<typeof LetterResponseSchema>;

import { z } from 'zod';

const RecipientSchema = z.object({
  name: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string().optional(),
});

const HeaderSchema = z.object({
  companyName: z.string().optional(),
  logoUrl: z.string().optional(),
  date: z.string().optional(),
  referenceNumber: z.string().optional(),
});

const FooterSchema = z.object({
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  showPageNumbers: z.boolean().optional(),
});

const ContentBlockSchema = z.object({
  type: z.enum(['heading', 'paragraph', 'spacing', 'bullet']),
  level: z.enum(['h1', 'h2', 'h3', 'h4']).optional(),
  text: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  spacing: z.number().optional(),
  items: z.array(z.string()).optional(),
});

const TableColumnSchema = z.object({
  key: z.string(),
  header: z.string(),
  width: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

const LetterSectionSchema = z.object({
  type: z.enum(['afsnit', 'table', 'address', 'spacing']),
  blocks: z.array(ContentBlockSchema).optional(),
  columns: z.array(TableColumnSchema).optional(),
  data: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional(),
  showHeader: z.boolean().optional(),
  striped: z.boolean().optional(),
  recipient: RecipientSchema.optional(),
  spacing: z.number().optional(),
});

export const CreateLetterRequestSchema = z.object({
  templateId: z.string().optional(),
  customerId: z.string(),
  recipient: RecipientSchema,
  header: HeaderSchema.optional(),
  footer: FooterSchema.optional(),
  sections: z.array(LetterSectionSchema),
  metadata: z
    .object({
      subject: z.string(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export const CreateLetterResponseSchema = z.object({
  letterId: z.string(),
  status: z.enum(['created', 'failed']),
  pdfUrl: z.string().optional(),
  createdAt: z.string(),
});

export type CreateLetterRequest = z.infer<typeof CreateLetterRequestSchema>;
export type CreateLetterResponse = z.infer<typeof CreateLetterResponseSchema>;

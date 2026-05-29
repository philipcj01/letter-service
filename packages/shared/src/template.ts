import { z } from 'zod';
import { BusinessRuleSchema, PlaceholderDefSchema } from './rules';

// ─── Content Block Types (used in sections) ────────────────────────────────────

export const HeadingLevelSchema = z.enum(['h1', 'h2', 'h3', 'h4']);
export type HeadingLevel = z.infer<typeof HeadingLevelSchema>;

export const ContentBlockSchema = z.object({
  type: z.enum(['heading', 'paragraph', 'spacing', 'bullet']),
  level: HeadingLevelSchema.optional(),
  text: z.string().optional(),           // Can contain {{placeholders}}
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  spacing: z.number().optional(),
  items: z.array(z.string()).optional(), // For bullet lists
});
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const TableColumnDefSchema = z.object({
  key: z.string(),
  header: z.string(),
  width: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  format: z.enum(['text', 'number', 'currency', 'date', 'percent']).optional(),
});
export type TableColumnDef = z.infer<typeof TableColumnDefSchema>;

export const RecipientSchema = z.object({
  name: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string().optional(),
});
export type Recipient = z.infer<typeof RecipientSchema>;

// ─── Template Section Definitions ──────────────────────────────────────────────

export const TemplateSectionTypeSchema = z.enum([
  'afsnit',       // Dynamic content blocks (headings, paragraphs)
  'table',        // Dynamic table with columns
  'address',      // Recipient address block
  'spacing',      // Vertical spacer
  'signature',    // Signature block
  'attachment',   // Reference to attached documents
]);
export type TemplateSectionType = z.infer<typeof TemplateSectionTypeSchema>;

export const TemplateSectionDefSchema = z.object({
  id: z.string(),                        // Unique section identifier (for rule targeting)
  type: TemplateSectionTypeSchema,
  label: z.string(),                     // Human-readable label for the builder UI
  required: z.boolean().default(false),  // Cannot be removed from a letter
  // Content (depends on type)
  blocks: z.array(ContentBlockSchema).optional(),          // For 'afsnit'
  columns: z.array(TableColumnDefSchema).optional(),       // For 'table'
  dataSourcePlaceholder: z.string().optional(),            // For 'table': placeholder key that provides rows
  recipientPlaceholder: z.string().optional(),             // For 'address': placeholder key for RecipientAddress
  signatureFields: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    datePlaceholder: z.string().optional(),
  }).optional(),
  spacing: z.number().optional(),        // For 'spacing'
  // Visibility (can also be controlled by rules)
  visible: z.boolean().default(true),
  order: z.number().default(0),          // Display order
});
export type TemplateSectionDef = z.infer<typeof TemplateSectionDefSchema>;

// ─── Header & Footer Definitions ───────────────────────────────────────────────

export const TemplateHeaderDefSchema = z.object({
  companyName: z.string().optional(),
  logoUrl: z.string().optional(),
  showDate: z.boolean().default(true),
  showReferenceNumber: z.boolean().default(true),
});
export type TemplateHeaderDef = z.infer<typeof TemplateHeaderDefSchema>;

export const TemplateFooterDefSchema = z.object({
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  showPageNumbers: z.boolean().default(true),
});
export type TemplateFooterDef = z.infer<typeof TemplateFooterDefSchema>;

// ─── Letter Template (the full definition) ─────────────────────────────────────

export const TemplateStatusSchema = z.enum(['draft', 'published', 'archived']);
export type TemplateStatus = z.infer<typeof TemplateStatusSchema>;

export const LetterTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.number().default(1),
  status: TemplateStatusSchema.default('draft'),
  category: z.string(),                  // e.g. "Pension", "Forsikring", "Generelt"
  tags: z.array(z.string()).optional(),

  // Layout
  pageSize: z.enum(['A4', 'LETTER']).default('A4'),
  header: TemplateHeaderDefSchema.optional(),
  footer: TemplateFooterDefSchema.optional(),

  // Content
  sections: z.array(TemplateSectionDefSchema),

  // Data & Logic
  placeholders: z.array(PlaceholderDefSchema),
  rules: z.array(BusinessRuleSchema),

  // Metadata
  createdBy: z.string(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LetterTemplate = z.infer<typeof LetterTemplateSchema>;

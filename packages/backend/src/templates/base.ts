import { z } from 'zod';

/**
 * Base interface that ALL letter templates must extend.
 * These fields are required for every letter regardless of type.
 */
export const BaseLetterInputSchema = z.object({
  archiveEnabled: z.boolean(),
  recipient: z.object({
    name: z.string().min(1),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    postalCode: z.string().min(1),
    city: z.string().min(1),
    country: z.string().optional(),
  }),
});

export type BaseLetterInput = z.infer<typeof BaseLetterInputSchema>;

/**
 * Placeholder field definition for documentation/UI rendering.
 */
export interface PlaceholderField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list' | 'email';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  /** Validation regex */
  validationRegex?: string;
  /** Available options for select fields */
  options?: { label: string; value: string }[];
}

/**
 * Section definition for the PDF layout.
 */
/**
 * Context object passed to text functions in template blocks.
 * Contains all input data plus helper utilities.
 */
export interface TemplateTextContext {
  [key: string]: unknown;
  /** Format number as Danish currency: 2500 → "2.500,00 kr." */
  formatCurrency: (n: number) => string;
  /** Format ISO date to Danish: "2026-05-28" → "28. maj 2026" */
  formatDate: (iso: string) => string;
  /** Join array items with ", " and last separator " og ": ["a","b","c"] → "a, b og c" */
  joinDanish: (arr: unknown[], lastSep?: string) => string;
}

/**
 * Text in a block can be:
 * - A plain string with {{placeholder}} syntax (simple, no compile-time check)
 * - A function receiving typed context (full TS compile-time validation + IDE autocomplete)
 */
export type TemplateText = string | ((ctx: TemplateTextContext) => string);

export interface TemplateSectionDef {
  id: string;
  type: 'heading' | 'paragraph' | 'table' | 'recipient' | 'signature' | 'spacer';
  label: string;
  blocks?: Array<{
    type: 'heading' | 'paragraph' | 'bullet' | 'spacing';
    level?: 'h1' | 'h2' | 'h3';
    text?: TemplateText;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
    spacing?: number;
  }>;
  columns?: Array<{ key: string; header: string; width?: number; align?: string; format?: string }>;
  dataSourcePlaceholder?: string;
  recipientPlaceholder?: string;
  visible?: boolean;
  order?: number;
  /**
   * Conditional rendering. Section only renders if condition evaluates to true.
   * - { field, equals }:      render if input[field] === equals
   * - { field, notEquals }:   render if input[field] !== notEquals
   * - { field, includes }:    render if Array input[field] includes the value
   * - { field, notEmpty }:    render if input[field] is truthy / non-empty array
   */
  condition?: {
    field: string;
    equals?: unknown;
    notEquals?: unknown;
    includes?: unknown;
    notEmpty?: boolean;
  };
  /**
   * Repeat this section once per item in the specified array field.
   * Inside blocks, use {{_item}} to reference the current iteration value,
   * or {{_item.fieldName}} for object arrays.
   */
  repeatField?: string;
}

/**
 * Template definition — the complete letter template as code.
 */
export interface LetterTemplateDefinition {
  /** Unique slug identifier, e.g. "welcome-letter" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of when this letter is used */
  description: string;
  /** Version string, e.g. "1.0.0" */
  version: string;
  /** The Zod schema for validating input (extends BaseLetterInputSchema) */
  inputSchema: z.ZodType<BaseLetterInput & Record<string, unknown>>;
  /** Placeholder field definitions for UI/documentation */
  placeholders: PlaceholderField[];
  /** PDF section layout */
  sections: TemplateSectionDef[];
  /** Header config */
  header?: {
    companyName?: string;
    logoUrl?: string;
    showDate?: boolean;
    showReferenceNumber?: boolean;
  };
  /** Footer config */
  footer?: {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    showPageNumbers?: boolean;
  };
  /** Signature fields */
  signatureFields?: {
    name: string;
    title: string;
  };
  /**
   * Constants injected into the template resolution context.
   * Use for lookup maps, label dictionaries, etc. that ${...} expressions can reference.
   */
  constants?: Record<string, unknown>;
}

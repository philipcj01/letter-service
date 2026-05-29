import { z } from 'zod';

// ─── Placeholder Definitions ───────────────────────────────────────────────────

export const PlaceholderTypeSchema = z.enum(['text', 'number', 'date', 'boolean', 'currency', 'list', 'address']);
export type PlaceholderType = z.infer<typeof PlaceholderTypeSchema>;

export const PlaceholderSourceSchema = z.enum(['manual', 'api', 'computed']);
export type PlaceholderSource = z.infer<typeof PlaceholderSourceSchema>;

export const PlaceholderDefSchema = z.object({
  key: z.string(),                       // e.g. "customer.name", "policy.amount"
  label: z.string(),                     // e.g. "Customer full name"
  description: z.string().optional(),    // Help text for citizen developers
  type: PlaceholderTypeSchema,
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  source: PlaceholderSourceSchema.default('manual'),
  apiPath: z.string().optional(),        // For 'api' source: endpoint to fetch value
  computeExpression: z.string().optional(), // For 'computed': e.g. "policy.amount * 0.08"
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional(), // For dropdowns / enums
  }).optional(),
  group: z.string().optional(),          // Group placeholders in the UI (e.g. "Customer data", "Pension data")
});

export type PlaceholderDef = z.infer<typeof PlaceholderDefSchema>;

// ─── Business Rules ────────────────────────────────────────────────────────────

export const RuleOperatorSchema = z.enum([
  'equals', 'notEquals',
  'contains', 'notContains',
  'startsWith', 'endsWith',
  'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual',
  'isEmpty', 'isNotEmpty',
  'in', 'notIn',
  'isTrue', 'isFalse',
]);
export type RuleOperator = z.infer<typeof RuleOperatorSchema>;

export const RuleConditionSchema: z.ZodType<RuleCondition> = z.lazy(() =>
  z.object({
    type: z.enum(['simple', 'group']),
    // Simple condition fields
    field: z.string().optional(),              // Placeholder key to evaluate
    operator: RuleOperatorSchema.optional(),
    value: z.unknown().optional(),             // Comparison value
    // Group condition fields (AND/OR composition)
    logic: z.enum(['and', 'or']).optional(),
    conditions: z.array(RuleConditionSchema).optional(),
  })
);

export interface RuleCondition {
  type: 'simple' | 'group';
  field?: string;
  operator?: RuleOperator;
  value?: unknown;
  logic?: 'and' | 'or';
  conditions?: RuleCondition[];
}

export const RuleActionTypeSchema = z.enum([
  'showSection',
  'hideSection',
  'showField',
  'hideField',
  'setValue',
  'addSection',
  'removeSection',
  'setStyle',
  'setRequired',
]);
export type RuleActionType = z.infer<typeof RuleActionTypeSchema>;

export const RuleActionSchema = z.object({
  type: RuleActionTypeSchema,
  targetId: z.string(),                  // Section ID or placeholder key
  value: z.unknown().optional(),         // For setValue, setStyle, etc.
});
export type RuleAction = z.infer<typeof RuleActionSchema>;

export const BusinessRuleSchema = z.object({
  id: z.string(),
  name: z.string(),                      // Human-readable rule name
  description: z.string().optional(),
  priority: z.number().default(0),       // Higher = evaluated first
  condition: RuleConditionSchema,
  actions: z.array(RuleActionSchema),
  enabled: z.boolean().default(true),
});
export type BusinessRule = z.infer<typeof BusinessRuleSchema>;

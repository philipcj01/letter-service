// Template types & schemas
export { LetterTemplateSchema, TemplateSectionDefSchema, TemplateHeaderDefSchema, TemplateFooterDefSchema } from './template';
export type {
  LetterTemplate,
  TemplateSectionDef,
  TemplateSectionType,
  TemplateHeaderDef,
  TemplateFooterDef,
  TemplateStatus,
  ContentBlock,
  HeadingLevel,
  TableColumnDef,
  Recipient,
} from './template';
export { ContentBlockSchema, TableColumnDefSchema, RecipientSchema, TemplateStatusSchema, TemplateSectionTypeSchema } from './template';

// Business rules
export { BusinessRuleSchema, PlaceholderDefSchema, RuleConditionSchema, RuleActionSchema, RuleOperatorSchema } from './rules';
export type { BusinessRule, PlaceholderDef, PlaceholderType, PlaceholderSource, RuleCondition, RuleOperator, RuleAction, RuleActionType } from './rules';

// Rule engine
export { evaluateCondition, evaluateRules, resolveSectionVisibility, resolvePlaceholders } from './rule-engine';
export type { RuleEvaluationResult, EvaluationContext } from './rule-engine';

// Letter API types
export {
  CreateLetterFromTemplateSchema,
  LetterInstanceSchema,
  PreviewLetterRequestSchema,
  SendLetterRequestSchema,
  ArchiveLetterRequestSchema,
  LetterResponseSchema,
  LetterStatusSchema,
} from './letter';
export type {
  CreateLetterFromTemplate,
  LetterInstance,
  PreviewLetterRequest,
  SendLetterRequest,
  ArchiveLetterRequest,
  LetterResponse,
  LetterStatus,
} from './letter';

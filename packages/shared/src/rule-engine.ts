import { BusinessRule, RuleCondition } from './rules';

/**
 * Rule Engine — evaluates business rules against a set of placeholder values.
 * Used both client-side (for instant UI feedback) and server-side (for validation).
 */

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  actions: { type: string; targetId: string; value?: unknown }[];
}

export interface EvaluationContext {
  /** Current placeholder values */
  values: Record<string, unknown>;
}

/**
 * Evaluates a single condition against the provided context.
 */
export function evaluateCondition(condition: RuleCondition, ctx: EvaluationContext): boolean {
  if (condition.type === 'group') {
    const results = (condition.conditions || []).map((c) => evaluateCondition(c, ctx));
    if (condition.logic === 'or') {
      return results.some(Boolean);
    }
    return results.every(Boolean); // 'and' is default
  }

  // Simple condition
  const { field, operator, value } = condition;
  if (!field || !operator) return false;

  const fieldValue = getNestedValue(ctx.values, field);

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
      return fieldValue !== value;
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(String(value));
    case 'notContains':
      return typeof fieldValue === 'string' && !fieldValue.includes(String(value));
    case 'startsWith':
      return typeof fieldValue === 'string' && fieldValue.startsWith(String(value));
    case 'endsWith':
      return typeof fieldValue === 'string' && fieldValue.endsWith(String(value));
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(value);
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(value);
    case 'isEmpty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'isNotEmpty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'notIn':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'isTrue':
      return fieldValue === true;
    case 'isFalse':
      return fieldValue === false;
    default:
      return false;
  }
}

/**
 * Evaluates all rules and returns the combined actions to apply.
 */
export function evaluateRules(rules: BusinessRule[], ctx: EvaluationContext): RuleEvaluationResult[] {
  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  return sortedRules.map((rule) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    matched: evaluateCondition(rule.condition, ctx),
    actions: rule.actions,
  }));
}

/**
 * Resolves which sections should be visible after applying all matched rules.
 */
export function resolveSectionVisibility(
  sectionIds: string[],
  ruleResults: RuleEvaluationResult[]
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  sectionIds.forEach((id) => (visibility[id] = true)); // All visible by default

  for (const result of ruleResults) {
    if (!result.matched) continue;
    for (const action of result.actions) {
      if (action.type === 'showSection') {
        visibility[action.targetId] = true;
      } else if (action.type === 'hideSection') {
        visibility[action.targetId] = false;
      }
    }
  }

  return visibility;
}

/**
 * Resolves placeholder text in a string template.
 * Replaces {{key}} with the value from context.
 */
export function resolvePlaceholders(text: string, values: Record<string, unknown>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const value = getNestedValue(values, key.trim());
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

/**
 * Gets a nested value from an object using dot notation.
 * e.g. getNestedValue({ customer: { name: "John" } }, "customer.name") → "John"
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current === null || current === undefined) return undefined;
    return (current as Record<string, unknown>)[key];
  }, obj);
}

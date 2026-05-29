import { TemplateSectionDef, TemplateText, TemplateTextContext } from '../templates/base';
import { LetterSection } from '../pdf/renderer';
import { RecipientAddress } from '../pdf/components/AddressBlock';
import { formatDanishDate } from './date-utils';
import { formatDanishCurrency } from './currency-utils';

/**
 * Evaluates a section condition against the input data.
 * Returns true if the section should render.
 */
export function evaluateCondition(
  condition: NonNullable<TemplateSectionDef['condition']>,
  input: Record<string, unknown>,
): boolean {
  const value = input[condition.field];

  if (condition.equals !== undefined) {
    return value === condition.equals;
  }
  if (condition.notEquals !== undefined) {
    return value !== condition.notEquals;
  }
  if (condition.includes !== undefined) {
    if (Array.isArray(value)) {
      return value.includes(condition.includes);
    }
    return false;
  }
  if (condition.notEmpty) {
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }

  return true;
}

/**
 * Helper utilities available inside ${...} expressions in template text.
 * These are injected into the evaluation scope so templates can use them directly.
 */
const TEMPLATE_HELPERS = {
  formatCurrency: formatDanishCurrency,
  formatDate: formatDanishDate,
  /** Join array items with separator, with optional last separator (e.g. "a, b og c") */
  joinDanish: (arr: unknown[], lastSep = ' og '): string => {
    const strings = arr.map(String);
    if (strings.length <= 1) return strings.join('');
    return strings.slice(0, -1).join(', ') + lastSep + strings[strings.length - 1];
  },
};

/**
 * Resolves template text with two syntaxes:
 *
 * 1. **Simple placeholders**: `{{key}}` or `{{_item.field}}`
 *    Auto-formats ISO dates and numbers.
 *
 * 2. **JS expressions**: `${expression}` — full JavaScript evaluated with input data in scope.
 *    All input fields are available as local variables. Helpers available:
 *    - `formatCurrency(num)` → "471.540,00 kr."
 *    - `formatDate(isoStr)` → "28. maj 2026"
 *    - `joinDanish(arr, lastSep?)` → "a, b og c"
 *
 * Examples:
 *   "Kære {{customerName}}"
 *   "Dine dækninger (${changedCoverages.join(', ')}) er ændret"
 *   "Beløb: ${formatCurrency(amount)}"
 *   "${salaryDecreased ? 'Din løn er faldet.' : 'Din løn er uændret.'}"
 *
 * 3. **Function** (ctx) => string — TypeScript-compiled, fully type-checked at build time.
 *    Use this for complex logic that benefits from IDE autocomplete and compile-time validation.
 */
export function resolveTemplateText(text: TemplateText, data: Record<string, unknown>): string {
  // If text is a function, call it with the context (type-safe, compiled by TS)
  if (typeof text === 'function') {
    const ctx: TemplateTextContext = {
      ...data,
      formatCurrency: formatDanishCurrency,
      formatDate: formatDanishDate,
      joinDanish: TEMPLATE_HELPERS.joinDanish,
    };
    try {
      return text(ctx);
    } catch {
      return '[Expression error]';
    }
  }

  // String path: first resolve ${...} then {{...}}
  let resolved = text.replace(/\$\{([^}]+)\}/g, (match, expression: string) => {
    try {
      return evaluateExpression(expression, data);
    } catch {
      // If expression fails, leave it as-is for debugging
      return match;
    }
  });

  // Second pass: resolve {{...}} simple placeholders
  resolved = resolved.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (_, keyPath: string) => {
    const parts = keyPath.split('.');
    let val: unknown = data;
    for (const p of parts) {
      if (val === null || val === undefined) return '';
      val = (val as Record<string, unknown>)[p];
    }
    if (val === undefined || val === null) return '';
    if (typeof val === 'number') {
      return formatDanishCurrency(val);
    }
    const str = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return formatDanishDate(str);
    }
    return str;
  });

  return resolved;
}

/**
 * Evaluates a JavaScript expression string with input data and helpers in scope.
 * Uses `new Function` to create a sandboxed evaluation context.
 */
function evaluateExpression(expression: string, data: Record<string, unknown>): string {
  const keys = Object.keys(data);
  const helperKeys = Object.keys(TEMPLATE_HELPERS);
  const allKeys = [...keys, ...helperKeys];
  const allValues = [
    ...keys.map((k) => data[k]),
    ...helperKeys.map((k) => TEMPLATE_HELPERS[k as keyof typeof TEMPLATE_HELPERS]),
  ];

  // Build function: (key1, key2, ..., formatCurrency, formatDate, ...) => expression
  const fn = new Function(...allKeys, `"use strict"; return (${expression});`);
  const result = fn(...allValues);

  if (result === undefined || result === null) return '';
  if (typeof result === 'number') return formatDanishCurrency(result);
  const str = String(result);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return formatDanishDate(str);
  return str;
}

/**
 * Maps a TemplateSectionDef to one or more LetterSections.
 * Handles conditions, repeat fields, and type mapping.
 * Returns an array because repeat sections expand to multiple LetterSections.
 *
 * @param constants - Optional lookup maps/dictionaries injected into expression scope
 */
export function mapTemplateSections(
  sections: TemplateSectionDef[],
  input: Record<string, unknown>,
  constants?: Record<string, unknown>,
): LetterSection[] {
  const result: LetterSection[] = [];
  const mergedInput = constants ? { ...constants, ...input } : input;

  for (const section of sections) {
    // Evaluate condition
    if (section.condition && !evaluateCondition(section.condition, mergedInput)) {
      continue;
    }

    // Handle repeat
    if (section.repeatField) {
      const items = mergedInput[section.repeatField];
      if (Array.isArray(items)) {
        for (const item of items) {
          const itemContext = {
            ...mergedInput,
            _item: item,
            ...(typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}),
          };
          result.push(mapSingleSection(section, itemContext));
        }
      }
      continue;
    }

    result.push(mapSingleSection(section, mergedInput));
  }

  return result;
}

function mapSingleSection(section: TemplateSectionDef, input: Record<string, unknown>): LetterSection {
  switch (section.type) {
    case 'heading':
    case 'paragraph':
    case 'signature':
      return {
        type: 'afsnit',
        blocks: section.blocks?.map((b) => ({
          ...b,
          type: b.type,
          text: b.text ? resolveTemplateText(b.text, input) : '',
        })) || [],
      };
    case 'table':
      return {
        type: 'table',
        columns: section.columns?.map((c) => ({
          ...c,
          align: c.align as 'left' | 'center' | 'right' | undefined,
        })),
        data: section.dataSourcePlaceholder
          ? (input[section.dataSourcePlaceholder] as Record<string, string | number | boolean | null>[]) || []
          : [],
        showHeader: true,
      };
    case 'recipient':
      return {
        type: 'address',
        recipient: section.recipientPlaceholder
          ? (input[section.recipientPlaceholder] as RecipientAddress | undefined)
          : undefined,
      };
    case 'spacer':
      return { type: 'spacing', spacing: 20 };
    default:
      return { type: 'afsnit', blocks: [] };
  }
}

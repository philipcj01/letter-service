import type { LetterTemplateDefinition } from './base';
import { welcomeLetter } from './welcome-letter';

/**
 * Central registry of all letter templates.
 * Add new templates here — they will automatically appear in the API and frontend.
 */
const templates: LetterTemplateDefinition[] = [
  welcomeLetter,
];

const templateMap = new Map<string, LetterTemplateDefinition>(
  templates.map((t) => [t.id, t])
);

export function getAllTemplates(): LetterTemplateDefinition[] {
  return templates;
}

export function getTemplateById(id: string): LetterTemplateDefinition | undefined {
  return templateMap.get(id);
}

export { type LetterTemplateDefinition, type PlaceholderField, type TemplateSectionDef, type TemplateText, type TemplateTextContext, BaseLetterInputSchema } from './base';

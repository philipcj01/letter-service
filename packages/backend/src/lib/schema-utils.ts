import { z } from 'zod';

/**
 * Lightweight Zod-to-JSON-Schema converter for documentation purposes.
 * Handles the common types used in letter templates.
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return convertNode(schema);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function convertNode(node: z.ZodType): Record<string, unknown> {
  const def = (node as any)._def;

  switch (def.typeName) {
    case 'ZodObject': {
      const shape = (node as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const field = value as z.ZodType;
        const isOptional = field.isOptional();
        properties[key] = convertNode(isOptional ? (field as any).unwrap() : field);
        if (!isOptional) required.push(key);
      }

      return { type: 'object', properties, required };
    }
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodEnum': {
      const values = def.values;
      return { type: 'string', enum: values };
    }
    case 'ZodOptional':
      return convertNode((node as any).unwrap());
    case 'ZodArray':
      return { type: 'array', items: convertNode(def.type) };
    case 'ZodDefault':
      return convertNode(def.innerType);
    default:
      return { type: 'unknown' };
  }
}

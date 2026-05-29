import { Logger } from '@aws-lambda-powertools/logger';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { withCors } from '../../lib/response';
import { getAllTemplates, getTemplateById } from '../../templates';
import { zodToJsonSchema } from '../../lib/schema-utils';

const logger = new Logger({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const method = event.httpMethod;
  const templateId = event.pathParameters?.templateId;

  logger.info('Template registry request', { method, path: event.path, templateId });

  try {
    if (method !== 'GET') {
      return withCors({ statusCode: 405, body: JSON.stringify({ error: 'Method not allowed. Templates are read-only.' }) }, origin);
    }

    if (templateId) {
      return withCors(getTemplateDetail(templateId), origin);
    }

    return withCors(listTemplates(event), origin);
  } catch (err) {
    logger.error('Unhandled error', { error: err });
    return withCors({ statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }, origin);
  }
};

function listTemplates(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const search = event.queryStringParameters?.search?.toLowerCase();
  const allTemplates = getAllTemplates();

  const filtered = search
    ? allTemplates.filter((t) =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)
      )
    : allTemplates;

  const items = filtered.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    version: t.version,
    placeholderCount: t.placeholders.length,
    requiredFields: t.placeholders.filter((p) => p.required).length,
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ templates: items, count: items.length }),
  };
}

function getTemplateDetail(templateId: string): APIGatewayProxyResult {
  const template = getTemplateById(templateId);

  if (!template) {
    return { statusCode: 404, body: JSON.stringify({ error: `Template '${templateId}' not found` }) };
  }

  // Generate JSON example from all placeholders
  const jsonSchema = zodToJsonSchema(template.inputSchema);
  const jsonExample = generateJsonExample(jsonSchema);

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: template.id,
      name: template.name,
      description: template.description,
      version: template.version,
      placeholders: template.placeholders,
      sections: template.sections,
      header: template.header,
      footer: template.footer,
      api: {
        endpoint: `/letters/${template.id}`,
        method: 'POST',
        description: template.description,
        jsonExample,
        baseFields: {
          archiveEnabled: { type: 'boolean', required: false, description: 'Enable document archiving' },
          recipient: { type: 'object', required: true, description: 'Recipient address (name, addressLine1, postalCode, city)' },
        },
      },
    }),
  };
}

/**
 * Generates an example JSON body from a JSON Schema.
 * Produces realistic placeholder values based on field types and names.
 */
function generateJsonExample(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = (schema as { properties?: Record<string, Record<string, unknown>> }).properties;
  if (!properties) return {};

  const example: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(properties)) {
    example[key] = getExampleValue(key, prop);
  }

  return example;
}

function getExampleValue(key: string, prop: Record<string, unknown>): unknown {
  // Use enum values if available
  if (prop.enum && Array.isArray(prop.enum)) {
    return prop.enum[0];
  }

  const type = prop.type as string;

  // Generate contextual examples based on key name
  if (key === 'archiveEnabled') return true;
  if (key.toLowerCase().includes('email')) return 'user@example.com';
  if (key.toLowerCase().includes('phone')) return '+1 555-0123';
  if (key.toLowerCase().includes('date')) return '2025-01-15';
  if (key.toLowerCase().includes('name')) return 'John Smith';
  if (key.toLowerCase().includes('address')) return '123 Main Street';
  if (key.toLowerCase().includes('postal')) return '10001';
  if (key.toLowerCase().includes('city')) return 'New York';

  switch (type) {
    case 'string': return 'example';
    case 'number': return 1000;
    case 'boolean': return true;
    case 'array': return [];
    case 'object': return {};
    default: return null;
  }
}

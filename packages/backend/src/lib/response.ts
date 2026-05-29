import { APIGatewayProxyResult } from 'aws-lambda';

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

export function success(body: unknown, statusCode = 200, origin?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function error(message: string, statusCode = 400, origin?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  };
}

export function created(body: unknown, origin?: string) {
  return success(body, 201, origin);
}

export function notFound(message = 'Not found', origin?: string) {
  return error(message, 404, origin);
}

export function serverError(message = 'Internal server error', origin?: string) {
  return error(message, 500, origin);
}

/**
 * Safely parse JSON body. Returns parsed object or null + error response.
 */
export function parseBody(body: string | null): { data: Record<string, unknown> | null; error: APIGatewayProxyResult | null } {
  try {
    return { data: JSON.parse(body || '{}'), error: null };
  } catch {
    return { data: null, error: { statusCode: 400, body: JSON.stringify({ error: 'InvalidJSON', message: 'Request body is not valid JSON' }) } };
  }
}

/**
 * Wraps a raw `{ statusCode, body }` response with CORS headers.
 * Use this to retrofit existing lambda return values without rewriting them.
 */
export function withCors(response: APIGatewayProxyResult, origin?: string): APIGatewayProxyResult {
  return {
    ...response,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json',
      ...(response.headers || {}),
    },
  };
}

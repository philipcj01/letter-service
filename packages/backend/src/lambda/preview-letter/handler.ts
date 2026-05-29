import { Logger } from '@aws-lambda-powertools/logger';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { renderLetterToPdf } from '../../pdf/renderer';
import { withCors, parseBody } from '../../lib/response';
import { getTemplateById } from '../../templates';
import { mapTemplateSections } from '../../lib/section-mapper';

const logger = new Logger({ serviceName: process.env.SERVICE_NAME || 'cloudletters' });
const s3Client = new S3Client({});

const BUCKET_NAME = process.env.LETTERS_BUCKET!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = event.headers?.origin || event.headers?.Origin;
  logger.info('Preview letter request received');

  try {
    const { data: body, error: parseErr } = parseBody(event.body);
    if (parseErr) return withCors(parseErr, origin);

    const { templateId, placeholderValues } = body as { templateId: string; placeholderValues: Record<string, unknown> };

    if (!templateId || !placeholderValues) {
      return withCors({ statusCode: 400, body: JSON.stringify({ error: 'templateId and placeholderValues are required' }) }, origin);
    }

    // Resolve template from code registry
    const template = getTemplateById(templateId);
    if (!template) {
      return withCors({ statusCode: 404, body: JSON.stringify({ error: `Template '${templateId}' not found` }) }, origin);
    }

    const values = placeholderValues as Record<string, unknown>;

    // Render PDF
    const pdfBuffer = await renderLetterToPdf({
      header: template.header ? {
        companyName: template.header.companyName,
      } : undefined,
      footer: template.footer ? {
        companyName: template.footer.companyName,
        address: template.footer.address,
        phone: template.footer.phone,
        email: template.footer.email,
        website: template.footer.website,
      } : undefined,
      recipient: {
        name: (values.customerName as string) || 'Kunde',
        addressLine1: (values.addressLine1 as string) || 'Adresselinje 1',
        addressLine2: values.addressLine2 as string,
        postalCode: (values.postalCode as string) || '0000',
        city: (values.city as string) || 'By',
      },
      sections: mapTemplateSections(template.sections, values, template.constants),
    });

    // Upload to S3 with short TTL key
    const previewKey = `previews/${randomUUID()}.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: previewKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      // Auto-delete after 1 hour
      Expires: new Date(Date.now() + 60 * 60 * 1000),
    }));

    // Generate presigned URL valid for 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: previewKey,
    }), { expiresIn: 900 });

    logger.info('Preview generated', { templateId, size: pdfBuffer.length, previewKey });

    return withCors({
      statusCode: 200,
      body: JSON.stringify({ url: presignedUrl }),
    }, origin);
  } catch (error) {
    logger.error('Preview generation failed', error as Error);
    return withCors({
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate preview', message: (error as Error).message }),
    }, origin);
  }
};

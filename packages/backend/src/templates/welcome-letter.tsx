import { z } from 'zod';
import { BaseLetterInputSchema, type LetterTemplateDefinition, type PlaceholderField } from './base';

const InputSchema = BaseLetterInputSchema.extend({
  customerName: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  closingName: z.string().default('CloudLetters Team'),
});

const placeholders: PlaceholderField[] = [
  { key: 'customerName', label: 'Customer Name', type: 'text', required: true, description: 'Full name of the recipient' },
  { key: 'subject', label: 'Subject', type: 'text', required: true, description: 'Letter subject line' },
  { key: 'body', label: 'Body', type: 'text', required: true, description: 'Main letter content' },
  { key: 'closingName', label: 'Closing Name', type: 'text', required: false, description: 'Name in the sign-off' },
];

export const welcomeLetter: LetterTemplateDefinition = {
  id: 'welcome-letter',
  name: 'Welcome Letter',
  description: 'A general-purpose welcome letter for new customers',
  version: '1.0.0',
  inputSchema: InputSchema,
  placeholders,
  sections: [
    {
      id: 'greeting',
      type: 'heading',
      label: 'Greeting',
      blocks: [
        { type: 'heading', level: 'h1', text: (ctx) => `${ctx.subject}` },
        { type: 'spacing', spacing: 8 },
        { type: 'paragraph', text: (ctx) => `Dear ${ctx.customerName},` },
        { type: 'spacing', spacing: 6 },
      ],
    },
    {
      id: 'body',
      type: 'paragraph',
      label: 'Body',
      blocks: [
        { type: 'paragraph', text: (ctx) => `${ctx.body}` },
      ],
    },
    {
      id: 'closing',
      type: 'signature',
      label: 'Closing',
      blocks: [
        { type: 'spacing', spacing: 16 },
        { type: 'paragraph', text: 'Kind regards,' },
        { type: 'spacing', spacing: 4 },
        { type: 'paragraph', text: (ctx) => `${ctx.closingName}`, bold: true },
      ],
    },
  ],
  header: {
    companyName: 'CloudLetters',
    showDate: true,
  },
  footer: {
    companyName: 'CloudLetters',
    email: 'support@cloudletters.io',
    website: 'www.cloudletters.io',
    showPageNumbers: true,
  },
};

import { renderLetterToPdf } from './renderer';
import * as fs from 'fs';

async function main() {
  const buf = await renderLetterToPdf({
    header: { companyName: 'CloudLetters' },
    footer: { showPageNumbers: true },
    recipient: {
      name: 'John Smith',
      addressLine1: '123 Main Street',
      postalCode: '10001',
      city: 'New York',
    },
    sections: [
      {
        type: 'afsnit',
        blocks: [
          { type: 'heading', level: 'h1', text: 'Welcome to CloudLetters' },
          { type: 'paragraph', text: 'Dear John' },
          { type: 'spacing', spacing: 6 },
          { type: 'paragraph', text: 'Thank you for choosing CloudLetters. We are excited to help you generate professional PDF letters with dynamic templates.' },
          { type: 'paragraph', text: 'With CloudLetters you get access to a powerful template system with type-safe text functions, automatic page breaks, headers, footers, and more.' },
          { type: 'paragraph', text: 'Key features include:' },
          { type: 'bullet', items: [
            'Type-safe template text with (ctx) => string functions',
            'Automatic page breaks and layout',
            'Pluggable archive system',
            'Email/password authentication via Cognito',
            'Bearer token API access',
          ]},
          { type: 'heading', level: 'h2', text: 'Getting Started' },
          { type: 'paragraph', text: 'Check the README for quick start instructions.' },
          { type: 'spacing', spacing: 16 },
          { type: 'paragraph', text: 'Kind regards' },
          { type: 'spacing', spacing: 4 },
          { type: 'paragraph', text: 'CloudLetters Team' },
        ],
      },
    ],
  });

  fs.writeFileSync('test-cloudletters.pdf', buf);
  console.log('Generated test-cloudletters.pdf, size:', buf.length, 'bytes');
}
main().catch(e => { console.error(e); process.exit(1); });

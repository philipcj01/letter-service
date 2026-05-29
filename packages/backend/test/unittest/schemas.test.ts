import { CreateLetterRequestSchema } from '../../src/lambda/create-letter/schema';
import { SendLetterRequestSchema } from '../../src/lambda/send-letter/schema';
import { ArchiveLetterRequestSchema } from '../../src/lambda/archive-letter/schema';

describe('CreateLetterRequestSchema', () => {
  it('should validate a valid create letter request', () => {
    const validRequest = {
      customerId: 'cust-123',
      sections: [
        {
          type: 'afsnit' as const,
          blocks: [
            { type: 'heading' as const, level: 'h1' as const, text: 'Test Letter' },
            { type: 'paragraph' as const, text: 'This is a test paragraph.' },
          ],
        },
      ],
      metadata: {
        subject: 'Test Subject',
        category: 'general',
      },
    };

    const result = CreateLetterRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject request without customerId', () => {
    const invalidRequest = {
      sections: [{ type: 'afsnit', blocks: [] }],
    };

    const result = CreateLetterRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should validate request with table section', () => {
    const validRequest = {
      customerId: 'cust-456',
      sections: [
        {
          type: 'table' as const,
          columns: [
            { key: 'name', header: 'Name' },
            { key: 'amount', header: 'Amount', align: 'right' as const },
          ],
          data: [
            { name: 'Item 1', amount: 100 },
            { name: 'Item 2', amount: 200 },
          ],
          showHeader: true,
          striped: true,
        },
      ],
    };

    const result = CreateLetterRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should validate request with address section', () => {
    const validRequest = {
      customerId: 'cust-789',
      sections: [
        {
          type: 'address' as const,
          recipient: {
            name: 'John Doe',
            addressLine1: 'Street 123',
            postalCode: '2100',
            city: 'København Ø',
          },
        },
      ],
    };

    const result = CreateLetterRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });
});

describe('SendLetterRequestSchema', () => {
  it('should validate a valid send request', () => {
    const validRequest = {
      letterId: 'letter-123',
      channel: 'email' as const,
      recipient: {
        name: 'Test User',
        email: 'test@example.com',
      },
      subject: 'Your Letter',
    };

    const result = SendLetterRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidRequest = {
      letterId: 'letter-123',
      channel: 'email',
      recipient: {
        name: 'Test User',
        email: 'not-an-email',
      },
    };

    const result = SendLetterRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('ArchiveLetterRequestSchema', () => {
  it('should validate a valid archive request', () => {
    const validRequest = {
      letterId: 'letter-123',
      documentTypeName: 'Outgoing Letters',
      archiveReason: 'completed',
    };

    const result = ArchiveLetterRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject archive request without letterId', () => {
    const invalidRequest = {};

    const result = ArchiveLetterRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should apply default values', () => {
    const minimalRequest = {
      letterId: 'letter-123',
    };

    const result = ArchiveLetterRequestSchema.safeParse(minimalRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentTypeName).toBe('Outgoing Letters');
      expect(result.data.sourceSystem).toBe('CloudLetters');
    }
  });
});

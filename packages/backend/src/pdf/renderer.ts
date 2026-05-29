import React from 'react';
import { Document, Page, View, renderToBuffer } from '@react-pdf/renderer';
import { baseStyles, PAGE1_CONTENT_OFFSET } from './styles';
import { Header, HeaderProps } from './components/Header';
import { Footer, FooterProps } from './components/Footer';
import { AfsnitContentBlock, Afsnit } from './components/Afsnit';
import { DynamicTable, TableColumn } from './components/DynamicTable';
import { AddressBlock, RecipientAddress } from './components/AddressBlock';

export interface LetterSection {
  type: 'afsnit' | 'table' | 'address' | 'spacing';
  blocks?: AfsnitContentBlock[];
  columns?: TableColumn[];
  data?: Record<string, string | number | boolean | null | undefined>[];
  showHeader?: boolean;
  striped?: boolean;
  recipient?: RecipientAddress;
  spacing?: number;
}

export interface LetterDefinition {
  header?: HeaderProps;
  footer?: FooterProps;
  recipient: RecipientAddress;
  sections: LetterSection[];
  pageSize?: 'A4' | 'LETTER';
}

export async function renderLetterToPdf(definition: LetterDefinition): Promise<Buffer> {
  const { header, footer, recipient, sections, pageSize = 'A4' } = definition;

  const sectionElements = sections.map((section, index) => {
    switch (section.type) {
      case 'afsnit':
        return React.createElement(Afsnit, { key: index, blocks: section.blocks || [] });
      case 'table':
        return React.createElement(DynamicTable, {
          key: index,
          columns: section.columns || [],
          data: section.data || [],
          showHeader: section.showHeader,
          striped: section.striped,
        });
      case 'spacing':
        return React.createElement(View, {
          key: index,
          style: { height: section.spacing || 20 },
        });
      default:
        return null;
    }
  });

  const pageContent = React.createElement(
    Page,
    { size: pageSize, style: baseStyles.page },
    // Fixed header on all pages (logo + date)
    header && React.createElement(Header, header),
    // Address block positioned for envelope window (absolute, first page only)
    React.createElement(AddressBlock, { recipient }),
    // Spacer to push body content below address area on page 1
    React.createElement(View, { style: { height: PAGE1_CONTENT_OFFSET } }),
    // Letter body content
    React.createElement(
      View,
      null,
      ...sectionElements.filter(Boolean)
    ),
    // Footer
    footer && React.createElement(Footer, footer)
  );

  const doc = React.createElement(Document, null, pageContent);

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

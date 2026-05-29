import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import { baseStyles } from '../styles';
import { Header, HeaderProps } from '../components/Header';
import { Footer, FooterProps } from '../components/Footer';
import { Afsnit, AfsnitContentBlock } from '../components/Afsnit';
import { AddressBlock, RecipientAddress } from '../components/AddressBlock';
import { DynamicTable, TableColumn } from '../components/DynamicTable';

export interface StandardLetterProps {
  header: HeaderProps;
  footer: FooterProps;
  recipient: RecipientAddress;
  subject: string;
  body: AfsnitContentBlock[];
  table?: {
    columns: TableColumn[];
    data: Record<string, string | number | boolean | null | undefined>[];
  };
}

export const StandardLetterTemplate: React.FC<StandardLetterProps> = ({
  header,
  footer,
  recipient,
  subject,
  body,
  table,
}) => {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: baseStyles.page },
      React.createElement(Header, header),
      React.createElement(AddressBlock, { recipient }),
      React.createElement(Afsnit, {
        blocks: [{ type: 'heading', level: 'h2', text: subject }, ...body],
      }),
      table &&
        React.createElement(DynamicTable, {
          columns: table.columns,
          data: table.data,
          showHeader: true,
          striped: true,
        }),
      React.createElement(Footer, footer)
    )
  );
};

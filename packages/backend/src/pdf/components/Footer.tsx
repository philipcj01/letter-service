import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { layoutStyles } from '../styles';

export interface FooterProps {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  cvr?: string;
  showPageNumbers?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  companyName = 'CloudLetters',
  address,
  phone,
  email = 'support@cloudletters.io',
  website = 'www.cloudletters.io',
  cvr,
  showPageNumbers = true,
}) => {
  const line1 = [companyName, address].filter(Boolean).join(' / ');
  const line2Parts = [
    phone ? `Telefon: ${phone}` : null,
    email,
    website,
    cvr ? `CVR-nr. ${cvr}` : null,
  ].filter(Boolean);
  const line2 = line2Parts.join(' / ');

  return React.createElement(
    View,
    { style: layoutStyles.footer, fixed: true },
    React.createElement(
      View,
      { style: { flex: 1 } },
      React.createElement(Text, { style: { fontSize: 8, color: '#333333' } }, line1),
      React.createElement(Text, { style: { fontSize: 8, color: '#333333' } }, line2)
    ),
    showPageNumbers &&
      React.createElement(
        Text,
        {
          style: layoutStyles.pageNumber,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `Side ${pageNumber} af ${totalPages}`,
        }
      )
  );
};

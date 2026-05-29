import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { layoutStyles } from '../styles';
import { CLOUD_LOGO_BASE64 } from '../assets/logo';
import { formatDate } from '../../lib/date-utils';

export interface HeaderProps {
  companyName?: string;
  logoUrl?: string;
  date?: string;
  referenceNumber?: string;
  referenceLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({ date }) => {
  const displayDate = date || formatDate(new Date());

  return React.createElement(
    React.Fragment,
    null,
    // Header row: logo left, date right
    React.createElement(
      View,
      { style: layoutStyles.header, fixed: true },
      CLOUD_LOGO_BASE64
        ? React.createElement(Image, {
            src: CLOUD_LOGO_BASE64,
            style: { width: 80, height: 'auto' },
          })
        : React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#000000' } }, 'CloudLetters'),
      React.createElement(Text, { style: layoutStyles.headerDate }, displayDate)
    ),
    // Separator line
    React.createElement(View, { style: layoutStyles.separator, fixed: true })
  );
};


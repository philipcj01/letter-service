import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { baseStyles } from '../styles';

export interface ParagraphProps {
  children: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export const Paragraph: React.FC<ParagraphProps> = ({ children, bold, italic, align = 'left' }) => {
  const style = {
    ...baseStyles.paragraph,
    ...(bold ? baseStyles.bold : {}),
    ...(italic ? baseStyles.italic : {}),
    textAlign: align as 'left' | 'center' | 'right' | 'justify',
  };

  return React.createElement(Text, { style }, children);
};

export interface SectionProps {
  children: React.ReactNode;
  marginBottom?: number;
}

export const Section: React.FC<SectionProps> = ({ children, marginBottom = 16 }) => {
  return React.createElement(View, { style: { marginBottom } }, children);
};

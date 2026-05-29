import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { Heading, HeadingLevel } from './Heading';
import { Paragraph } from './Paragraph';
import { baseStyles } from '../styles';

export interface AfsnitContentBlock {
  type: 'heading' | 'paragraph' | 'spacing' | 'bullet';
  level?: HeadingLevel;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
  spacing?: number;
  items?: string[];
}

export interface AfsnitProps {
  blocks: AfsnitContentBlock[];
}

/**
 * Afsnit - Dynamic section component for composing letter content.
 * Renders a sequence of headings, paragraphs, bullet lists, and spacing blocks.
 */
export const Afsnit: React.FC<AfsnitProps> = ({ blocks }) => {
  return React.createElement(
    View,
    { style: { marginBottom: 8 } },
    ...blocks.map((block: AfsnitContentBlock, index: number) => {
      switch (block.type) {
        case 'heading':
          return React.createElement(Heading, { key: index, level: block.level || 'h2', children: block.text || '' });
        case 'paragraph':
          return React.createElement(
            Paragraph,
            { key: index, bold: block.bold, italic: block.italic, align: block.align, children: block.text || '' }
          );
        case 'bullet':
          return React.createElement(
            View,
            { key: index, style: { marginBottom: 6 } },
            ...(block.items || []).map((item: string, i: number) =>
              React.createElement(
                View,
                { key: i, style: { flexDirection: 'row' as const, paddingLeft: 10, marginBottom: 2 } },
                React.createElement(Text, { style: { fontSize: 10, width: 12 } }, '•'),
                React.createElement(Text, { style: baseStyles.bulletItem }, item)
              )
            )
          );
        case 'spacing':
          return React.createElement(View, { key: index, style: { height: block.spacing || 12 } });
        default:
          return React.createElement(Text, { key: index }, '');
      }
    })
  );
};

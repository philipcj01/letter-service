import React from 'react';
import { Text } from '@react-pdf/renderer';
import { baseStyles } from '../styles';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

export interface HeadingProps {
  level: HeadingLevel;
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({ level, children }) => {
  const style = baseStyles[level];
  return React.createElement(Text, { style }, children);
};

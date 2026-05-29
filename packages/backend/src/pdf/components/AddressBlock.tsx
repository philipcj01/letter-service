import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { layoutStyles } from '../styles';

export interface RecipientAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country?: string;
}

export interface AddressBlockProps {
  recipient: RecipientAddress;
}

export const AddressBlock: React.FC<AddressBlockProps> = ({ recipient }) => {
  return React.createElement(
    View,
    { style: layoutStyles.addressBlock },
    React.createElement(Text, { style: { fontSize: 10 } }, recipient.name),
    React.createElement(Text, { style: { fontSize: 10 } }, recipient.addressLine1),
    recipient.addressLine2 ? React.createElement(Text, { style: { fontSize: 10 } }, recipient.addressLine2) : null,
    React.createElement(Text, { style: { fontSize: 10 } }, `${recipient.postalCode} ${recipient.city}`),
    recipient.country ? React.createElement(Text, { style: { fontSize: 10 } }, recipient.country) : null
  );
};

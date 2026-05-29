import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { tableStyles } from '../styles';

export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface DynamicTableProps {
  columns: TableColumn[];
  data: Record<string, string | number | boolean | null | undefined>[];
  showHeader?: boolean;
  striped?: boolean;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
  columns,
  data,
  showHeader = true,
  striped = false,
}) => {
  const renderHeaderRow = () => {
    return React.createElement(
      View,
      { style: tableStyles.tableHeaderRow },
      columns.map((col) =>
        React.createElement(
          Text,
          {
            key: col.key,
            style: [
              tableStyles.tableHeaderCell,
              col.width ? { flex: undefined, width: col.width } : {},
              col.align ? { textAlign: col.align } : {},
            ],
          },
          col.header
        )
      )
    );
  };

  const renderRow = (row: Record<string, string | number | boolean | null | undefined>, index: number) => {
    const rowStyle = [
      tableStyles.tableRow,
      striped && index % 2 === 1 ? { backgroundColor: '#fafafa' } : {},
    ];

    return React.createElement(
      View,
      { key: index, style: rowStyle },
      columns.map((col) =>
        React.createElement(
          Text,
          {
            key: col.key,
            style: [
              tableStyles.tableCell,
              col.width ? { flex: undefined, width: col.width } : {},
              col.align ? { textAlign: col.align } : {},
            ],
          },
          String(row[col.key] ?? '')
        )
      )
    );
  };

  return React.createElement(
    View,
    { style: tableStyles.table },
    showHeader && renderHeaderRow(),
    data.map((row, index) => renderRow(row, index))
  );
};

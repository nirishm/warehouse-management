import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  table: {
    width: '100%',
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  cell: {
    fontSize: 9,
    color: '#111827',
  },
  cellRight: {
    fontSize: 9,
    color: '#111827',
    textAlign: 'right',
  },
});

export interface Column {
  label: string;
  width: string | number;
  align?: 'left' | 'right';
}

interface PdfTableProps {
  columns: Column[];
  rows: (string | number)[][];
}

export function PdfTable({ columns, rows }: PdfTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <Text
            key={col.label}
            style={[styles.headerCell, { width: col.width }]}
          >
            {col.label}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => (
            <Text
              key={ci}
              style={[
                columns[ci]?.align === 'right' ? styles.cellRight : styles.cell,
                { width: columns[ci]?.width ?? 'auto' },
              ]}
            >
              {String(cell ?? '')}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

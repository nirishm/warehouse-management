import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Letterhead, Footer } from './shared/letterhead';
import { PdfTable } from './shared/pdf-table';
import type { DocumentConfig } from '../validations/config';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
  },
  section: {
    marginTop: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    color: '#111827',
  },
  notes: {
    marginTop: 12,
    fontSize: 9,
    color: '#6b7280',
  },
  total: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827',
    minWidth: 80,
    textAlign: 'right',
  },
});

interface PurchaseItem {
  commodity: { name: string; code: string } | null;
  unit: { name: string; abbreviation: string } | null;
  quantity: number;
  unit_price?: number | null;
  bags?: number | null;
}

interface GRNData {
  purchase_number: string;
  purchase_date: string;
  status: string;
  notes?: string | null;
  location: { name: string } | null;
  contact: { name: string } | null;
  purchase_items: PurchaseItem[];
}

interface Props {
  data: GRNData;
  config: DocumentConfig;
}

export function GRNDocument({ data, config }: Props) {
  const date = new Date(data.purchase_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rows = data.purchase_items.map((item) => [
    item.commodity?.name ?? '',
    item.commodity?.code ?? '',
    item.quantity,
    item.unit?.abbreviation ?? '',
    item.bags ?? '-',
    item.unit_price != null ? `₹${Number(item.unit_price).toFixed(2)}` : '-',
    item.unit_price != null
      ? `₹${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}`
      : '-',
  ]);

  const total = data.purchase_items.reduce(
    (sum, i) => sum + (i.unit_price != null ? Number(i.unit_price) * Number(i.quantity) : 0),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead
          config={config}
          docTitle="Goods Receipt Note"
          docNumber={data.purchase_number}
          docDate={date}
        />

        <View style={styles.section}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Received At</Text>
              <Text style={styles.metaValue}>{data.location?.name ?? '-'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Supplier</Text>
              <Text style={styles.metaValue}>{data.contact?.name ?? '-'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{data.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <PdfTable
          columns={[
            { label: 'Commodity', width: '22%' },
            { label: 'Code', width: '12%' },
            { label: 'Qty', width: '8%', align: 'right' },
            { label: 'Unit', width: '8%' },
            { label: 'Bags', width: '8%', align: 'right' },
            { label: 'Unit Price', width: '14%', align: 'right' },
            { label: 'Amount', width: '14%', align: 'right' },
          ]}
          rows={rows}
        />

        {total > 0 && (
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        )}

        {data.notes && (
          <Text style={styles.notes}>Notes: {data.notes}</Text>
        )}

        <Footer config={config} />
      </Page>
    </Document>
  );
}

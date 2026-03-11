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
  commodity: { name: string; code: string; hsn_code?: string | null; tax_rate?: number | null } | null;
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

  const rows = data.purchase_items.map((item) => {
    const amount = item.unit_price != null ? Number(item.unit_price) * Number(item.quantity) : 0;
    const taxRate = item.commodity?.tax_rate ?? 0;
    const taxAmount = amount * (taxRate / 100);
    return [
      item.commodity?.name ?? '',
      item.commodity?.hsn_code ?? '-',
      item.quantity,
      item.unit?.abbreviation ?? '',
      item.bags ?? '-',
      item.unit_price != null ? `₹${Number(item.unit_price).toFixed(2)}` : '-',
      item.unit_price != null ? `₹${amount.toFixed(2)}` : '-',
      taxRate > 0 ? `${taxRate}%` : '-',
      taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : '-',
    ];
  });

  const subtotal = data.purchase_items.reduce(
    (sum, i) => sum + (i.unit_price != null ? Number(i.unit_price) * Number(i.quantity) : 0),
    0
  );

  const totalTax = data.purchase_items.reduce((sum, i) => {
    const amount = i.unit_price != null ? Number(i.unit_price) * Number(i.quantity) : 0;
    return sum + amount * ((i.commodity?.tax_rate ?? 0) / 100);
  }, 0);

  const grandTotal = subtotal + totalTax;

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
            { label: 'Item', width: '18%' },
            { label: 'HSN', width: '8%' },
            { label: 'Qty', width: '7%', align: 'right' },
            { label: 'Unit', width: '6%' },
            { label: 'Bags', width: '6%', align: 'right' },
            { label: 'Rate', width: '12%', align: 'right' },
            { label: 'Amount', width: '13%', align: 'right' },
            { label: 'GST', width: '6%', align: 'right' },
            { label: 'Tax', width: '10%', align: 'right' },
          ]}
          rows={rows}
        />

        {subtotal > 0 && (
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            {totalTax > 0 && (
              <View style={styles.total}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>₹{totalTax.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
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

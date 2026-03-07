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
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 6,
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    backgroundColor: '#fef3c7',
    marginTop: 12,
  },
  statusText: {
    fontSize: 9,
    color: '#92400e',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  notes: {
    marginTop: 12,
    fontSize: 9,
    color: '#6b7280',
  },
});

interface DispatchItem {
  commodity: { name: string; code: string } | null;
  unit: { name: string; abbreviation: string } | null;
  requested_quantity: number;
  sent_quantity: number | null;
  received_quantity: number | null;
  bags?: number | null;
  notes?: string | null;
}

interface DispatchChallanData {
  dispatch_number: string;
  status: string;
  created_at: string;
  notes?: string | null;
  origin_location: { name: string } | null;
  dest_location: { name: string } | null;
  dispatch_items: DispatchItem[];
}

interface Props {
  data: DispatchChallanData;
  config: DocumentConfig;
}

export function DispatchChallanDocument({ data, config }: Props) {
  const date = new Date(data.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rows = data.dispatch_items.map((item) => [
    item.commodity?.name ?? '',
    item.commodity?.code ?? '',
    item.requested_quantity,
    item.sent_quantity ?? '-',
    item.received_quantity ?? '-',
    item.bags ?? '-',
    item.unit?.abbreviation ?? '',
  ]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead
          config={config}
          docTitle="Dispatch Challan"
          docNumber={data.dispatch_number}
          docDate={date}
        />

        <View style={styles.section}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>From</Text>
              <Text style={styles.metaValue}>{data.origin_location?.name ?? '-'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>To</Text>
              <Text style={styles.metaValue}>{data.dest_location?.name ?? '-'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{data.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <PdfTable
          columns={[
            { label: 'Commodity', width: '25%' },
            { label: 'Code', width: '12%' },
            { label: 'Requested', width: '12%', align: 'right' },
            { label: 'Dispatched', width: '12%', align: 'right' },
            { label: 'Received', width: '12%', align: 'right' },
            { label: 'Bags', width: '10%', align: 'right' },
            { label: 'Unit', width: '10%' },
          ]}
          rows={rows}
        />

        {data.notes && (
          <Text style={styles.notes}>Notes: {data.notes}</Text>
        )}

        <Footer config={config} />
      </Page>
    </Document>
  );
}

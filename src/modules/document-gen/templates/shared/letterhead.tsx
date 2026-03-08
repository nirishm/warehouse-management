import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { DocumentConfig } from '../../validations/config';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  companyDetails: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 1.4,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'right',
  },
  docMeta: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

interface LetterheadProps {
  config: DocumentConfig;
  docTitle: string;
  docNumber: string;
  docDate: string;
}

export function Letterhead({ config, docTitle, docNumber, docDate }: LetterheadProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.companyName}>{config.company_name || 'Company Name'}</Text>
        {config.company_address && (
          <Text style={styles.companyDetails}>{config.company_address}</Text>
        )}
        {config.company_phone && (
          <Text style={styles.companyDetails}>Tel: {config.company_phone}</Text>
        )}
        {config.company_email && (
          <Text style={styles.companyDetails}>{config.company_email}</Text>
        )}
        {config.company_gstin && (
          <Text style={styles.companyDetails}>GSTIN: {config.company_gstin}</Text>
        )}
      </View>
      <View>
        <Text style={styles.docTitle}>{docTitle}</Text>
        <Text style={styles.docMeta}>#{docNumber}</Text>
        <Text style={styles.docMeta}>{docDate}</Text>
      </View>
    </View>
  );
}

export function Footer({ config }: { config: DocumentConfig }) {
  if (!config.footer_text) return null;
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{config.footer_text}</Text>
    </View>
  );
}

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import type { QuoteTemplateData } from '@/components/finance/quote-templates/GermanStandardQuoteTemplate';

interface TemplateProps {
  data: QuoteTemplateData;
}

// Styles für React-PDF (identisch zum HTML-Template)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  
  // Header Section
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 60,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 64,
    height: 60,
    border: '2px dashed #D1D5DB',
    borderRadius: 4,
    backgroundColor: '#F9FAFB',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  
  // Company + Quote Info Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  companyText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },
  
  quoteInfo: {
    alignItems: 'flex-end',
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14AD9F',
    marginBottom: 12,
  },
  quoteDetail: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 4,
  },
  
  // Customer Section
  customerSection: {
    marginBottom: 24,
  },
  customerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  customerBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    border: '1px solid #E5E7EB',
  },
  customerName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  customerText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 2,
  },
  
  // Head Text
  headText: {
    marginBottom: 24,
    fontSize: 10,
    color: '#1F2937',
  },
  
  // Table
  table: {
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#14AD9F',
    padding: 12,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #E5E7EB',
    padding: 8,
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  tableCellBold: {
    fontSize: 9,
    color: '#374151',
    fontWeight: 'bold',
  },
  tableCellRed: {
    fontSize: 9,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  
  // Column widths
  descriptionCol: { flex: 1 },
  quantityCol: { width: 60, textAlign: 'center' },
  priceCol: { width: 80, textAlign: 'right' },
  totalCol: { width: 100, textAlign: 'right' },
  
  // Summary Section
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  notesSection: {
    width: 280,
  },
  notesText: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 8,
  },
  
  totalsSection: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #E5E7EB',
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderBottom: '2px solid #14AD9F',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#14AD9F',
  },
  
  // Footer
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTop: '1px solid #D1D5DB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
});

/**
 * React-PDF Version des GermanStandardQuoteTemplate
 * Identisches Design und Layout wie das HTML-Template
 */
export const GermanStandardQuotePDF: React.FC<TemplateProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    const code = data.currency || 'EUR';
    try {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: code }).format(
        Number.isFinite(amount) ? amount : 0
      );
    } catch {
      const val = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
      return `${val} ${code}`;
    }
  };

  // Platzhalter ersetzen für Footer-Text
  const replacePlaceholders = (input: string): string => {
    const map: Record<string, string> = {
      KONTAKTPERSON: data.contactPersonName || '',
      FIRMENNAME: data.companyName || '',
      KUNDENNAME: data.customerName || '',
      ANGEBOTSNUMMER: data.quoteNumber || '',
      DATUM: data.date || '',
      GUELTIG_BIS: data.validUntil || '',
      WAEHRUNG: data.currency || '',
      SUMME: formatCurrency(data.total || 0),
    };
    return (input || '').replace(/\[%([A-Z_]+)%\]/g, (_, key: string) => map[key] ?? '');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {data.companyLogo || data.profilePictureURL ? (
            <Image 
              src={data.companyLogo || data.profilePictureURL || ''} 
              style={styles.logo}
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={{ fontSize: 8, color: '#6B7280', fontWeight: 'bold' }}>Logo</Text>
              <Text style={{ fontSize: 7, color: '#9CA3AF', marginTop: 4 }}>
                {data.companyName}
              </Text>
            </View>
          )}
        </View>

        {/* Header Row: Company Info + Quote Info */}
        <View style={styles.headerRow}>
          {/* Company Info */}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.companyName}</Text>
            <Text style={styles.companyText}>{data.companyAddress}</Text>
            {data.companyPhone && (
              <Text style={styles.companyText}>Tel: {data.companyPhone}</Text>
            )}
            {data.companyEmail && (
              <Text style={styles.companyText}>E-Mail: {data.companyEmail}</Text>
            )}
            {data.companyWebsite && (
              <Text style={styles.companyText}>Web: {data.companyWebsite}</Text>
            )}
            {data.contactPersonName && (
              <Text style={styles.companyText}>
                Ansprechpartner: {data.contactPersonName}
              </Text>
            )}
          </View>

          {/* Quote Info */}
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteTitle}>ANGEBOT</Text>
            <Text style={styles.quoteDetail}>
              <Text style={{ fontWeight: 'bold' }}>Angebotsnr.:</Text> {data.quoteNumber}
            </Text>
            <Text style={styles.quoteDetail}>
              <Text style={{ fontWeight: 'bold' }}>Datum:</Text> {data.date}
            </Text>
            <Text style={styles.quoteDetail}>
              <Text style={{ fontWeight: 'bold' }}>Gültig bis:</Text> {data.validUntil}
            </Text>
            {data.title && (
              <Text style={styles.quoteDetail}>
                <Text style={{ fontWeight: 'bold' }}>Titel:</Text> {data.title}
              </Text>
            )}
            {data.reference && (
              <Text style={styles.quoteDetail}>
                <Text style={{ fontWeight: 'bold' }}>Referenz:</Text> {data.reference}
              </Text>
            )}
          </View>
        </View>

        {/* Customer */}
        <View style={styles.customerSection}>
          <Text style={styles.customerLabel}>Kunde:</Text>
          <View style={styles.customerBox}>
            <Text style={styles.customerName}>{data.customerName}</Text>
            {data.customerAddress && (
              <Text style={styles.customerText}>{data.customerAddress}</Text>
            )}
            {data.customerEmail && (
              <Text style={styles.customerText}>E-Mail: {data.customerEmail}</Text>
            )}
          </View>
        </View>

        {/* Head Text (vereinfacht, da React-PDF kein HTML parst) */}
        {data.headTextHtml && (
          <View style={styles.headText}>
            <Text>{data.headTextHtml.replace(/<[^>]*>/g, '')}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.descriptionCol]}>Beschreibung</Text>
            <Text style={[styles.tableHeaderText, styles.quantityCol]}>Menge</Text>
            <Text style={[styles.tableHeaderText, styles.priceCol]}>Einzelpreis</Text>
            <Text style={[styles.tableHeaderText, styles.totalCol]}>Gesamtpreis</Text>
          </View>

          {/* Table Rows */}
          {data.items.map((item, index) => {
            const isDiscount = (item as any).category === 'discount';
            const sign = isDiscount ? -1 : 1;
            const unit = (item.unitPrice || 0) * sign;
            const total = (item.total || 0) * sign;
            
            return (
              <View key={item.id ?? index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.descriptionCol]}>
                  {item.description}
                </Text>
                <Text style={[styles.tableCell, styles.quantityCol]}>
                  {item.quantity}
                </Text>
                <Text style={[
                  isDiscount ? styles.tableCellRed : styles.tableCell, 
                  styles.priceCol
                ]}>
                  {formatCurrency(unit)}
                </Text>
                <Text style={[
                  isDiscount ? styles.tableCellRed : styles.tableCellBold, 
                  styles.totalCol
                ]}>
                  {formatCurrency(total)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          {/* Notes */}
          <View style={styles.notesSection}>
            {(data as any).taxRuleLabel && (
              <Text style={styles.notesText}>
                USt.-Regelung: {(data as any).taxRuleLabel}
              </Text>
            )}
            <Text style={styles.notesText}>
              Dieses Angebot ist gültig bis {data.validUntil}.
            </Text>
            {data.notes && (
              <Text style={styles.notesText}>{data.notes}</Text>
            )}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Nettobetrag:</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
            </View>
            
            {!data.isSmallBusiness && data.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  MwSt.{data.vatRate ? ` (${data.vatRate}%)` : ''}:
                </Text>
                <Text style={styles.totalValue}>{formatCurrency(data.tax)}</Text>
              </View>
            )}
            
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Gesamtbetrag:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer Text */}
        {data.footerText && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.notesText}>
              {replacePlaceholders(data.footerText).replace(/<[^>]*>/g, '')}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dieses Angebot wurde automatisch erstellt.
          </Text>
          <Text style={styles.footerText}>
            {data.companyVatId && `USt-IdNr.: ${data.companyVatId} · `}
            {data.companyTaxNumber && `Steuernr.: ${data.companyTaxNumber}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default GermanStandardQuotePDF;
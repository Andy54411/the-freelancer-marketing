import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Invoice-spezifische Typdefinition
type InvoiceTemplateData = {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  title?: string;
  reference?: string;
  currency?: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyLogo?: string;
  profilePictureURL?: string;
  companyVatId?: string;
  companyTaxNumber?: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
    category?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  vatRate?: number;
  isSmallBusiness?: boolean;
  bankDetails?: {
    iban?: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
  };
  notes?: string;
  headTextHtml?: string;
  footerText?: string;
  contactPersonName?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
};

interface TemplateProps {
  data: InvoiceTemplateData;
}

// Styles für React-PDF (optimiert für Rechnungen)
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

  // Company + Invoice Info Header
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
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 9,
    color: '#6B7280',
    lineHeight: 1.3,
  },

  // Invoice Info Box
  invoiceInfo: {
    width: 200,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: 16,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
  },
  invoiceField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  invoiceLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
  },
  invoiceValue: {
    fontSize: 9,
    color: '#1F2937',
    fontWeight: 'bold',
  },

  // Customer Section
  customerSection: {
    marginBottom: 24,
  },
  customerLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  customerInfo: {
    backgroundColor: '#F9FAFB',
    borderLeft: '4px solid #1E40AF',
    padding: 12,
  },
  customerName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 9,
    color: '#4B5563',
    lineHeight: 1.3,
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
    backgroundColor: '#1E40AF',
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
    justifyContent: 'flex-end',
    marginBottom: 32,
  },
  summaryBox: {
    width: 250,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: 16,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 10,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '2px solid #1E40AF',
    paddingTop: 8,
    marginTop: 8,
  },
  summaryTotalLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: 'bold',
  },

  // Footer Section
  footerSection: {
    marginTop: 32,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 24,
  },
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  footerColumn: {
    width: '30%',
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#6B7280',
    lineHeight: 1.3,
  },

  // Payment Terms and Notes
  paymentSection: {
    backgroundColor: '#FEF3C7',
    border: '1px solid #F59E0B',
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 9,
    color: '#78350F',
  },

  // Legal notices
  legalNotice: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
});

// Hilfsfunktionen
const formatDateDE = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE');
  } catch {
    return dateStr;
  }
};

const formatCurrencyDE = (amount: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
};

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

export const GermanStandardInvoicePDF: React.FC<TemplateProps> = ({ data }) => {
  const {
    invoiceNumber,
    date,
    dueDate,
    title,
    reference,
    currency = 'EUR',
    customerName,
    customerAddress,
    customerEmail,
    companyName,
    companyAddress,
    companyEmail,
    companyPhone,
    companyWebsite,
    companyLogo,
    profilePictureURL,
    companyVatId,
    companyTaxNumber,
    items,
    subtotal,
    tax,
    total,
    vatRate,
    isSmallBusiness,
    bankDetails,
    notes,
    headTextHtml,
    footerText,
    contactPersonName,
    paymentTerms,
    deliveryTerms,
  } = data;

  const logoUrl = companyLogo || profilePictureURL;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Logo */}
        {logoUrl && (
          <View style={styles.logoContainer}>
            <Image src={logoUrl} style={styles.logo} />
          </View>
        )}

        {/* Header: Company Info + Invoice Info */}
        <View style={styles.headerRow}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyName || 'Ihr Unternehmen'}</Text>
            <View style={styles.companyDetails}>
              {companyAddress && <Text>{companyAddress}</Text>}
              {companyEmail && <Text>E-Mail: {companyEmail}</Text>}
              {companyPhone && <Text>Telefon: {companyPhone}</Text>}
              {companyWebsite && <Text>Web: {companyWebsite}</Text>}
            </View>
          </View>

          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>RECHNUNG</Text>
            <View style={styles.invoiceField}>
              <Text style={styles.invoiceLabel}>Rechnungsnummer:</Text>
              <Text style={styles.invoiceValue}>{invoiceNumber}</Text>
            </View>
            <View style={styles.invoiceField}>
              <Text style={styles.invoiceLabel}>Rechnungsdatum:</Text>
              <Text style={styles.invoiceValue}>{formatDateDE(date)}</Text>
            </View>
            {dueDate && (
              <View style={styles.invoiceField}>
                <Text style={styles.invoiceLabel}>Fälligkeitsdatum:</Text>
                <Text style={styles.invoiceValue}>{formatDateDE(dueDate)}</Text>
              </View>
            )}
            {reference && (
              <View style={styles.invoiceField}>
                <Text style={styles.invoiceLabel}>Referenz:</Text>
                <Text style={styles.invoiceValue}>{reference}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerSection}>
          <Text style={styles.customerLabel}>Rechnungsempfänger</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            {customerAddress && <Text style={styles.customerAddress}>{customerAddress}</Text>}
            {customerEmail && <Text style={styles.customerAddress}>E-Mail: {customerEmail}</Text>}
          </View>
        </View>

        {/* Head Text */}
        {headTextHtml && (
          <View style={styles.headText}>
            <Text>{stripHtml(headTextHtml)}</Text>
          </View>
        )}

        {/* Title */}
        {title && (
          <View style={styles.headText}>
            <Text style={{ fontWeight: 'bold', fontSize: 11 }}>{title}</Text>
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
          {items.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.descriptionCol]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.quantityCol]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.priceCol]}>
                {formatCurrencyDE(item.unitPrice, currency)}
              </Text>
              <Text style={[styles.tableCellBold, styles.totalCol]}>
                {formatCurrencyDE(item.total, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Zwischensumme:</Text>
              <Text style={styles.summaryValue}>{formatCurrencyDE(subtotal, currency)}</Text>
            </View>

            {!isSmallBusiness && vatRate && vatRate > 0 && (
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Umsatzsteuer ({vatRate}%):</Text>
                <Text style={styles.summaryValue}>{formatCurrencyDE(tax, currency)}</Text>
              </View>
            )}

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Gesamtbetrag:</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrencyDE(total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Terms */}
        {paymentTerms && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Zahlungsbedingungen</Text>
            <Text style={styles.paymentText}>{paymentTerms}</Text>
          </View>
        )}

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.footerGrid}>
            {/* Bank Details */}
            {bankDetails && (
              <View style={styles.footerColumn}>
                <Text style={styles.footerTitle}>Bankverbindung</Text>
                <View style={styles.footerText}>
                  {bankDetails.iban && <Text>IBAN: {bankDetails.iban}</Text>}
                  {bankDetails.bic && <Text>BIC: {bankDetails.bic}</Text>}
                  {bankDetails.accountHolder && <Text>Inhaber: {bankDetails.accountHolder}</Text>}
                  {bankDetails.bankName && <Text>Bank: {bankDetails.bankName}</Text>}
                </View>
              </View>
            )}

            {/* Tax Information */}
            <View style={styles.footerColumn}>
              <Text style={styles.footerTitle}>Steuerdaten</Text>
              <View style={styles.footerText}>
                {companyVatId && <Text>USt-IdNr.: {companyVatId}</Text>}
                {companyTaxNumber && <Text>Steuernr.: {companyTaxNumber}</Text>}
              </View>
            </View>

            {/* Contact Person */}
            {contactPersonName && (
              <View style={styles.footerColumn}>
                <Text style={styles.footerTitle}>Ansprechpartner</Text>
                <Text style={styles.footerText}>{contactPersonName}</Text>
              </View>
            )}
          </View>

          {/* Legal Notices */}
          {isSmallBusiness && (
            <Text style={styles.legalNotice}>
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
            </Text>
          )}

          {/* Footer Text */}
          {footerText && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.footerText}>{stripHtml(footerText)}</Text>
            </View>
          )}

          {/* Notes */}
          {notes && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.footerTitle}>Anmerkungen</Text>
              <Text style={styles.footerText}>{notes}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default GermanStandardInvoicePDF;

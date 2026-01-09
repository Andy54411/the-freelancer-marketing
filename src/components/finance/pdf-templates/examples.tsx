/**
 * Beispiel für die Verwendung der neuen modularen PDF-Template-Struktur
 *
 * Diese Datei zeigt, wie die Templates nach der Refactoring verwendet werden.
 */

import React from 'react';
import PDFTemplate from '@/components/finance/PDFTemplates';
import {
  StandardTemplate,
  TotalsDisplay,
  usePDFTemplateData,
  type ProcessedPDFData,
} from '@/components/finance/pdf-templates';

// === GRUNDLEGENDE VERWENDUNG ===

const BasicUsageExample: React.FC = () => {
  const sampleInvoiceData = {
    invoiceNumber: 'RE-MOCK-001',
    companyName: 'Meine Firma GmbH',
    customerName: 'Max Mustermann',
    items: [
      {
        description: 'Beratungsleistung',
        quantity: 5,
        unitPrice: 100,
        total: 500,
      },
    ],

    // ... weitere Felder
  };

  return (
    <PDFTemplate
      document={sampleInvoiceData}
      template="TEMPLATE_ELEGANT"
      color="#14ad9f"
      logoUrl="https://example.com/logo.png"
      logoSize={60}
      documentType="invoice"
    />
  );
};

// === ERWEITERTE VERWENDUNG MIT HOOK ===

const AdvancedUsageExample: React.FC<{ document: any }> = ({ document }) => {
  // Verwende den Hook direkt für Custom Logic
  const data = usePDFTemplateData({
    document,
    template: 'TEMPLATE_STANDARD',
    color: '#14ad9f',
    logoSize: 50,
    documentType: 'invoice',
  });

  // Zugriff auf alle berechneten Werte

  return (
    <div className="custom-pdf-wrapper">
      <StandardTemplate data={data} color="#14ad9f" logoSize={50} />
    </div>
  );
};

// === EIGENE TEMPLATE-KOMPONENTE ERSTELLEN ===

interface CustomTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
}

const MyCustomTemplate: React.FC<CustomTemplateProps> = ({ data, color, logoSize }) => {
  return (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6">
      {/* Custom Header */}
      <header className="mb-8 border-b-2" style={{ borderColor: color }}>
        <h1 className="text-3xl font-bold" style={{ color }}>
          {data.documentLabel} - {data.invoiceNumber}
        </h1>
        {data.companyLogo && (
          <img src={data.companyLogo} alt="Logo" style={{ height: `${logoSize}px` }} />
        )}
      </header>

      {/* Verwende Common Components */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Kundeninformationen</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>{data.customerName}</strong>
            <br />
            {data.customerAddressParsed.street}
            <br />
            {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
          </div>
          <div>
            <strong>Rechnungsdetails</strong>
            <br />
            Nummer: {data.invoiceNumber}
            <br />
            Datum: {data.invoiceDate}
          </div>
        </div>
      </div>

      {/* Wiederverwendbare Totals-Komponente */}
      <TotalsDisplay data={data} color={color} variant="elegant" />
    </div>
  );
};

// === TEMPLATE IN MAIN CONTAINER REGISTRIEREN ===

// In PDFTemplates.tsx ergänzen:
/*
const PDFTemplate: React.FC<PDFTemplateProps> = (props) => {
  const data = usePDFTemplateData(props);
  
  const renderTemplate = () => {
    switch (props.template) {
      case 'TEMPLATE_MYCUSTOM':
        return <MyCustomTemplate data={data} color={props.color} logoSize={props.logoSize || 50} />;
      // ... andere Templates
      default:
        return <NeutralTemplate data={data} color={props.color} logoSize={props.logoSize || 50} />;
    }
  };

  return (
    <div className="w-full h-full bg-white shadow-lg">
      {renderTemplate()}
    </div>
  );
};
*/

// === TESTING BEISPIEL ===

// Mock für Tests
const createMockInvoiceData = (overrides = {}) => ({
  invoiceNumber: 'TEST-MOCK',
  companyName: 'Test Company',
  customerName: 'Test Customer',
  items: [{ description: 'Test Item', quantity: 1, unitPrice: 100, total: 100 }],
  vatRate: 19,
  ...overrides,
});

// Jest Test Beispiel
/*
describe('PDF Templates', () => {
  test('should render StandardTemplate correctly', () => {
    const mockData = createMockInvoiceData();
    const { container } = render(
      <PDFTemplate
        document={mockData}
        template="TEMPLATE_STANDARD"
        color="#14ad9f"
        documentType="invoice"
      />
    );
    
    expect(container.querySelector('[data-testid="invoice-number"]'))
      .toHaveTextContent('TEST-MOCK');
  });

  test('should calculate totals correctly', () => {
    const mockData = createMockInvoiceData({
      items: [
        { description: 'Item 1', quantity: 2, unitPrice: 50, total: 100 },
        { description: 'Item 2', quantity: 1, unitPrice: 200, total: 200 }
      ]
    });

    const { result } = renderHook(() => usePDFTemplateData({
      document: mockData,
      template: 'TEMPLATE_STANDARD',
      color: '#14ad9f',
      documentType: 'invoice',
      logoSize: 50
    }));

    expect(result.current.subtotal).toBe(300);
    expect(result.current.taxAmount).toBe(57); // 19% von 300
    expect(result.current.total).toBe(357);
  });
});
*/

export { BasicUsageExample, AdvancedUsageExample, MyCustomTemplate, createMockInvoiceData };

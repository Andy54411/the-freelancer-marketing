'use client';

import { useEffect } from 'react';
import { 
  StandardTemplate,
  NeutralTemplate,
  ElegantTemplate,
  TechnicalTemplate,
  GeometricTemplate,
  DynamicTemplate 
} from '@/components/finance/pdf-templates';
import { usePDFTemplateData } from '@/hooks/pdf/usePDFTemplateData';
import { DocumentType } from '@/lib/document-utils';

interface PrintClientProps {
  documentData: any;
}

export function PrintClient({ documentData }: PrintClientProps) {
  
  // DEFENSIVE PROGRAMMIERUNG: Prüfe documentData
  console.log('📊 PrintClient received documentData:', documentData);
  
  if (!documentData) {
    return <div className="p-8 text-center text-red-600">Keine Dokumentdaten verfügbar</div>;
  }
  
  // Process data with the same hook as PDF generation
  const processedData = usePDFTemplateData({
    document: documentData,
    template: documentData?.templateId || documentData?.template || 'TEMPLATE_STANDARD',
    color: documentData?.color || '#14ad9f',
    logoUrl: documentData?.logoUrl || null,
    logoSize: documentData?.logoSize || 120,
    documentType: 'invoice',
    pageMode: 'single',
    documentSettings: {
      language: 'de',
      showQRCode: false,
      showEPCQRCode: false,
      showCustomerNumber: true,
      showContactPerson: true,
      showVATPerPosition: false,
      showArticleNumber: false,
      showFoldLines: false,
      showPageNumbers: true,
      showFooter: true,
      showWatermark: false
    }
  });

  // Template mapping - GENAU wie im PDF-System
  const getTemplateComponent = (templateId: string) => {
    switch (templateId) {
      case 'TEMPLATE_STANDARD':
        return StandardTemplate;
      case 'TEMPLATE_NEUTRAL':
        return NeutralTemplate;
      case 'TEMPLATE_ELEGANT':
        return ElegantTemplate;
      case 'TEMPLATE_TECHNICAL':
        return TechnicalTemplate;
      case 'TEMPLATE_GEOMETRIC':
        return GeometricTemplate;
      case 'TEMPLATE_DYNAMIC':
        return DynamicTemplate;
      default:
        return StandardTemplate;
    }
  };

  const selectedTemplate = documentData?.templateId || 
                           documentData?.template || 
                           documentData?.templateType || 
                           'TEMPLATE_STANDARD';
  
  const TemplateComponent = getTemplateComponent(selectedTemplate);

  // Automatisch drucken wenn Dokument geladen ist
  useEffect(() => {
    if (documentData) {
      // Warte kurz bis DOM gerendert ist
      const timer = setTimeout(() => {
        window.print();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [documentData]);

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          /* Verstecke alles außer dem Dokument */
          body > *:not(#print-content) {
            display: none !important;
          }
          
          /* Verstecke Screen Controls */
          .print\\:hidden {
            display: none !important;
          }
        }
        
        @media screen {
          /* Auf dem Bildschirm: Zentriert und mit Schatten */
          #print-content {
            max-width: 210mm;
            margin: 2rem auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* Print Content */}
      <div id="print-content">
        {processedData && (
          <TemplateComponent
            data={processedData}
            color={documentData?.color || '#14ad9f'}
            logoSize={documentData?.logoSize || 120}
            pageMode="single"
            documentSettings={{
              language: 'de',
              showQRCode: false,
              showEPCQRCode: false,
              showCustomerNumber: true,
              showContactPerson: true
            } as any}
          />
        )}
      </div>

      {/* Screen Controls */}
      <div className="fixed top-4 right-4 print:hidden space-x-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Drucken
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Schließen
        </button>
      </div>
    </>
  );
}

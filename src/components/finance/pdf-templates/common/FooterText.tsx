import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';

interface FooterTextProps {
  data: ProcessedPDFData;
  variant?: 'standard' | 'elegant' | 'compact';
}

export const FooterText: React.FC<FooterTextProps> = ({ 
  data, 
  variant = 'standard' 
}) => {
  if (!data.footerText) return null;

  const processFooterText = (text: string) => {
    return text
      .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(data.total))
      .replace(/\[%RECHNUNGSNUMMER%\]/g, data.invoiceNumber)
      .replace(/\[%ZAHLUNGSZIEL%\]/g, data.paymentTerms || '')
      .replace(/\[%RECHNUNGSDATUM%\]/g, data.invoiceDate)
      .replace(
        /\[%KONTAKTPERSON%\]/g,
        data.contactPersonName || data.internalContactPerson || data.companyName || ''
      )
      .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
      .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
      .replace(/Vielen Dank/g, '<br>Vielen Dank')
      .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen');
  };

  if (variant === 'elegant') {
    return (
      <div className="mt-4 bg-gradient-to-r from-gray-50 to-white p-3 rounded">
        <div
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: processFooterText(data.footerText)
          }}
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded border">
        <div
          className="text-xs text-gray-700 leading-normal"
          dangerouslySetInnerHTML={{
            __html: processFooterText(data.footerText)
          }}
        />
      </div>
    );
  }

  // Standard variant
  return (
    <div className="mb-2 p-2 bg-gray-50 rounded">
      <div
        className="text-xs text-gray-700 leading-normal"
        dangerouslySetInnerHTML={{
          __html: processFooterText(data.footerText)
        }}
      />
    </div>
  );
};
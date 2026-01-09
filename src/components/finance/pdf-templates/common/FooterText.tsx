import React from 'react';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { DocumentType } from '@/lib/document-utils';

interface FooterTextProps {
  data: ProcessedPDFData;
  variant?: 'standard' | 'elegant' | 'compact';
  documentType?: DocumentType;
  language?: string;
}

export const FooterText: React.FC<FooterTextProps> = ({
  data,
  variant = 'standard',
  documentType: _documentType,
  language: _language = 'de',
}) => {
  // 🔥 CRITICAL FIX: Verwende processedFooterText (bereits verarbeitet in usePDFTemplateData)
  // NICHT data.footerText (enthält noch Platzhalter)!
  const processedFooterText = data.processedFooterText || data.footerText || '';
  
  if (!processedFooterText) return null;

  if (variant === 'elegant') {
    return (
      <div className="mt-4 bg-linear-to-r from-gray-50 to-white p-3 rounded">
        <div
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: processedFooterText,
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
            __html: processedFooterText,
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
          __html: processedFooterText,
        }}
      />
    </div>
  );
};

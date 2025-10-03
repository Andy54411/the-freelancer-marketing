import React from 'react';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { DocumentType } from '@/lib/document-utils';
import { replacePlaceholders } from '@/utils/placeholderSystem';

interface FooterTextProps {
  data: ProcessedPDFData;
  variant?: 'standard' | 'elegant' | 'compact';
  documentType?: DocumentType;
  language?: string;
}

export const FooterText: React.FC<FooterTextProps> = ({ 
  data, 
  variant = 'standard',
  documentType,
  language = 'de'
}) => {
  if (!data.footerText) return null;

  // Verwende das zentrale placeholderSystem für Platzhalter-Ersetzung mit Sprach-Support
  const processedFooterText = replacePlaceholders(
    data.footerText, 
    data, 
    language
  );

  if (variant === 'elegant') {
    return (
      <div className="mt-4 bg-gradient-to-r from-gray-50 to-white p-3 rounded">
        <div
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: processedFooterText
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
            __html: processedFooterText
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
          __html: processedFooterText
        }}
      />
    </div>
  );
};
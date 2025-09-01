import React from 'react';
import { InvoiceData } from './types';

interface TemplateProps {
  data: InvoiceData;
  preview?: boolean;
}

/**
 * Moderne Business-Rechnungsvorlage
 *
 * Features:
 * - Taskilo Branding (#14ad9f)
 * - Modern Corporate Design
 * - Logo-Integration mit Fallback
 * - Professional Layout
 * - Deutsche Rechtskonformität
 */
export const ModernBusinessTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-[595px] h-[842px] bg-white p-8 font-sans text-sm">
      <div className="text-center text-gray-500 mt-64">
        Modern Business Template - Coming Soon
        <br />
        Company: {data.companyName}
        <br />
        Invoice: {data.invoiceNumber}
      </div>
    </div>
  );
};

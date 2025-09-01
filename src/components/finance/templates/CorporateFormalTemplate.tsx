import React from 'react';
import { InvoiceData } from './types';

interface TemplateProps {
  data: InvoiceData;
  preview?: boolean;
}

export const CorporateFormalTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-[595px] h-[842px] bg-white p-8 font-sans text-sm">
      <div className="text-center text-gray-500 mt-64">
        Corporate Formal Template - Coming Soon
        <br />
        Company: {data.companyName}
        <br />
        Invoice: {data.invoiceNumber}
      </div>
    </div>
  );
};

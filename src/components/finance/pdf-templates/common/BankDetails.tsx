import React from 'react';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';

interface BankDetailsProps {
  data: ProcessedPDFData;
  color?: string;
  variant?: 'standard' | 'elegant' | 'technical' | 'compact';
}

export const BankDetails: React.FC<BankDetailsProps> = ({ 
  data, 
  color = '#14ad9f', 
  variant = 'standard' 
}) => {
  const bankDetails = data.bankDetails as any;
  
  if (!bankDetails?.iban && !bankDetails?.bic) {
    return null;
  }

  if (variant === 'elegant') {
    return (
      <div className="bg-gray-50 p-4 rounded border-l-4" style={{ borderColor: color }}>
        <div className="font-medium mb-2 text-xs" style={{ color }}>Bankverbindung</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {bankDetails.iban && (
            <div><span className="font-medium">IBAN:</span> {bankDetails.iban}</div>
          )}
          {bankDetails.bic && (
            <div><span className="font-medium">BIC:</span> {bankDetails.bic}</div>
          )}
          {bankDetails.accountHolder && (
            <div className="col-span-2"><span className="font-medium">Kontoinhaber:</span> {bankDetails.accountHolder}</div>
          )}
          {bankDetails.bankName && (
            <div className="col-span-2"><span className="font-medium">Bank:</span> {bankDetails.bankName}</div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="mt-4 bg-gradient-to-r from-blue-50 to-white p-3 rounded border-l-4" style={{ borderColor: color }}>
        <div className="font-medium mb-1 text-xs" style={{ color }}>Bankverbindung</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {bankDetails.iban && (
            <div><span className="font-medium">IBAN:</span> {bankDetails.iban}</div>
          )}
          {bankDetails.bic && (
            <div><span className="font-medium">BIC:</span> {bankDetails.bic}</div>
          )}
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className="mt-8 p-4 bg-gray-50 rounded">
      <div className="font-semibold mb-2">Bankverbindung:</div>
      <div className="text-sm space-y-1">
        {bankDetails.accountHolder && <div>Kontoinhaber: {bankDetails.accountHolder}</div>}
        {bankDetails.iban && <div>IBAN: {bankDetails.iban}</div>}
        {bankDetails.bic && <div>BIC: {bankDetails.bic}</div>}
        {bankDetails.bankName && <div>Bank: {bankDetails.bankName}</div>}
      </div>
    </div>
  );
};
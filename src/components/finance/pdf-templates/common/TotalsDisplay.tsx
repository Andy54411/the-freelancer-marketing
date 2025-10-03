import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { useDocumentTranslation } from '@/hooks/pdf/useDocumentTranslation';

interface TotalsDisplayProps {
  data: ProcessedPDFData;
  color?: string;
  className?: string;
  variant?: 'standard' | 'elegant' | 'technical' | 'compact';
  language?: string;
}

export const TotalsDisplay: React.FC<TotalsDisplayProps> = ({
  data,
  color = '#14ad9f',
  className = '',
  variant = 'standard',
  language = 'de',
}) => {
  const { t } = useDocumentTranslation(language);
  const getSkontoDate = () => {
    const skontoDate = new Date();
    skontoDate.setDate(skontoDate.getDate() + data.skontoDays);
    return skontoDate.toLocaleDateString('de-DE');
  };

  // Prüfe alle speziellen Steuerbehandlungen
  const isReverseCharge =
    data.taxRule?.includes('REVERSE') || data.taxRuleType?.includes('REVERSE');
  const isTaxExempt =
    data.taxRule?.includes('EXEMPT') ||
    data.taxRuleType?.includes('EXEMPT') ||
    data.taxRule?.includes('DE_EXEMPT_4_USTG') ||
    data.taxRuleType?.includes('DE_EXEMPT_4_USTG') ||
    data.taxRule?.includes('NOTAXABLE') ||
    data.taxRuleType?.includes('NOTAXABLE') ||
    data.taxRule?.includes('EXPORT') ||
    data.taxRuleType?.includes('EXPORT') ||
    data.taxRule?.includes('INTRACOMMUNITY') ||
    data.taxRuleType?.includes('INTRACOMMUNITY');
  const isOSS =
    data.taxRule?.includes('OSS') ||
    data.taxRuleType?.includes('OSS') ||
    data.taxRule?.includes('EU_OSS') ||
    data.taxRuleType?.includes('EU_OSS') ||
    data.taxRule?.includes('18j') ||
    data.taxRuleType?.includes('18j');
  const isNotTaxableInGermany =
    data.taxRule?.includes('OUT_OF_SCOPE') ||
    data.taxRuleType?.includes('OUT_OF_SCOPE') ||
    data.taxRule?.includes('NON_EU') ||
    data.taxRuleType?.includes('NON_EU') ||
    data.taxRule?.includes('3a') ||
    data.taxRuleType?.includes('3a') ||
    data.taxRule?.includes('OUTSIDE_GERMANY') ||
    data.taxRuleType?.includes('OUTSIDE_GERMANY');
  const isSmallBusiness =
    data.isSmallBusiness ||
    data.taxRule?.includes('SMALL_BUSINESS') ||
    data.taxRuleType?.includes('SMALL_BUSINESS');

  // Zeige MwSt nur bei normaler steuerpflichtiger Lieferung (nicht bei speziellen Verfahren)
  const showVat =
    !isReverseCharge && !isTaxExempt && !isOSS && !isNotTaxableInGermany && !isSmallBusiness;

  // SevDesk-style: Verwende taxGrouped wenn verfügbar, sonst fallback zu altem System
  const taxLines =
    data.taxGrouped && data.taxGrouped.length > 0
      ? data.taxGrouped.filter(tax => showVat && tax.taxAmount > 0)
      : showVat && data.taxAmount > 0
        ? [{ rate: data.vatRate, taxAmount: data.taxAmount }]
        : [];

  if (variant === 'elegant') {
    return (
      <div className={`w-80 ${className}`}>
        <div className="bg-gray-50 p-6 rounded border" style={{ borderColor: color }}>
          <div className="space-y-3">
            <div className="flex justify-between py-1 text-sm">
              <span>{t('subtotal')}:</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {taxLines.map((tax, index) => (
              <div key={index} className="flex justify-between py-1 text-sm">
                <span>MwSt. ({tax.rate}%):</span>
                <span>{formatCurrency(tax.taxAmount)}</span>
              </div>
            ))}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3" />
            <div className="flex justify-between py-2 font-bold text-lg" style={{ color }}>
              <span>{t('totalAmount')}:</span>
              <span>{formatCurrency(data.total)}</span>
            </div>
            {data.skontoEnabled && data.skontoDays && data.skontoPercentage && (
              <div className="mt-4 pt-3 border-t" style={{ borderColor: color }}>
                <div className="flex justify-between py-1 text-sm text-green-700">
                  <span>Skonto ({data.skontoPercentage}%):</span>
                  <span>-{formatCurrency(data.total * (data.skontoPercentage / 100))}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-sm text-green-800">
                  <span>Bei Zahlung bis {getSkontoDate()}:</span>
                  <span>
                    {formatCurrency(data.total - data.total * (data.skontoPercentage / 100))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`w-60 ${className}`}>
        <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded border border-gray-200 shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between py-0.5 text-xs">
              <span>{t('subtotal')}:</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {taxLines.map((tax, index) => (
              <div key={index} className="flex justify-between py-0.5 text-xs">
                <span>MwSt. ({tax.rate}%):</span>
                <span>{formatCurrency(tax.taxAmount)}</span>
              </div>
            ))}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />
            <div className="flex justify-between py-1 font-bold text-sm" style={{ color }}>
              <span>{t('totalAmount')}:</span>
              <span>{formatCurrency(data.total)}</span>
            </div>
            {data.skontoEnabled && data.skontoDays && data.skontoPercentage && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: color }}>
                <div className="flex justify-between py-0.5 text-xs text-green-700">
                  <span>Skonto ({data.skontoPercentage}%):</span>
                  <span>-{formatCurrency(data.total * (data.skontoPercentage / 100))}</span>
                </div>
                <div className="flex justify-between py-0.5 font-medium text-xs text-green-800">
                  <span>Bei Zahlung bis {getSkontoDate()}:</span>
                  <span>
                    {formatCurrency(data.total - data.total * (data.skontoPercentage / 100))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className={`w-64 flex-shrink-0 ${className}`}>
      <div className="flex justify-between py-2">
        <span>{t('subtotal')}:</span>
        <span>{formatCurrency(data.subtotal)}</span>
      </div>
      {taxLines.map((tax, index) => (
        <div key={index} className="flex justify-between py-2">
          <span>MwSt. ({tax.rate}%):</span>
          <span>{formatCurrency(tax.taxAmount)}</span>
        </div>
      ))}
      <div className="flex justify-between py-2 font-bold text-lg border-t">
        <span>{t('totalAmount')}:</span>
        <span>{formatCurrency(data.total)}</span>
      </div>
      {data.skontoEnabled && data.skontoDays && data.skontoPercentage && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="flex justify-between py-1 text-sm text-green-700">
            <span>Skonto ({data.skontoPercentage}%):</span>
            <span>-{formatCurrency(data.total * (data.skontoPercentage / 100))}</span>
          </div>
          <div className="flex justify-between py-1 font-bold text-green-800 border-t border-green-200">
            <span>Bei Zahlung bis {getSkontoDate()}:</span>
            <span>{formatCurrency(data.total - data.total * (data.skontoPercentage / 100))}</span>
          </div>
        </div>
      )}
    </div>
  );
};

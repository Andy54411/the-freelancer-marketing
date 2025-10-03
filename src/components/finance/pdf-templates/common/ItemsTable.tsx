import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { PDF_PAGE_STYLES } from '@/utils/pdf-page-styles';
import { useDocumentTranslation } from '@/hooks/pdf/useDocumentTranslation';

interface ItemsTableProps {
  data: ProcessedPDFData;
  color?: string;
  variant?: 'standard' | 'elegant' | 'technical' | 'neutral' | 'dynamic';
  showArticleNumber?: boolean;
  showVATPerPosition?: boolean;
  language?: string;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  data,
  color = '#14ad9f',
  variant = 'standard',
  showArticleNumber = false,
  showVATPerPosition = false,
  language = 'de',
}) => {
  const { t } = useDocumentTranslation(language);
  if (!data.realItems || data.realItems.length === 0) {
    return <div className="text-center py-8 text-gray-500">Keine Positionen vorhanden</div>;
  }

  const hasAnyDiscount = data.realItems.some(item => (item as any).discountPercent > 0);

  if (variant === 'elegant') {
    return (
      <div className="mb-8">
        <div className="relative">
          <div className="absolute -inset-1 border" style={{ borderColor: color, opacity: 0.2 }} />
          <table className="w-full bg-white relative">
            <thead style={PDF_PAGE_STYLES.tableHeader}>
              <tr style={{ backgroundColor: color }}>
                <th className="text-white py-4 px-3 text-left font-light">{t('position')}</th>
                {showArticleNumber && <th className="text-white py-4 px-3 text-left font-light">{t('articleNumber')}</th>}
                <th className="text-white py-4 px-3 text-left font-light">{t('description')}</th>
                <th className="text-white py-4 px-3 text-right font-light">{t('quantity')}</th>
                <th className="text-white py-4 px-3 text-right font-light">{t('unitPrice')}</th>
                {hasAnyDiscount && (
                  <th className="text-white py-4 px-3 text-right font-light">{t('discount')}</th>
                )}
                {showVATPerPosition && <th className="text-white py-4 px-3 text-right font-light">{t('vatRate')}</th>}
                <th className="text-white py-4 px-3 text-right font-light">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {data.realItems.map((item, index) => {
                const discountPercent = (item as any).discountPercent || 0;
                const originalTotal = item.total || item.unitPrice * item.quantity;
                const discountedTotal =
                  discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
                const isEven = index % 2 === 0;

                return (
                  <tr
                    key={index}
                    className={`${isEven ? 'bg-gray-50' : 'bg-white'} border-b border-gray-200`}
                    style={PDF_PAGE_STYLES.tableRow}
                  >
                    <td className="py-4 px-3 text-sm">{index + 1}</td>
                    {showArticleNumber && (
                      <td className="py-4 px-3 text-sm text-gray-600">
                        {(item as any).articleNumber || `ART-${String(index + 1).padStart(3, '0')}`}
                      </td>
                    )}
                    <td className="py-4 px-3 text-sm">
                      <div className="font-medium">{item.description}</div>
                      {(item as any).unit && (
                        <div className="text-xs text-gray-500">Einheit: {(item as any).unit}</div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-sm text-right">{item.quantity}</td>
                    <td className="py-4 px-3 text-sm text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    {hasAnyDiscount && (
                      <td className="py-4 px-3 text-sm text-right text-red-600">
                        {discountPercent > 0 ? `-${discountPercent}%` : ''}
                      </td>
                    )}
                    {showVATPerPosition && (
                      <td className="py-4 px-3 text-sm text-right">
                        {(item as any).vatRate || (data as any).taxRate || '19'}%
                      </td>
                    )}
                    <td className="py-4 px-3 text-sm text-right font-medium">
                      {formatCurrency(discountedTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (variant === 'technical') {
    return (
      <div className="mb-8 border" style={{ borderColor: color }}>
        <table className="w-full">
          <thead style={PDF_PAGE_STYLES.tableHeader}>
            <tr className="bg-gray-900 text-white">
              <th className="py-3 px-2 text-left font-mono text-xs">ID</th>
              {showArticleNumber && <th className="py-3 px-2 text-left font-mono text-xs">{t('articleNumber').toUpperCase()}</th>}
              <th className="py-3 px-2 text-left font-mono text-xs">{t('description').toUpperCase()}</th>
              <th className="py-3 px-2 text-right font-mono text-xs">{t('quantity').toUpperCase()}</th>
              <th className="py-3 px-2 text-right font-mono text-xs">{t('unitPrice').toUpperCase()}</th>
              {hasAnyDiscount && <th className="py-3 px-2 text-right font-mono text-xs">{t('discount').toUpperCase()}</th>}
              {showVATPerPosition && <th className="py-3 px-2 text-right font-mono text-xs">{t('vatRate').toUpperCase()}</th>}
              <th className="py-3 px-2 text-right font-mono text-xs">{t('amount').toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {data.realItems.map((item, index) => {
              const discountPercent = (item as any).discountPercent || 0;
              const originalTotal = item.total || item.unitPrice * item.quantity;
              const discountedTotal =
                discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;

              return (
                <tr
                  key={index}
                  className="border-b border-gray-300"
                  style={PDF_PAGE_STYLES.tableRow}
                >
                  <td className="py-2 px-2 text-xs font-mono">
                    {String(index + 1).padStart(3, '0')}
                  </td>
                  {showArticleNumber && (
                    <td className="py-2 px-2 text-xs font-mono text-gray-600">
                      {(item as any).articleNumber || `ART${String(index + 1).padStart(3, '0')}`}
                    </td>
                  )}
                  <td className="py-2 px-2 text-xs font-mono">
                    <div>{item.description}</div>
                    {(item as any).unit && (
                      <div className="text-gray-500">UNIT: {(item as any).unit}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-xs text-right font-mono">{item.quantity}</td>
                  <td className="py-2 px-2 text-xs text-right font-mono">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  {hasAnyDiscount && (
                    <td className="py-2 px-2 text-xs text-right font-mono text-red-600">
                      {discountPercent > 0 ? `-${discountPercent}%` : 'N/A'}
                    </td>
                  )}
                  {showVATPerPosition && (
                    <td className="py-2 px-2 text-xs text-right font-mono">
                      {(item as any).vatRate || (data as any).taxRate || '19'}%
                    </td>
                  )}
                  <td className="py-2 px-2 text-xs text-right font-mono font-bold">
                    {formatCurrency(discountedTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Standard variant
  return (
    <div className="mb-8">
      <table className="w-full border-collapse">
        <thead style={PDF_PAGE_STYLES.tableHeader}>
          <tr style={{ backgroundColor: color ? `${color}15` : '#F4F2E5' }}>
            {showArticleNumber && <th className="border p-3 text-left">{t('articleNumber')}</th>}
            <th className="border p-3 text-left">{t('description')}</th>
            <th className="border p-3 text-center">{t('quantity')}</th>
            <th className="border p-3 text-right">{t('unitPrice')}</th>
            {hasAnyDiscount && <th className="border p-3 text-right">{t('discount')} %</th>}
            {showVATPerPosition && <th className="border p-3 text-right">{t('vatRate')}</th>}
            <th className="border p-3 text-right">{t('total')}</th>
          </tr>
        </thead>
        <tbody>
          {data.realItems.map((item, index) => {
            const discountPercent = (item as any).discountPercent || 0;
            const hasDiscount = discountPercent > 0;
            const originalPrice = item.unitPrice;
            const discountedPrice = hasDiscount
              ? originalPrice * (1 - discountPercent / 100)
              : originalPrice;
            const totalWithDiscount = hasDiscount ? discountedPrice * item.quantity : item.total;

            return (
              <tr key={index} style={PDF_PAGE_STYLES.tableRow}>
                {showArticleNumber && (
                  <td className="border p-3 text-sm text-gray-600">
                    {(item as any).articleNumber || `ART-${String(index + 1).padStart(3, '0')}`}
                  </td>
                )}
                <td className="border p-3">{item.description}</td>
                <td className="border p-3 text-center">
                  {item.quantity} {(item as any).unit || t('piece')}
                </td>
                <td className="border p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                {hasAnyDiscount && (
                  <td className="border p-3 text-right">
                    {hasDiscount ? (
                      <span className="text-red-600 font-semibold">{discountPercent}%</span>
                    ) : (
                      '-'
                    )}
                  </td>
                )}
                {showVATPerPosition && (
                  <td className="border p-3 text-right text-sm">
                    {(item as any).vatRate || (data as any).taxRate || '19'}%
                  </td>
                )}
                <td className="border p-3 text-right">
                  {hasDiscount ? (
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(totalWithDiscount)}
                    </span>
                  ) : (
                    <span
                      className={item.category === 'discount' ? 'text-red-600 font-semibold' : ''}
                    >
                      {formatCurrency(item.total)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

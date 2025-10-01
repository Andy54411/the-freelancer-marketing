import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { PDF_PAGE_STYLES } from '@/utils/pdf-page-styles';

interface ItemsTableProps {
  data: ProcessedPDFData;
  color?: string;
  variant?: 'standard' | 'elegant' | 'technical' | 'neutral' | 'dynamic';
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  data,
  color = '#14ad9f',
  variant = 'standard',
}) => {
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
                <th className="text-white py-4 px-3 text-left font-light">Pos.</th>
                <th className="text-white py-4 px-3 text-left font-light">Beschreibung</th>
                <th className="text-white py-4 px-3 text-right font-light">Menge</th>
                <th className="text-white py-4 px-3 text-right font-light">Einzelpreis</th>
                {hasAnyDiscount && (
                  <th className="text-white py-4 px-3 text-right font-light">Rabatt</th>
                )}
                <th className="text-white py-4 px-3 text-right font-light">Betrag</th>
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
              <th className="py-3 px-2 text-left font-mono text-xs">DESCRIPTION</th>
              <th className="py-3 px-2 text-right font-mono text-xs">QTY</th>
              <th className="py-3 px-2 text-right font-mono text-xs">PRICE</th>
              {hasAnyDiscount && <th className="py-3 px-2 text-right font-mono text-xs">DISC</th>}
              <th className="py-3 px-2 text-right font-mono text-xs">AMOUNT</th>
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
            <th className="border p-3 text-left">Beschreibung</th>
            <th className="border p-3 text-center">Menge</th>
            <th className="border p-3 text-right">Einzelpreis</th>
            {hasAnyDiscount && <th className="border p-3 text-right">Rabatt %</th>}
            <th className="border p-3 text-right">Gesamtpreis</th>
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
                <td className="border p-3">{item.description}</td>
                <td className="border p-3 text-center">
                  {item.quantity} {(item as any).unit || 'Stk'}
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

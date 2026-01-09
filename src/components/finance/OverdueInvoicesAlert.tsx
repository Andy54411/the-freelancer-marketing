/**
 * Alert-Komponente für überfällige Rechnungen
 * Wird in das bestehende Notification-System des Headers integriert
 */

'use client';

import React from 'react';
import { AlertTriangle, FileText, Calendar, Send } from 'lucide-react';
import { useOverdueInvoices } from '@/hooks/useOverdueInvoices';

interface OverdueInvoicesAlertProps {
  companyId: string;
  onReminderClick?: (invoice: any) => void;
  onViewInvoicesClick?: () => void;
}

export const OverdueInvoicesAlert: React.FC<OverdueInvoicesAlertProps> = ({
  companyId,
  onReminderClick,
  onViewInvoicesClick,
}) => {
  const { overdueInvoices, hasOverdueInvoices, overdueCount, loading } =
    useOverdueInvoices(companyId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (loading || !hasOverdueInvoices) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header für überfällige Rechnungen */}
      <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div>
          <h4 className="font-semibold text-red-800">
            {overdueCount} Überfällige Rechnung{overdueCount > 1 ? 'en' : ''}
          </h4>
          <p className="text-sm text-red-600">Sofortige Aufmerksamkeit erforderlich</p>
        </div>
      </div>

      {/* Liste der überfälligen Rechnungen */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {overdueInvoices.slice(0, 3).map(invoice => (
          <div
            key={invoice.id}
            className="p-3 border border-red-200 rounded-md bg-red-25 hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm text-red-800">{invoice.invoiceNumber}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-red-800">
                  {formatCurrency(invoice.total)}
                </div>
                <div className="text-xs text-red-600">{invoice.daysPastDue} Tage überfällig</div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-red-600">
                <Calendar className="h-3 w-3 inline mr-1" />
                Fällig: {formatDate(invoice.dueDate)}
              </div>
              <div className="flex gap-1">
                {onReminderClick && (
                  <button
                    onClick={() => onReminderClick(invoice)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Mahnung
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer mit Gesamt-Aktionen */}
      {overdueCount > 3 && (
        <div className="p-2 text-center text-xs text-red-600 bg-red-50">
          und {overdueCount - 3} weitere überfällige Rechnungen...
        </div>
      )}

      {onViewInvoicesClick && (
        <div className="p-2 border-t border-red-200">
          <button
            onClick={onViewInvoicesClick}
            className="w-full text-sm px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Alle Rechnungen anzeigen
          </button>
        </div>
      )}
    </div>
  );
};

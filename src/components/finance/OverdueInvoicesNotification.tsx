/**
 * Benachrichtigungskomponente für überfällige Rechnungen
 * Zeigt Alerts und Badge für überfällige Rechnungen im Header an
 */

'use client';

import React, { useState } from 'react';
import { Bell, AlertTriangle, FileText, Euro, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOverdueInvoices } from '@/hooks/useOverdueInvoices';
import { ReminderDialog } from '@/components/finance/ReminderDialog';
import { useRouter } from 'next/navigation';

interface OverdueInvoicesNotificationProps {
  companyId: string;
}

export const OverdueInvoicesNotification: React.FC<OverdueInvoicesNotificationProps> = ({
  companyId,
}) => {
  const { overdueInvoices, hasOverdueInvoices, overdueCount, loading } =
    useOverdueInvoices(companyId);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const handleSendReminder = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsReminderDialogOpen(true);
  };

  const handleViewInvoices = () => {
    router.push(`/dashboard/company/${companyId}/finance/invoices`);
  };

  if (loading || !hasOverdueInvoices) {
    return (
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {hasOverdueInvoices && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {overdueCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Überfällige Rechnungen ({overdueCount})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="max-h-96 overflow-y-auto">
            {overdueInvoices.slice(0, 5).map(invoice => (
              <DropdownMenuItem
                key={invoice.id}
                className="flex flex-col items-start p-3 space-y-2 cursor-default"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">{invoice.invoiceNumber}</span>
                  </div>
                  <Badge
                    variant={invoice.daysPastDue > 30 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {invoice.daysPastDue}d
                  </Badge>
                </div>

                <div className="w-full space-y-1">
                  <p className="text-xs text-gray-600">Kunde: {invoice.customerName}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {formatCurrency(invoice.total)}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className="h-3 w-3" />
                      Fällig: {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-7"
                    onClick={e => {
                      e.stopPropagation();
                      handleSendReminder(invoice);
                    }}
                  >
                    Mahnung
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs h-7"
                    onClick={e => {
                      e.stopPropagation();
                      router.push(`/dashboard/company/${companyId}/finance/invoices`);
                    }}
                  >
                    Anzeigen
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>

          {overdueCount > 5 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleViewInvoices}
                className="text-center text-sm text-blue-600 hover:text-blue-800"
              >
                Alle {overdueCount} überfällige Rechnungen anzeigen
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleViewInvoices}>
            <FileText className="h-4 w-4 mr-2" />
            Alle Rechnungen verwalten
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedInvoice && (
        <ReminderDialog
          invoice={selectedInvoice}
          isOpen={isReminderDialogOpen}
          onClose={() => {
            setIsReminderDialogOpen(false);
            setSelectedInvoice(null);
          }}
          companyId={companyId}
        />
      )}
    </>
  );
};

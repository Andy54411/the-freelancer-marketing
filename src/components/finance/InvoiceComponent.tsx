'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Plus, FileText, X } from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';
import StornoInvoice from './StornoInvoice';

interface InvoiceComponentProps {
  invoices: InvoiceData[];
  onRefresh?: () => void;
  companyId: string;
}

export function InvoiceComponent({
  invoices: initialInvoices,
  onRefresh,
  companyId: _companyId,
}: InvoiceComponentProps) {
  const [invoices, _setInvoices] = useState<InvoiceData[]>(initialInvoices);
  const [showStornoDialog, setShowStornoDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Entwurf', variant: 'secondary' as const },
      sent: { label: 'Gesendet', variant: 'default' as const },
      paid: { label: 'Bezahlt', variant: 'default' as const },
      overdue: { label: 'Überfällig', variant: 'destructive' as const },
      cancelled: { label: 'Storniert', variant: 'secondary' as const },
      storno: { label: 'Storno', variant: 'destructive' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCreateStorno = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setShowStornoDialog(true);
    }
  };

  const handleStornoCreated = () => {
    setShowStornoDialog(false);
    setSelectedInvoice(null);
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTemplatesPage = () => {
    router.push('./invoices/templates');
  };

  const handleCreateInvoice = () => {
    router.push('./invoices/create');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Rechnungen</CardTitle>
            <CardDescription>Verwalten Sie Ihre Rechnungen</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTemplatesPage}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Templates
            </Button>
            <Button
              onClick={handleCreateInvoice}
              className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Neue Rechnung
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Keine Rechnungen vorhanden</div>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{invoice.sequentialNumber}</div>
                        <div className="text-sm text-muted-foreground">{invoice.customerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(invoice.total)}</div>
                        <div className="text-sm text-muted-foreground">
                          Fällig: {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(invoice.status)}
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" title="Anzeigen">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'draft' && (
                        <Button variant="ghost" size="sm" title="Bearbeiten">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {(invoice.status === 'sent' || invoice.status === 'paid') &&
                        !invoice.isStorno && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Stornieren"
                            onClick={() => handleCreateStorno(invoice.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {invoice.status === 'draft' && (
                        <Button variant="ghost" size="sm" title="Löschen">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {showStornoDialog && selectedInvoice && (
        <StornoInvoice invoice={selectedInvoice} onStornoCreated={handleStornoCreated} />
      )}
    </Card>
  );
}

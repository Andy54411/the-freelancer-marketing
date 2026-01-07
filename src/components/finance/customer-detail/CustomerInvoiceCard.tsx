'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Loader2, 
  ExternalLink,
  Eye,
  Calendar,
  Euro,
  MessageSquare,
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';
import { InvoiceData, InvoiceStatusHelper } from '@/types/invoiceTypes';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { toast } from 'sonner';

interface CustomerInvoiceCardProps {
  customer: Customer;
}

export function CustomerInvoiceCard({ customer }: CustomerInvoiceCardProps) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!customer.companyId) {
        setError('Firmen-ID nicht gefunden');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Lade alle Rechnungen aus der Subcollection
        const allInvoices = await FirestoreInvoiceService.getInvoicesByCompany(customer.companyId);
        
        // Filtere nach Kundenname oder E-Mail
        const customerInvoices = allInvoices.filter(invoice => 
          invoice.customerName === customer.name ||
          invoice.customerEmail === customer.email ||
          (invoice.customer?.name === customer.name) ||
          (invoice.customer?.email === customer.email)
        );

        setInvoices(customerInvoices);
      } catch (err) {
        console.error('Fehler beim Laden der Rechnungen:', err);
        setError('Fehler beim Laden der Rechnungen');
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [customer.companyId, customer.name, customer.email]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const openInvoice = (invoiceId: string) => {
    const url = `/dashboard/company/${customer.companyId}/finance/invoices/${invoiceId}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'draft': { variant: 'secondary' as const, class: 'bg-gray-100 text-gray-800' },
      'finalized': { variant: 'secondary' as const, class: 'bg-blue-100 text-blue-800' },
      'sent': { variant: 'outline' as const, class: 'bg-indigo-100 text-indigo-800' },
      'paid': { variant: 'default' as const, class: 'bg-green-100 text-green-800' },
      'overdue': { variant: 'destructive' as const, class: 'bg-red-100 text-red-800' },
      'cancelled': { variant: 'secondary' as const, class: 'bg-gray-100 text-gray-600' },
      'storno': { variant: 'destructive' as const, class: 'bg-red-100 text-red-700' }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return (
      <Badge variant={config.variant} className={config.class}>
        {InvoiceStatusHelper.getStatusLabel(status as any)}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#14ad9f]" />
              Rechnungsübersicht
            </CardTitle>
            <CardDescription>
              Alle Rechnungen für {customer.name} ({invoices.length} gefunden)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Euro className="h-4 w-4" />
            <span>
              Gesamt: {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#14ad9f] mb-4" />
            <p className="text-sm text-gray-500">Lade Rechnungen aus Subcollection...</p>
            <p className="text-xs text-gray-400 mt-1">companies/{customer.companyId}/invoices</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 mx-auto mb-4 text-red-300" />
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Erneut versuchen
            </Button>
          </div>
        ) : invoices.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[140px]">Rechnungsnummer</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">Datum</TableHead>
                  <TableHead className="w-[120px]">Fälligkeitsdatum</TableHead>
                  <TableHead className="w-[120px] text-right">Betrag</TableHead>
                  <TableHead className="w-[120px] text-center">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {invoice.invoiceNumber || invoice.number}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatDate(invoice.issueDate || invoice.date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatDate(invoice.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#14ad9f]">
                      {formatCurrency(invoice.total || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                          onClick={() => openInvoice(invoice.id)}
                          title="Rechnung öffnen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {customer.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white"
                            onClick={() => {
                              const invoiceUrl = `${window.location.origin}/dashboard/company/${customer.companyId}/finance/invoices/${invoice.id}`;
                              const message = `Sehr geehrte(r) ${customer.name},\n\nanbei erhalten Sie Ihre Rechnung ${invoice.invoiceNumber || invoice.number} über ${formatCurrency(invoice.total || 0)}.\n\nRechnung ansehen: ${invoiceUrl}\n\nMit freundlichen Grüßen`;
                              window.open(`/dashboard/company/${customer.companyId}/whatsapp?phone=${encodeURIComponent(customer.phone || '')}&message=${encodeURIComponent(message)}&invoiceId=${invoice.id}`, '_blank');
                              
                              // Speichere Aktivität im Kundenprofil
                              fetch('/api/whatsapp/activity', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  companyId: customer.companyId,
                                  customerId: customer.id,
                                  phone: customer.phone,
                                  activityType: 'invoice_sent',
                                  title: `Rechnung ${invoice.invoiceNumber || invoice.number} per WhatsApp gesendet`,
                                  description: `Betrag: ${formatCurrency(invoice.total || 0)}`,
                                  metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber || invoice.number },
                                }),
                              }).catch(() => {});
                              
                              toast.success('WhatsApp-Chat wird geöffnet...');
                            }}
                            title="Per WhatsApp senden"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Keine Rechnungen gefunden</p>
            <p className="text-sm">
              Für {customer.name} wurden noch keine Rechnungen erstellt.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => window.open(`/dashboard/company/${customer.companyId}/finance/invoices/create?customer=${encodeURIComponent(customer.name)}`, '_blank')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Erste Rechnung erstellen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
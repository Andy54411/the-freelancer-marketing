'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FiUpload,
  FiFileText,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiDownload,
  FiRefreshCw,
  FiFilter,
} from 'react-icons/fi';
import { DatevService, DatevOrganization } from '@/services/datevService';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { toast } from 'sonner';

interface DatevExportProps {
  companyId: string;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  customerName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  exported: boolean;
  exportedAt?: string;
}

interface ExportJob {
  id: string;
  type: 'invoice' | 'payment' | 'transaction';
  itemId: string;
  itemName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export function DatevExport({ companyId }: DatevExportProps) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<DatevOrganization | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [exportType, setExportType] = useState<string>('automatic');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadExportData();
  }, [companyId]);

  const loadExportData = async () => {
    try {
      setLoading(true);
      const token = await DatevTokenManager.getUserToken();

      if (!token) {
        toast.error('Keine DATEV-Verbindung gefunden');
        return;
      }

      // Load organization
      // Organizations not needed for Taskilo - UserInfo API is sufficient

      // Mock invoice data - in production, load from your backend
      setInvoices([
        {
          id: '1',
          number: 'RG-2025-001',
          date: '2025-08-01',
          customerName: 'Mustermann GmbH',
          amount: 1190.0,
          status: 'sent',
          exported: false,
        },
        {
          id: '2',
          number: 'RG-2025-002',
          date: '2025-08-02',
          customerName: 'Schmidt & Partner',
          amount: 2380.0,
          status: 'paid',
          exported: true,
          exportedAt: '2025-08-02T14:30:00Z',
        },
        {
          id: '3',
          number: 'RG-2025-003',
          date: '2025-08-03',
          customerName: 'TechStart Solutions',
          amount: 595.0,
          status: 'draft',
          exported: false,
        },
      ]);

      // Mock export jobs
      setExportJobs([
        {
          id: '1',
          type: 'invoice',
          itemId: '2',
          itemName: 'RG-2025-002',
          status: 'completed',
          startedAt: '2025-08-02T14:30:00Z',
          completedAt: '2025-08-02T14:31:15Z',
        },
        {
          id: '2',
          type: 'payment',
          itemId: 'pay-001',
          itemName: 'Zahlung RG-2025-002',
          status: 'completed',
          startedAt: '2025-08-02T15:00:00Z',
          completedAt: '2025-08-02T15:00:45Z',
        },
      ]);
    } catch (error) {
      toast.error('Fehler beim Laden der Export-Daten');
    } finally {
      setLoading(false);
    }
  };

  const exportSelectedInvoices = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Rechnung aus');
      return;
    }

    try {
      for (const invoiceId of selectedInvoices) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) continue;

        // Create export job
        const newJob: ExportJob = {
          id: Date.now().toString() + invoiceId,
          type: 'invoice',
          itemId: invoiceId,
          itemName: invoice.number,
          status: 'processing',
          startedAt: new Date().toISOString(),
        };

        setExportJobs(prev => [newJob, ...prev]);

        // Simulate export process
        setTimeout(
          async () => {
            try {
              // Prepare invoice data for DATEV
              const invoiceData = {
                id: invoiceId,
                invoiceNumber: invoice.number,
                date: invoice.date,
                dueDate: invoice.date, // Simplified - should calculate due date
                customerName: invoice.customerName,
                amount: invoice.amount,
                vatAmount: invoice.amount * 0.19, // Simplified VAT calculation
                description: `Rechnung ${invoice.number} für ${invoice.customerName}`,
              };

              await DatevService.importInvoiceToDatev(invoiceData, organization!.id);

              // Update job status
              setExportJobs(prev =>
                prev.map(job =>
                  job.id === newJob.id
                    ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
                    : job
                )
              );

              // Update invoice status
              setInvoices(prev =>
                prev.map(inv =>
                  inv.id === invoiceId
                    ? { ...inv, exported: true, exportedAt: new Date().toISOString() }
                    : inv
                )
              );

              toast.success(`${invoice.number} erfolgreich zu DATEV exportiert`);
            } catch (error) {
              // Update job with error
              setExportJobs(prev =>
                prev.map(job =>
                  job.id === newJob.id
                    ? { ...job, status: 'failed', error: 'Export fehlgeschlagen' }
                    : job
                )
              );
              toast.error(`Fehler beim Export von ${invoice.number}`);
            }
          },
          1000 + Math.random() * 2000
        );
      }

      setSelectedInvoices([]);
      toast.info(`Export von ${selectedInvoices.length} Rechnung(en) gestartet`);
    } catch (error) {
      toast.error('Fehler beim Starten des Exports');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'exported') return invoice.exported;
    if (statusFilter === 'not-exported') return !invoice.exported;
    return invoice.status === statusFilter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <FiRefreshCw className="animate-spin w-6 h-6 text-[#14ad9f]" />
            <span className="ml-2">Lade Export-Daten...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Keine DATEV-Verbindung</CardTitle>
          <CardDescription>Bitte richten Sie zuerst die DATEV-Integration ein.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiUpload className="text-[#14ad9f]" />
            Export-Einstellungen
          </CardTitle>
          <CardDescription>Konfigurieren Sie den automatischen Export zu DATEV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Export-Modus</label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatisch bei Rechnungserstellung</SelectItem>
                <SelectItem value="manual">Manuell nach Auswahl</SelectItem>
                <SelectItem value="scheduled">Geplant (täglich/wöchentlich)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="auto-payment-sync" />
            <label htmlFor="auto-payment-sync" className="text-sm">
              Zahlungseingänge automatisch synchronisieren
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="notification-enabled" defaultChecked />
            <label htmlFor="notification-enabled" className="text-sm">
              E-Mail-Benachrichtigungen bei Export-Fehlern
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FiFileText className="text-[#14ad9f]" />
                Rechnungen exportieren
              </CardTitle>
              <CardDescription>Wählen Sie Rechnungen für den Export zu DATEV aus</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <FiFilter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="not-exported">Nicht exportiert</SelectItem>
                  <SelectItem value="exported">Exportiert</SelectItem>
                  <SelectItem value="draft">Entwurf</SelectItem>
                  <SelectItem value="sent">Versendet</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={exportSelectedInvoices}
                disabled={selectedInvoices.length === 0}
                className="bg-[#14ad9f] hover:bg-taskilo-hover"
              >
                <FiUpload className="w-4 h-4 mr-2" />
                Export ({selectedInvoices.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredInvoices.map(invoice => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={checked => {
                      if (checked) {
                        setSelectedInvoices([...selectedInvoices, invoice.id]);
                      } else {
                        setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                      }
                    }}
                    disabled={invoice.exported}
                  />
                  <div>
                    <h4 className="font-medium">{invoice.number}</h4>
                    <p className="text-sm text-gray-500">
                      {invoice.customerName} • {new Date(invoice.date).toLocaleDateString('de-DE')}
                    </p>
                    {invoice.exported && invoice.exportedAt && (
                      <p className="text-xs text-green-600">
                        Exportiert: {new Date(invoice.exportedAt).toLocaleString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">€{invoice.amount.toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        invoice.status === 'paid'
                          ? 'border-green-500 text-green-500'
                          : invoice.status === 'sent'
                            ? 'border-blue-500 text-blue-500'
                            : invoice.status === 'overdue'
                              ? 'border-red-500 text-red-500'
                              : 'border-gray-500 text-gray-500'
                      }
                    >
                      {invoice.status === 'paid'
                        ? 'Bezahlt'
                        : invoice.status === 'sent'
                          ? 'Versendet'
                          : invoice.status === 'overdue'
                            ? 'Überfällig'
                            : invoice.status === 'draft'
                              ? 'Entwurf'
                              : 'Storniert'}
                    </Badge>
                    {invoice.exported && (
                      <Badge className="bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20">
                        <FiCheck className="w-3 h-3 mr-1" />
                        Exportiert
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Keine Rechnungen für die gewählten Filter gefunden
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiClock className="text-[#14ad9f]" />
            Export-Verlauf
          </CardTitle>
          <CardDescription>Verlauf aller DATEV-Exports und deren Status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      job.status === 'completed'
                        ? 'bg-green-500'
                        : job.status === 'failed'
                          ? 'bg-red-500'
                          : job.status === 'processing'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                    }`}
                  ></div>
                  <div>
                    <h4 className="font-medium">{job.itemName}</h4>
                    <p className="text-sm text-gray-500">
                      {job.type === 'invoice'
                        ? 'Rechnung'
                        : job.type === 'payment'
                          ? 'Zahlung'
                          : 'Transaktion'}{' '}
                      • Gestartet: {new Date(job.startedAt).toLocaleString('de-DE')}
                    </p>
                    {job.error && <p className="text-xs text-red-600">{job.error}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={
                      job.status === 'completed'
                        ? 'border-green-500 text-green-500'
                        : job.status === 'failed'
                          ? 'border-red-500 text-red-500'
                          : job.status === 'processing'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-gray-500 text-gray-500'
                    }
                  >
                    {job.status === 'completed' && <FiCheck className="w-3 h-3 mr-1" />}
                    {job.status === 'failed' && <FiAlertCircle className="w-3 h-3 mr-1" />}
                    {job.status === 'processing' && (
                      <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {job.status === 'completed'
                      ? 'Abgeschlossen'
                      : job.status === 'failed'
                        ? 'Fehlgeschlagen'
                        : job.status === 'processing'
                          ? 'Verarbeitung'
                          : 'Wartend'}
                  </Badge>
                  {job.completedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(job.completedAt).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {exportJobs.length === 0 && (
              <p className="text-center text-gray-500 py-8">Noch keine Export-Aktivitäten</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

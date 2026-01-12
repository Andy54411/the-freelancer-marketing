'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Plus,
  Eye,
  Search,
  RotateCcw,
  CheckCircle,
  Euro,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData } from '@/types/invoiceTypes';

interface CreditComponentProps {
  companyId: string;
}

export function CreditComponent({ companyId }: CreditComponentProps) {
  const router = useRouter();
  const [stornos, setStornos] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStorno, setSelectedStorno] = useState<InvoiceData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadStornos = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Lade alle Rechnungen und filtere nach isStorno === true
      const allInvoices = await FirestoreInvoiceService.getInvoicesByCompany(companyId);
      
      // Filtere nur Stornorechnungen
      const stornoInvoices = allInvoices.filter(invoice => 
        invoice.isStorno === true || 
        (invoice.invoiceNumber && invoice.invoiceNumber.startsWith('ST-'))
      );
      
      setStornos(stornoInvoices);
    } catch (error) {
      console.error('Fehler beim Laden der Stornorechnungen:', error);
      toast.error('Stornorechnungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadStornos();
  }, [loadStornos]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      finalized: { label: 'Abgeschlossen', className: 'bg-green-100 text-green-800' },
      processed: { label: 'Verarbeitet', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Storniert', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredStornos = stornos.filter(
    storno =>
      (storno.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (storno.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (storno.number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateStorno = () => {
    router.push(`/dashboard/company/${companyId}/finance/credits/create`);
  };

  const handleViewStorno = (storno: InvoiceData) => {
    setSelectedStorno(storno);
  };

  const handleDownloadPDF = async (_storno: InvoiceData) => {
    toast.info('PDF-Download wird vorbereitet...');
    // TODO: PDF-Download implementieren
  };

  // Statistiken berechnen
  const stats = {
    total: stornos.length,
    sent: stornos.filter(s => s.status === 'sent').length,
    finalized: stornos.filter(s => s.status === 'finalized' || s.status === 'paid').length,
    totalAmount: stornos.reduce((sum, s) => sum + Math.abs(s.total || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Stornorechnungen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stornorechnungen</h2>
          <p className="text-gray-600 mt-1">Stornorechnungen und Korrekturen verwalten</p>
        </div>
        <Button
          onClick={handleCreateStorno}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Stornorechnung
        </Button>
      </div>

      <div className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-[#14ad9f]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gesamt</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <RotateCcw className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Versendet</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Abgeschlossen</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.finalized}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stornobetrag</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(stats.totalAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Stornorechnungen suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={loadStornos}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          {/* Stornos List */}
          <Card>
            <CardHeader>
              <CardTitle>Stornorechnungen</CardTitle>
              <CardDescription>
                Alle erstellten Stornorechnungen im Überblick
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredStornos.length === 0 ? (
                <div className="text-center py-8">
                  <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Keine Stornorechnungen gefunden' : 'Keine Stornorechnungen vorhanden'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? 'Versuchen Sie andere Suchbegriffe'
                      : 'Erstellen Sie Ihre erste Stornorechnung'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleCreateStorno}
                      className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    >
                      Erste Stornorechnung erstellen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStornos.map(storno => (
                    <div
                      key={storno.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="shrink-0">
                          <RotateCcw className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {storno.invoiceNumber || storno.number || 'Ohne Nummer'}
                            {storno.originalInvoiceNumber && (
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                (Storno zu {storno.originalInvoiceNumber})
                              </span>
                            )}
                          </h4>
                          {storno.originalInvoiceNumber && storno.originalInvoiceDate && (
                            <p className="text-xs text-[#14ad9f]">
                              Urspr. Rechnung: {storno.originalInvoiceNumber} vom {formatDate(storno.originalInvoiceDate)}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">{storno.customerName || 'Kein Kunde'}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(storno.status || 'draft')}
                            <span className="text-xs text-gray-500">
                              {formatDate(storno.date || storno.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-red-600">
                            {formatCurrency(storno.total || 0)}
                          </p>
                          {storno.description && (
                            <p className="text-sm text-gray-600 max-w-xs truncate">
                              {storno.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStorno(storno)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ansehen
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPDF(storno)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Storno Detail Modal */}
      {selectedStorno && (
        <Dialog open={!!selectedStorno} onOpenChange={() => setSelectedStorno(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Stornorechnung: {selectedStorno.invoiceNumber || selectedStorno.number}
              </DialogTitle>
              <DialogDescription>
                Detailansicht der Stornorechnung für {selectedStorno.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedStorno.status || 'draft')}
                  <span className="text-sm text-gray-600">
                    Erstellt am: {formatDate(selectedStorno.createdAt)}
                  </span>
                  {selectedStorno.originalInvoiceId && (
                    <span className="text-sm text-gray-600">
                      Urspr. Rechnung-ID: {selectedStorno.originalInvoiceId}
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadPDF(selectedStorno)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF Download
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Kunde</h4>
                  <p className="text-sm text-gray-600">{selectedStorno.customerName}</p>
                  {selectedStorno.customerAddress && (
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {selectedStorno.customerAddress}
                    </p>
                  )}
                  {selectedStorno.customerEmail && (
                    <p className="text-sm text-gray-600">{selectedStorno.customerEmail}</p>
                  )}
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nummer:</span>
                      <span>{selectedStorno.invoiceNumber || selectedStorno.number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Datum:</span>
                      <span>{formatDate(selectedStorno.date || selectedStorno.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span>{selectedStorno.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedStorno.description && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Beschreibung</h4>
                  <p className="text-sm text-gray-600">{selectedStorno.description}</p>
                </div>
              )}

              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Positionen</h4>
                {selectedStorno.items && selectedStorno.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStorno.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                        <span className="flex-1">{item.description}</span>
                        <span className="w-20 text-right">{item.quantity} x</span>
                        <span className="w-24 text-right">{formatCurrency(item.unitPrice)}</span>
                        <span className="w-24 text-right font-medium text-red-600">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Keine Positionen vorhanden</p>
                )}
                
                <div className="border-t mt-4 pt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Netto:</span>
                    <span className="text-red-600">{formatCurrency(selectedStorno.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>MwSt. ({selectedStorno.vatRate || 19}%):</span>
                    <span className="text-red-600">{formatCurrency(selectedStorno.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg">
                    <span>Gesamt:</span>
                    <span className="text-red-600">{formatCurrency(selectedStorno.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

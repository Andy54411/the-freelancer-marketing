'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Download,
  Eye,
  Calendar,
  User,
  Hash,
  Euro,
} from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceTemplateRenderer } from './InvoiceTemplates';
import { toast } from 'sonner';

interface StornoInvoiceProps {
  invoice: InvoiceData;
  onStornoCreated?: (stornoInvoice: InvoiceData) => void;
}

export default function StornoInvoice({ invoice, onStornoCreated }: StornoInvoiceProps) {
  const [isCreatingStorno, setIsCreatingStorno] = useState(false);
  const [stornoReason, setStornoReason] = useState('');
  const [stornoInvoice, setStornoInvoice] = useState<InvoiceData | null>(null);
  const [showStornoPreview, setShowStornoPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('de-DE');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Entwurf', variant: 'secondary' as const, icon: FileText },
      sent: { label: 'Gesendet', variant: 'default' as const, icon: CheckCircle },
      paid: { label: 'Bezahlt', variant: 'default' as const, icon: CheckCircle },
      overdue: { label: 'Überfällig', variant: 'destructive' as const, icon: AlertTriangle },
      cancelled: { label: 'Storniert', variant: 'secondary' as const, icon: X },
      storno: { label: 'Storno', variant: 'destructive' as const, icon: X },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCreateStorno = async () => {
    if (!stornoReason.trim()) {
      toast.error('Bitte geben Sie einen Grund für die Stornierung an');
      return;
    }

    if (!user) {
      toast.error('Sie müssen angemeldet sein');
      return;
    }

    setIsCreatingStorno(true);

    try {
      const createdStornoInvoice = await FirestoreInvoiceService.createAndSaveStornoInvoice(
        invoice.companyId || invoice.id, // companyId ist der erste Parameter
        invoice.id,
        stornoReason.trim(),
        user.email || user.uid
      );

      setStornoInvoice(createdStornoInvoice);
      toast.success('Storno-Rechnung erfolgreich erstellt');

      if (onStornoCreated) {
        onStornoCreated(createdStornoInvoice);
      }

      setShowConfirmDialog(false);
      setStornoReason('');
    } catch (error) {
      console.error('Storno creation error:', error);
      toast.error('Fehler beim Erstellen der Storno-Rechnung');
    } finally {
      setIsCreatingStorno(false);
    }
  };

  const handleDownloadStornoPdf = async () => {
    if (!stornoInvoice) {
      toast.error('Keine Storno-Rechnung verfügbar');
      return;
    }

    try {
      toast.info('PDF wird erstellt...');

      // Nutze die bestehende PDF-Generation API
      const response = await fetch('/api/generate-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceData: stornoInvoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF-Generierung fehlgeschlagen');
      }

      const contentType = response.headers.get('content-type');

      // Prüfe ob wir direkt ein PDF erhalten haben (Development mit Puppeteer)
      if (contentType?.includes('application/pdf')) {
        const pdfBlob = await response.blob();
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Download auslösen
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Storno-Rechnung_${stornoInvoice.invoiceNumber || stornoInvoice.number || 'storno'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);

        toast.success('Storno-PDF erfolgreich heruntergeladen');
      } else {
        // Fallback: JSON Response mit Print-URL
        const data = await response.json();
        if (data.printUrl) {
          // Öffne Print-Seite in neuem Tab für Browser-basierte PDF-Generierung
          window.open(data.printUrl, '_blank');
          toast.success('Storno-PDF wird in neuem Tab geöffnet');
        } else {
          throw new Error('Keine PDF-URL erhalten');
        }
      }
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(
        `PDF-Download fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    }
  };

  const canBeStorniert = () => {
    return (invoice.status === 'sent' || invoice.status === 'paid') && !invoice.isStorno;
  };

  if (!canBeStorniert()) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Diese Rechnung kann nicht storniert werden</span>
          </div>
          <p className="text-sm text-amber-600 mt-2">
            Nur gesendete oder bezahlte Rechnungen können storniert werden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Original Invoice Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Original-Rechnung
          </CardTitle>
          <CardDescription>Informationen zur zu stornierenden Rechnung</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Rechnungsnummer:</span>
                <span>{invoice.sequentialNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Datum:</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Kunde:</span>
                <span>{invoice.customerName}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Betrag:</span>
                <span className="font-bold text-lg">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storno Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <X className="w-5 h-5" />
            Storno-Rechnung erstellen
          </CardTitle>
          <CardDescription>
            Erstellen Sie eine Storno-Rechnung für die oben genannte Original-Rechnung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stornoReason">Grund für Stornierung *</Label>
            <Textarea
              id="stornoReason"
              placeholder="Geben Sie hier den Grund für die Stornierung ein..."
              value={stornoReason}
              onChange={e => setStornoReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-sm text-gray-500">
              Der Stornierungsgrund wird auf der Storno-Rechnung vermerkt und ist für die
              Buchhaltung erforderlich.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-1">Wichtige Hinweise zur Stornierung</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Die Storno-Rechnung erhält eine neue, fortlaufende Rechnungsnummer</li>
                  <li>• Alle Beträge werden negativ ausgewiesen (Gutschrift)</li>
                  <li>• Die Original-Rechnung wird als &quot;Storniert&quot; markiert</li>
                  <li>• Der Vorgang kann nicht rückgängig gemacht werden</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={!stornoReason.trim() || isCreatingStorno}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  {isCreatingStorno ? 'Erstelle Storno...' : 'Storno-Rechnung erstellen'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Stornierung bestätigen
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Sind Sie sicher, dass Sie die Rechnung{' '}
                    <strong>{invoice.sequentialNumber}</strong> stornieren möchten?
                    <br />
                    <br />
                    <strong>Grund:</strong> {stornoReason}
                    <br />
                    <br />
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCreateStorno}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isCreatingStorno}
                  >
                    {isCreatingStorno ? 'Erstelle...' : 'Stornierung bestätigen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Storno Invoice Result */}
      {stornoInvoice && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Storno-Rechnung erfolgreich erstellt
            </CardTitle>
            <CardDescription>Die Storno-Rechnung wurde erstellt und gespeichert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Storno-Nummer:</span>
                  <span className="font-bold">{stornoInvoice.sequentialNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Erstellt am:</span>
                  <span>{formatDate(stornoInvoice.issueDate)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Storno-Betrag:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(stornoInvoice.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  {getStatusBadge(stornoInvoice.status)}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Dialog open={showStornoPreview} onOpenChange={setShowStornoPreview}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Storno-Rechnung anzeigen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Storno-Rechnung {stornoInvoice.sequentialNumber}</DialogTitle>
                    <DialogDescription>Vorschau der erstellten Storno-Rechnung</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <InvoiceTemplateRenderer
                      data={stornoInvoice}
                      template="TEMPLATE_NEUTRAL"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowStornoPreview(false)}>
                      Schließen
                    </Button>
                    <Button
                      className="bg-[#14ad9f] hover:bg-[#129488]"
                      onClick={handleDownloadStornoPdf}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF herunterladen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

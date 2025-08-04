'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Eye,
  Send,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EInvoiceService,
  EInvoiceData,
  EInvoiceSettings,
  XRechnungMetadata,
  ZUGFeRDMetadata,
} from '@/services/eInvoiceService';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceData } from '@/types/invoiceTypes';

interface EInvoiceComponentProps {
  companyId: string;
}

export function EInvoiceComponent({ companyId }: EInvoiceComponentProps) {
  const [eInvoices, setEInvoices] = useState<EInvoiceData[]>([]);
  const [settings, setSettings] = useState<EInvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<EInvoiceData | null>(null);
  const [previewXML, setPreviewXML] = useState('');
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);

  // Form States für neue E-Rechnung
  const [newEInvoiceForm, setNewEInvoiceForm] = useState({
    format: 'zugferd' as 'zugferd' | 'xrechnung',
    standard: 'EN16931' as 'EN16931' | 'BASIC' | 'COMFORT' | 'EXTENDED',
    invoiceId: '',
    buyerReference: '',
    leitwegId: '',
    processingNote: '',
  });

  // Einstellungen Form
  const [settingsForm, setSettingsForm] = useState<Partial<EInvoiceSettings>>({
    defaultFormat: 'zugferd',
    defaultStandard: 'EN16931',
    enableAutoGeneration: false,
    peppol: {
      enabled: false,
      participantId: '',
      endpoint: '',
    },
    validation: {
      strictMode: true,
      autoCorrection: false,
    },
  });

  useEffect(() => {
    loadEInvoices();
    loadSettings();
  }, [companyId]);

  const loadEInvoices = async () => {
    try {
      setLoading(true);
      const invoices = await EInvoiceService.getEInvoicesByCompany(companyId);
      setEInvoices(invoices);
    } catch (error) {
      console.error('Fehler beim Laden der E-Rechnungen:', error);
      toast.error('E-Rechnungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // Implementierung zum Laden der Einstellungen
      // Hier würden die gespeicherten Einstellungen geladen werden
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    }
  };

  const loadInvoiceByNumber = async (invoiceNumber: string) => {
    if (!invoiceNumber.trim()) {
      setSelectedInvoiceData(null);
      return;
    }

    try {
      setLoadingInvoice(true);
      console.log('Lade Rechnung mit Nummer:', invoiceNumber);

      // Alle Rechnungen der Firma laden
      const allInvoices = await FirestoreInvoiceService.getInvoicesByCompany(companyId);
      console.log('Gefundene Rechnungen:', allInvoices.length);

      // Rechnung anhand der Rechnungsnummer finden
      const foundInvoice = allInvoices.find(
        invoice => invoice.invoiceNumber === invoiceNumber || invoice.number === invoiceNumber
      );

      if (foundInvoice) {
        console.log('Rechnung gefunden:', foundInvoice);
        setSelectedInvoiceData(foundInvoice);
        toast.success(`Rechnung ${invoiceNumber} gefunden`);
      } else {
        console.log('Rechnung nicht gefunden');
        setSelectedInvoiceData(null);
        toast.error(`Rechnung ${invoiceNumber} nicht gefunden`);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnung:', error);
      toast.error('Fehler beim Laden der Rechnung');
      setSelectedInvoiceData(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleGenerateEInvoice = async (invoiceData?: any) => {
    try {
      setGenerating(true);

      // Verwende echte Rechnungsdaten falls verfügbar, sonst Fallback zu Test-Daten
      let finalInvoiceData = invoiceData;

      if (selectedInvoiceData && !invoiceData) {
        // Konvertiere FirestoreInvoiceData zu E-Rechnungs-Format
        // Sichere Behandlung von Date-Feldern (können Date-Objekte oder Strings sein)
        const formatDateSafely = (dateValue: any): string => {
          if (!dateValue) return new Date().toISOString().split('T')[0];
          if (typeof dateValue === 'string') return dateValue;
          if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
          if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            // Firestore Timestamp
            return dateValue.toDate().toISOString().split('T')[0];
          }
          return new Date(dateValue).toISOString().split('T')[0];
        };

        finalInvoiceData = {
          invoiceNumber: selectedInvoiceData.invoiceNumber || selectedInvoiceData.number,
          issueDate: formatDateSafely(selectedInvoiceData.createdAt),
          dueDate: selectedInvoiceData.dueDate
            ? formatDateSafely(selectedInvoiceData.dueDate)
            : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          customerName: selectedInvoiceData.customerName || 'Kunde',
          customerAddress: selectedInvoiceData.customerAddress || 'Adresse nicht verfügbar',
          amount: selectedInvoiceData.amount || 0,
          tax: selectedInvoiceData.tax || 0,
          total: selectedInvoiceData.total || 0,
          vatRate: selectedInvoiceData.vatRate || 19,
          items: selectedInvoiceData.items || [
            {
              description: 'Position aus importierter Rechnung',
              quantity: 1,
              unitPrice: selectedInvoiceData.amount || 0,
              total: selectedInvoiceData.amount || 0,
            },
          ],
        };
        console.log('Verwende echte Rechnungsdaten:', finalInvoiceData);
      } else if (!finalInvoiceData) {
        // Fallback zu Test-Daten
        finalInvoiceData = {
          invoiceNumber: newEInvoiceForm.invoiceId,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          customerName: 'Test Kunde',
          customerAddress: 'Test Str. 1\n12345 Berlin',
          amount: 1000,
          tax: 190,
          total: 1190,
          vatRate: 19,
          items: [{ description: 'Test Position', quantity: 1, unitPrice: 1000, total: 1000 }],
        };
        console.log('Verwende Test-Daten:', finalInvoiceData);
      }

      let xmlContent = '';

      if (newEInvoiceForm.format === 'zugferd') {
        const metadata: ZUGFeRDMetadata = {
          conformanceLevel: newEInvoiceForm.standard as 'BASIC' | 'COMFORT' | 'EXTENDED',
          guideline: 'urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p1:extended',
          specificationId: 'urn:cen.eu:en16931:2017',
        };

        xmlContent = await EInvoiceService.generateZUGFeRDXML(finalInvoiceData, metadata, {
          companyName: 'Test Firma',
          companyAddress: 'Test Str. 1\n12345 Berlin',
          companyVatId: 'DE123456789',
        });
      } else {
        const metadata: XRechnungMetadata = {
          buyerReference: newEInvoiceForm.buyerReference,
          leitwegId: newEInvoiceForm.leitwegId,
          processingNote: newEInvoiceForm.processingNote,
          specificationId: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
          businessProcessType: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
        };

        xmlContent = await EInvoiceService.generateXRechnungXML(finalInvoiceData, metadata, {
          companyName: 'Test Firma',
          companyAddress: 'Test Str. 1\n12345 Berlin',
          companyVatId: 'DE123456789',
        });
      }

      // Validierung
      const validation = await EInvoiceService.validateEInvoice(xmlContent, newEInvoiceForm.format);

      // E-Rechnung speichern
      const eInvoiceId = await EInvoiceService.createEInvoice({
        invoiceId: finalInvoiceData.invoiceNumber || newEInvoiceForm.invoiceId,
        companyId,
        format: newEInvoiceForm.format,
        standard: newEInvoiceForm.standard,
        xmlContent,
        validationStatus: validation.isValid ? 'valid' : 'invalid',
        validationErrors: validation.errors,
        transmissionStatus: 'draft',
      });

      toast.success('E-Rechnung erfolgreich generiert');
      setPreviewXML(xmlContent);
      await loadEInvoices();
    } catch (error) {
      console.error('Fehler beim Generieren der E-Rechnung:', error);
      toast.error('E-Rechnung konnte nicht generiert werden');
    } finally {
      setGenerating(false);
    }
  };

  const handleValidateInvoice = async (invoice: EInvoiceData) => {
    try {
      setValidating(true);
      const validation = await EInvoiceService.validateEInvoice(invoice.xmlContent, invoice.format);

      if (validation.isValid) {
        toast.success('E-Rechnung ist gültig');
      } else {
        toast.error(`Validierung fehlgeschlagen: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Fehler bei der Validierung:', error);
      toast.error('Validierung fehlgeschlagen');
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadXML = (invoice: EInvoiceData) => {
    const blob = new Blob([invoice.xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e-rechnung-${invoice.invoiceId}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = async () => {
    try {
      await EInvoiceService.saveEInvoiceSettings({
        companyId,
        ...settingsForm,
      } as Omit<EInvoiceSettings, 'id' | 'createdAt' | 'updatedAt'>);

      toast.success('Einstellungen gespeichert');
      setShowSettings(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      toast.error('Einstellungen konnten nicht gespeichert werden');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Gültig
          </Badge>
        );
      case 'invalid':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Ungültig
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Prüfung
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  const getTransmissionBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Versendet</Badge>;
      case 'received':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Empfangen</Badge>;
      case 'processed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Verarbeitet</Badge>;
      case 'draft':
        return <Badge variant="outline">Entwurf</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade E-Rechnungen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setShowSettings(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Einstellungen
        </Button>
        <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
          <FileText className="h-4 w-4 mr-2" />
          Neue E-Rechnung
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="generate">Erstellen</TabsTrigger>
          <TabsTrigger value="validate">Validierung</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistiken */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-[#14ad9f]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gesamt</p>
                    <p className="text-2xl font-bold text-gray-900">{eInvoices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gültig</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {eInvoices.filter(inv => inv.validationStatus === 'valid').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Send className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Versendet</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {eInvoices.filter(inv => inv.transmissionStatus === 'sent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Fehler</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {eInvoices.filter(inv => inv.validationStatus === 'invalid').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* E-Rechnungs-Liste */}
          <Card>
            <CardHeader>
              <CardTitle>E-Rechnungen</CardTitle>
              <CardDescription>
                Alle erstellten elektronischen Rechnungen im Überblick
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine E-Rechnungen vorhanden
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Erstellen Sie Ihre erste elektronische Rechnung im ZUGFeRD oder XRechnung
                    Format.
                  </p>
                  <Button
                    onClick={() => setActiveTab('generate')}
                    className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                  >
                    Erste E-Rechnung erstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {eInvoices.map(invoice => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <FileText className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{invoice.invoiceId}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{invoice.format.toUpperCase()}</Badge>
                            <Badge variant="outline">{invoice.standard}</Badge>
                            {getStatusBadge(invoice.validationStatus)}
                            {getTransmissionBadge(invoice.transmissionStatus)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Vorschau
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadXML(invoice)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleValidateInvoice(invoice)}
                          disabled={validating}
                        >
                          {validating ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Validieren
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Neue E-Rechnung erstellen</CardTitle>
              <CardDescription>
                Generieren Sie eine neue elektronische Rechnung im ZUGFeRD oder XRechnung Format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select
                    value={newEInvoiceForm.format}
                    onValueChange={(value: 'zugferd' | 'xrechnung') =>
                      setNewEInvoiceForm(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Format wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zugferd">ZUGFeRD</SelectItem>
                      <SelectItem value="xrechnung">XRechnung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standard">Standard</Label>
                  <Select
                    value={newEInvoiceForm.standard}
                    onValueChange={(value: any) =>
                      setNewEInvoiceForm(prev => ({ ...prev, standard: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Standard wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EN16931">EN 16931</SelectItem>
                      <SelectItem value="BASIC">BASIC</SelectItem>
                      <SelectItem value="COMFORT">COMFORT</SelectItem>
                      <SelectItem value="EXTENDED">EXTENDED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceId">Rechnungs-ID</Label>
                <div className="relative">
                  <Input
                    id="invoiceId"
                    value={newEInvoiceForm.invoiceId}
                    onChange={e => {
                      const value = e.target.value;
                      setNewEInvoiceForm(prev => ({ ...prev, invoiceId: value }));
                      // Automatische Suche nach der Rechnung bei Eingabe
                      if (value.length >= 3) {
                        loadInvoiceByNumber(value);
                      } else {
                        setSelectedInvoiceData(null);
                      }
                    }}
                    placeholder="z.B. R-2025-001"
                    className={selectedInvoiceData ? 'border-green-500' : ''}
                  />
                  {loadingInvoice && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Anzeige der gefundenen Rechnung */}
                {selectedInvoiceData && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Rechnung gefunden</span>
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>
                        <strong>Kunde:</strong> {selectedInvoiceData.customerName || 'Unbekannt'}
                      </div>
                      <div>
                        <strong>Betrag:</strong>{' '}
                        {(
                          selectedInvoiceData.totalAmount ||
                          selectedInvoiceData.total ||
                          0
                        ).toFixed(2)}{' '}
                        €
                      </div>
                      <div>
                        <strong>Datum:</strong>{' '}
                        {selectedInvoiceData.createdAt
                          ? new Date(selectedInvoiceData.createdAt).toLocaleDateString('de-DE')
                          : 'Unbekannt'}
                      </div>
                      <div>
                        <strong>Status:</strong> {selectedInvoiceData.status || 'Unbekannt'}
                      </div>
                    </div>
                  </div>
                )}

                {newEInvoiceForm.invoiceId.length >= 3 &&
                  !loadingInvoice &&
                  !selectedInvoiceData && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Keine Rechnung mit dieser ID gefunden. Es werden Test-Daten verwendet.
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {newEInvoiceForm.format === 'xrechnung' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="buyerReference">Buyer Reference</Label>
                    <Input
                      id="buyerReference"
                      value={newEInvoiceForm.buyerReference}
                      onChange={e =>
                        setNewEInvoiceForm(prev => ({ ...prev, buyerReference: e.target.value }))
                      }
                      placeholder="Referenz des Käufers"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leitwegId">Leitweg-ID</Label>
                    <Input
                      id="leitwegId"
                      value={newEInvoiceForm.leitwegId}
                      onChange={e =>
                        setNewEInvoiceForm(prev => ({ ...prev, leitwegId: e.target.value }))
                      }
                      placeholder="z.B. 991-1234567-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingNote">Verarbeitungshinweis</Label>
                    <Textarea
                      id="processingNote"
                      value={newEInvoiceForm.processingNote}
                      onChange={e =>
                        setNewEInvoiceForm(prev => ({ ...prev, processingNote: e.target.value }))
                      }
                      placeholder="Optionaler Hinweis zur Verarbeitung"
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleGenerateEInvoice()}
                  disabled={generating || !newEInvoiceForm.invoiceId}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      {selectedInvoiceData
                        ? 'E-Rechnung aus importierter Rechnung generieren'
                        : 'E-Rechnung mit Test-Daten generieren'}
                    </>
                  )}
                </Button>
              </div>

              {/* XML Vorschau */}
              {previewXML && (
                <div className="space-y-2">
                  <Label>XML Vorschau</Label>
                  <Textarea value={previewXML} readOnly rows={10} className="font-mono text-sm" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>E-Rechnung Validierung</CardTitle>
              <CardDescription>
                Laden Sie eine E-Rechnung hoch um sie nach EN 16931 Standard zu validieren
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">E-Rechnung hochladen</h3>
                <p className="text-gray-600 mb-4">Unterstützte Formate: XML (ZUGFeRD, XRechnung)</p>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Datei auswählen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* XML Vorschau Modal */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>E-Rechnung: {selectedInvoice.invoiceId}</DialogTitle>
              <DialogDescription>
                {selectedInvoice.format.toUpperCase()} Format, Standard: {selectedInvoice.standard}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedInvoice.validationStatus)}
                  {getTransmissionBadge(selectedInvoice.transmissionStatus)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadXML(selectedInvoice)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  XML Download
                </Button>
              </div>

              <div>
                <Label>XML Inhalt</Label>
                <Textarea
                  value={selectedInvoice.xmlContent}
                  readOnly
                  rows={15}
                  className="font-mono text-sm mt-2"
                />
              </div>

              {selectedInvoice.validationErrors && selectedInvoice.validationErrors.length > 0 && (
                <div>
                  <Label className="text-red-600">Validierungsfehler</Label>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-red-600">
                    {selectedInvoice.validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Einstellungen Modal */}
      {showSettings && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>E-Rechnungs Einstellungen</DialogTitle>
              <DialogDescription>
                Konfigurieren Sie die Standardeinstellungen für E-Rechnungen
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Standard Format</Label>
                  <Select
                    value={settingsForm.defaultFormat}
                    onValueChange={(value: any) =>
                      setSettingsForm(prev => ({ ...prev, defaultFormat: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zugferd">ZUGFeRD</SelectItem>
                      <SelectItem value="xrechnung">XRechnung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Standard</Label>
                  <Select
                    value={settingsForm.defaultStandard}
                    onValueChange={(value: any) =>
                      setSettingsForm(prev => ({ ...prev, defaultStandard: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EN16931">EN 16931</SelectItem>
                      <SelectItem value="BASIC">BASIC</SelectItem>
                      <SelectItem value="COMFORT">COMFORT</SelectItem>
                      <SelectItem value="EXTENDED">EXTENDED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Automatische Generierung</Label>
                  <p className="text-sm text-gray-600">
                    E-Rechnungen automatisch bei Rechnungserstellung generieren
                  </p>
                </div>
                <Switch
                  checked={settingsForm.enableAutoGeneration}
                  onCheckedChange={checked =>
                    setSettingsForm(prev => ({ ...prev, enableAutoGeneration: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Strikte Validierung</Label>
                  <p className="text-sm text-gray-600">
                    Strenge Validierung nach EN 16931 Standard
                  </p>
                </div>
                <Switch
                  checked={settingsForm.validation?.strictMode || false}
                  onCheckedChange={checked =>
                    setSettingsForm(prev => ({
                      ...prev,
                      validation: {
                        strictMode: checked,
                        autoCorrection: prev.validation?.autoCorrection || false,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveSettings}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  Einstellungen speichern
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

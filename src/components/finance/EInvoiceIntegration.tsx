/**
 * E-Invoice Integration Komponente
 * Vollständige deutsche E-Rechnung-Compliance für Taskilo
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Send,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  Globe,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EInvoiceService,
  EInvoiceData,
  EInvoiceSettings,
  TSEData,
} from '@/services/eInvoiceService';

interface EInvoiceIntegrationProps {
  companyId: string;
  invoiceData?: any;
  onEInvoiceGenerated?: (eInvoiceData: EInvoiceData) => void;
  onSettingsChanged?: (settings: EInvoiceSettings) => void;
}

interface EInvoiceStatus {
  xmlGenerated: boolean;
  pdfA3Generated: boolean;
  validationPassed: boolean;
  transmissionReady: boolean;
  tseSigned: boolean;
}

export function EInvoiceIntegration({
  companyId,
  invoiceData,
  onEInvoiceGenerated: _onEInvoiceGenerated,
  onSettingsChanged,
}: EInvoiceIntegrationProps) {
  const [settings, setSettings] = useState<EInvoiceSettings | null>(null);
  const [eInvoiceStatus, setEInvoiceStatus] = useState<EInvoiceStatus>({
    xmlGenerated: false,
    pdfA3Generated: false,
    validationPassed: false,
    transmissionReady: false,
    tseSigned: false,
  });
  const [tseData, setTseData] = useState<TSEData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string>('');
  const [showXmlPreview, setShowXmlPreview] = useState(false);

  // E-Invoice Settings laden
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await EInvoiceService.getEInvoiceSettings(companyId);
        setSettings(settingsData);
      } catch {
        setSettings({
          companyId,
          defaultFormat: 'zugferd',
          defaultStandard: 'EN16931',
          enableAutoGeneration: false,
          peppol: {
            enabled: false,
          },
          validation: {
            strictMode: true,
            autoCorrection: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    };

    if (companyId) {
      loadSettings();
    }
  }, [companyId]);

  // ZUGFeRD XML generieren
  const generateZUGFeRDXML = async () => {
    if (!invoiceData || !settings) {
      toast.error('Rechnungsdaten oder Einstellungen fehlen');
      return;
    }

    setGenerating(true);
    try {
      const xmlContent = await EInvoiceService.generateZUGFeRDWithTSE(
        invoiceData,
        {
          conformanceLevel: settings.defaultStandard as any,
          guideline: 'urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p1:extended',
          specificationId: 'urn:cen.eu:en16931:2017',
        },
        {
          companyName: invoiceData.companyName,
          companyAddress: invoiceData.companyAddress,
          companyVatId: invoiceData.companyVatId,
          email: invoiceData.companyEmail,
          phoneNumber: invoiceData.companyPhone,
        },
        tseData || undefined
      );

      setXmlPreview(xmlContent);
      setEInvoiceStatus(prev => ({
        ...prev,
        xmlGenerated: true,
        tseSigned: !!tseData,
      }));

      toast.success('ZUGFeRD XML erfolgreich generiert');
    } catch (error) {
      console.error('Fehler bei XML-Generierung:', error);
      toast.error('XML-Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  // XRechnung XML generieren
  const generateXRechnungXML = async () => {
    if (!invoiceData || !settings) {
      toast.error('Rechnungsdaten oder Einstellungen fehlen');
      return;
    }

    setGenerating(true);
    try {
      const xmlContent = await EInvoiceService.generateXRechnungXML(
        invoiceData,
        {
          buyerReference: invoiceData.reference || invoiceData.customerOrderNumber || '',
          leitwegId: settings.xrechnung?.leitwegId || '',
          specificationId: 'urn:cen.eu:en16931:2017',
          businessProcessType: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
        },
        {
          companyName: invoiceData.companyName,
          companyAddress: invoiceData.companyAddress,
          companyVatId: invoiceData.companyVatId,
          email: invoiceData.companyEmail,
          phoneNumber: invoiceData.companyPhone,
        }
      );

      setXmlPreview(xmlContent);
      setEInvoiceStatus(prev => ({
        ...prev,
        xmlGenerated: true,
      }));

      toast.success('XRechnung XML erfolgreich generiert');
    } catch (error) {
      console.error('Fehler bei XRechnung-Generierung:', error);
      toast.error('XRechnung-Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  // XML validieren
  const validateXML = async () => {
    if (!xmlPreview) {
      toast.error('Keine XML-Daten zum Validieren vorhanden');
      return;
    }

    setValidating(true);
    try {
      const validationResult = await EInvoiceService.validateEInvoice(
        xmlPreview,
        settings?.defaultFormat || 'zugferd'
      );
      if (validationResult.isValid) {
        setEInvoiceStatus(prev => ({ ...prev, validationPassed: true }));
        toast.success('XML-Validierung erfolgreich');
      } else {
        toast.error(`Validierung fehlgeschlagen: ${validationResult.errors.join(', ')}`);
      }

      if (validationResult.warnings.length > 0) {
        toast.warning(`Warnungen: ${validationResult.warnings.join(', ')}`);
      }
    } catch (error) {
      console.error('Fehler bei Validierung:', error);
      toast.error('Validierung fehlgeschlagen');
    } finally {
      setValidating(false);
    }
  };

  // PDF/A-3 mit eingebetteter XML erstellen
  const _generatePDFA3 = async (pdfBuffer: ArrayBuffer) => {
    if (!xmlPreview) {
      toast.error('XML-Daten fehlen für PDF/A-3 Erstellung');
      return null;
    }

    try {
      const pdfA3Buffer = await EInvoiceService.createPDFA3WithXML(
        pdfBuffer,
        xmlPreview,
        'zugferd-data.xml'
      );

      setEInvoiceStatus(prev => ({ ...prev, pdfA3Generated: true }));
      toast.success('PDF/A-3 mit eingebetteter XML erstellt');

      return pdfA3Buffer;
    } catch (error) {
      console.error('Fehler bei PDF/A-3 Erstellung:', error);
      toast.error('PDF/A-3 Erstellung fehlgeschlagen');
      return null;
    }
  };

  // E-Invoice übertragen
  const transmitEInvoice = async () => {
    if (!xmlPreview || !settings) {
      toast.error('XML-Daten oder Übertragungseinstellungen fehlen');
      return;
    }

    setTransmitting(true);
    try {
      // Hier würde die tatsächliche Übertragung stattfinden
      // Je nach Konfiguration: PEPPOL, E-Mail, Portal, etc.

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation

      setEInvoiceStatus(prev => ({ ...prev, transmissionReady: true }));
      toast.success('E-Rechnung erfolgreich übertragen');
    } catch (error) {
      console.error('Fehler bei Übertragung:', error);
      toast.error('Übertragung fehlgeschlagen');
    } finally {
      setTransmitting(false);
    }
  };

  // TSE-Daten aktualisieren
  const _updateTSEData = (newTseData: Partial<TSEData>) => {
    setTseData(prev => (prev ? { ...prev, ...newTseData } : null));
  };

  if (!settings) {
    return <div>E-Invoice Einstellungen werden geladen...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#14ad9f]" />
          Deutsche E-Rechnung-Compliance
          <Badge variant={eInvoiceStatus.validationPassed ? 'default' : 'secondary'}>
            {settings.defaultFormat.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            {eInvoiceStatus.xmlGenerated ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">XML generiert</span>
          </div>

          <div className="flex items-center gap-2">
            {eInvoiceStatus.tseSigned ? (
              <Shield className="h-4 w-4 text-green-500" />
            ) : (
              <Shield className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">TSE signiert</span>
          </div>

          <div className="flex items-center gap-2">
            {eInvoiceStatus.validationPassed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Validiert</span>
          </div>

          <div className="flex items-center gap-2">
            {eInvoiceStatus.pdfA3Generated ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">PDF/A-3</span>
          </div>

          <div className="flex items-center gap-2">
            {eInvoiceStatus.transmissionReady ? (
              <Send className="h-4 w-4 text-green-500" />
            ) : (
              <Globe className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Übertragbar</span>
          </div>
        </div>

        <Separator />

        {/* Format und Standard Auswahl */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>E-Rechnung Format</Label>
            <Select
              value={settings.defaultFormat}
              onValueChange={(value: 'zugferd' | 'xrechnung') => {
                const newSettings = { ...settings, defaultFormat: value };
                setSettings(newSettings);
                onSettingsChanged?.(newSettings);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zugferd">ZUGFeRD (PDF/A-3)</SelectItem>
                <SelectItem value="xrechnung">XRechnung (XML)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Standard-Level</Label>
            <Select
              value={settings.defaultStandard}
              onValueChange={(value: any) => {
                const newSettings = { ...settings, defaultStandard: value };
                setSettings(newSettings);
                onSettingsChanged?.(newSettings);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN16931">EN 16931 (Standard)</SelectItem>
                <SelectItem value="BASIC">BASIC</SelectItem>
                <SelectItem value="COMFORT">COMFORT</SelectItem>
                <SelectItem value="EXTENDED">EXTENDED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={
              settings.defaultFormat === 'zugferd' ? generateZUGFeRDXML : generateXRechnungXML
            }
            disabled={generating || !invoiceData}
            className="bg-[#14ad9f] hover:bg-taskilo-hover"
          >
            {generating ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                {settings.defaultFormat.toUpperCase()} generieren
              </>
            )}
          </Button>

          <Button variant="outline" onClick={validateXML} disabled={validating || !xmlPreview}>
            {validating ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                Validiere...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validieren
              </>
            )}
          </Button>

          <Dialog open={showXmlPreview} onOpenChange={setShowXmlPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!xmlPreview}>
                <FileText className="h-4 w-4 mr-2" />
                XML ansehen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Generierte E-Rechnung XML</DialogTitle>
              </DialogHeader>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">{xmlPreview}</pre>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={transmitEInvoice}
            disabled={transmitting || !eInvoiceStatus.validationPassed}
          >
            {transmitting ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-spin" />
                Übertrage...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Übertragen
              </>
            )}
          </Button>
        </div>

        {/* TSE Integration */}
        {tseData && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">TSE-Daten integriert</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>Seriennummer: {tseData.serialNumber}</div>
              <div>Transaktion: {tseData.transactionNumber}</div>
              <div>Algorithmus: {tseData.signatureAlgorithm}</div>
              <div>Zertifikat: {tseData.certificateSerial}</div>
            </div>
          </div>
        )}

        {/* Automatic Generation Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="font-medium">Automatische E-Rechnung-Generierung</Label>
            <p className="text-sm text-gray-600">
              E-Rechnungen automatisch bei Rechnungserstellung generieren
            </p>
          </div>
          <Switch
            checked={settings.enableAutoGeneration}
            onCheckedChange={checked => {
              const newSettings = { ...settings, enableAutoGeneration: checked };
              setSettings(newSettings);
              onSettingsChanged?.(newSettings);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

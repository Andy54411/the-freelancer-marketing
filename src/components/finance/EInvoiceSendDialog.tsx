/**
 * E-Rechnungs-Versendungskomponente
 * Implementiert deutsche UStG §14 konforme E-Rechnungs-Übertragung
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Send,
  Mail,
  Globe,
  Server,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  Info,
} from 'lucide-react';
import jsPDF from 'jspdf';

import {
  EInvoiceTransmissionService,
  EInvoiceRecipientSettings,
  EInvoiceTransmissionLog,
  EInvoiceComplianceCheck,
} from '@/services/eInvoiceTransmissionService';

interface RecipientSettingsForm {
  recipientName: string;
  preferredTransmissionMethod: 'email' | 'webservice' | 'portal' | 'edi';
  emailAddress?: string;
  emailSubject?: string;
  emailBody?: string;
  attachmentFormat?: 'xml' | 'xml_pdf' | 'pdf_only';
  requiresDeliveryConfirmation: boolean;
  endpointUrl?: string;
  protocol?: 'EDIFACT' | 'PEPPOL' | 'CUSTOM';
  authType?: 'api_key' | 'oauth' | 'certificate';
  apiKey?: string;
  acceptsEInvoices: boolean;
  agreedFormat: 'zugferd' | 'xrechnung' | 'both';
  agreementReference?: string;
}

interface EInvoiceSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eInvoiceId: string;
  companyId: string;
  xmlContent: string;
  pdfContent?: string;
  invoiceNumber: string;
}

export function EInvoiceSendDialog({
  isOpen,
  onClose,
  eInvoiceId,
  companyId,
  xmlContent,
  pdfContent,
  invoiceNumber,
}: EInvoiceSendDialogProps) {
  const [step, setStep] = useState<'compliance' | 'recipient' | 'sending' | 'completed'>(
    'compliance'
  );
  const [complianceCheck, setComplianceCheck] = useState<EInvoiceComplianceCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transmissionLogId, setTransmissionLogId] = useState<string | null>(null);
  const [showTransmissionLog, setShowTransmissionLog] = useState(false);

  // Form State
  const [formData, setFormData] = useState<RecipientSettingsForm>({
    recipientName: '',
    preferredTransmissionMethod: 'email',
    emailAddress: '',
    emailSubject: `E-Rechnung ${invoiceNumber} (UStG §14 konform)`,
    emailBody: `Sehr geehrte Damen und Herren,

anbei übersenden wir Ihnen die E-Rechnung ${invoiceNumber} im strukturierten Format gemäß § 14 Umsatzsteuergesetz.

Diese elektronische Rechnung entspricht der europäischen Norm EN 16931 und ermöglicht eine automatisierte Weiterverarbeitung in Ihren Systemen.

Bei Fragen zur E-Rechnung stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen`,
    attachmentFormat: 'xml_pdf',
    requiresDeliveryConfirmation: false,
    endpointUrl: '',
    protocol: 'CUSTOM',
    authType: 'api_key',
    apiKey: '',
    acceptsEInvoices: true,
    agreedFormat: 'both',
    agreementReference: '',
  });

  // Compliance-Prüfung beim Öffnen
  useEffect(() => {
    if (isOpen && step === 'compliance') {
      checkCompliance();
    }
  }, [isOpen]);

  const checkCompliance = async () => {
    setIsChecking(true);
    try {

      const compliance = await EInvoiceTransmissionService.checkUStGCompliance(xmlContent);

      setComplianceCheck(compliance);

      if (compliance.isCompliant) {
        toast.success('E-Rechnung ist UStG §14 konform');
      } else {
        toast.error('E-Rechnung entspricht nicht UStG §14 Anforderungen');

      }
    } catch (error) {
      toast.error('Compliance-Prüfung fehlgeschlagen');

    } finally {
      setIsChecking(false);
    }
  };

  const handleSendEInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!complianceCheck?.isCompliant) {
      toast.error('E-Rechnung muss UStG-konform sein vor der Versendung');
      return;
    }

    // Validierung
    if (!formData.recipientName) {
      toast.error('Empfängername ist erforderlich');
      return;
    }

    if (formData.preferredTransmissionMethod === 'email' && !formData.emailAddress) {
      toast.error('E-Mail-Adresse ist erforderlich');
      return;
    }

    if (
      ['webservice', 'edi'].includes(formData.preferredTransmissionMethod) &&
      !formData.endpointUrl
    ) {
      toast.error('Endpoint-URL ist erforderlich');
      return;
    }

    setIsSending(true);
    setStep('sending');

    try {
      // Empfänger-Einstellungen aufbauen
      const recipientSettings: Omit<EInvoiceRecipientSettings, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        recipientId: `recipient_${Date.now()}`,
        recipientName: formData.recipientName,
        preferredTransmissionMethod: formData.preferredTransmissionMethod,

        email:
          formData.preferredTransmissionMethod === 'email'
            ? {
                address: formData.emailAddress!,
                subject: formData.emailSubject || `E-Rechnung ${invoiceNumber}`,
                bodyTemplate: formData.emailBody || '',
                attachmentFormat: formData.attachmentFormat || 'xml_pdf',
                requiresDeliveryConfirmation: formData.requiresDeliveryConfirmation,
              }
            : undefined,

        // EDI nur setzen wenn tatsächlich verwendet
        ...(['webservice', 'edi'].includes(formData.preferredTransmissionMethod)
          ? {
              edi: {
                endpointUrl: formData.endpointUrl!,
                protocol: formData.protocol || 'CUSTOM',
                authentication: {
                  type: formData.authType || 'api_key',
                  credentials: {
                    apiKey: formData.apiKey || '',
                  },
                },
              },
            }
          : {}),

        agreements: {
          acceptsEInvoices: formData.acceptsEInvoices,
          agreedFormat: formData.agreedFormat,
          agreementDate: new Date(),
          agreementReference: formData.agreementReference,
        },
      };

      // Empfänger-Einstellungen speichern
      await EInvoiceTransmissionService.saveRecipientSettings(recipientSettings);

      // E-Rechnung versenden
      const logId = await EInvoiceTransmissionService.sendEInvoice(
        eInvoiceId,
        companyId,
        recipientSettings as EInvoiceRecipientSettings,
        xmlContent,
        pdfContent
      );

      setTransmissionLogId(logId);
      setStep('completed');
      toast.success('E-Rechnung erfolgreich versendet');
    } catch (error) {

      toast.error('E-Rechnungs-Versendung fehlgeschlagen: ' + (error as Error).message);
      setStep('recipient');
    } finally {
      setIsSending(false);
    }
  };

  const handleShowTransmissionLog = () => {
    if (transmissionLogId) {
      setShowTransmissionLog(true);
    }
  };

  const getTransmissionIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'webservice':
        return <Server className="h-4 w-4" />;
      case 'portal':
        return <Globe className="h-4 w-4" />;
      case 'edi':
        return <Server className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  const getComplianceIcon = (isCompliant: boolean) => {
    return isCompliant ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const generateTransmissionLogPDF = () => {
    try {
      const doc = new jsPDF();

      // Taskilo Branding Farbe (RGB-Werte)
      const taskiloR = 20;
      const taskiloG = 173;
      const taskiloB = 159; // #14ad9f in RGB

      // Header mit Taskilo Branding
      doc.setFillColor(taskiloR, taskiloG, taskiloB);
      doc.rect(0, 0, 210, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Übertragungsprotokoll - E-Rechnung', 20, 17);

      // Rechnungsnummer
      doc.setFontSize(14);
      doc.text(`Rechnung ${invoiceNumber}`, 150, 17);

      // Reset Textfarbe
      doc.setTextColor(0, 0, 0);

      let yPosition = 40;

      // Übertragungsdetails
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Übertragungsdetails', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');

      const details = [
        ['Protokoll-ID:', transmissionLogId || 'N/A'],
        ['Übertragungsmethode:', formData.preferredTransmissionMethod],
        ['Übertragungsdatum:', new Date().toLocaleString('de-DE')],
        ['Status:', 'Erfolgreich übertragen'],
      ];

      details.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(label, 20, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(value, 80, yPosition);
        yPosition += 7;
      });

      yPosition += 10;

      // UStG §14 Compliance
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('UStG §14 Compliance', 20, yPosition);
      yPosition += 10;

      doc.setTextColor(taskiloR, taskiloG, taskiloB);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('✓ Vollständig UStG §14 konform', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 15;

      // Compliance-Checkliste in zwei Spalten
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      const complianceItems = [
        '✓ Strukturiertes Format',
        '✓ Rechnungsnummer',
        '✓ Verkäuferdaten',
        '✓ Käuferdaten',
        '✓ Steuerangaben',
        '✓ Elektronische Verarbeitung',
      ];

      complianceItems.forEach((item, index) => {
        const xPos = index < 3 ? 20 : 110;
        const yPos = yPosition + (index % 3) * 6;
        doc.text(item, xPos, yPos);
      });

      yPosition += 25;

      // Empfänger-Informationen
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Empfänger-Informationen', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');

      const recipientDetails = [['Empfänger:', formData.recipientName]];

      if (formData.preferredTransmissionMethod === 'email' && formData.emailAddress) {
        recipientDetails.push(['E-Mail-Adresse:', formData.emailAddress]);
      }

      if (formData.preferredTransmissionMethod !== 'email' && formData.endpointUrl) {
        recipientDetails.push(['Endpoint-URL:', formData.endpointUrl]);
      }

      recipientDetails.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(label, 20, yPosition);
        doc.setFont(undefined, 'normal');

        // Lange Texte umbrechen
        const splitText = doc.splitTextToSize(value, 110);
        doc.text(splitText, 80, yPosition);
        yPosition += splitText.length * 7;
      });

      yPosition += 15;

      // Rechtlicher Hinweis Box
      doc.setDrawColor(taskiloR, taskiloG, taskiloB);
      doc.setLineWidth(0.5);
      doc.rect(15, yPosition - 5, 180, 25);

      doc.setFillColor(248, 249, 250); // Hellgrauer Hintergrund
      doc.rect(15, yPosition - 5, 180, 25, 'F');

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Aufbewahrungspflicht:', 20, yPosition + 3);

      doc.setFont(undefined, 'normal');
      const legalText = doc.splitTextToSize(
        'Dieses Übertragungsprotokoll wird gemäß § 14b UStG für 8 Jahre gespeichert und dient als Nachweis der ordnungsgemäßen elektronischen Übertragung.',
        170
      );
      doc.text(legalText, 20, yPosition + 10);

      yPosition += 35;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generiert am ${new Date().toLocaleString('de-DE')} | Taskilo Platform`,
        20,
        yPosition + 10
      );

      // PDF speichern
      const fileName = `Uebertragungsprotokoll-${invoiceNumber}-${transmissionLogId}.pdf`;
      doc.save(fileName);

      return true;
    } catch (error) {

      throw error;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-[1400px] !w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              E-Rechnung versenden (UStG §14 konform)
            </DialogTitle>
            <DialogDescription>
              Versendung der elektronischen Rechnung {invoiceNumber} nach deutschen
              Rechtsvorschriften
            </DialogDescription>
          </DialogHeader>{' '}
          {/* Schritt-Anzeige */}
          <div className="flex items-center gap-2 mb-6">
            <Badge
              variant={step === 'compliance' ? 'default' : 'outline'}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              1. Compliance-Prüfung
            </Badge>
            <Badge
              variant={step === 'recipient' ? 'default' : 'outline'}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              2. Empfänger-Einstellungen
            </Badge>
            <Badge
              variant={step === 'sending' ? 'default' : 'outline'}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              3. Versendung
            </Badge>
            <Badge
              variant={step === 'completed' ? 'default' : 'outline'}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              4. Abgeschlossen
            </Badge>
          </div>
          {/* Schritt 1: Compliance-Prüfung */}
          {step === 'compliance' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#14ad9f]" />
                    UStG §14 Compliance-Prüfung
                  </CardTitle>
                  <CardDescription>
                    Überprüfung der E-Rechnung auf deutsche Rechtskonformität
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isChecking ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Prüfe E-Rechnung auf UStG-Konformität...</span>
                    </div>
                  ) : complianceCheck ? (
                    <div className="space-y-4">
                      {/* Haupt-Compliance Status */}
                      <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-50">
                        {getComplianceIcon(complianceCheck.isCompliant)}
                        <span className="font-medium">
                          {complianceCheck.isCompliant
                            ? 'UStG §14 konform'
                            : 'Nicht UStG §14 konform'}
                        </span>
                        <Badge variant={complianceCheck.isCompliant ? 'default' : 'destructive'}>
                          {complianceCheck.complianceLevel}
                        </Badge>
                      </div>

                      {/* Detaillierte Prüfungsergebnisse */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Pflichtfelder (UStG §14 Abs. 4)</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.hasSequentialNumber)}
                              <span>Fortlaufende Nummer</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.hasIssueDate)}
                              <span>Ausstellungsdatum</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.hasSellerData)}
                              <span>Aussteller-Daten</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.hasBuyerData)}
                              <span>Empfänger-Daten</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Format-Anforderungen</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.isStructuredFormat)}
                              <span>Strukturiertes Format</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.enablesProcessing)}
                              <span>Elektronische Verarbeitung</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.hasValidTax)}
                              <span>Steuerangaben</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getComplianceIcon(complianceCheck.checkedFields.hasPaymentTerms)}
                              <span>Zahlungsbedingungen</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fehler und Warnungen */}
                      {complianceCheck.errors.length > 0 && (
                        <Alert>
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <strong>Compliance-Fehler:</strong>
                              {complianceCheck.errors.map((error, index) => (
                                <div key={index} className="text-sm">
                                  • {error}
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {complianceCheck.warnings.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <strong>Warnungen:</strong>
                              {complianceCheck.warnings.map((warning, index) => (
                                <div key={index} className="text-sm">
                                  • {warning}
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Rechtliche Hinweise */}
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Rechtliche Grundlagen:</strong>
                          <div className="text-sm mt-1 space-y-1">
                            • UStG §14: E-Rechnungspflicht zwischen inländischen Unternehmern ab
                            01.01.2025 • BMF-Schreiben vom 15.10.2024: Detaillierte
                            Verwaltungsauffassung • EN 16931: Europäische Norm für strukturierte
                            elektronische Rechnungen • Übergangsregelungen bis 31.12.2026 (bzw.
                            31.12.2027 bei Umsatz &lt; 800.000€)
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={checkCompliance} disabled={isChecking}>
                    Erneut prüfen
                  </Button>
                  <Button
                    onClick={() => setStep('recipient')}
                    disabled={!complianceCheck?.isCompliant}
                    className="bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    Weiter zur Versendung
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Schritt 2: Empfänger-Einstellungen */}
          {step === 'recipient' && (
            <form onSubmit={handleSendEInvoice} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Empfänger-Einstellungen</CardTitle>
                  <CardDescription>
                    Konfiguration der Übertragungsmethode für die E-Rechnung
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Grunddaten */}
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Empfängername</Label>
                    <Input
                      id="recipientName"
                      placeholder="Firmenname des Empfängers"
                      value={formData.recipientName}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, recipientName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  {/* Übertragungsmethode */}
                  <div className="space-y-2">
                    <Label htmlFor="transmissionMethod">Übertragungsmethode</Label>
                    <Select
                      value={formData.preferredTransmissionMethod}
                      onValueChange={(value: 'email' | 'webservice' | 'portal' | 'edi') =>
                        setFormData(prev => ({ ...prev, preferredTransmissionMethod: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Übertragungsmethode wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>E-Mail (einfachste Methode)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="webservice">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            <span>Webservice/API</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="portal">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Portal (ZRE/OZG-RE)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="edi">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            <span>EDI (EDIFACT/PEPPOL)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-600">
                      Gemäß BMF sind alle Übertragungswege zulässig (E-Mail, Webservice, Portal,
                      etc.)
                    </p>
                  </div>

                  <Separator />

                  {/* E-Mail spezifische Felder */}
                  {formData.preferredTransmissionMethod === 'email' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">E-Mail-Einstellungen</h4>

                      <div className="space-y-2">
                        <Label htmlFor="emailAddress">E-Mail-Adresse</Label>
                        <Input
                          id="emailAddress"
                          type="email"
                          placeholder="rechnung@empfaenger.de"
                          value={formData.emailAddress}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, emailAddress: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emailSubject">E-Mail-Betreff</Label>
                        <Input
                          id="emailSubject"
                          value={formData.emailSubject}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, emailSubject: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emailBody">E-Mail-Text</Label>
                        <Textarea
                          id="emailBody"
                          className="min-h-[120px]"
                          value={formData.emailBody}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, emailBody: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="attachmentFormat">Anhang-Format</Label>
                        <Select
                          value={formData.attachmentFormat}
                          onValueChange={(value: 'xml' | 'xml_pdf' | 'pdf_only') =>
                            setFormData(prev => ({ ...prev, attachmentFormat: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="xml">Nur XML</SelectItem>
                            <SelectItem value="xml_pdf">XML + PDF</SelectItem>
                            <SelectItem value="pdf_only">Nur PDF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deliveryConfirmation"
                          checked={formData.requiresDeliveryConfirmation}
                          onCheckedChange={checked =>
                            setFormData(prev => ({
                              ...prev,
                              requiresDeliveryConfirmation: checked as boolean,
                            }))
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label
                            htmlFor="deliveryConfirmation"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Zustellbestätigung anfordern
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Bestätigung über erfolgreiche Zustellung der E-Mail
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Webservice/EDI spezifische Felder */}
                  {['webservice', 'edi'].includes(formData.preferredTransmissionMethod) && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Webservice-Einstellungen</h4>

                      <div className="space-y-2">
                        <Label htmlFor="endpointUrl">Endpoint-URL</Label>
                        <Input
                          id="endpointUrl"
                          placeholder="https://api.empfaenger.de/einvoice"
                          value={formData.endpointUrl}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, endpointUrl: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="protocol">Protokoll</Label>
                        <Select
                          value={formData.protocol}
                          onValueChange={(value: 'EDIFACT' | 'PEPPOL' | 'CUSTOM') =>
                            setFormData(prev => ({ ...prev, protocol: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EDIFACT">EDIFACT</SelectItem>
                            <SelectItem value="PEPPOL">PEPPOL</SelectItem>
                            <SelectItem value="CUSTOM">Custom REST API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API-Schlüssel</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          placeholder="Authentifizierungs-Token"
                          value={formData.apiKey}
                          onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Compliance-Vereinbarungen */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Empfänger-Vereinbarungen</h4>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="acceptsEInvoices"
                        checked={formData.acceptsEInvoices}
                        onCheckedChange={checked =>
                          setFormData(prev => ({ ...prev, acceptsEInvoices: checked as boolean }))
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="acceptsEInvoices"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Empfänger akzeptiert E-Rechnungen
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Bestätigung, dass der Empfänger E-Rechnungen empfangen kann (UStG §14 Abs.
                          1 Satz 3)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agreedFormat">Vereinbartes Format</Label>
                      <Select
                        value={formData.agreedFormat}
                        onValueChange={(value: 'zugferd' | 'xrechnung' | 'both') =>
                          setFormData(prev => ({ ...prev, agreedFormat: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zugferd">ZUGFeRD</SelectItem>
                          <SelectItem value="xrechnung">XRechnung</SelectItem>
                          <SelectItem value="both">Beide Formate</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-600">
                        Format kann zwischen Geschäftspartnern vereinbart werden (UStG §14 Abs. 1
                        Satz 3)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agreementReference">Vereinbarungs-Referenz (optional)</Label>
                      <Input
                        id="agreementReference"
                        placeholder="Vertragsnummer, E-Mail-Referenz, etc."
                        value={formData.agreementReference}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, agreementReference: e.target.value }))
                        }
                      />
                      <p className="text-sm text-gray-600">
                        Nachweis der Vereinbarung über E-Rechnungs-Format
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('compliance')}>
                  Zurück
                </Button>
                <Button
                  type="submit"
                  disabled={isSending}
                  className="bg-[#14ad9f] hover:bg-[#129488]"
                >
                  {isSending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Wird versendet...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      E-Rechnung versenden
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
          {/* Schritt 3: Versendung läuft */}
          {step === 'sending' && (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <Clock className="h-12 w-12 text-[#14ad9f] animate-spin" />
              </div>
              <h3 className="text-lg font-medium">E-Rechnung wird versendet...</h3>
              <p className="text-gray-600">
                Die E-Rechnung wird an den Empfänger übertragen und der Versendungsnachweis wird
                erstellt.
              </p>
            </div>
          )}
          {/* Schritt 4: Abgeschlossen */}
          {step === 'completed' && (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">E-Rechnung erfolgreich versendet!</h3>
              <p className="text-gray-600">
                Die E-Rechnung {invoiceNumber} wurde UStG §14 konform übertragen.
              </p>
              {transmissionLogId && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Übertragungsprotokoll:</strong> {transmissionLogId}
                    <br />
                    Dieses Protokoll dient als Nachweis der ordnungsgemäßen Übertragung und wird 8
                    Jahre aufbewahrt.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Schließen
                </Button>
                <Button
                  className="bg-[#14ad9f] hover:bg-[#129488]"
                  onClick={handleShowTransmissionLog}
                >
                  Übertragungsprotokoll anzeigen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Übertragungsprotokoll Modal */}
      <Dialog open={showTransmissionLog} onOpenChange={setShowTransmissionLog}>
        <DialogContent className="!max-w-[900px] !w-[95vw] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#14ad9f]" />
              Übertragungsprotokoll - E-Rechnung {invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-120px)] space-y-6 pr-2">
            {/* Protokoll-Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Übertragungsdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Protokoll-ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono flex-1 break-all">
                        {transmissionLogId}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(transmissionLogId || '');
                          toast.success('Protokoll-ID kopiert');
                        }}
                      >
                        Kopieren
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Übertragungsmethode</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getTransmissionIcon(formData.preferredTransmissionMethod)}
                      <span className="capitalize">{formData.preferredTransmissionMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Übertragungsdatum</Label>
                    <p className="text-sm mt-1">{new Date().toLocaleString('de-DE')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Erfolgreich übertragen</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance-Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">UStG §14 Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Vollständig UStG §14 konform</span>
                </div>

                {complianceCheck && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Strukturiertes Format</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Rechnungsnummer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Verkäuferdaten</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Käuferdaten</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Steuerangaben</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Elektronische Verarbeitung</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Empfänger-Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Empfänger-Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Empfänger</Label>
                  <p className="text-sm mt-1">{formData.recipientName}</p>
                </div>

                {formData.preferredTransmissionMethod === 'email' && (
                  <div>
                    <Label className="text-sm font-medium">E-Mail-Adresse</Label>
                    <p className="text-sm mt-1 break-all">{formData.emailAddress}</p>
                  </div>
                )}

                {formData.preferredTransmissionMethod !== 'email' && formData.endpointUrl && (
                  <div>
                    <Label className="text-sm font-medium">Endpoint-URL</Label>
                    <p className="text-sm mt-1 font-mono break-all">{formData.endpointUrl}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rechtlicher Hinweis */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Aufbewahrungspflicht:</strong> Dieses Übertragungsprotokoll wird gemäß § 14b
                UStG für 8 Jahre gespeichert und dient als Nachweis der ordnungsgemäßen
                elektronischen Übertragung.
              </AlertDescription>
            </Alert>
          </div>

          {/* Buttons - Fixed at bottom */}
          <div className="flex justify-end gap-2 pt-4 border-t bg-white">
            <Button variant="outline" onClick={() => setShowTransmissionLog(false)}>
              Schließen
            </Button>
            <Button
              className="bg-[#14ad9f] hover:bg-[#129488]"
              onClick={async () => {
                try {
                  generateTransmissionLogPDF();
                  toast.success('PDF wurde heruntergeladen');
                } catch (error) {

                  toast.error('PDF-Export fehlgeschlagen');
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Als PDF exportieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

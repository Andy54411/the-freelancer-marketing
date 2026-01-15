'use client';

/**
 * UStVA-Assistent Wizard - Schritt 5: Absenden
 * 
 * Unterstützt:
 * - Speichern als lokalen Bericht
 * - ELSTER-Übermittlung mit PIN-Dialog (Testmodus)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, FileText, Receipt, ClipboardCheck, Send, Loader2, CheckCircle2, Download, ExternalLink, Shield, AlertCircle, Eye, EyeOff, Upload } from 'lucide-react';
import { TaxService } from '@/services/taxService';
import { toast } from 'sonner';
import Link from 'next/link';

const STEPS = [
  { id: 1, title: 'Zeitraum', icon: Calendar },
  { id: 2, title: 'Einnahmen', icon: FileText },
  { id: 3, title: 'Ausgaben', icon: Receipt },
  { id: 4, title: 'Zusammenfassung', icon: ClipboardCheck },
  { id: 5, title: 'Absenden', icon: Send },
];

interface UStVAData {
  umsatzSteuerpflichtig19: number;
  umsatzSteuerpflichtig7: number;
  umsatzsteuer19: number;
  umsatzsteuer7: number;
  vorsteuerAbziehbar: number;
  zahllast: number;
  erstattung: number;
}

interface CertificateStatus {
  certificateExists: boolean;
  fileInfo?: {
    size: number;
    uploadedAt: string;
  };
}

interface ElsterSubmissionResult {
  success: boolean;
  transferTicket?: string;
  serverResponse?: string;
  errorCode?: number;
  errorMessage?: string;
  message?: string;
  testMode?: boolean;
  submittedAt?: string;
}

export default function WizardAbsendenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = params.uid as string;

  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const quarter = parseInt(searchParams.get('quarter') || '1');

  const [ustvaData, setUstvaData] = useState<UStVAData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  
  // ELSTER-spezifisch
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [loadingCertStatus, setLoadingCertStatus] = useState(true);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [elsterSubmitting, setElsterSubmitting] = useState(false);
  const [elsterResult, setElsterResult] = useState<ElsterSubmissionResult | null>(null);
  const [steuernummer, setSteuernummer] = useState('');

  // Zertifikatsstatus abrufen
  const fetchCertificateStatus = useCallback(async () => {
    try {
      setLoadingCertStatus(true);
      const response = await fetch(`/api/company/${uid}/elster/certificate-status`);
      const data = await response.json();
      
      if (data.success) {
        setCertificateStatus({
          certificateExists: data.certificateExists,
          fileInfo: data.fileInfo,
        });
      }
    } catch {
      // Ignorieren - ELSTER einfach nicht verfügbar
    } finally {
      setLoadingCertStatus(false);
    }
  }, [uid]);

  // Steuernummer der Firma abrufen
  const fetchCompanyData = useCallback(async () => {
    try {
      const response = await fetch(`/api/company/${uid}`);
      const data = await response.json();
      if (data.company?.taxNumber) {
        setSteuernummer(data.company.taxNumber);
      }
    } catch {
      // Ignorieren
    }
  }, [uid]);

  useEffect(() => {
    const savedData = sessionStorage.getItem('ustva_calculated');
    if (savedData) {
      setUstvaData(JSON.parse(savedData));
    }
    
    fetchCertificateStatus();
    fetchCompanyData();
  }, [fetchCertificateStatus, fetchCompanyData]);

  const handleSubmit = async () => {
    if (!ustvaData || !user) return;

    setSubmitting(true);
    try {
      const startMonth = (quarter - 1) * 3;
      const periodStart = new Date(year, startMonth, 1);
      const periodEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);

      const newReportId = await TaxService.createTaxReport({
        companyId: uid,
        type: 'ustVA',
        year,
        quarter,
        periodStart,
        periodEnd,
        status: 'calculated',
        taxData: {
          ustVA: {
            umsatzSteuerpflichtig19: ustvaData.umsatzSteuerpflichtig19,
            umsatzSteuerpflichtig7: ustvaData.umsatzSteuerpflichtig7,
            umsatzSteuerpflichtig: ustvaData.umsatzSteuerpflichtig19 + ustvaData.umsatzSteuerpflichtig7,
            umsatzSteuerfrei: 0,
            innergemeinschaftlich: 0,
            umsatzsteuer19: ustvaData.umsatzsteuer19,
            umsatzsteuer7: ustvaData.umsatzsteuer7,
            vorsteuerAbziehbar: ustvaData.vorsteuerAbziehbar,
            vorsteuerInnergem: 0,
            vorsteuerImport: 0,
            umsatzsteuerSchuld: ustvaData.umsatzsteuer19 + ustvaData.umsatzsteuer7,
            vorsteuerGuthaben: ustvaData.vorsteuerAbziehbar,
            zahllast: ustvaData.zahllast,
            erstattung: ustvaData.erstattung,
          },
        },
        generatedBy: user.uid,
        notes: `UStVA Q${quarter}/${year} - Erstellt über Steuer-Assistent`,
      });

      setReportId(newReportId);
      setSubmitted(true);

      // Lösche sessionStorage
      sessionStorage.removeItem('ustva_invoices');
      sessionStorage.removeItem('ustva_selected_invoices');
      sessionStorage.removeItem('ustva_expenses');
      sessionStorage.removeItem('ustva_selected_expenses');
      sessionStorage.removeItem('ustva_calculated');

      toast.success('UStVA erfolgreich erstellt!');
    } catch {
      toast.error('Fehler beim Erstellen der UStVA');
    } finally {
      setSubmitting(false);
    }
  };

  // ELSTER-Übermittlung
  const handleElsterSubmit = async () => {
    if (!ustvaData || !pin || !steuernummer) {
      toast.error('Bitte geben Sie Ihre PIN ein');
      return;
    }

    setElsterSubmitting(true);
    try {
      // Zeitraum-Code berechnen (41-44 für Quartale)
      const zeitraumCode = (40 + quarter).toString().padStart(2, '0');

      const response = await fetch(`/api/company/${uid}/elster/submit-ustva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          testMode: true, // IMMER Testmodus!
          ustvaData: {
            steuernummer,
            jahr: year,
            zeitraum: zeitraumCode,
            kz81: ustvaData.umsatzSteuerpflichtig19,
            kz86: ustvaData.umsatzSteuerpflichtig7,
            kz35: 0,
            kz36: 0,
            kz77: 0,
            kz76: 0,
            kz41: 0,
            kz44: 0,
            kz49: 0,
            kz66: ustvaData.vorsteuerAbziehbar,
            kz61: 0,
            kz62: 0,
            kz67: 0,
            kz63: 0,
            kz64: 0,
            kz26: 0,
          },
        }),
      });

      const result = await response.json();
      setElsterResult(result);
      
      // PIN sofort löschen (Sicherheit!)
      setPin('');

      if (result.success) {
        toast.success('ELSTER-Übermittlung erfolgreich!');
        setShowPinDialog(false);
        
        // Auch als Bericht speichern
        await handleSubmit();
      } else {
        toast.error(result.errorMessage || 'ELSTER-Übermittlung fehlgeschlagen');
      }
    } catch (err) {
      toast.error('Fehler bei der ELSTER-Übermittlung');
      setPin('');
    } finally {
      setElsterSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/dashboard/company/${uid}/finance/taxes`}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Steuerzentrale
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">UStVA-Assistent</h1>
        <p className="text-gray-600 mt-2">
          Q{quarter}/{year} - Absenden
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className="flex flex-col items-center text-[#14ad9f]"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id < 5 ? 'bg-[#14ad9f]/20 text-[#14ad9f]' : 'bg-[#14ad9f] text-white'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={100} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">Schritt 5 von 5</p>
      </div>

      {/* PIN Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#14ad9f]" />
                ELSTER-PIN eingeben
              </CardTitle>
              <CardDescription>
                Geben Sie die PIN Ihres ELSTER-Zertifikats ein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Testmodus-Hinweis */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    <strong>Testmodus aktiv:</strong> Die Übermittlung erfolgt an das Testfinanzamt 9198.
                    Ihre Daten werden nicht an ein echtes Finanzamt gesendet.
                  </p>
                </div>
              </div>

              {/* PIN-Eingabe */}
              <div className="space-y-2">
                <Label htmlFor="pin">Zertifikat-PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN eingeben"
                    className="pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Die PIN wird nicht gespeichert und nur für diese Übermittlung verwendet.
                </p>
              </div>

              {/* ELSTER-Fehler anzeigen */}
              {elsterResult && !elsterResult.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    {elsterResult.errorMessage || 'Unbekannter Fehler bei der Übermittlung'}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPinDialog(false);
                    setPin('');
                  }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleElsterSubmit}
                  disabled={elsterSubmitting || !pin}
                  className="flex-1 bg-[#14ad9f] hover:bg-teal-700"
                >
                  {elsterSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      An ELSTER senden
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      {!submitted ? (
        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#14ad9f]" />
                UStVA absenden
              </CardTitle>
              <CardDescription>
                Ihre UStVA für Q{quarter}/{year} ist bereit zum Absenden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Zusammenfassung */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Umsatzsteuer gesamt:</span>
                  <span className="font-medium">
                    {formatCurrency((ustvaData?.umsatzsteuer19 || 0) + (ustvaData?.umsatzsteuer7 || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Abziehbare Vorsteuer:</span>
                  <span className="font-medium text-[#14ad9f]">
                    - {formatCurrency(ustvaData?.vorsteuerAbziehbar || 0)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">
                    {(ustvaData?.zahllast || 0) > 0 ? 'Zahllast:' : 'Erstattung:'}
                  </span>
                  <span className={`font-bold text-lg ${(ustvaData?.zahllast || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(ustvaData?.zahllast || ustvaData?.erstattung || 0)}
                  </span>
                </div>
              </div>

              {/* ELSTER-Übermittlung */}
              {!loadingCertStatus && (
                <div className="border rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#14ad9f]" />
                    </div>
                    <div>
                      <h3 className="font-medium">ELSTER-Übermittlung</h3>
                      <p className="text-sm text-gray-500">Direkt an das Finanzamt senden</p>
                    </div>
                  </div>

                  {certificateStatus?.certificateExists ? (
                    <>
                      {/* Testmodus-Hinweis */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-700">
                            <strong>Testmodus aktiv:</strong> Die Übermittlung erfolgt an das Testfinanzamt 9198.
                          </p>
                        </div>
                      </div>

                      {/* Steuernummer fehlt? */}
                      {!steuernummer && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-700">
                            <strong>Steuernummer fehlt:</strong> Bitte hinterlegen Sie Ihre Steuernummer in den Firmeneinstellungen.
                          </p>
                        </div>
                      )}

                      <Button 
                        onClick={() => setShowPinDialog(true)}
                        disabled={!steuernummer}
                        className="w-full bg-[#14ad9f] hover:bg-teal-700"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Mit ELSTER übermitteln (Testmodus)
                      </Button>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">
                        Für die ELSTER-Übermittlung benötigen Sie ein Zertifikat.
                      </p>
                      <Link href={`/dashboard/company/${uid}/finance/settings`}>
                        <Button variant="outline" size="sm">
                          Zertifikat in Einstellungen hochladen
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Oder-Trennlinie */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-sm text-gray-400">oder</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Manuell speichern */}
              <div className="border rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Download className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Manuell einreichen</h3>
                    <p className="text-sm text-gray-500">Speichern und selbst bei ELSTER einreichen</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || !ustvaData}
                  variant="outline"
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Wird erstellt...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Nur speichern (manuell einreichen)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {elsterResult?.success 
                    ? 'ELSTER-Übermittlung erfolgreich!' 
                    : 'UStVA erfolgreich erstellt!'
                  }
                </h2>
                <p className="text-gray-600 mb-6">
                  {elsterResult?.success ? (
                    <>
                      Ihre UStVA für Q{quarter}/{year} wurde an das {elsterResult.testMode ? 'Testfinanzamt 9198' : 'Finanzamt'} übermittelt.
                      <br />
                      <span className="text-sm text-gray-500">
                        Transfer-Ticket: {elsterResult.transferTicket || 'Nicht verfügbar'}
                      </span>
                    </>
                  ) : (
                    <>Ihre Umsatzsteuer-Voranmeldung für Q{quarter}/{year} wurde gespeichert.</>
                  )}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    PDF herunterladen
                  </Button>
                  {!elsterResult?.success && (
                    <a 
                      href="https://www.elster.de/eportal/start" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="gap-2 w-full">
                        <ExternalLink className="w-4 h-4" />
                        Bei ELSTER einreichen
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nächste Schritte */}
          <Card>
            <CardHeader>
              <CardTitle>Nächste Schritte</CardTitle>
            </CardHeader>
            <CardContent>
              {elsterResult?.success ? (
                <ol className="list-decimal list-inside space-y-3 text-gray-600">
                  <li>
                    <strong className="text-green-600">Übermittlung abgeschlossen</strong> - Ihre UStVA wurde elektronisch eingereicht
                  </li>
                  <li>Laden Sie die UStVA als PDF für Ihre Unterlagen herunter</li>
                  <li>
                    Überweisen Sie ggf. die Zahllast bis zum{' '}
                    <strong>
                      {quarter === 1 && '10. April'}
                      {quarter === 2 && '10. Juli'}
                      {quarter === 3 && '10. Oktober'}
                      {quarter === 4 && '10. Januar'}
                    </strong>
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-3 text-gray-600">
                  <li>Laden Sie die UStVA als PDF herunter</li>
                  <li>Melden Sie sich bei ELSTER an</li>
                  <li>Übertragen Sie die Daten in das ELSTER-Formular</li>
                  <li>Senden Sie die UStVA über ELSTER an Ihr Finanzamt</li>
                  <li>
                    Überweisen Sie ggf. die Zahllast bis zum{' '}
                    <strong>
                      {quarter === 1 && '10. April'}
                      {quarter === 2 && '10. Juli'}
                      {quarter === 3 && '10. Oktober'}
                      {quarter === 4 && '10. Januar'}
                    </strong>
                  </li>
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        {!submitted ? (
          <>
            <Link href={`/dashboard/company/${uid}/finance/taxes/wizard/zusammenfassung?year=${year}&quarter=${quarter}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            </Link>
            <div></div>
          </>
        ) : (
          <>
            <div></div>
            <Link href={`/dashboard/company/${uid}/finance/taxes`}>
              <Button className="bg-[#14ad9f] hover:bg-teal-700">
                Zur Steuerzentrale
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

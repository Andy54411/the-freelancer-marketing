'use client';

/**
 * UStVA-Assistent Wizard - Schritt 5: Absenden
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, FileText, Receipt, ClipboardCheck, Send, Loader2, CheckCircle2, Download, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    const savedData = sessionStorage.getItem('ustva_calculated');
    if (savedData) {
      setUstvaData(JSON.parse(savedData));
    }
  }, []);

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

              {/* ELSTER Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Hinweis zur ELSTER-Übermittlung:</strong><br />
                  Die direkte Übermittlung an ELSTER wird vorbereitet. Aktuell wird die UStVA 
                  als Bericht gespeichert. Sie können diesen dann manuell über{' '}
                  <a 
                    href="https://www.elster.de" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    elster.de
                  </a>{' '}
                  einreichen.
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !ustvaData}
                className="w-full bg-[#14ad9f] hover:bg-teal-700 py-6 text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    UStVA erstellen und speichern
                  </>
                )}
              </Button>
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
                  UStVA erfolgreich erstellt!
                </h2>
                <p className="text-gray-600 mb-6">
                  Ihre Umsatzsteuer-Voranmeldung für Q{quarter}/{year} wurde gespeichert.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    PDF herunterladen
                  </Button>
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

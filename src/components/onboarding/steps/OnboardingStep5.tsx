'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Plus,
  ExternalLink,
  Shield,
  LogIn
} from 'lucide-react';
import { RequiredFieldIndicator } from '@/components/onboarding/RequiredFieldLabel';

// API Base URL für Hetzner Webmail-Proxy
const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de';

// Step5Data Interface - E-Mail-Verbindung
interface Step5Data {
  emailType: 'gmail' | 'taskilo' | 'existing-taskilo' | 'skip' | null;
  gmailConnected: boolean;
  gmailEmail?: string;
  taskiloEmailRequested: boolean;
  taskiloEmailPrefix?: string;
  taskiloEmailConnected?: boolean;
  taskiloEmail?: string;
}

interface OnboardingStep5Props {
  companyUid?: string;
}

// Innere Komponente mit useSearchParams
function OnboardingStep5Content({ companyUid }: OnboardingStep5Props) {
  const searchParams = useSearchParams();
  const { 
    stepData, 
    updateStepData, 
    goToNextStep, 
    goToPreviousStep,
    saveCurrentStep 
  } = useOnboarding();
  const { user } = useAuth();

  const [step5Data, setStep5Data] = useState<Step5Data>(
    stepData[5] || {
      emailType: null,
      gmailConnected: false,
      taskiloEmailRequested: false,
    }
  );

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // State für bestehendes Konto verbinden
  const [existingEmail, setExistingEmail] = useState('');
  const [existingPassword, setExistingPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // URL-Parameter verarbeiten (Rückkehr von Webmail-Registrierung)
  useEffect(() => {
    const taskiloEmail = searchParams.get('taskiloEmail');
    const emailConnected = searchParams.get('emailConnected');
    
    if (taskiloEmail && emailConnected === 'true') {
      // E-Mail wurde erfolgreich erstellt - State aktualisieren
      const newData: Step5Data = {
        ...step5Data,
        emailType: 'taskilo',
        taskiloEmailConnected: true,
        taskiloEmail: taskiloEmail,
        taskiloEmailRequested: true,
      };
      setStep5Data(newData);
      updateStepData(5, newData);
      
      // URL bereinigen (Parameter entfernen)
      const url = new URL(window.location.href);
      url.searchParams.delete('taskiloEmail');
      url.searchParams.delete('emailConnected');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const updateField = <K extends keyof Step5Data>(field: K, value: Step5Data[K]) => {
    const newData = { ...step5Data, [field]: value };
    setStep5Data(newData);
    updateStepData(5, newData);
  };

  // Gmail OAuth verbinden
  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // OAuth Flow starten
      const response = await fetch('/api/auth/gmail/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId: companyUid || user?.uid,
          redirectUrl: window.location.href
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Starten der Gmail-Verbindung');
      }

      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect zu Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Keine Auth-URL erhalten');
      }
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Fehler beim Verbinden mit Gmail'
      );
      setIsConnecting(false);
    }
  };

  // Taskilo E-Mail erstellen - Weiterleitung zur Registrierungsseite
  const handleCreateTaskiloEmail = () => {
    // Öffne die Webmail-Registrierung im selben Tab (Rückkehr per URL-Parameter)
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/webmail/register?returnUrl=${returnUrl}&companyId=${companyUid || user?.uid}`;
  };

  // Bestehendes Taskilo-Konto verbinden
  const handleConnectExistingTaskilo = async () => {
    if (!existingEmail.trim() || !existingPassword.trim()) {
      setConnectionError('Bitte E-Mail und Passwort eingeben');
      return;
    }

    // Validiere E-Mail-Format
    if (!existingEmail.endsWith('@taskilo.de')) {
      setConnectionError('Nur @taskilo.de E-Mail-Adressen werden akzeptiert');
      return;
    }

    setIsVerifying(true);
    setConnectionError(null);

    try {
      // Prüfe Zugangsdaten gegen Mailcow via webmail-proxy
      const response = await fetch(`${WEBMAIL_API_URL}/api/registration/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: existingEmail,
          password: existingPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Konto erfolgreich verifiziert
        const newData: Step5Data = {
          ...step5Data,
          emailType: 'existing-taskilo',
          taskiloEmailConnected: true,
          taskiloEmail: existingEmail,
        };
        setStep5Data(newData);
        updateStepData(5, newData);
        setExistingPassword(''); // Passwort aus State entfernen
      } else {
        setConnectionError(data.error || 'Ungültige Zugangsdaten');
      }
    } catch {
      setConnectionError('Verbindung zum Server fehlgeschlagen');
    } finally {
      setIsVerifying(false);
    }
  };

  // Validierung
  const isValidForNext = () => {
    // Mindestens eine Option muss gewählt sein (oder bewusst übersprungen)
    return step5Data.emailType === 'skip' || 
           step5Data.gmailConnected || 
           step5Data.taskiloEmailRequested ||
           step5Data.taskiloEmailConnected;
  };

  const handleNext = async () => {
    await saveCurrentStep();
    goToNextStep(true);
  };

  const handleSkip = () => {
    updateField('emailType', 'skip');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-[#14ad9f]" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">E-Mail-Verbindung</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Verbinden Sie Ihr Gmail-Konto oder erstellen Sie eine professionelle @taskilo.de E-Mail-Adresse
        </p>
      </div>

      {/* Required Fields Indicator */}
      <RequiredFieldIndicator />

      <div className="space-y-6">
        {/* Fehleranzeige */}
        {connectionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Verbindungsfehler</h4>
              <p className="text-sm text-red-700">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Option 1: Gmail verbinden */}
        <Card className={`cursor-pointer transition-all ${
          step5Data.emailType === 'gmail' 
            ? 'border-2 border-[#14ad9f] ring-2 ring-[#14ad9f]/20' 
            : 'border-gray-200 hover:border-[#14ad9f]/50'
        }`}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => updateField('emailType', 'gmail')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  step5Data.emailType === 'gmail' ? 'bg-[#14ad9f]' : 'bg-gray-100'
                }`}>
                  <svg className={`w-6 h-6 ${step5Data.emailType === 'gmail' ? 'text-white' : 'text-gray-600'}`} viewBox="0 0 24 24">
                    <path fill="currentColor" d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Gmail verbinden</h3>
                  <p className="text-sm text-gray-500 font-normal">Nutzen Sie Ihr bestehendes Google-Konto</p>
                </div>
              </div>
              {step5Data.gmailConnected && (
                <div className="flex items-center gap-2 text-[#14ad9f]">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Verbunden</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          {step5Data.emailType === 'gmail' && (
            <CardContent className="pt-0">
              <div className="bg-gray-50 rounded-xl p-5">
                {step5Data.gmailConnected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#14ad9f]/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{step5Data.gmailEmail}</p>
                        <p className="text-sm text-gray-500">Gmail erfolgreich verbunden</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateField('gmailConnected', false);
                        updateField('gmailEmail', undefined);
                      }}
                    >
                      Trennen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-[#14ad9f] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-1">Sichere Verbindung</p>
                        <p>Wir nutzen OAuth 2.0 für eine sichere Verbindung. Taskilo erhält nur Lesezugriff auf Ihre E-Mails.</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleConnectGmail}
                      disabled={isConnecting}
                      className="w-full bg-[#14ad9f] hover:bg-teal-600 h-12"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Verbinde...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-5 w-5 mr-2" />
                          Mit Google verbinden
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Option 2: Taskilo E-Mail erstellen */}
        <Card className={`cursor-pointer transition-all ${
          step5Data.emailType === 'taskilo' 
            ? 'border-2 border-[#14ad9f] ring-2 ring-[#14ad9f]/20' 
            : 'border-gray-200 hover:border-[#14ad9f]/50'
        }`}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => updateField('emailType', 'taskilo')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  step5Data.emailType === 'taskilo' ? 'bg-[#14ad9f]' : 'bg-gray-100'
                }`}>
                  <Mail className={`w-6 h-6 ${step5Data.emailType === 'taskilo' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Taskilo E-Mail erstellen</h3>
                  <p className="text-sm text-gray-500 font-normal">Professionelle @taskilo.de Adresse</p>
                </div>
              </div>
              {step5Data.taskiloEmailRequested && (
                <div className="flex items-center gap-2 text-[#14ad9f]">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Beantragt</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          {step5Data.emailType === 'taskilo' && (
            <CardContent className="pt-0">
              <div className="bg-gray-50 rounded-xl p-5">
                {step5Data.taskiloEmailConnected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#14ad9f]/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {step5Data.taskiloEmail}
                        </p>
                        <p className="text-sm text-gray-500">
                          Taskilo E-Mail erfolgreich verbunden
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateField('taskiloEmailConnected', false);
                        updateField('taskiloEmail', undefined);
                        updateField('taskiloEmailRequested', false);
                      }}
                    >
                      Trennen
                    </Button>
                  </div>
                ) : step5Data.taskiloEmailRequested ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#14ad9f]/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {step5Data.taskiloEmailPrefix}@taskilo.de
                      </p>
                      <p className="text-sm text-gray-500">
                        Wird nach Abschluss des Onboardings aktiviert
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-[#14ad9f]/5 rounded-lg">
                      <Shield className="h-5 w-5 text-[#14ad9f] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-1">Inklusive Features</p>
                        <ul className="space-y-1">
                          <li>Professionelle @taskilo.de Adresse</li>
                          <li>Integriertes Webmail</li>
                          <li>Spam-Schutz & Sicherheit</li>
                          <li>1 GB Speicherplatz</li>
                        </ul>
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateTaskiloEmail}
                      className="w-full bg-[#14ad9f] hover:bg-teal-600 h-12"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Neue Taskilo E-Mail erstellen
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      Sie werden zur E-Mail-Registrierung weitergeleitet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Option 3: Bestehendes Taskilo-Konto verbinden */}
        <Card className={`cursor-pointer transition-all ${
          step5Data.emailType === 'existing-taskilo' 
            ? 'border-2 border-[#14ad9f] ring-2 ring-[#14ad9f]/20' 
            : 'border-gray-200 hover:border-[#14ad9f]/50'
        }`}>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => updateField('emailType', 'existing-taskilo')}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  step5Data.emailType === 'existing-taskilo' ? 'bg-[#14ad9f]' : 'bg-gray-100'
                }`}>
                  <LogIn className={`w-6 h-6 ${step5Data.emailType === 'existing-taskilo' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Bestehendes Konto verbinden</h3>
                  <p className="text-sm text-gray-500 font-normal">Sie haben bereits eine @taskilo.de E-Mail</p>
                </div>
              </div>
              {step5Data.emailType === 'existing-taskilo' && step5Data.taskiloEmailConnected && (
                <div className="flex items-center gap-2 text-[#14ad9f]">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Verbunden</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          {step5Data.emailType === 'existing-taskilo' && (
            <CardContent className="pt-0">
              <div className="bg-gray-50 rounded-xl p-5">
                {step5Data.taskiloEmailConnected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#14ad9f]/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{step5Data.taskiloEmail}</p>
                        <p className="text-sm text-gray-500">Konto erfolgreich verbunden</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateField('taskiloEmailConnected', false);
                        updateField('taskiloEmail', undefined);
                        setExistingEmail('');
                      }}
                    >
                      Trennen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-[#14ad9f] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-1">Konto verifizieren</p>
                        <p>Geben Sie Ihre Taskilo E-Mail und Ihr Passwort ein, um Ihr bestehendes Konto zu verbinden.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="email"
                        value={existingEmail}
                        onChange={(e) => setExistingEmail(e.target.value)}
                        placeholder="ihre-email@taskilo.de"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#14ad9f] focus:outline-none transition-colors"
                      />
                      <input
                        type="password"
                        value={existingPassword}
                        onChange={(e) => setExistingPassword(e.target.value)}
                        placeholder="Passwort"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#14ad9f] focus:outline-none transition-colors"
                      />
                    </div>
                    
                    <Button
                      onClick={handleConnectExistingTaskilo}
                      disabled={isVerifying || !existingEmail.trim() || !existingPassword.trim()}
                      className="w-full bg-[#14ad9f] hover:bg-teal-600 h-12"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Verifiziere...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-5 w-5 mr-2" />
                          Konto verbinden
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Option 4: Überspringen */}
        <Card className={`cursor-pointer transition-all ${
          step5Data.emailType === 'skip' 
            ? 'border-2 border-gray-400' 
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <CardHeader 
            className="cursor-pointer"
            onClick={handleSkip}
          >
            <CardTitle className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                step5Data.emailType === 'skip' ? 'bg-gray-400' : 'bg-gray-100'
              }`}>
                <ArrowRight className={`w-6 h-6 ${step5Data.emailType === 'skip' ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Später einrichten</h3>
                <p className="text-sm text-gray-500 font-normal">E-Mail-Verbindung im Dashboard nachholen</p>
              </div>
              {step5Data.emailType === 'skip' && (
                <CheckCircle className="h-5 w-5 text-gray-400 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Info-Box */}
        <div className="bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-[#14ad9f] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-1">Warum E-Mail verbinden?</p>
              <p className="text-gray-600">
                Mit einer verbundenen E-Mail können Sie direkt aus Taskilo heraus mit Kunden kommunizieren,
                Rechnungen versenden und Benachrichtigungen erhalten.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Message */}
      {!isValidForNext() && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">E-Mail-Option wählen</h4>
            <p className="text-sm text-amber-700">
              Bitte wählen Sie eine E-Mail-Option oder überspringen Sie diesen Schritt.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={isConnecting}
          className="px-6 h-12"
        >
          Zurück
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValidForNext() || isConnecting}
          className={`px-8 h-12 text-base font-semibold ${
            isValidForNext()
              ? 'bg-linear-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center gap-2">
            Weiter
            <ArrowRight className="h-5 w-5" />
          </span>
        </Button>
      </div>
    </div>
  );
}

// Loading Fallback
function Step5LoadingFallback() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="animate-pulse space-y-8">
        <div className="h-16 bg-gray-200 rounded-2xl w-16 mx-auto" />
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
        <div className="space-y-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Exportierte Komponente mit Suspense-Wrapper
export default function OnboardingStep5({ companyUid }: OnboardingStep5Props) {
  return (
    <Suspense fallback={<Step5LoadingFallback />}>
      <OnboardingStep5Content companyUid={companyUid} />
    </Suspense>
  );
}

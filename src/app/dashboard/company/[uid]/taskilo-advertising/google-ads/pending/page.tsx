'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  ArrowLeft,
  Shield,
  Users,
  Link2,
  Mail,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  XCircle,
} from 'lucide-react';

interface ConnectionStatus {
  success: boolean;
  customerId: string;
  accountName: string;
  managerApproved: boolean;
  managerLinkStatus: 'PENDING' | 'ACTIVE' | 'REQUIRES_MANUAL_LINK' | 'REFUSED';
  status: string;
  testTokenMode: boolean;
  manualVerificationRequired: boolean;
  connectedAt?: string;
  selectedAt?: string;
}

const MANAGER_ID = '578-822-9684';
const MANAGER_ID_FORMATTED = '578-822-9684';

export default function GoogleAdsPendingPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;

  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedManagerId, setCopiedManagerId] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checkStatus = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`);
      const data = await response.json();

      if (data.success) {
        setStatus({
          success: true,
          customerId: data.customerId,
          accountName: data.accountName,
          managerApproved: data.managerApproved,
          managerLinkStatus: data.managerLinkStatus,
          status: data.status,
          testTokenMode: data.testTokenMode,
          manualVerificationRequired: data.manualVerificationRequired,
          connectedAt: data.connectedAt,
          selectedAt: data.selectedAt,
        });

        // Wenn erfolgreich verknüpft, zur Hauptseite weiterleiten
        if (data.managerApproved && data.managerLinkStatus === 'ACTIVE') {
          router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Fehler beim Laden des Status');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId, router]);

  const retryInvitation = async () => {
    setIsRetrying(true);
    setRetryMessage(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads/retry-invitation`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setRetryMessage({
          type: 'success',
          text: data.message || 'Einladung erfolgreich gesendet!',
        });
        // Refresh Status
        await checkStatus();
      } else {
        // Spezifische Fehlermeldungen fuer bekannte Fehlertypen
        let errorText = data.error || 'Fehler beim Senden der Einladung';
        
        if (data.details?.isManagerAccount || data.details?.code === 'ACCOUNTS_NOT_COMPATIBLE') {
          errorText = 'Ihr Google Ads Konto ist ein Manager-Konto und kann nicht automatisch verknuepft werden. Manager-Konten koennen andere Konten verwalten, aber nicht selbst verwaltet werden. Bitte waehlen Sie ein normales Werbekonto aus oder folgen Sie den manuellen Schritten unten.';
        } else if (data.details?.code === 'TEST_TOKEN_PRODUCTION_ACCOUNT') {
          errorText = 'Die automatische Verknuepfung ist derzeit nicht moeglich. Bitte folgen Sie den manuellen Schritten unten.';
        }
        
        setRetryMessage({
          type: 'error',
          text: errorText,
        });
      }
    } catch (err) {
      setRetryMessage({
        type: 'error',
        text: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const acceptInvitation = async () => {
    setIsAccepting(true);
    setAcceptMessage(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads/accept-invitation`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setAcceptMessage({
          type: 'success',
          text: data.message || 'Verkuepfung erfolgreich!',
        });
        // Refresh Status - wird automatisch zur Hauptseite weiterleiten
        await checkStatus();
      } else {
        let errorText = data.error || 'Fehler beim Akzeptieren der Einladung';
        
        if (data.needsNewInvitation) {
          errorText = 'Keine ausstehende Einladung gefunden. Bitte klicken Sie auf "Einladung senden", um eine neue Einladung anzufordern.';
        }
        
        setAcceptMessage({
          type: 'error',
          text: errorText,
        });
      }
    } catch (err) {
      setAcceptMessage({
        type: 'error',
        text: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es spaeter erneut.',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-Refresh alle 30 Sekunden
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, checkStatus]);

  const copyManagerId = () => {
    navigator.clipboard.writeText(MANAGER_ID.replace(/-/g, ''));
    setCopiedManagerId(true);
    setTimeout(() => setCopiedManagerId(false), 2000);
  };

  const formatCustomerId = (id: string) => {
    if (!id) return '';
    const cleaned = id.replace(/-/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  const getStatusIcon = () => {
    if (!status) return <Clock className="w-8 h-8 text-gray-400" />;

    switch (status.managerLinkStatus) {
      case 'ACTIVE':
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      case 'REFUSED':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'REQUIRES_MANUAL_LINK':
        return <AlertCircle className="w-8 h-8 text-amber-500" />;
      default:
        return <Clock className="w-8 h-8 text-blue-500 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    if (!status) return 'Status wird geladen...';

    switch (status.managerLinkStatus) {
      case 'ACTIVE':
        return 'Verknüpfung erfolgreich';
      case 'REFUSED':
        return 'Verknüpfung abgelehnt';
      case 'REQUIRES_MANUAL_LINK':
        return 'Manuelle Verknüpfung erforderlich';
      default:
        return 'Warten auf Verknüpfung';
    }
  };

  const getStatusColor = () => {
    if (!status) return 'bg-gray-100 text-gray-700';

    switch (status.managerLinkStatus) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'REFUSED':
        return 'bg-red-100 text-red-700';
      case 'REQUIRES_MANUAL_LINK':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const faqItems = [
    {
      question: 'Warum muss ich meinen Google Ads Account verknüpfen?',
      answer:
        'Um Ihre Kampagnen direkt in Taskilo verwalten zu können, benötigt unser System Zugriff auf Ihren Google Ads Account. Die Verknüpfung mit unserem Manager-Account ermöglicht es uns, Ihre Kampagnen zu lesen und zu optimieren, ohne dass Sie Ihr Passwort teilen müssen.',
    },
    {
      question: 'Was ist ein Manager-Account?',
      answer:
        'Ein Manager-Account (MCC - My Client Center) ist ein spezieller Google Ads Account-Typ, der es Agenturen und Plattformen wie Taskilo ermöglicht, mehrere Kunden-Accounts zentral zu verwalten. Der Zugriff ist sicher und kann jederzeit widerrufen werden.',
    },
    {
      question: 'Wie lange dauert die Verknüpfung?',
      answer:
        'Sobald Sie die Verknüpfung in Ihrem Google Ads Account akzeptiert haben, wird der Status automatisch aktualisiert. Dies dauert in der Regel nur wenige Sekunden. Diese Seite prüft den Status automatisch alle 30 Sekunden.',
    },
    {
      question: 'Kann ich die Verknüpfung später wieder entfernen?',
      answer:
        'Ja, Sie können die Verknüpfung jederzeit in Ihrem Google Ads Account unter "Einstellungen" > "Kontozugriff" wieder entfernen. Taskilo verliert dann sofort den Zugriff auf Ihren Account.',
    },
    {
      question: 'Welche Berechtigungen hat Taskilo?',
      answer:
        'Taskilo erhält Lesezugriff auf Ihre Kampagnen, Anzeigengruppen, Keywords und Leistungsdaten. Wir können in Ihrem Auftrag Kampagnen erstellen und optimieren. Wir haben KEINEN Zugriff auf Ihre Zahlungsinformationen oder persönlichen Daten.',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Status wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`)}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/dashboard/company/${companyId}/taskilo-advertising`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zu Taskilo Advertising</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Status Header */}
          <div className="bg-linear-to-r from-teal-600 to-teal-700 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <img
                  src="https://www.gstatic.com/images/branding/product/1x/ads_48dp.png"
                  alt="Google Ads"
                  className="w-10 h-10"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Google Ads Verknüpfung</h1>
                <p className="text-teal-100">
                  {status?.accountName || 'Google Ads Account'} ({formatCustomerId(status?.customerId || '')})
                </p>
              </div>
            </div>
          </div>

          {/* Status Body */}
          <div className="p-6">
            {/* Current Status */}
            <div className="flex items-center justify-between mb-8 p-4 rounded-xl bg-gray-50">
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div>
                  <p className="font-medium text-gray-900">{getStatusText()}</p>
                  <p className="text-sm text-gray-500">
                    {status?.selectedAt && (
                      <>Anfrage gesendet am {new Date(status.selectedAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</>
                    )}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                {status?.managerLinkStatus || 'PENDING'}
              </span>
            </div>

            {/* Auto-Refresh Toggle */}
            <div className="flex items-center justify-between mb-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className={`w-4 h-4 ${autoRefreshEnabled && isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">
                  {autoRefreshEnabled ? 'Automatische Aktualisierung aktiv (alle 30s)' : 'Automatische Aktualisierung pausiert'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => checkStatus(true)}
                  disabled={isRefreshing}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isRefreshing ? 'Aktualisiere...' : 'Jetzt prüfen'}
                </button>
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    autoRefreshEnabled
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {autoRefreshEnabled ? 'Pausieren' : 'Aktivieren'}
                </button>
              </div>
            </div>

            {/* Instructions based on status */}
            {status?.managerLinkStatus === 'PENDING' && (
              <div className="space-y-6">
                {/* Accept Button - Primary Action */}
                <div className="p-6 bg-linear-to-r from-teal-50 to-green-50 border-2 border-teal-200 rounded-xl">
                  <div className="text-center">
                    <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Einladung jetzt annehmen
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Klicken Sie hier, um die Verknuepfung mit Taskilo direkt zu bestaetigen.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={acceptInvitation}
                        disabled={isAccepting || isRetrying}
                        className="px-8 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium text-lg flex items-center gap-2 justify-center"
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Wird verbunden...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Einladung annehmen
                          </>
                        )}
                      </button>
                      <button
                        onClick={retryInvitation}
                        disabled={isAccepting || isRetrying}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium flex items-center gap-2 justify-center"
                      >
                        {isRetrying ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sende...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-5 h-5" />
                            Neue Einladung senden
                          </>
                        )}
                      </button>
                    </div>
                    {acceptMessage && (
                      <div className={`mt-4 p-4 rounded-lg text-sm text-left ${
                        acceptMessage.type === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <p>{acceptMessage.text}</p>
                        {acceptMessage.type === 'error' && acceptMessage.text.includes('dauerhaft storniert') && (
                          <div className="mt-3 space-y-2">
                            <p className="font-medium">So loesen Sie das Problem:</p>
                            <ol className="list-decimal list-inside space-y-1">
                              <li>Oeffnen Sie <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">ads.google.com</a></li>
                              <li>Gehen Sie zu Einstellungen → Kontozugriff</li>
                              <li>Entfernen Sie die Taskilo-Verknuepfung</li>
                              <li>Klicken Sie hier auf &quot;Neue Einladung senden&quot;</li>
                              <li>Dann auf &quot;Einladung annehmen&quot;</li>
                            </ol>
                          </div>
                        )}
                        {acceptMessage.type === 'error' && acceptMessage.text.includes('Status') && (
                          <p className="mt-2 font-medium">
                            Bitte klicken Sie auf &quot;Neue Einladung senden&quot;.
                          </p>
                        )}
                      </div>
                    )}
                    {retryMessage && (
                      <div className={`mt-4 p-3 rounded-lg text-sm ${
                        retryMessage.type === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {retryMessage.text}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">oder manuell in Google Ads</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Alternative: Manuell in Google Ads akzeptieren</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Falls die Buttons oben nicht funktionieren, koennen Sie die Einladung auch direkt in Ihrem Google Ads Account akzeptieren.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" />
                    So akzeptieren Sie manuell in Google Ads:
                  </h3>

                  <div className="space-y-3">
                    <StepCard
                      number={1}
                      title="Google Ads öffnen"
                      description="Öffnen Sie ads.google.com und melden Sie sich mit dem Account an, den Sie verknüpfen möchten."
                      action={
                        <a
                          href="https://ads.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          Google Ads öffnen <ExternalLink className="w-3 h-3" />
                        </a>
                      }
                    />

                    <StepCard
                      number={2}
                      title="Zu Einstellungen navigieren"
                      description="Klicken Sie auf das Werkzeug-Symbol (Einstellungen) in der oberen Navigationsleiste."
                    />

                    <StepCard
                      number={3}
                      title="Kontozugriff auswählen"
                      description='Unter "Einrichtung" finden Sie den Menüpunkt "Kontozugriff". Klicken Sie darauf.'
                    />

                    <StepCard
                      number={4}
                      title="Manager-Anfrage akzeptieren"
                      description="Sie sollten eine Anfrage von Taskilo sehen. Klicken Sie auf 'Akzeptieren', um die Verknüpfung zu bestätigen."
                    />
                  </div>
                </div>
              </div>
            )}

            {status?.managerLinkStatus === 'REQUIRES_MANUAL_LINK' && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Manuelle Verknüpfung erforderlich</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Die automatische Verknüpfung konnte nicht durchgeführt werden. 
                        Bitte verknüpfen Sie Ihren Account manuell mit unserem Manager-Account.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Retry Button */}
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-teal-800">Automatische Verknüpfung erneut versuchen?</p>
                      <p className="text-sm text-teal-700 mt-1">
                        Klicken Sie hier, um die automatische Einladung erneut zu senden.
                      </p>
                    </div>
                    <button
                      onClick={retryInvitation}
                      disabled={isRetrying}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {isRetrying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sende...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Erneut versuchen
                        </>
                      )}
                    </button>
                  </div>
                  {retryMessage && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      retryMessage.type === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {retryMessage.text}
                    </div>
                  )}
                </div>

                {/* Manager ID Copy Box */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Taskilo Manager-Account ID:</p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-white rounded-lg border border-gray-300 font-mono text-lg text-gray-900">
                      {MANAGER_ID_FORMATTED}
                    </code>
                    <button
                      onClick={copyManagerId}
                      className={`px-4 py-3 rounded-lg flex items-center gap-2 transition-colors ${
                        copiedManagerId
                          ? 'bg-green-100 text-green-700'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {copiedManagerId ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Kopiert
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Kopieren
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Manual Steps */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-teal-600" />
                    So verknüpfen Sie manuell:
                  </h3>

                  <div className="space-y-3">
                    <StepCard
                      number={1}
                      title="Google Ads öffnen"
                      description="Öffnen Sie ads.google.com und melden Sie sich an."
                      action={
                        <a
                          href="https://ads.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          Google Ads öffnen <ExternalLink className="w-3 h-3" />
                        </a>
                      }
                    />

                    <StepCard
                      number={2}
                      title='Zu "Kontozugriff" navigieren'
                      description='Klicken Sie auf Einstellungen > Einrichtung > Kontozugriff'
                    />

                    <StepCard
                      number={3}
                      title="Manager hinzufügen"
                      description='Klicken Sie auf das Plus-Symbol (+) oder "Manager hinzufügen"'
                    />

                    <StepCard
                      number={4}
                      title="Manager-ID eingeben"
                      description={`Geben Sie die Taskilo Manager-ID ein: ${MANAGER_ID_FORMATTED}`}
                    />

                    <StepCard
                      number={5}
                      title="Einladung senden"
                      description='Klicken Sie auf "Einladung senden" und warten Sie auf die Bestätigung.'
                    />
                  </div>
                </div>
              </div>
            )}

            {status?.managerLinkStatus === 'REFUSED' && (
              <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex gap-3">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Verknüpfung abgelehnt</p>
                      <p className="text-sm text-red-700 mt-1">
                        Die Verknüpfungsanfrage wurde abgelehnt. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`)}
                  className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {status?.managerLinkStatus === 'ACTIVE' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Verknüpfung erfolgreich</p>
                    <p className="text-sm text-green-700 mt-1">
                      Ihr Google Ads Account ist jetzt mit Taskilo verknüpft. Sie werden weitergeleitet...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              Sicherheit & Datenschutz
            </h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <SecurityCard
                icon={<Shield className="w-6 h-6" />}
                title="Sichere Verbindung"
                description="Die Verknüpfung erfolgt über die offizielle Google Ads API mit OAuth 2.0 Authentifizierung."
              />
              <SecurityCard
                icon={<Users className="w-6 h-6" />}
                title="Volle Kontrolle"
                description="Sie können die Verknüpfung jederzeit in Ihrem Google Ads Account widerrufen."
              />
              <SecurityCard
                icon={<Mail className="w-6 h-6" />}
                title="Keine Zahlungsdaten"
                description="Taskilo hat keinen Zugriff auf Ihre Zahlungsinformationen oder Kreditkartendaten."
              />
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-teal-600" />
              Häufig gestellte Fragen
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6 text-gray-600">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Contact */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Haben Sie Probleme bei der Verknüpfung?{' '}
            <a
              href="mailto:support@taskilo.de"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Kontaktieren Sie unseren Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  action,
}: {
  number: number;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

function SecurityCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

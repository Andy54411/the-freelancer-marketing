'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react';

interface GoogleAdsManagerLinkWarningProps {
  companyId: string;
}

interface ConnectionStatus {
  managerApproved: boolean;
  managerLinkStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'MANUAL_VERIFICATION' | 'REQUIRES_MANUAL_LINK';
  requiresManagerLink?: boolean;
  customerId?: string;
  testTokenMode?: boolean;
  manualVerificationRequired?: boolean;
  status?: string;
}

export default function GoogleAdsManagerLinkWarning({ companyId }: GoogleAdsManagerLinkWarningProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  const MANAGER_ID = '655-923-8498';

  useEffect(() => {
    checkManagerLinkStatus();
  }, [companyId]);

  const checkManagerLinkStatus = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`);
      const data = await response.json();

      if (data.success) {
        setStatus({
          managerApproved: data.managerApproved || false,
          managerLinkStatus: data.managerLinkStatus,
          requiresManagerLink: data.requiresManagerLink !== false,
          customerId: data.customerId,
          testTokenMode: data.testTokenMode,
          manualVerificationRequired: data.manualVerificationRequired,
          status: data.status,
        });
      }
    } catch (error) {
      console.error('Failed to check manager link status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendManagerInvitation = async () => {
    if (!status?.customerId) return;

    setIsSendingInvitation(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/google-ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: status.customerId,
          accountName: 'Current Account',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await checkManagerLinkStatus();
      } else {
        alert(result.message || 'Fehler beim Senden der Einladung');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSendingInvitation(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!status || !status.requiresManagerLink) {
    return null;
  }

  // Manuelle Verknüpfung erforderlich (höchste Priorität)
  if (status.managerLinkStatus === 'REQUIRES_MANUAL_LINK' || 
      (status.status === 'requires_manual_link')) {
    // Format Customer ID: entferne Bindestriche
    const formattedCustomerId = status.customerId?.replace(/-/g, '') || '';
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-red-900 mb-1">
            Verknüpfung mit Taskilo Manager Account
          </h3>
          <p className="text-sm text-red-800 mb-3">
            Taskilo sendet automatisch eine Einladung an Ihren Google Ads Account. 
            Sie müssen diese nur noch in Google Ads <strong>akzeptieren</strong>:
          </p>
          <ol className="text-sm text-red-800 list-decimal list-inside space-y-2 mb-4 bg-white/50 p-3 rounded">
            <li>Klicken Sie unten auf <strong>"Verknüpfungsanfrage senden"</strong></li>
            <li>Öffnen Sie danach <strong>ads.google.com → Einstellungen → Kontozugriff</strong></li>
            <li>Akzeptieren Sie die <strong>ausstehende Einladung von Taskilo ({MANAGER_ID})</strong></li>
          </ol>
          <div className="flex gap-2">
            <button
              onClick={sendManagerInvitation}
              disabled={isSendingInvitation}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isSendingInvitation ? 'Wird gesendet...' : 'Verknüpfungsanfrage senden'}
            </button>
            <a
              href={formattedCustomerId ? `https://ads.google.com/aw/accountaccess/users?ocid=${formattedCustomerId}` : 'https://ads.google.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-red-900 border border-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Kontozugriff öffnen
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-red-700 mt-3">
            💡 Taskilo sendet die Einladung - Sie müssen sie nur in Google Ads akzeptieren!
          </p>
        </div>
      </div>
    );
  }

  // Bereits verbunden
  if (status.managerApproved) {
    // Normal verbunden - nur wenn managerLinkStatus = ACTIVE
    if (status.managerLinkStatus === 'ACTIVE') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-green-900 mb-1">
              Mit Taskilo Manager Account verbunden
            </h3>
            <p className="text-sm text-green-800">
              Ihr Google Ads Account ist mit dem Taskilo Manager Account ({MANAGER_ID}) verknüpft. 
              Sie können jetzt Kampagnen erstellen.
            </p>
          </div>
        </div>
      );
    }
  }

  // Einladung ausstehend
  if (status.managerLinkStatus === 'PENDING') {
    // Format Customer ID: entferne Bindestriche
    const formattedCustomerId = status.customerId?.replace(/-/g, '') || '';
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-900 mb-1">
            Jetzt Einladung in Google Ads akzeptieren!
          </h3>
          <p className="text-sm text-yellow-800 mb-3">
            Taskilo hat die Einladung gesendet. Sie müssen diese JETZT in Ihrem Google Ads Account akzeptieren:
          </p>
          <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-2 mb-4 bg-white/50 p-3 rounded">
            <li><strong>Klicken Sie unten auf "Kontozugriff öffnen"</strong></li>
            <li>Sie sehen die <strong>ausstehende Einladung von Taskilo ({MANAGER_ID})</strong></li>
            <li><strong className="text-yellow-900">Klicken Sie auf "Akzeptieren"</strong></li>
            <li>Kommen Sie zurück zu Taskilo und laden Sie die Seite neu</li>
          </ol>
          <a
            href={formattedCustomerId ? `https://ads.google.com/aw/accountaccess/users?ocid=${formattedCustomerId}` : 'https://ads.google.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Kontozugriff öffnen
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-xs text-yellow-700 mt-3">
            💡 Sie müssen die Einladung AKZEPTIEREN, nicht selbst eine senden!
          </p>
        </div>
      </div>
    );
  }

  // Nicht verbunden - Warnung
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-red-900 mb-1">
          Manager Account Verknüpfung erforderlich
        </h3>
        <p className="text-sm text-red-800 mb-3">
          Bevor Sie Google Ads Kampagnen erstellen können, muss Ihr Account mit dem Taskilo 
          Manager Account ({MANAGER_ID}) verknüpft werden.
        </p>
        <p className="text-sm text-red-800 font-semibold mb-3">
          1. Klicken Sie unten auf "Verknüpfungsanfrage senden"
        </p>
        <p className="text-sm text-red-800 mb-4">
          2. Danach öffnen Sie Google Ads und akzeptieren die Einladung
        </p>
        <button
          onClick={sendManagerInvitation}
          disabled={isSendingInvitation || !status?.customerId}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {isSendingInvitation ? 'Wird gesendet...' : 'Verknüpfungsanfrage senden'}
        </button>
        {!status?.customerId && (
          <p className="text-xs text-red-700 mt-2">
            ⚠️ Bitte wählen Sie zuerst einen Google Ads Account aus
          </p>
        )}
        {status?.customerId && (
          <p className="text-xs text-red-700 mt-2">
            Nach dem Klicken müssen Sie die Einladung in Google Ads akzeptieren
          </p>
        )}
      </div>
    </div>
  );
}

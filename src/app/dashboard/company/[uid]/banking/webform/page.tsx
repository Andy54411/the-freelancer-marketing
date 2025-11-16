'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFinAPICredentialType } from '@/lib/finapi-config';
import { ExternalLink, RefreshCw, CreditCard, Shield, AlertCircle, ArrowLeft } from 'lucide-react';

export default function BankingWebFormPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Get environment-specific credential type
  const credentialType = getFinAPICredentialType();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webFormUrl, setWebFormUrl] = useState<string | null>(null);

  const createWebForm = async () => {
    if (!user?.uid) {
      setError('Benutzer nicht authentifiziert');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/finapi/webform?userId=${user.uid}&credentialType=${credentialType}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.webFormUrl) {
        setWebFormUrl(data.webFormUrl);
        // Öffne WebForm in neuem Tab
        window.open(data.webFormUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error(data.error || 'WebForm konnte nicht erstellt werden');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen der WebForm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a
              href={`/dashboard/company/${uid}/banking`}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Zurück zum Banking
            </a>
          </div>
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">finAPI WebForm 2.0</h1>
          <p className="text-gray-600 mt-1">Sichere Bankverbindung ohne Datenspeicherung</p>
        </div>
      </div>

      {/* WebForm Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <Shield className="h-6 w-6 text-blue-600 shrink-0" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-800">
              Sichere finAPI WebForm Integration
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-3">
                Die finAPI WebForm 2.0 ermöglicht eine sichere Verbindung zu Ihrer Bank ohne dass
                sensible Daten auf unseren Servern gespeichert werden.
              </p>

              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Sicherheitsfeatures:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    Direkte Verbindung zur Bank über finAPI
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    Keine Speicherung von Zugangsdaten
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    DSGVO-konforme Datenverarbeitung
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    PSD2-konforme Authentifizierung
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WebForm Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 text-[#14ad9f] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bank verbinden</h3>
          <p className="text-gray-600 mb-6">
            Öffnen Sie die finAPI WebForm, um eine sichere Verbindung zu Ihrer Bank herzustellen.
          </p>

          <button
            onClick={createWebForm}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                WebForm wird erstellt...
              </>
            ) : (
              <>
                <ExternalLink className="h-5 w-5 mr-2" />
                WebForm öffnen
              </>
            )}
          </button>

          {webFormUrl && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 mb-2">
                WebForm wurde erfolgreich erstellt und in einem neuen Tab geöffnet.
              </p>
              <a
                href={webFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-[#14ad9f] hover:text-[#129488]"
              >
                WebForm erneut öffnen
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Process Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">So funktioniert es:</h3>
        <div className="space-y-4">
          <div className="flex">
            <div className="shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#14ad9f] text-white text-sm font-medium">
                1
              </div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">WebForm öffnen</h4>
              <p className="text-sm text-gray-600">
                Klicken Sie auf &quot;WebForm öffnen&quot; um die sichere finAPI-Verbindung zu
                starten.
              </p>
            </div>
          </div>

          <div className="flex">
            <div className="shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#14ad9f] text-white text-sm font-medium">
                2
              </div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Bank auswählen</h4>
              <p className="text-sm text-gray-600">
                Wählen Sie Ihre Bank aus der Liste und folgen Sie den Anweisungen.
              </p>
            </div>
          </div>

          <div className="flex">
            <div className="shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#14ad9f] text-white text-sm font-medium">
                3
              </div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Authentifizierung</h4>
              <p className="text-sm text-gray-600">
                Authentifizieren Sie sich sicher bei Ihrer Bank gemäß PSD2-Richtlinien.
              </p>
            </div>
          </div>

          <div className="flex">
            <div className="shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#14ad9f] text-white text-sm font-medium">
                4
              </div>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">Fertig</h4>
              <p className="text-sm text-gray-600">
                Nach erfolgreicher Verbindung können Sie Ihre Kontodaten im Banking Dashboard
                einsehen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

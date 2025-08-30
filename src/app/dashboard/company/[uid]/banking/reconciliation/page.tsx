'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, RefreshCw, FileText, CreditCard, Ban, ExternalLink } from 'lucide-react';

export default function BankingReconciliationPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Banking reconciliation system has been removed
    setLoading(false);
    setError(
      'Das Banking-Reconciliation-System wurde entfernt. Verwenden Sie finAPI WebForm für Banking-Integrationen.'
    );
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Lade Abgleichsdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banking Reconciliation</h1>
            <p className="text-gray-600 mt-1">Banking-System wurde vereinfacht</p>
          </div>
        </div>
      </div>

      {/* System Removed Notice */}
      <div className="rounded-md bg-yellow-50 border border-yellow-200 p-6">
        <div className="flex">
          <Ban className="h-6 w-6 text-yellow-600 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-yellow-800">
              Banking Reconciliation System entfernt
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-3">
                Das interne Banking-Reconciliation-System wurde aus Datenschutz- und
                Sicherheitsgründen entfernt. Für Banking-Integrationen verwenden Sie bitte das
                finAPI WebForm System.
              </p>

              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-yellow-900 mb-2">Verfügbare Banking-Features:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    finAPI WebForm 2.0 Integration
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    Sichere Bank-Verbindungen
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                    Keine Speicherung sensibler Daten
                  </li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <a
                  href={`/dashboard/company/${uid}/banking`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Banking Dashboard
                </a>
                <a
                  href={`/dashboard/company/${uid}/banking/webform`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  finAPI WebForm
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Information</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-red-800 hover:text-red-600"
                >
                  Verstanden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FileText className="h-8 w-8 text-blue-500" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">Rechnungsstellung</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Erstellen und verwalten Sie Rechnungen weiterhin über das Rechnungssystem.
          </p>
          <a
            href={`/dashboard/company/${uid}/invoices`}
            className="inline-flex items-center text-sm font-medium text-[#14ad9f] hover:text-[#129488]"
          >
            Zu den Rechnungen
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-8 w-8 text-green-500" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">Banking WebForm</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Sichere Bankverbindungen über finAPI WebForm 2.0 ohne Datenspeicherung.
          </p>
          <a
            href={`/dashboard/company/${uid}/banking/webform`}
            className="inline-flex items-center text-sm font-medium text-[#14ad9f] hover:text-[#129488]"
          >
            WebForm öffnen
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Ban className="h-8 w-8 text-gray-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">Datenschutz</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Keine Speicherung von Kontodaten oder Transaktionen für maximalen Datenschutz.
          </p>
          <span className="inline-flex items-center text-sm font-medium text-gray-500">
            DSGVO-konform
          </span>
        </div>
      </div>

      {/* Migration Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-3">System-Migration abgeschlossen</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>✅ Interne Banking-APIs entfernt für besseren Datenschutz</p>
          <p>✅ finAPI WebForm 2.0 als sichere Alternative implementiert</p>
          <p>✅ Keine persistente Speicherung von Banking-Daten</p>
          <p>✅ Rechnungssystem weiterhin verfügbar</p>
        </div>
      </div>
    </div>
  );
}

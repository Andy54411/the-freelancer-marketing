'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, CreditCard, Ban, ExternalLink, AlertTriangle } from 'lucide-react';

export default function BankingImportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Banking import system has been removed
    setError(
      'Das Banking-Import-System wurde entfernt. Verwenden Sie finAPI WebForm für Banking-Integrationen.'
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/company/${uid}/banking`)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Zurück zu Banking</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banking Import</h1>
          <p className="text-gray-600">Banking-System wurde vereinfacht</p>
        </div>
      </div>

      {/* System Removed Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <Ban className="h-5 w-5" />
            <span>Banking Import System entfernt</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 mb-3">
              Das interne Banking-Import-System wurde aus Datenschutz- und Sicherheitsgründen
              entfernt. Für Banking-Integrationen verwenden Sie bitte das finAPI WebForm System.
            </p>

            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-yellow-900 mb-2">Verfügbare Banking-Features:</h4>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                  finAPI WebForm 2.0 Integration
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                  Sichere Bank-Verbindungen ohne Datenspeicherung
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                  DSGVO-konforme Lösung
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => router.push(`/dashboard/company/${uid}/banking`)}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Banking Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/company/${uid}/banking/webform`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                finAPI WebForm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Information</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-3">
                  Verstanden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span>Rechnungsstellung</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Erstellen und verwalten Sie Rechnungen weiterhin über das Rechnungssystem.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/company/${uid}/invoices`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Zu den Rechnungen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              <span>Banking WebForm</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Sichere Bankverbindungen über finAPI WebForm 2.0 ohne lokale Datenspeicherung.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/company/${uid}/banking/webform`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              WebForm öffnen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Migration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-800">System-Migration abgeschlossen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 space-y-2">
              <p>✅ Interne Banking-APIs entfernt für besseren Datenschutz</p>
              <p>✅ finAPI WebForm 2.0 als sichere Alternative implementiert</p>
              <p>✅ Keine persistente Speicherung von Banking-Daten</p>
              <p>✅ Rechnungssystem weiterhin verfügbar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

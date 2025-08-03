'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FiShield,
  FiCheck,
  FiArrowRight,
  FiInfo,
  FiUsers,
  FiFileText,
  FiDatabase,
} from 'react-icons/fi';
import { DatevAuthComponent } from '@/components/datev/DatevAuthComponent';

interface DatevSetupPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function DatevSetupPage({ params }: DatevSetupPageProps) {
  const { uid } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DATEV Integration einrichten</h1>
          <p className="text-gray-600 mt-1">
            Verbinden Sie Ihr DATEV-Konto für professionelle Buchhaltung
          </p>
        </div>
        <Badge className="bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20">
          Sicher & DSGVO-konform
        </Badge>
      </div>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiInfo className="text-[#14ad9f]" />
            Setup-Schritte
          </CardTitle>
          <CardDescription>
            Folgen Sie diesen Schritten für eine erfolgreiche DATEV-Integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <FiCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-green-900">DATEV-Konto vorbereiten</h4>
                <p className="text-sm text-green-700 mt-1">
                  Stellen Sie sicher, dass Sie ein aktives DATEV-Konto haben und die erforderlichen
                  Berechtigungen besitzen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-medium">DATEV-Verbindung herstellen</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Authentifizieren Sie sich sicher über OAuth2 mit Ihrem DATEV-Konto.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-medium">Synchronisation konfigurieren</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Wählen Sie aus, welche Daten automatisch synchronisiert werden sollen.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Vorteile der DATEV-Integration</CardTitle>
          <CardDescription>Was Sie mit der DATEV-Anbindung erreichen können</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <FiFileText className="text-[#14ad9f] w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1">Automatischer Rechnungsexport</h4>
                <p className="text-sm text-gray-600">
                  Taskilo-Rechnungen werden automatisch zu DATEV übertragen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <FiDatabase className="text-[#14ad9f] w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1">Buchungssynchronisation</h4>
                <p className="text-sm text-gray-600">
                  Echtzeit-Synchronisation aller Geschäftsbuchungen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <FiUsers className="text-[#14ad9f] w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1">Steuerberater-Zugang</h4>
                <p className="text-sm text-gray-600">
                  Direkter Zugriff für Ihren Steuerberater auf relevante Daten
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <FiShield className="text-[#14ad9f] w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1">Maximale Sicherheit</h4>
                <p className="text-sm text-gray-600">
                  Ende-zu-Ende-Verschlüsselung und DSGVO-Compliance
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Component */}
      <DatevAuthComponent
        companyId={uid}
        onAuthSuccess={organization => {
          console.log('DATEV setup successful for:', organization);
          // TODO: Redirect to overview page
        }}
      />

      {/* Next Steps */}
      <Card className="border-[#14ad9f]/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <FiArrowRight className="text-[#14ad9f] w-6 h-6" />
            <div>
              <h3 className="font-semibold text-gray-900">Nach erfolgreicher Verbindung</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sie werden automatisch zum DATEV-Dashboard weitergeleitet, wo Sie alle Funktionen
                verwalten und Ihre Buchhaltungsdaten einsehen können.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

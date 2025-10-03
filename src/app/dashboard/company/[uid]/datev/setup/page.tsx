import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiShield, FiArrowRight, FiFileText, FiDatabase, FiUsers } from 'react-icons/fi';
import { DatevAuthComponent } from '@/components/datev/DatevAuthComponentCookie';

interface DatevSetupPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function DatevSetupPage({ params }: DatevSetupPageProps) {
  const { uid } = await params;

  // Additional validation
  if (!uid || uid === 'unknown' || uid.trim() === '') {
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Clean Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-[#14ad9f]/10 rounded-full">
            <FiDatabase className="w-8 h-8 text-[#14ad9f]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DATEV Integration</h1>
          </div>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Verbinden Sie Ihr DATEV-Konto für automatische Buchhaltung und nahtlose Zusammenarbeit mit
          Ihrem Steuerberater
        </p>
        <Badge className="bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20 px-4 py-1">
          <FiShield className="w-4 h-4 mr-2" />
          Sicher & DSGVO-konform
        </Badge>
      </div>

      {/* Main Benefits - Simple Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#14ad9f]/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#14ad9f]/10 rounded-full flex-shrink-0">
                <FiFileText className="w-6 h-6 text-[#14ad9f]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Automatischer Rechnungsexport</h3>
                <p className="text-gray-600">
                  Alle Taskilo-Rechnungen werden automatisch zu DATEV übertragen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#14ad9f]/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#14ad9f]/10 rounded-full flex-shrink-0">
                <FiUsers className="w-6 h-6 text-[#14ad9f]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Steuerberater-Zugang</h3>
                <p className="text-gray-600">
                  Direkter Zugriff für Ihren Steuerberater auf alle relevanten Geschäftsdaten
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status & Action */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">DATEV-Verbindung einrichten</CardTitle>
          <CardDescription>Melden Sie sich sicher mit Ihrem DATEV-Konto an</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Component */}
          {uid ? (
            <DatevAuthComponent companyId={uid} />
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600">Lade DATEV-Integration...</p>
              </div>
            </div>
          )}

          {/* Security Info - Enhanced based on sevdesk approach */}
          <Alert>
            <FiShield className="h-4 w-4" />
            <AlertDescription>
              <strong>Sicherheit & Datenschutz:</strong> Ihre DATEV-Zugangsdaten werden
              verschlüsselt und ausschließlich in Deutschland gespeichert. Die Verbindung erfolgt
              über DATEVs offizielle OAuth2-Schnittstelle - Ihre Passwörter werden niemals von
              Taskilo gespeichert. Alle Daten unterliegen der DSGVO und werden gemäß unserem
              Auftragsverarbeitungsvertrag behandelt.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Simple Next Steps */}
      <Card className="bg-gradient-to-r from-[#14ad9f]/5 to-[#14ad9f]/10 border-[#14ad9f]/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#14ad9f] rounded-full">
              <FiArrowRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Nach erfolgreicher Verbindung</h3>
              <p className="text-gray-600">
                Sie können alle DATEV-Funktionen im Dashboard verwalten und Ihre Buchhaltungsdaten
                einsehen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

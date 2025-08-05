'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiInfo, FiTool, FiAlertTriangle } from 'react-icons/fi';
import { DatevSandboxTest } from '@/components/datev/DatevSandboxTest';
import { DatevFlowTest } from '@/components/datev/DatevFlowTest';

interface DatevDebugPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function DatevDebugPage({ params }: DatevDebugPageProps) {
  const [uid, setUid] = React.useState<string>('');

  React.useEffect(() => {
    params.then(resolvedParams => {
      setUid(resolvedParams.uid);
    });
  }, [params]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-orange-100 rounded-full">
            <FiTool className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DATEV Debug-Tools</h1>
          </div>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Entwickler-Tools zur Diagnose und Fehlerbehebung der DATEV Sandbox-Integration
        </p>
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-4 py-1">
          <FiAlertTriangle className="w-4 h-4 mr-2" />
          Nur für Entwicklung
        </Badge>
      </div>

      {/* Warning */}
      <Alert className="border-orange-200 bg-orange-50">
        <FiInfo className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Wichtiger Hinweis:</strong> Diese Tools sind nur für die Entwicklung und
          Fehlerbehebung gedacht. In der Produktionsumgebung sollten diese nicht verwendet werden.
        </AlertDescription>
      </Alert>

      {/* DATEV Sandbox Configuration Test */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <FiTool className="text-orange-600" />
            DATEV Sandbox-Konfiguration
          </CardTitle>
          <CardDescription className="text-orange-700">
            Überprüfen Sie die DATEV Sandbox-Verbindung und -Konfiguration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DatevSandboxTest companyId={uid} />
        </CardContent>
      </Card>

      {/* DATEV OAuth Flow Test */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <FiTool className="text-orange-600" />
            DATEV OAuth-Flow Test
          </CardTitle>
          <CardDescription className="text-orange-700">
            Testen Sie den vollständigen DATEV-Authentifizierungsflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DatevFlowTest companyId={uid} />
        </CardContent>
      </Card>

      {/* Troubleshooting Info */}
      <Card>
        <CardHeader>
          <CardTitle>Fehlerbehebung</CardTitle>
          <CardDescription>
            Häufige Probleme und Lösungsansätze bei der DATEV-Integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Häufige Probleme:</h4>
            <ul className="space-y-2 text-gray-600">
              <li>• Ungültige DATEV Sandbox-Zugangsdaten</li>
              <li>• DATEV Sandbox-Konto nicht korrekt eingerichtet</li>
              <li>• Browser blockiert Third-Party-Cookies</li>
              <li>• DATEV Sandbox-Service temporär nicht verfügbar</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Lösungsansätze:</h4>
            <ul className="space-y-2 text-gray-600">
              <li>• Überprüfen Sie Ihr DATEV Sandbox-Konto im Developer Portal</li>
              <li>• Versuchen Sie es in einem Inkognito-/Privaten Browser-Fenster</li>
              <li>• Löschen Sie Browser-Cookies und -Cache</li>
              <li>• Prüfen Sie den Status des DATEV Sandbox-Services</li>
            </ul>
          </div>

          <Alert>
            <FiInfo className="h-4 w-4" />
            <AlertDescription>
              <strong>DATEV Sandbox-Zugangsdaten:</strong>
              <br />• Consultant Number: 455148
              <br />• Client Numbers: 1-6 (Client 1 hat volle Berechtigungen)
              <br />• Sie benötigen ein aktives DATEV Sandbox-Konto
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiShield, FiInfo, FiTrendingUp, FiFileText, FiUsers, FiDatabase } from 'react-icons/fi';
import { DatevAuthComponent } from '@/components/datev/DatevAuthComponent';
import { DatevDashboard } from '@/components/datev/DatevDashboard';

export default function DatevPage() {
  const companyId = 'default-company'; // TODO: Get from auth context

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">DATEV Integration</h1>
          <p className="text-gray-600 mt-2">
            Nahtlose Buchhaltungsintegration für Steuerberater und Unternehmen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FiShield className="text-[#14ad9f] w-8 h-8" />
          <span className="text-sm text-gray-500">Sicher & DSGVO-konform</span>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-[#14ad9f]/20 bg-[#14ad9f]/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <FiInfo className="text-[#14ad9f] w-6 h-6 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                DATEV-Schnittstelle für professionelle Buchhaltung
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Verbinden Sie Ihr Taskilo-Konto direkt mit DATEV für automatische Rechnungsstellung,
                Buchungsexport und Steuerberater-Integration. Alle Daten werden verschlüsselt
                übertragen und entsprechen den höchsten Sicherheitsstandards.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiFileText className="w-4 h-4" />
                  Automatischer Rechnungsexport
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiTrendingUp className="w-4 h-4" />
                  Echtzeit-Buchungssynchronisation
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiUsers className="w-4 h-4" />
                  Steuerberater-Zugang
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiDatabase className="w-4 h-4" />
                  Vollständige Datenintegration
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connection">Verbindung</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <DatevAuthComponent
            companyId={companyId}
            onAuthSuccess={org => {

            }}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <DatevDashboard companyId={companyId} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiShield className="text-[#14ad9f]" />
                DATEV-Einstellungen
              </CardTitle>
              <CardDescription>Konfigurieren Sie Ihre DATEV-Integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Automatischer Export</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Rechnungen automatisch zu DATEV exportieren wenn sie erstellt werden.
                  </p>
                  <Button
                    variant="outline"
                    className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  >
                    Auto-Export aktivieren
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Synchronisation</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Häufigkeit der Datensynchronisation mit DATEV.
                  </p>
                  <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option>Stündlich</option>
                    <option>Täglich</option>
                    <option>Wöchentlich</option>
                    <option>Manuell</option>
                  </select>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Steuerberater-Zugang</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Ihrem Steuerberater direkten Zugriff auf relevante Daten gewähren.
                  </p>
                  <Button
                    variant="outline"
                    className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  >
                    Steuerberater einladen
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Datensicherheit</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Alle Daten werden Ende-zu-Ende verschlüsselt übertragen.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <FiShield className="w-4 h-4" />
                    SSL/TLS-Verschlüsselung aktiv
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, ExternalLink, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SettingsPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const { uid: companyId } = React.use(params);

  const handleDisconnect = async () => {
    if (window.confirm('Möchten Sie die Google Ads Verbindung wirklich trennen?')) {
      try {
        const response = await fetch(`/api/multi-platform-advertising/connections/connect`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId,
            platform: 'google-ads'
          }),
        });

        if (response.ok) {
          alert('Google Ads Verbindung wurde erfolgreich getrennt.');
          router.push(`/dashboard/company/${companyId}/taskilo-advertising/google-ads`);
        } else {
          alert('Fehler beim Trennen der Verbindung.');
        }
      } catch (error) {
        console.error('Error disconnecting:', error);
        alert('Fehler beim Trennen der Verbindung.');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">Google Ads Einstellungen</h1>
        <p className="text-gray-600 mt-2">Verwalten Sie Ihre Google Ads Account-Einstellungen</p>
      </div>

      <div className="grid gap-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Account-Verwaltung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Google Account Verbunden</h3>
                <p className="text-green-800 text-sm mb-4">
                  Ihre OAuth-Verbindung zu Google Ads ist aktiv und funktionsfähig.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://ads.google.com/aw/accountsettings/home', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Account-Einstellungen öffnen
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://ads.google.com/aw/billing', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrechnung verwalten
                  </Button>
                </div>
              </div>

              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">🔧 Erweiterte Einstellungen</h3>
                <p className="text-blue-800 mb-4">
                  Zusätzliche Konfigurationsoptionen werden mit der vollständigen Google Ads API Integration verfügbar sein.
                </p>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>Geplante Features:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Automatisierte Gebotsstrategie-Konfiguration</li>
                    <li>Bulk-Kampagnen-Management</li>
                    <li>Custom Conversion-Tracking Setup</li>
                    <li>API-Limits und Rate-Limiting Konfiguration</li>
                    <li>Multi-Account Verwaltung</li>
                  </ul>
                </div>
              </div>

              {/* Disconnect Section */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Verbindung trennen</h3>
                <p className="text-red-800 text-sm mb-4">
                  Trennen Sie die Verbindung zu Ihrem Google Ads Account. Dies entfernt alle gespeicherten Zugangsdaten.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Google Ads Verbindung trennen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
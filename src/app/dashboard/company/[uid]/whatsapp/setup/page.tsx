'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WhatsAppSetupPage() {
  const params = useParams();
  const router = useRouter();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const handleOpenMetaSetup = () => {
    // Öffne Meta Business Manager für WhatsApp Setup
    const metaUrl = `https://business.facebook.com/latest/whatsapp_manager`;
    window.open(metaUrl, '_blank');
    
    toast.info('Folge den Schritten im Meta Business Manager', {
      duration: 5000,
    });
  };

  const handleManualSetup = () => {
    // Weiterleitung zu manuellen Einstellungen
    router.push(`/dashboard/company/${uid}/settings/whatsapp`);
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>WhatsApp Business einrichten</CardTitle>
              <CardDescription>
                Verbinde deine WhatsApp Business Nummer mit Taskilo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Option 1: Meta Business Manager */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">Option 1: Automatische Einrichtung (Empfohlen)</h3>
                <p className="text-sm text-green-800 mb-3">
                  Verbinde deine WhatsApp Business Nummer direkt über Meta Business Manager. 
                  Einfach und schnell - keine API-Kenntnisse nötig!
                </p>
                <Button
                  onClick={handleOpenMetaSetup}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Meta Business Manager öffnen
                </Button>
              </div>
            </div>

            {/* Anleitung für Option 1 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📋 Nach dem Öffnen:</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Klicke auf "WhatsApp Accounts" → "Konto hinzufügen"</li>
                <li>Wähle "Neue Nummer registrieren" oder "Bestehende Nummer verbinden"</li>
                <li>Folge den Schritten zur Verifizierung</li>
                <li>Kopiere dann deine <strong>Phone Number ID</strong> und <strong>Access Token</strong></li>
                <li>Komme zurück zu Taskilo und füge sie in den manuellen Einstellungen ein</li>
              </ol>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">oder</span>
            </div>
          </div>

          {/* Option 2: Manuelle Einrichtung */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <AlertCircle className="h-6 w-6 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Option 2: Manuelle Konfiguration</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Für Entwickler: Trage deine WhatsApp Business API Credentials manuell ein.
                </p>
                <Button
                  onClick={handleManualSetup}
                  variant="outline"
                >
                  Manuelle Einstellungen öffnen
                </Button>
              </div>
            </div>
          </div>

          {/* Hilfe */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">💡 Noch keine WhatsApp Business Nummer?</h4>
            <p className="text-sm text-yellow-800 mb-2">
              Du brauchst eine verifizierte WhatsApp Business Nummer, um loszulegen.
            </p>
            <a 
              href="https://business.whatsapp.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Jetzt WhatsApp Business erstellen
            </a>
          </div>

          {/* Info Box */}
          <div className="text-xs text-center text-gray-500 space-y-1">
            <p>✓ Deine Nummer bleibt bei dir</p>
            <p>✓ Volle Kontrolle über deine Daten</p>
            <p>✓ Kostenlos starten (Meta bietet 1.000 Nachrichten/Monat gratis)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

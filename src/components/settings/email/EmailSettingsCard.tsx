'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';
import { EmailSettings } from './types';

interface EmailSettingsCardProps {
  companyId: string;
  settings: EmailSettings;
  onSaveSettings: (settings: EmailSettings) => void;
}

export function EmailSettingsCard({ 
  companyId, 
  settings, 
  onSaveSettings 
}: EmailSettingsCardProps) {
  const [localSettings, setLocalSettings] = useState<EmailSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(localSettings);
      // Success feedback could be added here
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2 text-[#14ad9f]" />
          E-Mail-Einstellungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Standard Absender */}
        <div className="space-y-2">
          <Label htmlFor="defaultFrom">Standard-Absender</Label>
          <Input
            id="defaultFrom"
            value={localSettings.defaultFrom}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultFrom: e.target.value }))}
            placeholder="name@unternehmen.de"
          />
        </div>

        {/* E-Mail-Signatur */}
        <div className="space-y-2">
          <Label htmlFor="signature">E-Mail-Signatur</Label>
          <Textarea
            id="signature"
            value={localSettings.signature}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, signature: e.target.value }))}
            placeholder="Mit freundlichen Grüßen..."
            rows={4}
          />
        </div>

        {/* Auto-Reply */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Automatische Antwort</Label>
              <p className="text-sm text-gray-500">
                Automatische Antwort auf eingehende E-Mails
              </p>
            </div>
            <Switch
              checked={localSettings.autoReply}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, autoReply: checked }))}
            />
          </div>

          {localSettings.autoReply && (
            <Textarea
              value={localSettings.autoReplyMessage}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, autoReplyMessage: e.target.value }))}
              placeholder="Vielen Dank für Ihre E-Mail. Wir werden uns schnellstmöglich bei Ihnen melden."
              rows={3}
            />
          )}
        </div>

        {/* Tracking Optionen */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Tracking & Analytics</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>E-Mail Öffnungen verfolgen</Label>
              <p className="text-sm text-gray-500">
                Verfolgen Sie, wann E-Mails geöffnet werden
              </p>
            </div>
            <Switch
              checked={localSettings.trackOpens}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, trackOpens: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Link-Klicks verfolgen</Label>
              <p className="text-sm text-gray-500">
                Verfolgen Sie Klicks auf Links in E-Mails
              </p>
            </div>
            <Switch
              checked={localSettings.trackClicks}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, trackClicks: checked }))}
            />
          </div>
        </div>

        {/* Speichern Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Speichere...' : 'Einstellungen speichern'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
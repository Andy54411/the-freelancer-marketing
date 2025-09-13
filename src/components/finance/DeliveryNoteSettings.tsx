'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Settings,
  Hash,
  Mail,
  Zap,
  FileText,
  Truck,
  Plug,
  Save,
  RefreshCw,
  Globe,
  ShoppingCart,
  Database,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { DeliveryNoteService, DeliveryNoteSettings } from '@/services/deliveryNoteService';
import { DeliveryNoteApiIntegrations } from './DeliveryNoteApiIntegrations';
import { AVAILABLE_DELIVERY_NOTE_TEMPLATES } from '../templates/delivery-note-templates';

interface DeliveryNoteSettingsComponentProps {
  companyId: string;
}

export function DeliveryNoteSettingsComponent({ companyId }: DeliveryNoteSettingsComponentProps) {
  const [settings, setSettings] = useState<DeliveryNoteSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadSettings();
  }, [companyId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await DeliveryNoteService.getSettings(companyId);
      setSettings(data || getDefaultSettings());
    } catch (error) {
      toast.error('Einstellungen konnten nicht geladen werden');
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (): DeliveryNoteSettings => ({
    companyId,
    numberPrefix: 'LS',
    nextNumber: 1,
    numberFormat: '{PREFIX}-{YYYY}-{####}',
    autoSendEmail: false,
    autoUpdateStock: true,
    autoCreateInvoice: false,
    defaultTemplate: 'german-standard',
    defaultShippingMethod: 'standard',
    defaultDeliveryTerms: 'Lieferung frei Haus',
    emailSubject: 'Ihr Lieferschein {NUMBER}',
    emailTemplate: 'Anbei erhalten Sie Ihren Lieferschein.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await DeliveryNoteService.updateSettings(companyId, settings);
      toast.success('Einstellungen erfolgreich gespeichert');
    } catch (error) {
      toast.error('Einstellungen konnten nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof DeliveryNoteSettings>(
    key: K,
    value: DeliveryNoteSettings[K]
  ) => {
    setSettings(prev => (prev ? { ...prev, [key]: value } : null));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Einstellungen...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Einstellungen nicht verfügbar</h3>
          <p className="text-gray-600 mb-4">
            Die Lieferschein-Einstellungen konnten nicht geladen werden.
          </p>
          <Button onClick={loadSettings} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lieferschein-Einstellungen</h2>
          <p className="text-sm text-gray-600 mt-1">
            Konfigurieren Sie Nummerierung, Templates, Automatisierung und API-Integrationen
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Speichern
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            Allgemein
          </TabsTrigger>
          <TabsTrigger value="numbering">
            <Hash className="h-4 w-4 mr-2" />
            Nummerierung
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Zap className="h-4 w-4 mr-2" />
            Automatisierung
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="h-4 w-4 mr-2" />
            API-Integrationen
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Grundeinstellungen
              </CardTitle>
              <CardDescription>Allgemeine Konfiguration für Lieferscheine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultShippingMethod">Standard-Versandart</Label>
                  <Select
                    value={settings.defaultShippingMethod}
                    onValueChange={value => updateSetting('defaultShippingMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Versandart wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standardversand</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="overnight">Über Nacht</SelectItem>
                      <SelectItem value="pickup">Selbstabholung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultTemplate">Standard-Template</Label>
                  <Select
                    value={settings.defaultTemplate}
                    onValueChange={value => updateSetting('defaultTemplate', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Template wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_DELIVERY_NOTE_TEMPLATES.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultDeliveryTerms">Standard-Lieferbedingungen</Label>
                <Textarea
                  id="defaultDeliveryTerms"
                  value={settings.defaultDeliveryTerms}
                  onChange={e => updateSetting('defaultDeliveryTerms', e.target.value)}
                  placeholder="Lieferung frei Haus"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Numbering Settings */}
        <TabsContent value="numbering" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hash className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Nummerierung
              </CardTitle>
              <CardDescription>
                Konfiguration der automatischen Lieferschein-Nummerierung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="numberPrefix">Nummern-Präfix</Label>
                  <Input
                    id="numberPrefix"
                    value={settings.numberPrefix}
                    onChange={e => updateSetting('numberPrefix', e.target.value)}
                    placeholder="LS"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextNumber">Nächste Nummer</Label>
                  <Input
                    id="nextNumber"
                    type="number"
                    value={settings.nextNumber}
                    onChange={e => updateSetting('nextNumber', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberFormat">Nummern-Format</Label>
                <Input
                  id="numberFormat"
                  value={settings.numberFormat}
                  onChange={e => updateSetting('numberFormat', e.target.value)}
                  placeholder="{PREFIX}-{YYYY}-{####}"
                />
                <p className="text-sm text-gray-600">
                  Verfügbare Platzhalter: {'{PREFIX}'}, {'{YYYY}'}, {'{MM}'}, {'{####}'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Vorschau:</div>
                <div className="text-lg font-mono text-[#14ad9f]">
                  {settings.numberFormat
                    .replace('{PREFIX}', settings.numberPrefix)
                    .replace('{YYYY}', new Date().getFullYear().toString())
                    .replace('{MM}', (new Date().getMonth() + 1).toString().padStart(2, '0'))
                    .replace('{####}', settings.nextNumber.toString().padStart(4, '0'))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Settings */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Template-Verwaltung
              </CardTitle>
              <CardDescription>
                Verfügbare Lieferschein-Templates und deren Konfiguration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_DELIVERY_NOTE_TEMPLATES.map(template => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      settings.defaultTemplate === template.id
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'hover:border-[#14ad9f]/50'
                    }`}
                    onClick={() => updateSetting('defaultTemplate', template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {settings.defaultTemplate === template.id && (
                          <Badge className="bg-[#14ad9f] text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Standard
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Automatisierung
              </CardTitle>
              <CardDescription>
                Automatische Prozesse für Lieferscheine konfigurieren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Automatische E-Mail-Versendung</div>
                    <div className="text-sm text-gray-600">
                      Lieferscheine automatisch per E-Mail versenden
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoSendEmail}
                    onCheckedChange={value => updateSetting('autoSendEmail', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Automatische Lagerbestand-Aktualisierung</div>
                    <div className="text-sm text-gray-600">
                      Lagerbestände automatisch bei Lieferschein-Erstellung reduzieren
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoUpdateStock}
                    onCheckedChange={value => updateSetting('autoUpdateStock', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Automatische Rechnungs-Erstellung</div>
                    <div className="text-sm text-gray-600">
                      Rechnungen automatisch nach Zustellung erstellen
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoCreateInvoice}
                    onCheckedChange={value => updateSetting('autoCreateInvoice', value)}
                  />
                </div>
              </div>

              {/* E-Mail Template Configuration */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-[#14ad9f]" />
                  E-Mail-Template
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailSubject">E-Mail-Betreff</Label>
                    <Input
                      id="emailSubject"
                      value={settings.emailSubject}
                      onChange={e => updateSetting('emailSubject', e.target.value)}
                      placeholder="Ihr Lieferschein {NUMBER}"
                    />
                    <p className="text-sm text-gray-600">
                      Verfügbare Platzhalter: {'{NUMBER}'}, {'{CUSTOMER_NAME}'}, {'{DATE}'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailTemplate">E-Mail-Text</Label>
                    <Textarea
                      id="emailTemplate"
                      value={settings.emailTemplate}
                      onChange={e => updateSetting('emailTemplate', e.target.value)}
                      placeholder="Anbei erhalten Sie Ihren Lieferschein."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <DeliveryNoteApiIntegrations companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

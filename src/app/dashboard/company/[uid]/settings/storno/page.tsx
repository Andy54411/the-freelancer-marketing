'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FiSave,
  FiInfo,
  FiPercent,
  FiDollarSign,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StornoSettings {
  allowCustomerCancellation: boolean;
  customCancellationDeadline: number; // hours before job start
  stornoFee: {
    enabled: boolean;
    amount: number; // in cents
    percentage: number; // alternative to fixed amount
    type: 'fixed' | 'percentage';
  };
  autoApprovalSettings: {
    enabled: boolean;
    maxAmount: number; // max amount for auto-approval in cents
    beforeJobStart: number; // hours before job for auto-approval
  };
  customTerms: string;
  lastUpdated: string;
  updatedBy: string;
}

export default function CompanyStornoSettingsPage() {
  const params = useParams();
  const companyUid = params?.uid as string;

  const [settings, setSettings] = useState<StornoSettings>({
    allowCustomerCancellation: true,
    customCancellationDeadline: 24,
    stornoFee: {
      enabled: false,
      amount: 0,
      percentage: 0,
      type: 'fixed',
    },
    autoApprovalSettings: {
      enabled: false,
      maxAmount: 5000, // 50 EUR
      beforeJobStart: 48,
    },
    customTerms: '',
    lastUpdated: '',
    updatedBy: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (companyUid) {
      loadStornoSettings();
    }
  }, [companyUid]);

  const loadStornoSettings = async () => {
    try {
      const response = await fetch(`/api/company/${companyUid}/settings/storno-fees`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/company/${companyUid}/settings/storno-fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Storno-Einstellungen erfolgreich gespeichert!');
        setSettings(result.settings);
      } else {
        const error = await response.json();
        alert(`Fehler beim Speichern: ${error.message}`);
      }
    } catch (error) {
      alert('Speichern fehlgeschlagen - bitte erneut versuchen');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePreview = async () => {
    try {
      const response = await fetch(`/api/public/storno-conditions/${companyUid}?preview=true`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setShowPreview(true);
      }
    } catch (error) {
      alert('Fehler beim Generieren der Vorschau');
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <FiRefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mr-3" />
        <span>Lade Storno-Einstellungen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiSettings className="h-8 w-8 text-[#14ad9f]" />
            Storno-Einstellungen
          </h1>
          <p className="text-gray-600 mt-1">
            Konfigurieren Sie Ihre Stornierungsbedingungen und Gebühren
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePreview}>
            <FiEye className="h-4 w-4 mr-2" />
            Vorschau
          </Button>
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            {isSaving ? (
              <>
                <FiRefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <FiSave className="h-4 w-4 mr-2" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Grundeinstellungen</TabsTrigger>
          <TabsTrigger value="fees">Gebühren</TabsTrigger>
          <TabsTrigger value="terms">Bedingungen</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Storno-Einstellungen</CardTitle>
              <CardDescription>Grundlegende Konfiguration für Kundensstornierungen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allow Cancellation */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowCancellation"
                  checked={settings.allowCustomerCancellation}
                  onChange={e => updateSettings('allowCustomerCancellation', e.target.checked)}
                  className="h-4 w-4 text-[#14ad9f] rounded border-gray-300 focus:ring-[#14ad9f]"
                />

                <Label htmlFor="allowCancellation" className="text-sm font-medium">
                  Kundenstornierungen zulassen
                </Label>
              </div>

              {settings.allowCustomerCancellation && (
                <>
                  {/* Cancellation Deadline */}
                  <div>
                    <Label
                      htmlFor="deadline"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <FiClock className="h-4 w-4" />
                      Stornierungsfrist (Stunden vor Ausführung)
                    </Label>
                    <Input
                      id="deadline"
                      type="number"
                      min="0"
                      max="168"
                      value={settings.customCancellationDeadline}
                      onChange={e =>
                        updateSettings('customCancellationDeadline', parseInt(e.target.value))
                      }
                      className="mt-1 max-w-xs"
                    />

                    <p className="text-xs text-gray-500 mt-1">
                      0 = Stornierung bis zum Ausführungstag möglich, 24 = bis 24h vorher, etc.
                    </p>
                  </div>

                  {/* Auto-Approval Settings */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        id="autoApproval"
                        checked={settings.autoApprovalSettings.enabled}
                        onChange={e =>
                          updateSettings('autoApprovalSettings.enabled', e.target.checked)
                        }
                        className="h-4 w-4 text-[#14ad9f] rounded border-gray-300 focus:ring-[#14ad9f]"
                      />

                      <Label htmlFor="autoApproval" className="text-sm font-medium">
                        Automatische Genehmigung aktivieren
                      </Label>
                    </div>

                    {settings.autoApprovalSettings.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Max. Betrag für Auto-Genehmigung
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <FiDollarSign className="h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={(settings.autoApprovalSettings.maxAmount / 100).toFixed(2)}
                              onChange={e =>
                                updateSettings(
                                  'autoApprovalSettings.maxAmount',
                                  Math.round(parseFloat(e.target.value) * 100)
                                )
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">
                            Mindestzeit vor Ausführung (Stunden)
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <FiClock className="h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              min="0"
                              value={settings.autoApprovalSettings.beforeJobStart}
                              onChange={e =>
                                updateSettings(
                                  'autoApprovalSettings.beforeJobStart',
                                  parseInt(e.target.value)
                                )
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storno-Gebühren</CardTitle>
              <CardDescription>
                Konfigurieren Sie Bearbeitungsgebühren für Stornierungen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Fees */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableFees"
                  checked={settings.stornoFee.enabled}
                  onChange={e => updateSettings('stornoFee.enabled', e.target.checked)}
                  className="h-4 w-4 text-[#14ad9f] rounded border-gray-300 focus:ring-[#14ad9f]"
                />

                <Label htmlFor="enableFees" className="text-sm font-medium">
                  Storno-Gebühren erheben
                </Label>
              </div>

              {settings.stornoFee.enabled && (
                <>
                  {/* Fee Type Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Gebührentyp</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="fixedFee"
                          name="feeType"
                          checked={settings.stornoFee.type === 'fixed'}
                          onChange={() => updateSettings('stornoFee.type', 'fixed')}
                          className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                        />

                        <Label htmlFor="fixedFee" className="text-sm">
                          Fester Betrag
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="percentageFee"
                          name="feeType"
                          checked={settings.stornoFee.type === 'percentage'}
                          onChange={() => updateSettings('stornoFee.type', 'percentage')}
                          className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                        />

                        <Label htmlFor="percentageFee" className="text-sm">
                          Prozentsatz
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Fee Amount */}
                  {settings.stornoFee.type === 'fixed' ? (
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <FiDollarSign className="h-4 w-4" />
                        Feste Storno-Gebühr
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(settings.stornoFee.amount / 100).toFixed(2)}
                        onChange={e =>
                          updateSettings(
                            'stornoFee.amount',
                            Math.round(parseFloat(e.target.value) * 100)
                          )
                        }
                        className="mt-1 max-w-xs"
                        placeholder="z.B. 15.00"
                      />

                      <p className="text-xs text-gray-500 mt-1">
                        Betrag in Euro, der bei jeder Stornierung abgezogen wird
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <FiPercent className="h-4 w-4" />
                        Prozentuale Storno-Gebühr
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.stornoFee.percentage}
                        onChange={e =>
                          updateSettings('stornoFee.percentage', parseFloat(e.target.value))
                        }
                        className="mt-1 max-w-xs"
                        placeholder="z.B. 5.0"
                      />

                      <p className="text-xs text-gray-500 mt-1">
                        Prozentsatz des Auftragswertes als Storno-Gebühr
                      </p>
                    </div>
                  )}

                  {/* Fee Preview */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Gebühren-Vorschau</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Bei €100 Auftrag:</p>
                        <p className="font-bold">
                          Gebühr: €
                          {settings.stornoFee.type === 'fixed'
                            ? (settings.stornoFee.amount / 100).toFixed(2)
                            : ((100 * settings.stornoFee.percentage) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Bei €500 Auftrag:</p>
                        <p className="font-bold">
                          Gebühr: €
                          {settings.stornoFee.type === 'fixed'
                            ? (settings.stornoFee.amount / 100).toFixed(2)
                            : ((500 * settings.stornoFee.percentage) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Bei €1000 Auftrag:</p>
                        <p className="font-bold">
                          Gebühr: €
                          {settings.stornoFee.type === 'fixed'
                            ? (settings.stornoFee.amount / 100).toFixed(2)
                            : ((1000 * settings.stornoFee.percentage) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individuelle Storno-Bedingungen</CardTitle>
              <CardDescription>
                Zusätzliche Bedingungen, die Kunden angezeigt werden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="customTerms" className="text-sm font-medium">
                  Zusätzliche Storno-Bedingungen
                </Label>
                <Textarea
                  id="customTerms"
                  value={settings.customTerms}
                  onChange={e => updateSettings('customTerms', e.target.value)}
                  rows={6}
                  className="mt-1"
                  placeholder="z.B. Bei Materialbestellungen ist eine Stornierung nur bis 48h vor Ausführung möglich..."
                />

                <p className="text-xs text-gray-500 mt-1">
                  Diese Bedingungen werden Kunden zusätzlich zu den Standard-Storno-Informationen
                  angezeigt.
                </p>
              </div>
            </CardContent>
          </Card>

          {settings.lastUpdated && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiInfo className="h-4 w-4" />
                  <span>
                    Letzte Aktualisierung: {new Date(settings.lastUpdated).toLocaleString('de-DE')}
                    {settings.updatedBy && ` von ${settings.updatedBy}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Storno-Bedingungen Vorschau</h3>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <FiX className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">So sehen Kunden Ihre Storno-Bedingungen:</h4>
                  <div className="bg-white rounded border p-4">
                    {previewData.conditions && (
                      <div dangerouslySetInnerHTML={{ __html: previewData.conditions }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import { Loader2, Bell, Clock, AlertTriangle, DollarSign, Calendar } from 'lucide-react';

interface FinanceSettingsTabProps {
  companyUid: string;
}

export default function FinanceSettingsTab({ companyUid }: FinanceSettingsTabProps) {
  const { settings, loading } = useCompanySettings(companyUid);

  const [reminderFees, setReminderFees] = useState({
    level1: { fee: 5.0, days: 7, title: '1. Mahnung' },
    level2: { fee: 10.0, days: 14, title: '2. Mahnung' },
    level3: { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' },
  });

  const [reminderEnabled, setReminderEnabled] = useState({
    level1: true,
    level2: true,
    level3: true,
  });

  const [paymentTerms, setPaymentTerms] = useState({
    days: 14,
    text: 'Zahlbar binnen 14 Tagen ohne Abzug',
    skontoEnabled: false,
    skontoDays: 10,
    skontoPercentage: 2,
  });

  const [autoSettings, setAutoSettings] = useState({
    autoReminders: true,
    autoInvoiceSend: false,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      // Lade Mahngebühren
      if (settings.reminderFees) {
        setReminderFees(settings.reminderFees);
      }

      // Lade Zahlungskonditionen
      if (settings.defaultPaymentTerms) {
        setPaymentTerms({
          days: settings.defaultPaymentTerms.days || 14,
          text: settings.defaultPaymentTerms.text || 'Zahlbar binnen 14 Tagen ohne Abzug',
          skontoEnabled: settings.defaultPaymentTerms.skontoEnabled || false,
          skontoDays: settings.defaultPaymentTerms.skontoDays || 10,
          skontoPercentage: settings.defaultPaymentTerms.skontoPercentage || 2,
        });
      }
    }
  }, [settings]);

  const updateReminderFee = (
    level: 'level1' | 'level2' | 'level3',
    field: 'fee' | 'days' | 'title',
    value: string | number
  ) => {
    setReminderFees(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value,
      },
    }));
  };

  const updateReminderEnabled = (level: 'level1' | 'level2' | 'level3', enabled: boolean) => {
    setReminderEnabled(prev => ({
      ...prev,
      [level]: enabled,
    }));
  };

  const updatePaymentTerms = (field: string, value: any) => {
    setPaymentTerms(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateAutoSetting = (field: string, value: boolean) => {
    setAutoSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!companyUid) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, 'companies', companyUid), {
        reminderFees: reminderFees,
        defaultPaymentTerms: paymentTerms,
        // Speichere weitere Einstellungen als erweiterte Felder
        reminderEnabled: reminderEnabled,
        autoSettings: autoSettings,
      });
      toast.success('Finanzeinstellungen erfolgreich gespeichert');
    } catch (error) {
      console.error('Error saving finance settings:', error);
      toast.error('Fehler beim Speichern der Finanzeinstellungen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#14ad9f]/10 mb-4">
          <DollarSign className="h-8 w-8 text-[#14ad9f]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Finanzeinstellungen</h2>
        <p className="text-gray-600 mt-2">Konfigurieren Sie Ihre Finanz- und Mahnungseinstellungen</p>
      </div>

      {/* Mahnwesen Einstellungen */}
      <Card className="border-l-4 border-l-[#14ad9f]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bell className="h-5 w-5 text-[#14ad9f]" />
            Mahnwesen Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Mahnung */}
          <div className="border border-gray-200 rounded-lg p-6 bg-linear-to-r from-[#14ad9f]/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#14ad9f]/10">
                  <span className="text-sm font-semibold text-[#14ad9f]">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">1. Mahnung</h3>
              </div>
              <Switch
                checked={reminderEnabled.level1}
                onCheckedChange={(checked) => updateReminderEnabled('level1', checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Gebühr (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={reminderFees.level1.fee.toString()}
                  onChange={e => updateReminderFee('level1', 'fee', parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Zahlungsfrist (Tage)</Label>
                <Input
                  type="number"
                  value={reminderFees.level1.days.toString()}
                  onChange={e => updateReminderFee('level1', 'days', parseInt(e.target.value) || 0)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Titel</Label>
                <Input
                  value={reminderFees.level1.title}
                  onChange={e => updateReminderFee('level1', 'title', e.target.value)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
            </div>
          </div>

          {/* 2. Mahnung */}
          <div className="border border-gray-200 rounded-lg p-6 bg-linear-to-r from-yellow-50 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                  <span className="text-sm font-semibold text-yellow-700">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">2. Mahnung</h3>
              </div>
              <Switch
                checked={reminderEnabled.level2}
                onCheckedChange={(checked) => updateReminderEnabled('level2', checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Gebühr (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={reminderFees.level2.fee.toString()}
                  onChange={e => updateReminderFee('level2', 'fee', parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Zahlungsfrist (Tage)</Label>
                <Input
                  type="number"
                  value={reminderFees.level2.days.toString()}
                  onChange={e => updateReminderFee('level2', 'days', parseInt(e.target.value) || 0)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Titel</Label>
                <Input
                  value={reminderFees.level2.title}
                  onChange={e => updateReminderFee('level2', 'title', e.target.value)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
            </div>
          </div>

          {/* 3. Mahnung */}
          <div className="border border-gray-200 rounded-lg p-6 bg-linear-to-r from-red-50 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">3. Mahnung / Inkasso-Androhung</h3>
              </div>
              <Switch
                checked={reminderEnabled.level3}
                onCheckedChange={(checked) => updateReminderEnabled('level3', checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Gebühr (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={reminderFees.level3.fee.toString()}
                  onChange={e => updateReminderFee('level3', 'fee', parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Zahlungsfrist (Tage)</Label>
                <Input
                  type="number"
                  value={reminderFees.level3.days.toString()}
                  onChange={e => updateReminderFee('level3', 'days', parseInt(e.target.value) || 0)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Titel</Label>
                <Input
                  value={reminderFees.level3.title}
                  onChange={e => updateReminderFee('level3', 'title', e.target.value)}
                  className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zahlungskonditionen */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-blue-500" />
            Zahlungskonditionen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Standard Zahlungsziel (Tage)</Label>
              <Input
                type="number"
                value={paymentTerms.days.toString()}
                onChange={e => updatePaymentTerms('days', parseInt(e.target.value) || 14)}
                className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
              />
            </div>
          </div>

          {/* Skonto Einstellungen */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Skonto-Regelung</h4>
                <p className="text-sm text-gray-600">Gewähren Sie Rabatt bei früher Zahlung</p>
              </div>
              <Switch
                checked={paymentTerms.skontoEnabled || false}
                onCheckedChange={(checked) => updatePaymentTerms('skontoEnabled', checked)}
              />
            </div>

            {paymentTerms.skontoEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Skonto-Prozentsatz (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={paymentTerms.skontoPercentage?.toString() || '2'}
                    onChange={e => updatePaymentTerms('skontoPercentage', parseFloat(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Skonto-Tage</Label>
                  <Input
                    type="number"
                    value={paymentTerms.skontoDays?.toString() || '10'}
                    onChange={e => updatePaymentTerms('skontoDays', parseInt(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Automatisierung */}
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Automatisierung</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Automatische Mahnungen</Label>
                <p className="text-sm text-gray-600">Mahnungen automatisch basierend auf den obigen Einstellungen versenden</p>
              </div>
              <Switch
                checked={autoSettings.autoReminders}
                onCheckedChange={(checked) => updateAutoSetting('autoReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Automatischer Rechnungsversand</Label>
                <p className="text-sm text-gray-600">Rechnungen automatisch per E-Mail versenden</p>
              </div>
              <Switch
                checked={autoSettings.autoInvoiceSend}
                onCheckedChange={(checked) => updateAutoSetting('autoInvoiceSend', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Save Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white px-8 py-3"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Alle Einstellungen speichern
        </Button>
      </div>
    </div>
  );
}
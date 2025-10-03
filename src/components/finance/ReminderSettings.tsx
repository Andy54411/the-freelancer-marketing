'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import { Loader2, Bell, Clock, AlertTriangle } from 'lucide-react';

interface ReminderSettingsProps {
  uid: string;
}

export function ReminderSettings({ uid }: ReminderSettingsProps) {
  const { settings, loading } = useCompanySettings(uid);

  const [reminderFees, setReminderFees] = useState({
    level1: { fee: 5.0, days: 7, title: '1. Mahnung' },
    level2: { fee: 10.0, days: 14, title: '2. Mahnung' },
    level3: { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' }
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {

    // Always set reminderFees from settings or defaults
    setReminderFees(settings?.reminderFees || {
      level1: { fee: 5.0, days: 7, title: '1. Mahnung' },
      level2: { fee: 10.0, days: 14, title: '2. Mahnung' },
      level3: { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' }
    });
  }, [settings]);

  const updateReminderFee = (level: 'level1' | 'level2' | 'level3', field: 'fee' | 'days' | 'title', value: string | number) => {

    setReminderFees((prev) => {
      const newFees = {
        ...prev,
        [level]: {
          ...prev[level],
          [field]: value
        }
      };

      return newFees;
    });
  };

  const handleSave = async () => {
    if (!uid) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, 'companies', uid), {
        reminderFees: reminderFees
      });
      toast.success('Mahngebühren erfolgreich gespeichert');
    } catch (error) {
      console.error('Error saving reminder fees:', error);
      toast.error('Fehler beim Speichern der Mahngebühren');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>);

  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#14ad9f]/10 mb-4">
          <Bell className="h-8 w-8 text-[#14ad9f]" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Mahnwesen Einstellungen</h3>
        <p className="text-gray-600 mt-2">Konfigurieren Sie Ihr automatisches Mahnwesen</p>
      </div>

      <Card className="border-l-4 border-l-[#14ad9f] hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-[#14ad9f]" />
            Mahngebühren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            {/* 1. Mahnung */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-[#14ad9f]/5 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#14ad9f]/10">
                  <span className="text-sm font-semibold text-[#14ad9f]">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">1. Mahnung</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Gebühr (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={reminderFees.level1.fee.toString()}
                    onChange={(e) => {

                      updateReminderFee('level1', 'fee', parseFloat(e.target.value) || 0);
                    }}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Zahlungsfrist (Tage)</Label>
                  <Input
                    type="number"
                    defaultValue={reminderFees.level1.days.toString()}
                    onChange={(e) => updateReminderFee('level1', 'days', parseInt(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Titel</Label>
                  <Input
                    defaultValue={reminderFees.level1.title}
                    onChange={(e) => updateReminderFee('level1', 'title', e.target.value)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
              </div>
            </div>

            {/* 2. Mahnung */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-yellow-50 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                  <span className="text-sm font-semibold text-yellow-700">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">2. Mahnung</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Gebühr (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={reminderFees.level2.fee.toString()}
                    onChange={(e) => updateReminderFee('level2', 'fee', parseFloat(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Zahlungsfrist (Tage)</Label>
                  <Input
                    type="number"
                    defaultValue={reminderFees.level2.days.toString()}
                    onChange={(e) => updateReminderFee('level2', 'days', parseInt(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Titel</Label>
                  <Input
                    defaultValue={reminderFees.level2.title}
                    onChange={(e) => updateReminderFee('level2', 'title', e.target.value)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
              </div>
            </div>

            {/* 3. Mahnung */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-red-50 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">3. Mahnung / Inkasso-Androhung</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Gebühr (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={reminderFees.level3.fee.toString()}
                    onChange={(e) => updateReminderFee('level3', 'fee', parseFloat(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Zahlungsfrist (Tage)</Label>
                  <Input
                    type="number"
                    defaultValue={reminderFees.level3.days.toString()}
                    onChange={(e) => updateReminderFee('level3', 'days', parseInt(e.target.value) || 0)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Titel</Label>
                  <Input
                    defaultValue={reminderFees.level3.title}
                    onChange={(e) => updateReminderFee('level3', 'title', e.target.value)}
                    className="border-gray-300 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-2">

              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Einstellungen speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>);

}
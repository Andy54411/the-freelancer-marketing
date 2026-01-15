'use client';

import React, { useState, useEffect } from 'react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ReminderSettingsProps {
  uid: string;
}

export function ReminderSettings({ uid }: ReminderSettingsProps) {
  const { settings, loading } = useCompanySettings(uid);

  const [reminderFees, setReminderFees] = useState({
    level1: { fee: 5.0, days: 7, title: '1. Mahnung' },
    level2: { fee: 10.0, days: 14, title: '2. Mahnung' },
    level3: { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' },
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReminderFees(
      settings?.reminderFees || {
        level1: { fee: 5.0, days: 7, title: '1. Mahnung' },
        level2: { fee: 10.0, days: 14, title: '2. Mahnung' },
        level3: { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' },
      }
    );
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

  const handleSave = async () => {
    if (!uid) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, 'companies', uid), {
        reminderFees: reminderFees,
      });
      toast.success('Mahngebühren gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-100 rounded w-1/4"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const levels = [
    { key: 'level1' as const, label: '1. Mahnung' },
    { key: 'level2' as const, label: '2. Mahnung' },
    { key: 'level3' as const, label: '3. Mahnung' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mahnwesen</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Gebühren und Fristen für automatische Mahnungen
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-gray-500 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                Definiere Gebühren und Zahlungsfristen für jede Mahnstufe. 
                Die Tage geben an, nach wie vielen Tagen nach Fälligkeit die Mahnung versendet wird.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stufe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bezeichnung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tage nach Fälligkeit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gebühr
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {levels.map((level, index) => (
              <tr key={level.key} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={reminderFees[level.key].title}
                    onChange={e => updateReminderFee(level.key, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="relative w-24">
                    <input
                      type="number"
                      value={reminderFees[level.key].days}
                      onChange={e => updateReminderFee(level.key, 'days', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 pr-10 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Tage</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.01"
                      value={reminderFees[level.key].fee}
                      onChange={e => updateReminderFee(level.key, 'fee', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 pr-6 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#14ad9f] text-white text-sm font-medium rounded-lg hover:bg-[#0d8a7f] transition-colors disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

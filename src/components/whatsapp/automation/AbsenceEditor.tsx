/**
 * AbsenceEditor Component
 * 
 * Editor für Abwesenheitsnachrichten
 */
'use client';

import React from 'react';
import { Calendar, Clock, MessageSquare, Save } from 'lucide-react';

interface AbsenceSettings {
  isEnabled: boolean;
  message: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  useSchedule: boolean;
}

interface AbsenceEditorProps {
  value: AbsenceSettings;
  onChange: (settings: AbsenceSettings) => void;
  onSave: () => void;
  isSaving?: boolean;
  disabled?: boolean;
}

export function AbsenceEditor({ value, onChange, onSave, isSaving, disabled }: AbsenceEditorProps) {
  const handleChange = (field: keyof AbsenceSettings, val: string | boolean) => {
    onChange({ ...value, [field]: val });
  };

  const presetMessages = [
    'Vielen Dank für Ihre Nachricht. Ich bin derzeit abwesend und melde mich schnellstmöglich zurück.',
    'Hallo! Ich bin momentan nicht erreichbar. Bitte hinterlassen Sie eine Nachricht, ich antworte sobald ich wieder verfügbar bin.',
    'Vielen Dank für Ihre Anfrage. Aufgrund von Urlaub kann ich erst ab {{endDate}} antworten.',
    'Danke für Ihre Nachricht! Unser Team ist derzeit außerhalb der Geschäftszeiten. Wir melden uns am nächsten Werktag.',
  ];

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="font-medium">Abwesenheitsnachricht</h3>
          <p className="text-sm text-gray-500">Automatische Antwort bei Abwesenheit</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value.isEnabled}
            onChange={(e) => handleChange('isEnabled', e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]" />
        </label>
      </div>

      {value.isEnabled && (
        <>
          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Nachricht
            </label>
            <textarea
              value={value.message}
              onChange={(e) => handleChange('message', e.target.value)}
              disabled={disabled}
              rows={4}
              placeholder="Ihre Abwesenheitsnachricht..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
            />
            <p className="text-xs text-gray-400 mt-1">
              Verwenden Sie {'{{endDate}}'} um das Enddatum einzufügen
            </p>
          </div>

          {/* Preset Messages */}
          <div>
            <label className="block text-sm font-medium mb-2">Vorlagen</label>
            <div className="flex flex-wrap gap-2">
              {presetMessages.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChange('message', msg)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Vorlage {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Toggle */}
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <input
              type="checkbox"
              checked={value.useSchedule}
              onChange={(e) => handleChange('useSchedule', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-[#14ad9f] rounded focus:ring-[#14ad9f]"
            />
            <div>
              <span className="font-medium">Zeitraum festlegen</span>
              <p className="text-sm text-gray-500">Abwesenheit für bestimmten Zeitraum planen</p>
            </div>
          </div>

          {value.useSchedule && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
              {/* Start Date/Time */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Startdatum
                </label>
                <input
                  type="date"
                  value={value.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Startzeit
                </label>
                <input
                  type="time"
                  value={value.startTime || ''}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                />
              </div>

              {/* End Date/Time */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Enddatum
                </label>
                <input
                  type="date"
                  value={value.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Endzeit
                </label>
                <input
                  type="time"
                  value={value.endTime || ''}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={onSave}
              disabled={disabled || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Speichern
            </button>
          </div>
        </>
      )}
    </div>
  );
}

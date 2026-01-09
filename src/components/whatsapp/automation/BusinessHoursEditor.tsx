/**
 * BusinessHoursEditor Component
 * 
 * Visueller Editor für Geschäftszeiten
 */
'use client';

import React from 'react';
import { Plus, Trash2, Copy, Clock } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (hours: BusinessHours) => void;
  disabled?: boolean;
}

const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' },
];

const DEFAULT_SLOT: TimeSlot = { start: '09:00', end: '17:00' };

export function BusinessHoursEditor({ value, onChange, disabled }: BusinessHoursEditorProps) {
  const toggleDay = (day: keyof BusinessHours) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        enabled: !value[day].enabled,
        slots: value[day].enabled ? [] : [{ ...DEFAULT_SLOT }],
      },
    });
  };

  const addSlot = (day: keyof BusinessHours) => {
    const currentSlots = value[day].slots;
    const lastSlot = currentSlots[currentSlots.length - 1];
    const newStart = lastSlot ? lastSlot.end : '09:00';
    
    onChange({
      ...value,
      [day]: {
        ...value[day],
        slots: [...currentSlots, { start: newStart, end: '17:00' }],
      },
    });
  };

  const removeSlot = (day: keyof BusinessHours, index: number) => {
    const newSlots = value[day].slots.filter((_, i) => i !== index);
    onChange({
      ...value,
      [day]: {
        ...value[day],
        enabled: newSlots.length > 0,
        slots: newSlots,
      },
    });
  };

  const updateSlot = (day: keyof BusinessHours, index: number, field: 'start' | 'end', time: string) => {
    const newSlots = [...value[day].slots];
    newSlots[index] = { ...newSlots[index], [field]: time };
    onChange({
      ...value,
      [day]: {
        ...value[day],
        slots: newSlots,
      },
    });
  };

  const copyToAllWeekdays = (sourceDay: keyof BusinessHours) => {
    const sourceSchedule = value[sourceDay];
    const weekdays: (keyof BusinessHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    const updates: Partial<BusinessHours> = {};
    weekdays.forEach(day => {
      updates[day] = {
        enabled: sourceSchedule.enabled,
        slots: sourceSchedule.slots.map(s => ({ ...s })),
      };
    });
    
    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-4">
      {DAYS.map(({ key, label }) => (
        <div key={key} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value[key].enabled}
                  onChange={() => toggleDay(key)}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]" />
              </label>
              <span className={`font-medium ${value[key].enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>

            {value[key].enabled && !disabled && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToAllWeekdays(key)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Auf Werktage kopieren"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => addSlot(key)}
                  className="p-1.5 text-[#14ad9f] hover:bg-[#14ad9f]/10 rounded"
                  title="Zeitfenster hinzufügen"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {value[key].enabled && (
            <div className="space-y-2 ml-14">
              {value[key].slots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => updateSlot(key, index, 'start', e.target.value)}
                    disabled={disabled}
                    className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                  />
                  <span className="text-gray-400">bis</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => updateSlot(key, index, 'end', e.target.value)}
                    disabled={disabled}
                    className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
                  />
                  {value[key].slots.length > 1 && !disabled && (
                    <button
                      onClick={() => removeSlot(key, index)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!value[key].enabled && (
            <p className="text-sm text-gray-400 ml-14">Geschlossen</p>
          )}
        </div>
      ))}
    </div>
  );
}

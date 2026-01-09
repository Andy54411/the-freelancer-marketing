'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Bell } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface AppointmentReminderIntegrationProps {
  uid: string;
  contactPhone: string;
}

const REMINDER_TIMES = [
  { value: '1440', label: '24 Stunden vorher' },
  { value: '720', label: '12 Stunden vorher' },
  { value: '60', label: '1 Stunde vorher' },
  { value: '30', label: '30 Minuten vorher' },
  { value: '15', label: '15 Minuten vorher' },
];

export default function AppointmentReminderIntegration({ 
  uid, 
  contactPhone: _contactPhone 
}: AppointmentReminderIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reminderTime, setReminderTime] = useState('1440');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [sendReminder, setSendReminder] = useState(true);
  const [sendCancellation, setSendCancellation] = useState(true);

  // Lade Einstellungen aus Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'appointmentReminder');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setIsEnabled(data.enabled || false);
          setReminderTime(data.reminderTime || '1440');
          setSendConfirmation(data.sendConfirmation ?? true);
          setSendReminder(data.sendReminder ?? true);
          setSendCancellation(data.sendCancellation ?? true);
        }
      } catch {
        // Fehler ignorieren
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [uid]);

  // Speichere Einstellungen
  const saveSettings = async (updates: Record<string, unknown>) => {
    try {
      const settingsRef = doc(db, 'companies', uid, 'whatsappIntegrations', 'appointmentReminder');
      await setDoc(settingsRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Fehler ignorieren
    }
  };

  const handleToggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    await saveSettings({ enabled: newValue });
  };

  const handleReminderTimeChange = async (value: string) => {
    setReminderTime(value);
    await saveSettings({ reminderTime: value });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Terminbestätigungen</h4>
            <p className="text-xs text-gray-500 mt-0.5">Automatische Terminerinnerungen</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-[#14ad9f]' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isEnabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {isEnabled && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
          {/* Erinnerungszeit */}
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-2">
              <Clock className="w-3 h-3" />
              Erinnerung senden:
            </label>
            <select 
              value={reminderTime}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            >
              {REMINDER_TIMES.map((time) => (
                <option key={time.value} value={time.value}>
                  {time.label}
                </option>
              ))}
            </select>
          </div>

          {/* Benachrichtigungstypen */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Nachrichten senden bei:
            </label>
            
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sendConfirmation}
                onChange={(e) => {
                  setSendConfirmation(e.target.checked);
                  saveSettings({ sendConfirmation: e.target.checked });
                }}
                className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-gray-700">Terminbestätigung</span>
            </label>
            
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sendReminder}
                onChange={(e) => {
                  setSendReminder(e.target.checked);
                  saveSettings({ sendReminder: e.target.checked });
                }}
                className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-gray-700">Terminerinnerung</span>
            </label>
            
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sendCancellation}
                onChange={(e) => {
                  setSendCancellation(e.target.checked);
                  saveSettings({ sendCancellation: e.target.checked });
                }}
                className="w-4 h-4 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              <span className="text-gray-700">Terminabsage/-änderung</span>
            </label>
          </div>
          
          <Link
            href={`/dashboard/company/${uid}/calendar`}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" />
            Kalender öffnen
          </Link>
        </div>
      )}
    </div>
  );
}

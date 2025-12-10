'use client';

import { useState } from 'react';

export default function AppointmentSettingsPage() {
  const [settings, setSettings] = useState({
    defaultDuration: 30,
    allowBooking: true,
    requireApproval: false,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-teal-600">Termin-Einstellungen</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard-Termindauer (Minuten)
            </label>
            <input
              type="number"
              value={settings.defaultDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultDuration: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.allowBooking}
              onChange={(e) => setSettings(prev => ({ ...prev, allowBooking: e.target.checked }))}
              className="mr-3"
            />
            <label className="text-sm font-medium text-gray-700">
              Online-Buchung aktivieren
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.requireApproval}
              onChange={(e) => setSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
              className="mr-3"
            />
            <label className="text-sm font-medium text-gray-700">
              Termine benötigen Bestätigung
            </label>
          </div>
        </div>
        
        <div className="mt-8">
          <button className="bg-teal-600 text-white px-6 py-2 rounded-md hover:bg-teal-700 transition-colors">
            Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
}
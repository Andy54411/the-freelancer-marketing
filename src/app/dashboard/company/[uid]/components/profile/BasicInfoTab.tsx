'use client';

import React from 'react';
import ProfileImageUpload from './ProfileImageUpload';
import { ProfileTabProps } from './types';

const BasicInfoTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Grunddaten</h3>
        <p className="text-sm text-gray-600">
          Verwalte deine grundlegenden Unternehmensinformationen und Kontaktdaten.
        </p>
      </div>

      {/* Profilbild Upload */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <ProfileImageUpload profile={profile} setProfile={setProfile} />
      </div>

      {/* Grundinformationen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linke Spalte */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname *</label>
            <input
              type="text"
              value={profile.companyName}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, companyName: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="Dein Firmenname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stundensatz (€) *
            </label>
            <div className="relative">
              <input
                type="number"
                value={profile.hourlyRate}
                onChange={e =>
                  setProfile(prev =>
                    prev ? { ...prev, hourlyRate: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="50"
                min="0"
                step="5"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                €/Std
              </span>
            </div>
          </div>

          {/* Info Hinweis */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-2">📍 Standort verwalten</h5>
            <p className="text-sm text-gray-600">
              Deinen Standort kannst du im <strong>&quot;Standort&quot;</strong> Tab mit Google
              Places API präzise verwalten.
            </p>
          </div>
        </div>

        {/* Rechte Spalte */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unternehmensbeschreibung *
            </label>
            <textarea
              value={profile.publicDescription}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, publicDescription: e.target.value } : null))
              }
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="Beschreibe dein Unternehmen, deine Expertise und Dienstleistungen. Diese Beschreibung wird auf deinem öffentlichen Profil angezeigt und hilft Kunden dabei, dich zu finden und zu verstehen, was du anbietest..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Diese Beschreibung ist öffentlich sichtbar auf deinem Profil
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">💡 Tipp für bessere Sichtbarkeit</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Verwende klare, aussagekräftige Beschreibungen</li>
              <li>• Setze realistische und wettbewerbsfähige Stundensätze</li>
              <li>• Aktualisiere deine Informationen regelmäßig</li>
              <li>• Vervollständige alle Pflichtfelder (*)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoTab;

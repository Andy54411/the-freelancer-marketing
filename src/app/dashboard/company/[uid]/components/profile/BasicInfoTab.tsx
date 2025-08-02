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
      <div className="space-y-6">
        {/* Grunddaten Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname *</label>
            <input
              type="text"
              value={profile.companyName}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, companyName: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. Max Mustermann GmbH"
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
        </div>

        {/* Standort Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stadt *</label>
            <input
              type="text"
              value={profile.city || ''}
              onChange={e => setProfile(prev => (prev ? { ...prev, city: e.target.value } : null))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. München"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Land *</label>
            <input
              type="text"
              value={profile.country || ''}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, country: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="z.B. Deutschland"
            />
          </div>
        </div>

        {/* Unternehmensbeschreibung */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unternehmensbeschreibung *
          </label>
          <textarea
            value={profile.publicDescription}
            onChange={e =>
              setProfile(prev => (prev ? { ...prev, publicDescription: e.target.value } : null))
            }
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="Beschreibe dein Unternehmen, deine Expertise und Dienstleistungen. Diese Beschreibung wird auf deinem öffentlichen Profil angezeigt und hilft Kunden dabei, dich zu finden und zu verstehen, was du anbietest..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Diese Beschreibung ist öffentlich sichtbar auf deinem Profil
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoTab;

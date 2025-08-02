'use client';

import React from 'react';
import SpecialtiesManager from './SpecialtiesManager';
import ServicePackagesManager from './ServicePackagesManager';
import WorkingHoursManager from './WorkingHoursManager';
import FAQManager from './FAQManager';
import { ProfileTabProps } from './types';

const PublicProfileTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  return (
    <div className="space-y-8">
      {/* Öffentliche Beschreibung */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Öffentliche Beschreibung</h3>
        <textarea
          value={profile.publicDescription}
          onChange={e =>
            setProfile(prev => (prev ? { ...prev, publicDescription: e.target.value } : null))
          }
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          placeholder="Beschreibung für Ihr öffentliches Profil..."
        />
      </div>

      {/* Spezialisierungen */}
      <SpecialtiesManager profile={profile} setProfile={setProfile} />

      {/* Service Packages */}
      <ServicePackagesManager profile={profile} setProfile={setProfile} />

      {/* Arbeitszeiten */}
      <WorkingHoursManager profile={profile} setProfile={setProfile} />

      {/* FAQ */}
      <FAQManager profile={profile} setProfile={setProfile} />

      {/* Business Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Einstellungen</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={profile.instantBooking}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, instantBooking: e.target.checked } : null))
              }
              className="mr-3 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
            />
            <span className="font-medium">Sofortbuchung aktivieren</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Antwortzeit-Garantie (Stunden)
            </label>
            <input
              type="number"
              value={profile.responseTimeGuarantee}
              onChange={e =>
                setProfile(prev =>
                  prev ? { ...prev, responseTimeGuarantee: parseInt(e.target.value) || 24 } : null
                )
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileTab;

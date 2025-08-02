'use client';

import React from 'react';
import ProfileImageUpload from './ProfileImageUpload';
import { ProfileTabProps } from './types';

const BasicInfoTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Profilbild Upload */}
        <ProfileImageUpload profile={profile} setProfile={setProfile} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname</label>
          <input
            type="text"
            value={profile.companyName}
            onChange={e =>
              setProfile(prev => (prev ? { ...prev, companyName: e.target.value } : null))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
          <textarea
            value={profile.description}
            onChange={e =>
              setProfile(prev => (prev ? { ...prev, description: e.target.value } : null))
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            placeholder="Beschreibe deine Dienstleistungen und Expertise..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
            <input
              type="text"
              value={profile.country}
              onChange={e =>
                setProfile(prev => (prev ? { ...prev, country: e.target.value } : null))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stadt</label>
            <input
              type="text"
              value={profile.city}
              onChange={e => setProfile(prev => (prev ? { ...prev, city: e.target.value } : null))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Stundensatz (€)</label>
          <input
            type="number"
            value={profile.hourlyRate}
            onChange={e =>
              setProfile(prev =>
                prev ? { ...prev, hourlyRate: parseFloat(e.target.value) || 0 } : null
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoTab;

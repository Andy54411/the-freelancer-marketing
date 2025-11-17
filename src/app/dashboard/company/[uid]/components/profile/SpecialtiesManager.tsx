'use client';

import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { ProfileTabProps } from './types';

const SpecialtiesManager: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [newSpecialty, setNewSpecialty] = useState('');

  const addSpecialty = () => {
    if (!newSpecialty.trim() || profile.specialties.includes(newSpecialty)) return;
    setProfile(prev =>
      prev
        ? {
            ...prev,
            specialties: [...prev.specialties, newSpecialty],
          }
        : null
    );
    setNewSpecialty('');
  };

  const removeSpecialty = (specialty: string) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            specialties: prev.specialties.filter(s => s !== specialty),
          }
        : null
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spezialisierungen</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {profile.specialties.map(specialty => (
          <span
            key={specialty}
            className="inline-flex items-center gap-1 px-3 py-1 bg-[#14ad9f] text-white rounded-full text-sm"
          >
            {specialty}
            <button
              onClick={() => removeSpecialty(specialty)}
              className="text-white/80 hover:text-white ml-1"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Neue Spezialisierung hinzufügen"
          value={newSpecialty}
          onChange={e => setNewSpecialty(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              addSpecialty();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
        />
        <button
          onClick={addSpecialty}
          className="bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-taskilo-hover transition-colors"
        >
          <FiPlus />
        </button>
      </div>
    </div>
  );
};

export default SpecialtiesManager;

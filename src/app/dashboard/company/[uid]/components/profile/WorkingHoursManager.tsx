'use client';

import React from 'react';
import { ProfileTabProps, WorkingHours } from './types';

const WorkingHoursManager: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const updateWorkingHours = (
    dayIndex: number,
    field: keyof WorkingHours,
    value: string | boolean
  ) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            workingHours: prev.workingHours.map((day, index) =>
              index === dayIndex ? { ...day, [field]: value } : day
            ),
          }
        : null
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbeitszeiten</h3>
      <div className="space-y-2">
        {profile.workingHours.map((day, index) => (
          <div key={day.day} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
            <div className="w-24">
              <span className="font-medium">{day.day}</span>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={day.isOpen}
                onChange={e => updateWorkingHours(index, 'isOpen', e.target.checked)}
                className="mr-2 rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
              />
              Geöffnet
            </label>
            {day.isOpen && (
              <>
                <input
                  type="time"
                  value={day.openTime}
                  onChange={e => updateWorkingHours(index, 'openTime', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
                <span>bis</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={e => updateWorkingHours(index, 'closeTime', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkingHoursManager;

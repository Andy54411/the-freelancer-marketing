'use client';

import React from 'react';
import FAQManager from './FAQManager';
import { ProfileTabProps } from './types';

const FAQTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Häufig gestellte Fragen</h3>
        <p className="text-sm text-gray-600 mb-6">
          Beantworte häufige Fragen deiner Kunden, um Vertrauen zu schaffen und den Buchungsprozess
          zu erleichtern.
        </p>
      </div>

      <FAQManager profile={profile} setProfile={setProfile} />
    </div>
  );
};

export default FAQTab;

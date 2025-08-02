'use client';

import React from 'react';
import ServicePackagesManager from './ServicePackagesManager';
import SpecialtiesManager from './SpecialtiesManager';
import { ProfileTabProps } from './types';

const ServicesTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  return (
    <div className="space-y-8">
      {/* Spezialisierungen */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Spezialisierungen</h3>
        <p className="text-sm text-gray-600 mb-6">
          Definiere deine Fachbereiche und Expertise, um von passenden Kunden gefunden zu werden.
        </p>
        <SpecialtiesManager profile={profile} setProfile={setProfile} />
      </div>

      {/* Service Packages */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Service-Pakete</h3>
        <p className="text-sm text-gray-600 mb-6">
          Erstelle vordefinierte Service-Pakete mit festen Preisen für eine einfachere Buchung.
        </p>
        <ServicePackagesManager profile={profile} setProfile={setProfile} />
      </div>
    </div>
  );
};

export default ServicesTab;

'use client';

import React, { useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import { ProfileTabProps, ServicePackage } from './types';

const ServicePackagesManager: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [newServicePackage, setNewServicePackage] = useState<ServicePackage>({
    id: '',
    title: '',
    description: '',
    price: 0,
    duration: '',
    features: [],
  });

  const addServicePackage = () => {
    if (!newServicePackage.title || !newServicePackage.description) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    const servicePackage: ServicePackage = {
      ...newServicePackage,
      id: Date.now().toString(),
    };

    setProfile(prev =>
      prev
        ? {
            ...prev,
            servicePackages: [...prev.servicePackages, servicePackage],
          }
        : null
    );

    setNewServicePackage({
      id: '',
      title: '',
      description: '',
      price: 0,
      duration: '',
      features: [],
    });

    toast.success('Service Package hinzugefügt');
  };

  const removeServicePackage = (id: string) => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            servicePackages: prev.servicePackages.filter(pkg => pkg.id !== id),
          }
        : null
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Packages</h3>

      {/* Bestehende Service Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {profile.servicePackages.map(pkg => (
          <div key={pkg.id} className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900">{pkg.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
            <p className="text-lg font-bold text-[#14ad9f] mt-2">€{pkg.price}</p>
            <p className="text-xs text-gray-500">{pkg.duration}</p>
            <button
              onClick={() => removeServicePackage(pkg.id)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              <FiTrash2 className="inline mr-1" /> Entfernen
            </button>
          </div>
        ))}
      </div>

      {/* Neues Service Package hinzufügen */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Neues Service Package</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Titel"
            value={newServicePackage.title}
            onChange={e => setNewServicePackage(prev => ({ ...prev, title: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
          <input
            type="number"
            placeholder="Preis (€)"
            value={newServicePackage.price}
            onChange={e =>
              setNewServicePackage(prev => ({
                ...prev,
                price: parseFloat(e.target.value) || 0,
              }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
          <input
            type="text"
            placeholder="Dauer (z.B. 2-3 Tage)"
            value={newServicePackage.duration}
            onChange={e => setNewServicePackage(prev => ({ ...prev, duration: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
          <div></div>
          <textarea
            placeholder="Beschreibung"
            value={newServicePackage.description}
            onChange={e => setNewServicePackage(prev => ({ ...prev, description: e.target.value }))}
            className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            rows={3}
          />
        </div>
        <button
          onClick={addServicePackage}
          className="mt-4 bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-[#129488] transition-colors flex items-center gap-2"
        >
          <FiPlus /> Hinzufügen
        </button>
      </div>
    </div>
  );
};

export default ServicePackagesManager;

'use client';

import React, { useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { toast } from 'sonner';
import { ProfileTabProps } from './types';
import { Gemini } from '@/components/logos';

const BasicInfoTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Gemini-Beschreibung generieren
  const generateDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: profile.companyName,
          city: profile.city,
          country: profile.country,
          currentDescription: profile.publicDescription,
          hourlyRate: profile.hourlyRate,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Beschreibungsgenerierung');
      }

      const data = await response.json();
      setProfile(prev => (prev ? { ...prev, publicDescription: data.description } : null));
      toast.success('Beschreibung erfolgreich generiert!');
    } catch (error) {

      toast.error('Fehler bei der Generierung der Beschreibung');
    } finally {
      setIsGeneratingDescription(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Grunddaten</h3>
        <p className="text-sm text-gray-600">
          Verwalte deine grundlegenden Unternehmensinformationen und Kontaktdaten.
        </p>
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Unternehmensbeschreibung *
            </label>
            <button
              onClick={generateDescription}
              disabled={isGeneratingDescription}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isGeneratingDescription ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                <Gemini className="w-4 h-4" />
              )}
              {isGeneratingDescription ? 'Wird generiert...' : 'Mit Gemini generieren'}
            </button>
          </div>
          <textarea
            value={profile.publicDescription}
            onChange={e =>
              setProfile(prev => (prev ? { ...prev, publicDescription: e.target.value } : null))
            }
            rows={8}
            disabled={isGeneratingDescription}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Beschreibe dein Unternehmen, deine Expertise und Dienstleistungen. Diese Beschreibung wird auf deinem öffentlichen Profil angezeigt und hilft Kunden dabei, dich zu finden und zu verstehen, was du anbietest..."
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              Diese Beschreibung ist öffentlich sichtbar auf deinem Profil
            </p>
            <span className="text-xs text-gray-400">
              {profile.publicDescription?.length || 0} Zeichen
            </span>
          </div>
          {isGeneratingDescription && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Gemini className="w-4 h-4" />
                <span className="text-sm font-medium">Gemini KI arbeitet...</span>
              </div>
              <p className="text-blue-600 text-xs mt-1">
                Die KI erstellt eine professionelle Beschreibung basierend auf Ihren Firmendaten.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicInfoTab;

'use client';

import React, { useState } from 'react';
import {
  FiUser,
  FiMapPin,
  FiClock,
  FiPhone,
  FiMail,
  FiGlobe,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiImage,
  FiZap,
  FiShield,
  FiCheck,
  FiX,
  FiLoader,
} from 'react-icons/fi';
import { UserDataForSettings } from '../SettingsPage';
import { toast } from 'sonner';
import Image from 'next/image';
import { Gemini } from '@/components/logos';

interface PublicProfileFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string | number | boolean | File | null) => void;
}

// Typen für erweiterte öffentliche Profile-Daten
interface ServicePackage {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  features: string[];
}

interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface PublicProfileData {
  publicDescription: string;
  specialties: string[];
  servicePackages: ServicePackage[];
  workingHours: WorkingHours[];
  instantBooking: boolean;
  responseTimeGuarantee: number; // in Stunden
  faqs: FAQ[];
  profileBannerImage: string;
  businessLicense: string;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    year: string;
    imageUrl?: string;
  }>;
}

const PublicProfileForm: React.FC<PublicProfileFormProps> = ({ formData, handleChange }) => {
  // Standard-Arbeitsstunden
  const defaultWorkingHours: WorkingHours[] = [
    { day: 'Montag', isOpen: true, openTime: '08:00', closeTime: '18:00' },
    { day: 'Dienstag', isOpen: true, openTime: '08:00', closeTime: '18:00' },
    { day: 'Mittwoch', isOpen: true, openTime: '08:00', closeTime: '18:00' },
    { day: 'Donnerstag', isOpen: true, openTime: '08:00', closeTime: '18:00' },
    { day: 'Freitag', isOpen: true, openTime: '08:00', closeTime: '18:00' },
    { day: 'Samstag', isOpen: false, openTime: '09:00', closeTime: '16:00' },
    { day: 'Sonntag', isOpen: false, openTime: '10:00', closeTime: '14:00' },
  ];

  // Local state für erweiterte Profile-Daten
  const [publicProfileData, setPublicProfileData] = useState<PublicProfileData>({
    publicDescription: (formData as any).publicDescription || formData.step2.description || '',
    specialties: (formData as any).specialties || [],
    servicePackages: (formData as any).servicePackages || [],
    workingHours: (formData as any).workingHours || defaultWorkingHours,
    instantBooking: (formData as any).instantBooking ?? false,
    responseTimeGuarantee: (formData as any).responseTimeGuarantee || 24,
    faqs: (formData as any).faqs || [],
    profileBannerImage: (formData as any).profileBannerImage || '',
    businessLicense: (formData as any).businessLicense || '',
    certifications: (formData as any).certifications || [],
  });

  const [activeSection, setActiveSection] = useState<
    'basic' | 'services' | 'hours' | 'contact' | 'faq'
  >('basic');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Handler für Profile-Daten Updates
  const updateProfileData = (key: keyof PublicProfileData, value: any) => {
    // Stelle sicher, dass undefined-Werte durch entsprechende Standardwerte ersetzt werden
    let sanitizedValue = value;

    if (value === undefined || value === null) {
      switch (key) {
        case 'servicePackages':
        case 'specialties':
        case 'faqs':
        case 'certifications':
          sanitizedValue = [];
          break;
        case 'workingHours':
          sanitizedValue = defaultWorkingHours;
          break;
        case 'publicDescription':
        case 'profileBannerImage':
        case 'businessLicense':
          sanitizedValue = '';
          break;
        case 'instantBooking':
          sanitizedValue = false;
          break;
        case 'responseTimeGuarantee':
          sanitizedValue = 24;
          break;
        default:
          sanitizedValue = value;
      }
    }

    setPublicProfileData(prev => ({ ...prev, [key]: sanitizedValue }));
    handleChange(`publicProfile.${key}`, sanitizedValue);
  };

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
          companyName: formData.step2.companyName,
          industry: formData.step2.industry,
          selectedSubcategory: formData.selectedSubcategory,
          city: formData.step2.city,
          country: formData.step2.country,
          website: formData.step2.website,
          currentDescription: publicProfileData.publicDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Beschreibungsgenerierung');
      }

      const data = await response.json();
      updateProfileData('publicDescription', data.description);
      toast.success('Beschreibung erfolgreich generiert!');
    } catch (error) {
      console.error('Fehler bei der Beschreibungsgenerierung:', error);
      toast.error('Fehler bei der Generierung der Beschreibung');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Spezialität hinzufügen
  const addSpecialty = () => {
    if (!newSpecialty.trim()) return;
    const updated = [...publicProfileData.specialties, newSpecialty.trim()];
    updateProfileData('specialties', updated);
    setNewSpecialty('');
    toast.success('Spezialität hinzugefügt');
  };

  // Spezialität entfernen
  const removeSpecialty = (index: number) => {
    const updated = publicProfileData.specialties.filter((_, i) => i !== index);
    updateProfileData('specialties', updated);
  };

  // FAQ hinzufügen
  const addFAQ = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) {
      toast.error('Bitte Frage und Antwort ausfüllen');
      return;
    }
    const faq: FAQ = {
      id: Date.now().toString(),
      question: newFAQ.question.trim(),
      answer: newFAQ.answer.trim(),
    };
    const updated = [...publicProfileData.faqs, faq];
    updateProfileData('faqs', updated);
    setNewFAQ({ question: '', answer: '' });
    toast.success('FAQ hinzugefügt');
  };

  // FAQ entfernen
  const removeFAQ = (id: string) => {
    const updated = publicProfileData.faqs.filter(faq => faq.id !== id);
    updateProfileData('faqs', updated);
  };

  // Arbeitszeiten aktualisieren
  const updateWorkingHours = (
    index: number,
    field: keyof WorkingHours,
    value: string | boolean
  ) => {
    const updated = [...publicProfileData.workingHours];
    updated[index] = { ...updated[index], [field]: value };
    updateProfileData('workingHours', updated);
  };

  return (
    <div className="space-y-8">
      {/* Vorschau des öffentlichen Profils */}
      <div className="bg-gradient-to-r from-[#14ad9f] to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            {formData.step3.profilePictureURL &&
            formData.step3.profilePictureURL !== '/default-avatar.png' ? (
              <Image
                src={formData.step3.profilePictureURL}
                alt="Profil"
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <FiUser size={24} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">{formData.step2.companyName}</h3>
            <p className="text-white/80">{formData.step2.industry}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <FiMapPin size={14} />
                {formData.step2.city}, {formData.step2.country}
              </span>
              <span className="flex items-center gap-1">
                <FiZap size={14} />
                {publicProfileData.responseTimeGuarantee}h Antwortzeit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'basic', label: 'Grunddaten', icon: FiUser },
            { id: 'services', label: 'Services', icon: FiZap },
            { id: 'hours', label: 'Öffnungszeiten', icon: FiClock },
            { id: 'contact', label: 'Kontakt & Erreichbarkeit', icon: FiPhone },
            { id: 'faq', label: 'FAQ', icon: FiShield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === tab.id
                  ? 'border-[#14ad9f] text-[#14ad9f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeSection === 'basic' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Öffentliche Firmenbeschreibung
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
              value={publicProfileData.publicDescription}
              onChange={e => updateProfileData('publicDescription', e.target.value)}
              rows={6}
              disabled={isGeneratingDescription}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Beschreiben Sie Ihr Unternehmen für potenzielle Kunden. Was macht Sie besonders? Welche Erfahrungen haben Sie?"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">
                Diese Beschreibung wird auf Ihrem öffentlichen Profil angezeigt
              </p>
              <span className="text-xs text-gray-400">
                {publicProfileData.publicDescription.length} Zeichen
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ihre Spezialitäten
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {publicProfileData.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#14ad9f] text-white rounded-full text-sm"
                >
                  {specialty}
                  <button
                    onClick={() => removeSpecialty(index)}
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
                value={newSpecialty}
                onChange={e => setNewSpecialty(e.target.value)}
                placeholder="z.B. Badezimmer-Renovierung, WordPress-Entwicklung"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                onKeyPress={e => e.key === 'Enter' && addSpecialty()}
              />
              <button
                onClick={addSpecialty}
                className="bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors flex items-center gap-2"
              >
                <FiPlus size={16} />
                Hinzufügen
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Antwortzeit-Garantie (Stunden)
            </label>
            <input
              type="number"
              value={publicProfileData.responseTimeGuarantee}
              onChange={e =>
                updateProfileData('responseTimeGuarantee', parseInt(e.target.value) || 24)
              }
              min="1"
              max="168"
              className="w-full max-w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Garantierte maximale Antwortzeit auf Kundenanfragen
            </p>
          </div>
        </div>
      )}

      {activeSection === 'hours' && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Öffnungszeiten</h4>
          {publicProfileData.workingHours.map((day, index) => (
            <div key={day.day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-24 font-medium">{day.day}</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  onChange={e => updateWorkingHours(index, 'isOpen', e.target.checked)}
                  className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                />
                <span className="text-sm">Geöffnet</span>
              </label>
              {day.isOpen && (
                <>
                  <input
                    type="time"
                    value={day.openTime}
                    onChange={e => updateWorkingHours(index, 'openTime', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                  />
                  <span>bis</span>
                  <input
                    type="time"
                    value={day.closeTime}
                    onChange={e => updateWorkingHours(index, 'closeTime', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {activeSection === 'contact' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <FiZap className="text-green-600" />
              <div>
                <div className="font-medium text-green-800">Sofortbuchung aktivieren</div>
                <div className="text-sm text-green-600">
                  Kunden können direkt Termine buchen ohne vorherige Anfrage
                </div>
              </div>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={publicProfileData.instantBooking}
                onChange={e => updateProfileData('instantBooking', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
            </label>
          </div>

          {formData.step2.website && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <FiGlobe className="text-[#14ad9f]" />
                <div className="font-medium">Website</div>
              </div>
              <a
                href={formData.step2.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#14ad9f] hover:underline"
              >
                {formData.step2.website}
              </a>
            </div>
          )}
        </div>
      )}

      {activeSection === 'faq' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Häufig gestellte Fragen (FAQ)</h4>

            {/* Vorhandene FAQs */}
            <div className="space-y-3 mb-6">
              {publicProfileData.faqs.map(faq => (
                <div key={faq.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-2">{faq.question}</h5>
                      <p className="text-gray-600 text-sm">{faq.answer}</p>
                    </div>
                    <button
                      onClick={() => removeFAQ(faq.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Neue FAQ hinzufügen */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-3">Neue FAQ hinzufügen</h5>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newFAQ.question}
                  onChange={e => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Frage eingeben..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
                <textarea
                  value={newFAQ.answer}
                  onChange={e => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="Antwort eingeben..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                />
                <button
                  onClick={addFAQ}
                  className="bg-[#14ad9f] text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                  <FiPlus size={16} />
                  FAQ hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speicher-Hinweis */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-800">
          <FiShield size={16} />
          <span className="font-medium">Hinweis:</span>
        </div>
        <p className="text-blue-700 text-sm mt-1">
          Alle Änderungen werden automatisch mit den allgemeinen Einstellungen gespeichert. Klicken
          Sie unten auf &ldquo;Änderungen speichern&rdquo; um alle Profil-Einstellungen zu
          übernehmen.
        </p>
      </div>
    </div>
  );
};

export default PublicProfileForm;

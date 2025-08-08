'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  Upload,
  Image as ImageIcon,
  Star,
  MapPin,
  Plus,
  Globe,
  CheckCircle,
  FileImage,
} from 'lucide-react';

interface OnboardingStep3Props {
  companyUid: string;
}

interface Step3Data {
  // Images
  companyLogo: string;
  profileBannerImage: string;

  // Basic Info
  publicDescription: string;
  hourlyRate: string;
  instantBooking: boolean;
  responseTimeGuarantee: number;

  // Skills & Languages
  skills: string[];
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
  specialties: string[];

  // Working Hours
  workingHours: Array<{
    day: string;
    enabled: boolean;
    start: string;
    end: string;
  }>;

  // Services (basic)
  servicePackages: Array<{
    title: string;
    description: string;
    price: number;
    duration: string;
  }>;

  // Portfolio (minimal)
  portfolio: Array<{
    title: string;
    description: string;
    imageUrl: string;
  }>;

  // FAQ (minimal)
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

const OnboardingStep3: React.FC<OnboardingStep3Props> = ({ companyUid }) => {
  const { updateStepData, stepData } = useOnboarding();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('images');
  const [formData, setFormData] = useState<Step3Data>({
    companyLogo: '',
    profileBannerImage: '',
    publicDescription: '',
    hourlyRate: '',
    instantBooking: false,
    responseTimeGuarantee: 24,
    skills: [],
    languages: [],
    specialties: [],
    workingHours: [
      { day: 'Montag', enabled: true, start: '09:00', end: '17:00' },
      { day: 'Dienstag', enabled: true, start: '09:00', end: '17:00' },
      { day: 'Mittwoch', enabled: true, start: '09:00', end: '17:00' },
      { day: 'Donnerstag', enabled: true, start: '09:00', end: '17:00' },
      { day: 'Freitag', enabled: true, start: '09:00', end: '17:00' },
      { day: 'Samstag', enabled: false, start: '09:00', end: '17:00' },
      { day: 'Sonntag', enabled: false, start: '09:00', end: '17:00' },
    ],
    servicePackages: [],
    portfolio: [],
    faqs: [],
  });
  const [loading, setLoading] = useState(true);

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          setFormData({
            companyLogo:
              userData.step3?.profilePictureURL || userData.profilePictureFirebaseUrl || '',
            profileBannerImage: userData.profileBannerImage || '',
            publicDescription: userData.publicDescription || '',
            hourlyRate: userData.step3?.hourlyRate || '',
            instantBooking: userData.instantBooking || false,
            responseTimeGuarantee: userData.responseTimeGuarantee || 24,
            skills: userData.skills || [],
            languages: userData.languages || [],
            specialties: userData.specialties || [],
            workingHours: userData.workingHours || formData.workingHours,
            servicePackages: userData.servicePackages || [],
            portfolio: userData.portfolio || [],
            faqs: userData.faqs || [],
          });
        }

        // Load step data if exists
        if (stepData[3]) {
          setFormData(prev => ({ ...prev, ...stepData[3] }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user, stepData]);

  const handleChange = (field: keyof Step3Data, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateStepData(3, newData);
  };

  // Validation function to check what's missing
  const getValidationStatus = () => {
    const missing: string[] = [];
    if (!formData.companyLogo) missing.push('Firmenlogo');
    if (!formData.publicDescription || formData.publicDescription.length < 200) {
      missing.push('Beschreibung (mind. 200 Zeichen)');
    }
    if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) missing.push('Stundensatz');

    return {
      isValid: missing.length === 0,
      missing: missing,
      completed: ['Firmenlogo', 'Beschreibung', 'Stundensatz'].filter(
        item => !missing.some(m => m.includes(item.toLowerCase()))
      ),
    };
  };

  const validationStatus = getValidationStatus();

  const addSkill = (skill: string) => {
    if (skill.trim() && !formData.skills.includes(skill.trim())) {
      handleChange('skills', [...formData.skills, skill.trim()]);
    }
  };

  const removeSkill = (index: number) => {
    const newSkills = formData.skills.filter((_, i) => i !== index);
    handleChange('skills', newSkills);
  };

  const addServicePackage = () => {
    const newPackage = {
      title: '',
      description: '',
      price: 0,
      duration: '1 Stunde',
    };
    handleChange('servicePackages', [...formData.servicePackages, newPackage]);
  };

  const updateServicePackage = (index: number, field: string, value: any) => {
    const updatedPackages = formData.servicePackages.map((pkg, i) =>
      i === index ? { ...pkg, [field]: value } : pkg
    );
    handleChange('servicePackages', updatedPackages);
  };

  const addFAQ = () => {
    const newFAQ = { question: '', answer: '' };
    handleChange('faqs', [...formData.faqs, newFAQ]);
  };

  const updateFAQ = (index: number, field: string, value: string) => {
    const updatedFAQs = formData.faqs.map((faq, i) =>
      i === index ? { ...faq, [field]: value } : faq
    );
    handleChange('faqs', updatedFAQs);
  };

  const tabs = [
    { id: 'images', label: 'Bilder', icon: ImageIcon, required: true },
    { id: 'basic', label: 'Grunddaten', icon: Globe, required: true },
    { id: 'skills', label: 'Fähigkeiten', icon: Star, required: true },
    { id: 'services', label: 'Services', icon: CheckCircle, required: false },
    { id: 'faqs', label: 'FAQ', icon: FileImage, required: false },
  ];

  const getTabCompletion = (tabId: string) => {
    switch (tabId) {
      case 'images':
        return formData.companyLogo ? 100 : 0;
      case 'basic':
        const basicFields = [formData.publicDescription.length >= 200, formData.hourlyRate];
        return (basicFields.filter(Boolean).length / basicFields.length) * 100;
      case 'skills':
        return formData.skills.length >= 3 ? 100 : (formData.skills.length / 3) * 100;
      case 'services':
        return formData.servicePackages.length >= 1 ? 100 : 0;
      case 'faqs':
        return formData.faqs.length >= 3 ? 100 : (formData.faqs.length / 3) * 100;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Öffentliches Profil</h3>
        <p className="text-sm text-gray-600 mb-6">
          Erstellen Sie Ihr professionelles Profil, das Kunden sehen werden.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 justify-center">
          {tabs.map(tab => {
            const completion = getTabCompletion(tab.id);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.required && <span className="ml-1 text-red-500">*</span>}
                <div
                  className={`ml-2 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    completion === 100
                      ? 'bg-green-100 text-green-600'
                      : completion > 0
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {completion === 100 ? '✓' : Math.round(completion)}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Validation Status */}
      <div
        className={`p-4 rounded-lg border ${
          validationStatus.isValid
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <div className="flex items-start">
          <div
            className={`flex-shrink-0 ${validationStatus.isValid ? 'text-green-400' : 'text-yellow-400'}`}
          >
            {validationStatus.isValid ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
                <span className="text-xs font-bold">!</span>
              </div>
            )}
          </div>
          <div className="ml-3">
            <h4
              className={`text-sm font-medium ${
                validationStatus.isValid ? 'text-green-800' : 'text-yellow-800'
              }`}
            >
              {validationStatus.isValid
                ? 'Alle Pflichtfelder ausgefüllt!'
                : 'Noch nicht vollständig'}
            </h4>
            {!validationStatus.isValid && (
              <p className="mt-1 text-sm text-yellow-700">
                Zum Fortfahren zu Schritt 4 fehlen noch: {validationStatus.missing.join(', ')}
              </p>
            )}
            {validationStatus.completed.length > 0 && (
              <p className="mt-1 text-sm text-green-700">
                ✓ Erledigt: {validationStatus.completed.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-6">
        {activeTab === 'images' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Firmenlogo *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {formData.companyLogo ? (
                  <div className="space-y-4">
                    <img
                      src={formData.companyLogo}
                      alt="Logo"
                      className="w-32 h-32 object-cover mx-auto rounded-lg"
                    />
                    <button
                      onClick={() => handleChange('companyLogo', '')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Logo entfernen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div className="text-sm text-gray-600">Logo hochladen (max. 5MB)</div>
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#14ad9f] file:text-white hover:file:bg-[#129488]"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Create temporary URL for preview
                          const url = URL.createObjectURL(file);
                          handleChange('companyLogo', url);
                          console.log('Logo file selected:', file);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Profil-Banner (optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#14ad9f] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = e => {
                        const result = e.target?.result as string;
                        handleChange('profileBannerImage', result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="banner-upload"
                />
                <label htmlFor="banner-upload" className="cursor-pointer">
                  {formData.profileBannerImage ? (
                    <div className="space-y-2">
                      <img
                        src={formData.profileBannerImage}
                        alt="Banner Preview"
                        className="max-h-32 mx-auto rounded-lg object-cover"
                      />
                      <div className="text-sm text-green-600">Banner hochgeladen ✓</div>
                      <div className="text-xs text-gray-500">Klicken zum Ändern</div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600">
                        Banner-Bild hochladen (1200x400px empfohlen)
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Klicken oder Datei hierher ziehen
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öffentliche Beschreibung * (mindestens 200 Zeichen)
              </label>
              <textarea
                value={formData.publicDescription}
                onChange={e => handleChange('publicDescription', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="Beschreiben Sie Ihr Unternehmen und Ihre Dienstleistungen..."
              />
              <div className="text-sm text-gray-500 mt-1">
                {formData.publicDescription.length}/200 Zeichen
                {formData.publicDescription.length >= 200 && (
                  <span className="text-green-600 ml-2">✓ Mindestlänge erreicht</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stundensatz (€) *
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={e => handleChange('hourlyRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  placeholder="z.B. 50"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Antwortzeit-Garantie (Stunden)
                </label>
                <select
                  value={formData.responseTimeGuarantee}
                  onChange={e => handleChange('responseTimeGuarantee', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                >
                  <option value={1}>1 Stunde</option>
                  <option value={4}>4 Stunden</option>
                  <option value={24}>24 Stunden</option>
                  <option value={48}>48 Stunden</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fähigkeiten * (mindestens 3)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#14ad9f] text-white"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(index)}
                      className="ml-2 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Fähigkeit hinzufügen..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <div className="text-sm text-gray-500 mt-1">
                {formData.skills.length}/3 Fähigkeiten
                {formData.skills.length >= 3 && (
                  <span className="text-green-600 ml-2">✓ Mindestanzahl erreicht</span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Service-Pakete (optional)
              </label>
              <button
                onClick={addServicePackage}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] text-sm"
              >
                Paket hinzufügen
              </button>
            </div>

            {formData.servicePackages.map((pkg, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <input
                  type="text"
                  value={pkg.title}
                  onChange={e => updateServicePackage(index, 'title', e.target.value)}
                  placeholder="Service-Titel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
                <textarea
                  value={pkg.description}
                  onChange={e => updateServicePackage(index, 'description', e.target.value)}
                  placeholder="Beschreibung des Services"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={pkg.price}
                    onChange={e => updateServicePackage(index, 'price', parseFloat(e.target.value))}
                    placeholder="Preis (€)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                  <input
                    type="text"
                    value={pkg.duration}
                    onChange={e => updateServicePackage(index, 'duration', e.target.value)}
                    placeholder="Dauer"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Häufige Fragen (mindestens 3 empfohlen)
              </label>
              <button
                onClick={addFAQ}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] text-sm"
              >
                FAQ hinzufügen
              </button>
            </div>

            {formData.faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <input
                  type="text"
                  value={faq.question}
                  onChange={e => updateFAQ(index, 'question', e.target.value)}
                  placeholder="Frage"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
                <textarea
                  value={faq.answer}
                  onChange={e => updateFAQ(index, 'answer', e.target.value)}
                  placeholder="Antwort"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <div className="text-sm font-medium text-gray-900 mb-2">
          Schritt 3 von 5 - Profil-Vervollständigung
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {tabs.map(tab => {
            const completion = getTabCompletion(tab.id);
            return (
              <div key={tab.id} className="flex items-center justify-between">
                <span className="text-gray-600">{tab.label}</span>
                <span className={completion === 100 ? 'text-green-600' : 'text-gray-500'}>
                  {completion === 100 ? '✓' : `${Math.round(completion)}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep3;

'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface OnboardingStep1Props {
  companyUid: string;
}

interface Step1Data {
  companyName: string;
  businessType: 'b2b' | 'b2c' | 'hybrid';
  industry: string;
  address: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  legalForm: string;
  employees: string;
  termsAccepted: boolean;
}

const OnboardingStep1: React.FC<OnboardingStep1Props> = ({ companyUid }) => {
  const { updateStepData, stepData } = useOnboarding();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Step1Data>({
    companyName: '',
    businessType: 'hybrid',
    industry: '',
    address: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'DE',
    phone: '',
    email: '',
    website: '',
    legalForm: '',
    employees: '',
    termsAccepted: false
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
          
          // Map existing company data to form
          setFormData({
            companyName: userData.companyName || '',
            businessType: userData.businessType || 'hybrid',
            industry: userData.step2?.industry || '',
            address: userData.step2?.address || '',
            street: userData.step2?.street || '',
            city: userData.step2?.city || '',
            postalCode: userData.step2?.postalCode || '',
            country: userData.step2?.country || 'DE',
            phone: userData.companyPhoneNumber || '',
            email: userData.email || '',
            website: userData.step2?.website || '',
            legalForm: userData.step2?.legalForm || '',
            employees: userData.step2?.employees || '',
            termsAccepted: !!userData.tosAcceptanceIp
          });
        }

        // Load step data if exists
        if (stepData[1]) {
          setFormData(prev => ({ ...prev, ...stepData[1] }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user, stepData]);

  const handleChange = (field: keyof Step1Data, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateStepData(1, newData);
  };

  const businessTypes = [
    { value: 'b2b', label: 'B2B - Geschäftskunden', description: 'Dienstleistungen für Unternehmen' },
    { value: 'b2c', label: 'B2C - Privatkunden', description: 'Dienstleistungen für Privatpersonen' },
    { value: 'hybrid', label: 'Hybrid - Beide', description: 'Sowohl Geschäfts- als auch Privatkunden' }
  ];

  const industries = [
    'Handwerk & Technik',
    'IT & Software',
    'Hotel & Gastronomie',
    'Gesundheit & Wellness',
    'Beratung & Consulting',
    'Marketing & Design',
    'Bildung & Training',
    'Transport & Logistik',
    'Reinigung & Haushalt',
    'Event & Entertainment',
    'Andere'
  ];

  const legalForms = [
    'Einzelunternehmen',
    'GmbH',
    'UG (haftungsbeschränkt)',
    'AG',
    'KG',
    'OHG',
    'Freiberufler',
    'Andere'
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Grundlegende Unternehmensinformationen
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Diese Informationen werden für Ihr öffentliches Profil und Geschäftsabwicklungen benötigt.
        </p>
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Firmenname *
        </label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) => handleChange('companyName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          placeholder="z.B. Mustermann GmbH"
          required
        />
      </div>

      {/* Business Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Geschäftstyp *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {businessTypes.map((type) => (
            <div
              key={type.value}
              className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                formData.businessType === type.value
                  ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => handleChange('businessType', type.value)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={formData.businessType === type.value}
                  onChange={() => handleChange('businessType', type.value)}
                  className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f]"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {type.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Branche *
        </label>
        <select
          value={formData.industry}
          onChange={(e) => handleChange('industry', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          required
        >
          <option value="">Branche auswählen</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Geschäftsadresse *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => handleChange('street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="Straße und Hausnummer"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="PLZ"
              required
            />
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="Stadt"
              required
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefon *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="+49 123 456789"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-Mail *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="kontakt@unternehmen.de"
            required
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website (optional)
        </label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => handleChange('website', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          placeholder="https://www.unternehmen.de"
        />
      </div>

      {/* Legal Form and Employees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rechtsform *
          </label>
          <select
            value={formData.legalForm}
            onChange={(e) => handleChange('legalForm', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            required
          >
            <option value="">Rechtsform auswählen</option>
            {legalForms.map((form) => (
              <option key={form} value={form}>
                {form}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anzahl Mitarbeiter
          </label>
          <select
            value={formData.employees}
            onChange={(e) => handleChange('employees', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            <option value="">Anzahl wählen</option>
            <option value="1">1 (nur ich)</option>
            <option value="2-5">2-5 Mitarbeiter</option>
            <option value="6-10">6-10 Mitarbeiter</option>
            <option value="11-50">11-50 Mitarbeiter</option>
            <option value="50+">Mehr als 50</option>
          </select>
        </div>
      </div>

      {/* Terms Acceptance */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-start">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => handleChange('termsAccepted', e.target.checked)}
            className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded mt-1"
            required
          />
          <div className="ml-3">
            <label className="text-sm text-gray-700">
              Ich akzeptiere die{' '}
              <a href="/terms" target="_blank" className="text-[#14ad9f] hover:text-[#129488] underline">
                Allgemeinen Geschäftsbedingungen
              </a>{' '}
              und{' '}
              <a href="/privacy" target="_blank" className="text-[#14ad9f] hover:text-[#129488] underline">
                Datenschutzerklärung
              </a>{' '}
              von Taskilo. *
            </label>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <div className="text-sm text-gray-600 mb-2">
          Schritt 1 von 5 - Grunddaten
        </div>
        <div className="text-xs text-gray-500">
          Ihre Daten werden automatisch gespeichert. Sie können jederzeit pausieren und später fortfahren.
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep1;

'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { CheckCircle } from 'lucide-react';

interface OnboardingStep1Props {
  companyUid: string;
}

interface ManagerData {
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
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
  managerData?: ManagerData;
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
    termsAccepted: false,
  });
  const [loading, setLoading] = useState(true);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerData, setManagerData] = useState<ManagerData>({
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'DE',
  });

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          console.log('📊 Loading registration data for onboarding:', {
            companyRegisterForBackend: userData.companyRegisterForBackend,
            actualRepresentativeTitle: userData.actualRepresentativeTitle,
            taxNumberForBackend: userData.taxNumberForBackend,
            managerData: userData.managerData ? 'EXISTS' : 'NULL',
            legalForm: userData.legalForm,
          });

          // Map existing company data to form - PRIORITY: Registration data first, then onboarding
          setFormData({
            companyName: userData.companyName || '',
            businessType: userData.businessType || 'hybrid',
            industry: userData.step2?.industry || userData.industry || '',
            address: userData.step2?.address || userData.companyAddressLine1ForBackend || '',
            street: userData.step2?.street || userData.companyAddressLine1ForBackend || '',
            city: userData.step2?.city || userData.companyCityForBackend || '',
            postalCode: userData.step2?.postalCode || userData.companyPostalCodeForBackend || '',
            country: userData.step2?.country || userData.companyCountryForBackend || 'DE',
            phone: userData.companyPhoneNumber || userData.companyPhoneNumberForBackend || '',
            email: userData.email || '',
            website: userData.step2?.website || userData.companyWebsiteForBackend || '',
            legalForm: userData.step2?.legalForm || userData.legalForm || '',
            employees: userData.step2?.employees || userData.employees || '',
            termsAccepted: !!userData.tosAcceptanceIp,
            managerData: userData.managerData || undefined,
          });

          // Load manager data if exists from registration
          if (userData.managerData) {
            console.log(
              '✅ Loading existing manager data from registration:',
              userData.managerData
            );
            setManagerData(userData.managerData);
          } else if (userData.actualRepresentativeTitle) {
            // If we have representative title but no manager data, pre-fill with user info
            console.log('🔄 Creating manager data from registration fields');
            const inferredManagerData = {
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              position: userData.actualRepresentativeTitle || '',
              email: userData.email || '',
              phone: userData.phoneNumber || '',
              dateOfBirth: userData.dateOfBirth || '',
              address: userData.personalStreet || '',
              street: userData.personalStreet || '',
              city: userData.personalCity || '',
              postalCode: userData.personalPostalCode || '',
              country: userData.personalCountry || 'DE',
            };
            setManagerData(inferredManagerData);
          }
        }

        // Load step data if exists (onboarding data overrides registration where present)
        if (stepData[1]) {
          console.log('🔄 Applying onboarding step data over registration data');
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
    console.log('🔄 Updating Step1 data:', { field, value, newData });
    updateStepData(1, newData);

    // Check if manager data is required for certain legal forms
    if (field === 'legalForm' && requiresManager(value)) {
      setShowManagerModal(true);
    }
  };

  // Check if legal form requires manager data
  const requiresManager = (legalForm: string): boolean => {
    const formsWithManager = ['GmbH', 'UG (haftungsbeschränkt)', 'AG', 'KG', 'OHG'];
    const requires = formsWithManager.includes(legalForm);
    console.log(`🔍 requiresManager check: "${legalForm}" -> ${requires}`, { formsWithManager });
    return requires;
  };

  const handleManagerSave = () => {
    const newData = { ...formData, managerData };
    setFormData(newData);
    console.log('💼 Saving manager data:', { managerData, newData });
    updateStepData(1, newData);
    setShowManagerModal(false);
  };

  // Validation function to check what's missing
  const getValidationStatus = () => {
    const missing: string[] = [];
    if (!formData.companyName || formData.companyName.length < 2)
      missing.push('Firmenname (mind. 2 Zeichen)');
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      missing.push('Gültige E-Mail-Adresse');
    if (!formData.phone || formData.phone.length < 10)
      missing.push('Telefonnummer (mind. 10 Zeichen)');
    if (!formData.address) missing.push('Adresse');
    if (!formData.businessType) missing.push('Geschäftsbereich');

    // MANDATORY: Check if manager data is required but missing for certain legal forms
    if (requiresManager(formData.legalForm)) {
      if (!formData.managerData) {
        missing.push('Geschäftsführer-Daten (Pflichtfeld für ' + formData.legalForm + ')');
      } else if (
        !formData.managerData.firstName ||
        !formData.managerData.lastName ||
        !formData.managerData.position
      ) {
        missing.push('Vollständige Geschäftsführer-Daten (Vorname, Nachname, Position)');
      }
    }

    return {
      isValid: missing.length === 0,
      missing: missing,
      completed: ['Firmenname', 'E-Mail', 'Telefon', 'Adresse', 'Geschäftsbereich'].filter(
        item => !missing.some(m => m.includes(item.toLowerCase()))
      ),
    };
  };

  const validationStatus = getValidationStatus();

  const businessTypes = [
    {
      value: 'b2b',
      label: 'B2B - Geschäftskunden',
      description: 'Dienstleistungen für Unternehmen',
    },
    {
      value: 'b2c',
      label: 'B2C - Privatkunden',
      description: 'Dienstleistungen für Privatpersonen',
    },
    {
      value: 'hybrid',
      label: 'Hybrid - Beide',
      description: 'Sowohl Geschäfts- als auch Privatkunden',
    },
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
    'Andere',
  ];

  const legalForms = [
    'Einzelunternehmen',
    'GmbH',
    'UG (haftungsbeschränkt)',
    'AG',
    'KG',
    'OHG',
    'Freiberufler',
    'Andere',
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
                Zum Fortfahren zu Schritt 2 fehlen noch: {validationStatus.missing.join(', ')}
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

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname *</label>
        <input
          type="text"
          value={formData.companyName}
          onChange={e => handleChange('companyName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          placeholder="z.B. Mustermann GmbH"
          required
        />
      </div>

      {/* Business Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Geschäftstyp *</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {businessTypes.map(type => (
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
                  <div className="text-sm font-medium text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Branche *</label>
        <select
          value={formData.industry}
          onChange={e => handleChange('industry', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          required
        >
          <option value="">Branche auswählen</option>
          {industries.map(industry => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Geschäftsadresse *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              value={formData.street}
              onChange={e => handleChange('street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="Straße und Hausnummer"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formData.postalCode}
              onChange={e => handleChange('postalCode', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              placeholder="PLZ"
              required
            />
            <input
              type="text"
              value={formData.city}
              onChange={e => handleChange('city', e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="+49 123 456789"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="kontakt@unternehmen.de"
            required
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Website (optional)</label>
        <input
          type="url"
          value={formData.website}
          onChange={e => handleChange('website', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          placeholder="https://www.unternehmen.de"
        />
      </div>

      {/* Legal Form and Employees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rechtsform *</label>
          <select
            value={formData.legalForm}
            onChange={e => handleChange('legalForm', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            required
          >
            <option value="">Rechtsform auswählen</option>
            {legalForms.map(form => (
              <option key={form} value={form}>
                {form}
              </option>
            ))}
          </select>

          {/* Manager Data Button for Legal Forms requiring it */}
          {formData.legalForm && requiresManager(formData.legalForm) && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Geschäftsführer-Daten erforderlich
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Für die Rechtsform &quot;{formData.legalForm}&quot; sind zusätzliche Angaben
                    nötig
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManagerModal(true)}
                  className="px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] text-sm font-medium"
                >
                  {formData.managerData?.firstName ? 'Daten bearbeiten' : 'Daten eingeben'}
                </button>
              </div>
              {formData.managerData?.firstName && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ Geschäftsführer: {formData.managerData.firstName}{' '}
                  {formData.managerData.lastName}
                  {formData.managerData.position && ` (${formData.managerData.position})`}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Anzahl Mitarbeiter</label>
          <select
            value={formData.employees}
            onChange={e => handleChange('employees', e.target.value)}
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
            onChange={e => handleChange('termsAccepted', e.target.checked)}
            className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded mt-1"
            required
          />
          <div className="ml-3">
            <label className="text-sm text-gray-700">
              Ich akzeptiere die{' '}
              <a
                href="/terms"
                target="_blank"
                className="text-[#14ad9f] hover:text-[#129488] underline"
              >
                Allgemeinen Geschäftsbedingungen
              </a>{' '}
              und{' '}
              <a
                href="/privacy"
                target="_blank"
                className="text-[#14ad9f] hover:text-[#129488] underline"
              >
                Datenschutzerklärung
              </a>{' '}
              von Taskilo. *
            </label>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <div className="text-sm text-gray-600 mb-2">Schritt 1 von 5 - Grunddaten</div>
        <div className="text-xs text-gray-500">
          Ihre Daten werden automatisch gespeichert. Sie können jederzeit pausieren und später
          fortfahren.
        </div>
      </div>

      {/* Manager Data Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[75vh] overflow-hidden flex flex-col mt-12">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Geschäftsführer-Daten</h3>
                <button
                  onClick={() => setShowManagerModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Für &quot;{formData.legalForm}&quot; sind diese Angaben erforderlich.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      value={managerData.firstName}
                      onChange={e => setManagerData({ ...managerData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      value={managerData.lastName}
                      onChange={e => setManagerData({ ...managerData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position im Unternehmen *
                  </label>
                  <input
                    type="text"
                    value={managerData.position}
                    onChange={e => setManagerData({ ...managerData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                    placeholder="z.B. Geschäftsführer, CEO, Inhaber"
                    required
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                  <input
                    type="email"
                    value={managerData.email}
                    onChange={e => setManagerData({ ...managerData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <input
                    type="tel"
                    value={managerData.phone}
                    onChange={e => setManagerData({ ...managerData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                    required
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geburtsdatum *
                  </label>
                  <input
                    type="date"
                    value={managerData.dateOfBirth}
                    onChange={e => setManagerData({ ...managerData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                    required
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Straße und Hausnummer *
                  </label>
                  <input
                    type="text"
                    value={managerData.street}
                    onChange={e => setManagerData({ ...managerData, street: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                    placeholder="Musterstraße 123"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
                    <input
                      type="text"
                      value={managerData.postalCode}
                      onChange={e => setManagerData({ ...managerData, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                      placeholder="12345"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stadt *</label>
                    <input
                      type="text"
                      value={managerData.city}
                      onChange={e => setManagerData({ ...managerData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                      placeholder="Musterstadt"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land *</label>
                  <select
                    value={managerData.country}
                    onChange={e => setManagerData({ ...managerData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                    required
                  >
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowManagerModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleManagerSave}
                  disabled={
                    !managerData.firstName ||
                    !managerData.lastName ||
                    !managerData.position ||
                    !managerData.email
                  }
                  className="px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingStep1;

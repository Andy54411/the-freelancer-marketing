'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Plus, MapPin, Clock, Euro, CheckCircle, Tag } from 'lucide-react';

interface OnboardingStep4Props {
  companyUid: string;
}

interface Step4Data {
  // Categories
  selectedCategory: string;
  selectedSubcategory: string;
  additionalCategories: string[];
  
  // Location & Service Area
  lat: number;
  lng: number;
  radiusKm: number;
  serviceAreas: string[];
  
  // Availability
  availabilityType: 'flexible' | 'fixed' | 'on-demand';
  advanceBookingHours: number;
  
  // Pricing
  pricingModel: 'hourly' | 'fixed' | 'package';
  basePrice: number;
  currency: string;
  
  // Travel & Logistics
  travelCosts: boolean;
  travelCostPerKm: number;
  maxTravelDistance: number;
}

const OnboardingStep4: React.FC<OnboardingStep4Props> = ({ companyUid }) => {
  const { updateStepData, stepData } = useOnboarding();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Step4Data>({
    selectedCategory: '',
    selectedSubcategory: '',
    additionalCategories: [],
    lat: 0,
    lng: 0,
    radiusKm: 25,
    serviceAreas: [],
    availabilityType: 'flexible',
    advanceBookingHours: 24,
    pricingModel: 'hourly',
    basePrice: 0,
    currency: 'EUR',
    travelCosts: false,
    travelCostPerKm: 0.5,
    maxTravelDistance: 50
  });
  const [loading, setLoading] = useState(true);

  // Categories data structure
  const categories = {
    'Handwerk & Technik': [
      'Elektriker', 'Klempner', 'Maler', 'Schreiner', 'Heizung & Sanitär',
      'Gartenbau & Landschaftspflege', 'Renovierung & Sanierung'
    ],
    'IT & Software': [
      'Webentwicklung', 'App-Entwicklung', 'IT-Support', 'Netzwerk-Administration',
      'Datenbank-Management', 'Cybersecurity', 'Cloud-Services'
    ],
    'Hotel & Gastronomie': [
      'Mietkoch', 'Catering', 'Event-Service', 'Barkeeper',
      'Restaurant-Service', 'Küchenberatung'
    ],
    'Gesundheit & Wellness': [
      'Massage', 'Physiotherapie', 'Personal Training', 'Ernährungsberatung',
      'Wellness-Coaching', 'Kosmetik'
    ],
    'Beratung & Consulting': [
      'Unternehmensberatung', 'Steuerberatung', 'Rechtsberatung', 'HR-Beratung',
      'Marketing-Beratung', 'Finanzberatung'
    ],
    'Reinigung & Haushalt': [
      'Hausreinigung', 'Büroreinigung', 'Fensterreinigung', 'Teppichreinigung',
      'Hausmeister-Service', 'Gartenpflege'
    ],
    'Transport & Logistik': [
      'Umzugshilfe', 'Kurierdienst', 'Lieferservice', 'Möbeltransport',
      'Lagerung', 'Entsorgung'
    ],
    'Event & Entertainment': [
      'DJ', 'Fotograf', 'Videoerstellung', 'Event-Planung',
      'Hochzeitsplanung', 'Animateur'
    ]
  };

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          setFormData({
            selectedCategory: userData.selectedCategory || '',
            selectedSubcategory: userData.selectedSubcategory || '',
            additionalCategories: userData.additionalCategories || [],
            lat: userData.lat || 0,
            lng: userData.lng || 0,
            radiusKm: userData.radiusKm || 25,
            serviceAreas: userData.serviceAreas || [],
            availabilityType: userData.availabilityType || 'flexible',
            advanceBookingHours: userData.advanceBookingHours || 24,
            pricingModel: userData.pricingModel || 'hourly',
            basePrice: userData.step3?.hourlyRate ? parseFloat(userData.step3.hourlyRate) : 0,
            currency: 'EUR',
            travelCosts: userData.travelCosts || false,
            travelCostPerKm: userData.travelCostPerKm || 0.5,
            maxTravelDistance: userData.maxTravelDistance || 50
          });
        }

        // Load step data if exists
        if (stepData[4]) {
          setFormData(prev => ({ ...prev, ...stepData[4] }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user, stepData]);

  const handleChange = (field: keyof Step4Data, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateStepData(4, newData);
  };

  const handleCategoryChange = (category: string) => {
    handleChange('selectedCategory', category);
    handleChange('selectedSubcategory', ''); // Reset subcategory
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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Services & Kategorien
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Definieren Sie Ihre Dienstleistungen und den Bereich, in dem Sie tätig sind.
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Hauptkategorie auswählen *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.keys(categories).map((category) => (
            <div
              key={category}
              className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                formData.selectedCategory === category
                  ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5 ring-2 ring-[#14ad9f] ring-opacity-20'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={formData.selectedCategory === category}
                  onChange={() => handleCategoryChange(category)}
                  className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f]"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {category}
                  </div>
                  <div className="text-xs text-gray-500">
                    {categories[category as keyof typeof categories].length} Unterkategorien
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subcategory Selection */}
      {formData.selectedCategory && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Unterkategorie auswählen *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories[formData.selectedCategory as keyof typeof categories].map((subcategory) => (
              <div
                key={subcategory}
                className={`relative cursor-pointer rounded-lg border p-3 transition-colors ${
                  formData.selectedSubcategory === subcategory
                    ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleChange('selectedSubcategory', subcategory)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.selectedSubcategory === subcategory}
                    onChange={() => handleChange('selectedSubcategory', subcategory)}
                    className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f]"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {subcategory}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Area */}
      <div className="border-t border-gray-200 pt-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Service-Bereich
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tätigkeitsradius (km) *
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={formData.radiusKm}
              onChange={(e) => handleChange('radiusKm', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>5 km</span>
              <span className="font-medium text-[#14ad9f]">{formData.radiusKm} km</span>
              <span>100 km</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximale Anfahrtsstrecke (km)
            </label>
            <input
              type="number"
              value={formData.maxTravelDistance}
              onChange={(e) => handleChange('maxTravelDistance', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              min="0"
              max="200"
            />
          </div>
        </div>
      </div>

      {/* Pricing Model */}
      <div className="border-t border-gray-200 pt-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Preisgestaltung
        </h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Preismodell *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                value: 'hourly',
                label: 'Stundensatz',
                description: 'Abrechnung nach Arbeitszeit',
                icon: Clock
              },
              {
                value: 'fixed',
                label: 'Festpreis',
                description: 'Feste Preise pro Auftrag',
                icon: Euro
              },
              {
                value: 'package',
                label: 'Service-Pakete',
                description: 'Vordefinierte Service-Pakete',
                icon: Tag
              }
            ].map((model) => (
              <div
                key={model.value}
                className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                  formData.pricingModel === model.value
                    ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleChange('pricingModel', model.value)}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={formData.pricingModel === model.value}
                    onChange={() => handleChange('pricingModel', model.value)}
                    className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] mt-0.5"
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <model.icon className="w-4 h-4 text-gray-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {model.label}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {model.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Base Price */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {formData.pricingModel === 'hourly' ? 'Stundensatz (€)' : 'Grundpreis (€)'} *
          </label>
          <input
            type="number"
            value={formData.basePrice}
            onChange={(e) => handleChange('basePrice', parseFloat(e.target.value))}
            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            placeholder="z.B. 50"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Travel Costs */}
      <div className="border-t border-gray-200 pt-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Anfahrtskosten
        </h4>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.travelCosts}
              onChange={(e) => handleChange('travelCosts', e.target.checked)}
              className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Anfahrtskosten berechnen
            </label>
          </div>

          {formData.travelCosts && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anfahrtskosten pro Kilometer (€)
              </label>
              <input
                type="number"
                value={formData.travelCostPerKm}
                onChange={(e) => handleChange('travelCostPerKm', parseFloat(e.target.value))}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                placeholder="z.B. 0.50"
                min="0"
                step="0.01"
              />
              <div className="text-sm text-gray-500 mt-1">
                Empfohlen: 0,30€ - 0,60€ pro km
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Availability */}
      <div className="border-t border-gray-200 pt-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Verfügbarkeit
        </h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Buchungs-Vorlaufzeit
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: 'flexible', label: 'Flexibel', description: 'Buchung je nach Verfügbarkeit' },
              { value: 'fixed', label: 'Feste Zeiten', description: 'Nur zu bestimmten Zeiten' },
              { value: 'on-demand', label: 'Auf Abruf', description: 'Sofortige Verfügbarkeit' }
            ].map((type) => (
              <div
                key={type.value}
                className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${
                  formData.availabilityType === type.value
                    ? 'border-[#14ad9f] bg-[#14ad9f] bg-opacity-5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleChange('availabilityType', type.value)}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={formData.availabilityType === type.value}
                    onChange={() => handleChange('availabilityType', type.value)}
                    className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] mt-0.5"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {type.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mindest-Vorlaufzeit (Stunden)
          </label>
          <select
            value={formData.advanceBookingHours}
            onChange={(e) => handleChange('advanceBookingHours', parseInt(e.target.value))}
            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            <option value={1}>1 Stunde</option>
            <option value={4}>4 Stunden</option>
            <option value={24}>24 Stunden</option>
            <option value={48}>48 Stunden</option>
            <option value={168}>1 Woche</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              Schritt 4 von 5 - Service-Konfiguration
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              {formData.selectedCategory && (
                <div>✓ Kategorie: {formData.selectedCategory}</div>
              )}
              {formData.selectedSubcategory && (
                <div>✓ Service: {formData.selectedSubcategory}</div>
              )}
              {formData.basePrice > 0 && (
                <div>✓ Preis: {formData.basePrice}€ {formData.pricingModel === 'hourly' ? '/Stunde' : ''}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep4;

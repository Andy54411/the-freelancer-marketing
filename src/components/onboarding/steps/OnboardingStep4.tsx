'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { MapPin, Clock, Car, AlertCircle, Calendar, Zap, Users, Plus } from 'lucide-react';
import { RequiredFieldLabel, RequiredFieldIndicator } from '@/components/onboarding/RequiredFieldLabel';

// Harmonisierte Step4Data Interface
interface Step4Data {
  // Service-Bereich
  serviceAreas?: string[];

  // Verfügbarkeit
  availabilityType: 'flexible' | 'fixed' | 'on-demand';
  advanceBookingHours: number;

  // Reise & Logistik
  travelCosts: boolean;
  travelCostPerKm?: number;
  maxTravelDistance: number;
}

interface OnboardingStep4Props {
  companyUid?: string;
}

export default function OnboardingStep4({ companyUid }: OnboardingStep4Props) {
  const { stepData, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();

  // Normalisiere die Daten bei der Initialisierung - stelle sicher dass alle Werte definiert sind
  const normalizeStep4Data = (data: any): Step4Data => {
    const defaults: Step4Data = {
      availabilityType: 'flexible',
      advanceBookingHours: 24,
      travelCosts: false,
      maxTravelDistance: 50,
    };
    
    if (!data) return defaults;
    
    return {
      serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : [],
      availabilityType: data.availabilityType || defaults.availabilityType,
      advanceBookingHours: typeof data.advanceBookingHours === 'number' ? data.advanceBookingHours : defaults.advanceBookingHours,
      travelCosts: typeof data.travelCosts === 'boolean' ? data.travelCosts : defaults.travelCosts,
      travelCostPerKm: typeof data.travelCostPerKm === 'number' ? data.travelCostPerKm : undefined,
      maxTravelDistance: typeof data.maxTravelDistance === 'number' ? data.maxTravelDistance : defaults.maxTravelDistance,
    };
  };

  const [step4Data, setStep4Data] = useState<Step4Data>(() => normalizeStep4Data(stepData[4]));

  const [newServiceArea, setNewServiceArea] = useState('');

  const updateField = (field: keyof Step4Data, value: any) => {
    const updatedData = { ...step4Data, [field]: value };
    setStep4Data(updatedData);
    updateStepData(4, updatedData);
  };

  const addServiceArea = () => {
    if (newServiceArea.trim()) {
      const currentAreas = step4Data.serviceAreas || [];
      updateField('serviceAreas', [...currentAreas, newServiceArea.trim()]);
      setNewServiceArea('');
    }
  };

  const removeServiceArea = (index: number) => {
    const currentAreas = step4Data.serviceAreas || [];
    updateField(
      'serviceAreas',
      currentAreas.filter((_, i) => i !== index)
    );
  };

  const handleNext = () => {
    // skipValidation=true weil isValidForNext() bereits prüft
    goToNextStep(true);
  };

  // Validierungsstatus prüfen
  const isValidForNext = () => {
    return step4Data.availabilityType &&
           step4Data.advanceBookingHours > 0 &&
           step4Data.maxTravelDistance > 0 &&
           typeof step4Data.travelCosts === 'boolean' &&
           (!step4Data.travelCosts ||
            (step4Data.travelCosts &&
             typeof step4Data.travelCostPerKm === 'number' &&
             step4Data.travelCostPerKm >= 0));
  };

  const getValidationMessage = () => {
    const missing: string[] = [];
    
    if (!step4Data.availabilityType) missing.push('Verfügbarkeitstyp');
    if (!step4Data.advanceBookingHours || step4Data.advanceBookingHours <= 0) missing.push('Vorlaufzeit für Buchungen');
    if (!step4Data.maxTravelDistance || step4Data.maxTravelDistance <= 0) missing.push('Maximale Reiseentfernung');
    if (typeof step4Data.travelCosts !== 'boolean') missing.push('Reisekosten-Einstellung');
    if (step4Data.travelCosts && (!step4Data.travelCostPerKm || step4Data.travelCostPerKm < 0)) {
      missing.push('Kosten pro Kilometer');
    }
    
    if (missing.length > 0) {
      return `Erforderliche Felder: ${missing.join(', ')}`;
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service-Bereich & Verfügbarkeit</h1>
        <p className="text-gray-600">Definieren Sie Ihren Service-Bereich und Ihre Verfügbarkeit</p>
      </div>

      {/* Required Fields Indicator */}
      <RequiredFieldIndicator />

      <div className="space-y-6">
        {/* Service-Bereich - Modernes Design */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#14ad9f]" />
              <RequiredFieldLabel 
                required={false}
                tooltip="Optional: Spezifische Städte oder Gebiete wo Sie tätig sind"
              >
                Service-Gebiete
              </RequiredFieldLabel>
              <span className="text-xs font-normal text-gray-400 ml-2">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-sm text-gray-600 mb-4">
                Fügen Sie Städte oder Regionen hinzu, in denen Sie Ihre Dienstleistungen anbieten. 
                Dies hilft Kunden, Sie in ihrer Nähe zu finden.
              </p>

              {/* Eingabefeld mit modernem Design */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="z.B. München, Berlin, Hamburg..."
                    value={newServiceArea}
                    onChange={e => setNewServiceArea(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addServiceArea();
                      }
                    }}
                    className="pl-10 h-11 border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                  />
                </div>
                <Button
                  type="button"
                  onClick={addServiceArea}
                  disabled={!newServiceArea.trim()}
                  className="h-11 px-5 bg-[#14ad9f] hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </Button>
              </div>

              {/* Quick-Add Vorschläge */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Schnell hinzufügen:</p>
                <div className="flex flex-wrap gap-2">
                  {['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig'].map(city => {
                    const isAdded = (step4Data.serviceAreas || []).includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          if (!isAdded) {
                            const currentAreas = step4Data.serviceAreas || [];
                            updateField('serviceAreas', [...currentAreas, city]);
                          }
                        }}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isAdded
                            ? 'bg-[#14ad9f]/10 text-[#14ad9f] cursor-default'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                        }`}
                      >
                        {isAdded && <span className="mr-1">&#10003;</span>}
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Ausgewählte Gebiete */}
            {(step4Data.serviceAreas || []).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    Ihre Service-Gebiete ({(step4Data.serviceAreas || []).length})
                  </p>
                  {(step4Data.serviceAreas || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => updateField('serviceAreas', [])}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Alle entfernen
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(step4Data.serviceAreas || []).map((area, index) => (
                    <div
                      key={index}
                      className="group flex items-center bg-[#14ad9f]/10 text-[#14ad9f] pl-3 pr-2 py-2 rounded-xl text-sm font-medium transition-all hover:bg-[#14ad9f]/20"
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      {area}
                      <button
                        type="button"
                        onClick={() => removeServiceArea(index)}
                        className="ml-2 p-1 rounded-full hover:bg-[#14ad9f]/30 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leerer Zustand */}
            {(step4Data.serviceAreas || []).length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Noch keine Service-Gebiete hinzugefügt
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Fügen Sie Städte hinzu oder nutzen Sie die Schnellauswahl oben
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verfügbarkeit - Modernes Karten-Design */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#14ad9f]" />
              <RequiredFieldLabel 
                required={true}
                tooltip="Wählen Sie wie Sie für Kunden verfügbar sind"
              >
                Verfügbarkeit
              </RequiredFieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Verfügbarkeitstyp - Karten-Auswahl */}
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Wie möchten Sie Termine mit Kunden vereinbaren?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Flexibel */}
                <button
                  type="button"
                  onClick={() => updateField('availabilityType', 'flexible')}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                    step4Data.availabilityType === 'flexible'
                      ? 'border-[#14ad9f] bg-teal-50 ring-2 ring-[#14ad9f]/20'
                      : 'border-gray-200 hover:border-[#14ad9f]/50 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    step4Data.availabilityType === 'flexible' 
                      ? 'bg-[#14ad9f] text-white' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h3 className={`font-semibold mb-1 ${
                    step4Data.availabilityType === 'flexible' ? 'text-[#14ad9f]' : 'text-gray-900'
                  }`}>
                    Flexibel
                  </h3>
                  <p className="text-sm text-gray-500">
                    Termine nach individueller Absprache mit dem Kunden
                  </p>
                  {step4Data.availabilityType === 'flexible' && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#14ad9f] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Feste Zeiten */}
                <button
                  type="button"
                  onClick={() => updateField('availabilityType', 'fixed')}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                    step4Data.availabilityType === 'fixed'
                      ? 'border-[#14ad9f] bg-teal-50 ring-2 ring-[#14ad9f]/20'
                      : 'border-gray-200 hover:border-[#14ad9f]/50 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    step4Data.availabilityType === 'fixed' 
                      ? 'bg-[#14ad9f] text-white' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className={`font-semibold mb-1 ${
                    step4Data.availabilityType === 'fixed' ? 'text-[#14ad9f]' : 'text-gray-900'
                  }`}>
                    Feste Zeiten
                  </h3>
                  <p className="text-sm text-gray-500">
                    Vorgegebene Zeitfenster, aus denen Kunden wählen
                  </p>
                  {step4Data.availabilityType === 'fixed' && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#14ad9f] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Auf Abruf */}
                <button
                  type="button"
                  onClick={() => updateField('availabilityType', 'on-demand')}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                    step4Data.availabilityType === 'on-demand'
                      ? 'border-[#14ad9f] bg-teal-50 ring-2 ring-[#14ad9f]/20'
                      : 'border-gray-200 hover:border-[#14ad9f]/50 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    step4Data.availabilityType === 'on-demand' 
                      ? 'bg-[#14ad9f] text-white' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className={`font-semibold mb-1 ${
                    step4Data.availabilityType === 'on-demand' ? 'text-[#14ad9f]' : 'text-gray-900'
                  }`}>
                    Auf Abruf
                  </h3>
                  <p className="text-sm text-gray-500">
                    Kurzfristig verfügbar, auch für spontane Anfragen
                  </p>
                  {step4Data.availabilityType === 'on-demand' && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#14ad9f] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Vorlaufzeit - Moderner Slider-Look */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <RequiredFieldLabel 
                    required={true}
                    tooltip="Wie viele Stunden im Voraus müssen Kunden mindestens buchen?"
                  >
                    Mindestvorlaufzeit
                  </RequiredFieldLabel>
                  <p className="text-sm text-gray-500 mt-1">
                    Wie früh müssen Kunden mindestens buchen?
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#14ad9f]">
                    {step4Data.advanceBookingHours}
                  </div>
                  <div className="text-sm text-gray-500">Stunden</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="168"
                  value={step4Data.advanceBookingHours}
                  onChange={e => updateField('advanceBookingHours', Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#14ad9f]"
                  style={{
                    background: `linear-gradient(to right, #14ad9f 0%, #14ad9f ${(step4Data.advanceBookingHours / 168) * 100}%, #e5e7eb ${(step4Data.advanceBookingHours / 168) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>
              
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>1 Std.</span>
                <span>1 Tag</span>
                <span>3 Tage</span>
                <span>1 Woche</span>
              </div>
              
              {/* Quick-Select Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { label: '1 Std.', value: 1 },
                  { label: '2 Std.', value: 2 },
                  { label: '4 Std.', value: 4 },
                  { label: '12 Std.', value: 12 },
                  { label: '24 Std.', value: 24 },
                  { label: '48 Std.', value: 48 },
                  { label: '72 Std.', value: 72 },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('advanceBookingHours', option.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      step4Data.advanceBookingHours === option.value
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reise & Logistik - Modernes Design */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-[#14ad9f]" />
              <RequiredFieldLabel 
                required={true}
                tooltip="Einstellungen für Anfahrt und Einsatzradius"
              >
                Reise & Logistik
              </RequiredFieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reisekosten Toggle - Modern */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Anfahrtskosten berechnen?</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Berechnen Sie Kunden Kosten für die Anfahrt
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('travelCosts', !step4Data.travelCosts)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    step4Data.travelCosts ? 'bg-[#14ad9f]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      step4Data.travelCosts ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Kosten pro km - nur wenn aktiviert */}
              {step4Data.travelCosts && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <RequiredFieldLabel 
                        required={true}
                        tooltip="Preis pro Kilometer Anfahrt"
                      >
                        Kosten pro Kilometer
                      </RequiredFieldLabel>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#14ad9f]">
                        {step4Data.travelCostPerKm?.toFixed(2) || '0.00'} €
                      </div>
                      <div className="text-sm text-gray-500">pro km</div>
                    </div>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={step4Data.travelCostPerKm || 0}
                    onChange={e => updateField('travelCostPerKm', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#14ad9f]"
                    style={{
                      background: `linear-gradient(to right, #14ad9f 0%, #14ad9f ${((step4Data.travelCostPerKm || 0) / 2) * 100}%, #e5e7eb ${((step4Data.travelCostPerKm || 0) / 2) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>0,00 €</span>
                    <span>0,50 €</span>
                    <span>1,00 €</span>
                    <span>1,50 €</span>
                    <span>2,00 €</span>
                  </div>
                  
                  {/* Quick-Select für Kosten */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      { label: '0,30 €', value: 0.30 },
                      { label: '0,42 €', value: 0.42 },
                      { label: '0,50 €', value: 0.50 },
                      { label: '0,60 €', value: 0.60 },
                      { label: '0,70 €', value: 0.70 },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('travelCostPerKm', option.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          step4Data.travelCostPerKm === option.value
                            ? 'bg-[#14ad9f] text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Empfehlung: 0,30 € (Pauschale) oder 0,42 € (Finanzamt-Satz)
                  </p>
                </div>
              )}
            </div>

            {/* Maximale Entfernung - Slider */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <RequiredFieldLabel 
                    required={true}
                    tooltip="Maximaler Radius in Kilometern für Ihre Dienstleistungen"
                  >
                    Maximaler Einsatzradius
                  </RequiredFieldLabel>
                  <p className="text-sm text-gray-500 mt-1">
                    Wie weit fahren Sie maximal zu Kunden?
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#14ad9f]">
                    {step4Data.maxTravelDistance}
                  </div>
                  <div className="text-sm text-gray-500">Kilometer</div>
                </div>
              </div>
              
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={step4Data.maxTravelDistance}
                onChange={e => updateField('maxTravelDistance', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#14ad9f]"
                style={{
                  background: `linear-gradient(to right, #14ad9f 0%, #14ad9f ${((step4Data.maxTravelDistance - 5) / 195) * 100}%, #e5e7eb ${((step4Data.maxTravelDistance - 5) / 195) * 100}%, #e5e7eb 100%)`
                }}
              />
              
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>5 km</span>
                <span>50 km</span>
                <span>100 km</span>
                <span>150 km</span>
                <span>200 km</span>
              </div>
              
              {/* Quick-Select für Entfernung */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { label: '10 km', value: 10 },
                  { label: '25 km', value: 25 },
                  { label: '50 km', value: 50 },
                  { label: '75 km', value: 75 },
                  { label: '100 km', value: 100 },
                  { label: '150 km', value: 150 },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('maxTravelDistance', option.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      step4Data.maxTravelDistance === option.value
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zusammenfassung - Modernes Grid Design */}
        <Card className="bg-linear-to-br from-gray-50 to-white border-2 border-gray-100">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#14ad9f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ihre Einstellungen im Überblick
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Verfügbarkeitstyp */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verfügbarkeit</div>
                <div className="font-semibold text-gray-900">
                  {step4Data.availabilityType === 'flexible'
                    ? 'Flexibel'
                    : step4Data.availabilityType === 'fixed'
                      ? 'Feste Zeiten'
                      : 'Auf Abruf'}
                </div>
              </div>
              
              {/* Vorlaufzeit */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vorlaufzeit</div>
                <div className="font-semibold text-gray-900">
                  {step4Data.advanceBookingHours >= 24 
                    ? `${Math.floor(step4Data.advanceBookingHours / 24)} Tag${Math.floor(step4Data.advanceBookingHours / 24) > 1 ? 'e' : ''}`
                    : `${step4Data.advanceBookingHours} Std.`}
                </div>
              </div>
              
              {/* Reisekosten */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Anfahrtskosten</div>
                <div className="font-semibold text-gray-900">
                  {step4Data.travelCosts 
                    ? `${(step4Data.travelCostPerKm || 0).toFixed(2)} €/km` 
                    : 'Keine'}
                </div>
              </div>
              
              {/* Max. Entfernung */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Einsatzradius</div>
                <div className="font-semibold text-gray-900">{step4Data.maxTravelDistance} km</div>
              </div>
            </div>
            
            {/* Service-Gebiete */}
            {step4Data.serviceAreas && step4Data.serviceAreas.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Service-Gebiete</div>
                <div className="flex flex-wrap gap-2">
                  {step4Data.serviceAreas.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center bg-[#14ad9f]/10 text-[#14ad9f] px-3 py-1 rounded-full text-sm font-medium"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Validation Message */}
      {!isValidForNext() && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <AlertCircle className="h-5 w-5 text-[#14ad9f]" />
            <span className="font-medium">Erforderliche Felder fehlen:</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{getValidationMessage()}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={goToPreviousStep} className="px-6">
          Zurück
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValidForNext()}
          className="px-6 bg-[#14ad9f] hover:bg-taskilo-hover text-white disabled:bg-gray-300"
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}

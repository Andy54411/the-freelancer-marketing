'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { MapPin, Clock, Car } from 'lucide-react';

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

export default function OnboardingStep4() {
  const { stepData, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();
  
  const [step4Data, setStep4Data] = useState<Step4Data>(
    stepData[4] || {
      availabilityType: 'flexible',
      advanceBookingHours: 24,
      travelCosts: false,
      maxTravelDistance: 50,
    }
  );

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
    updateField('serviceAreas', currentAreas.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    goToNextStep();
  };

  const isValid = step4Data.availabilityType && 
                 step4Data.advanceBookingHours > 0 && 
                 step4Data.maxTravelDistance > 0 &&
                 (!step4Data.travelCosts || (step4Data.travelCosts && step4Data.travelCostPerKm));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Service-Bereich & Verfügbarkeit
        </h1>
        <p className="text-gray-600">
          Definieren Sie Ihren Service-Bereich und Ihre Verfügbarkeit
        </p>
      </div>

      <div className="space-y-6">
        {/* Service-Bereich */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service-Gebiete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Geben Sie spezifische Städte oder Gebiete an, in denen Sie Ihre Services anbieten.
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Stadt oder Gebiet hinzufügen"
                value={newServiceArea}
                onChange={(e) => setNewServiceArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addServiceArea()}
              />
              <Button onClick={addServiceArea} size="sm" className="bg-[#14ad9f] hover:bg-[#129488]">
                Hinzufügen
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(step4Data.serviceAreas || []).map((area, index) => (
                <div key={index} className="flex items-center bg-[#14ad9f] text-white px-3 py-1 rounded-full text-sm">
                  {area}
                  <button
                    onClick={() => removeServiceArea(index)}
                    className="ml-2 hover:text-red-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Verfügbarkeit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Verfügbarkeit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="availabilityType">Verfügbarkeitstyp *</Label>
              <Select 
                value={step4Data.availabilityType} 
                onValueChange={(value: 'flexible' | 'fixed' | 'on-demand') => updateField('availabilityType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wählen Sie Ihren Verfügbarkeitstyp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flexible">
                    <div>
                      <div className="font-medium">Flexibel</div>
                      <div className="text-sm text-gray-500">Termine nach Absprache</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div>
                      <div className="font-medium">Feste Zeiten</div>
                      <div className="text-sm text-gray-500">Vorgegebene Zeitfenster</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="on-demand">
                    <div>
                      <div className="font-medium">Auf Abruf</div>
                      <div className="text-sm text-gray-500">Kurzfristige Verfügbarkeit</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="advanceBookingHours">Vorlaufzeit für Buchungen (Stunden) *</Label>
              <Input
                id="advanceBookingHours"
                type="number"
                placeholder="24"
                value={step4Data.advanceBookingHours}
                onChange={(e) => updateField('advanceBookingHours', Number(e.target.value))}
                min="1"
                max="720"
              />
              <p className="text-sm text-gray-500 mt-1">
                Mindestens wie viele Stunden im Voraus sollen Kunden buchen können?
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reise & Logistik */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Reise & Logistik
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="travelCosts"
                checked={step4Data.travelCosts}
                onCheckedChange={(checked) => updateField('travelCosts', checked)}
              />
              <Label htmlFor="travelCosts">Reisekosten berechnen *</Label>
            </div>

            {step4Data.travelCosts && (
              <div>
                <Label htmlFor="travelCostPerKm">Kosten pro Kilometer (€) *</Label>
                <Input
                  id="travelCostPerKm"
                  type="number"
                  step="0.01"
                  placeholder="0.50"
                  value={step4Data.travelCostPerKm || ''}
                  onChange={(e) => updateField('travelCostPerKm', Number(e.target.value))}
                  min="0"
                  max="5"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Empfohlen: 0,30 - 0,60 € pro Kilometer
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="maxTravelDistance">Maximale Reiseentfernung (km) *</Label>
              <Input
                id="maxTravelDistance"
                type="number"
                placeholder="50"
                value={step4Data.maxTravelDistance}
                onChange={(e) => updateField('maxTravelDistance', Number(e.target.value))}
                min="1"
                max="500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Wie weit sind Sie bereit zu reisen, um Services anzubieten?
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Zusammenfassung */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Zusammenfassung Ihrer Einstellungen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Verfügbarkeitstyp:</span>
                <span className="font-medium">
                  {step4Data.availabilityType === 'flexible' ? 'Flexibel' :
                   step4Data.availabilityType === 'fixed' ? 'Feste Zeiten' : 'Auf Abruf'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vorlaufzeit:</span>
                <span className="font-medium">{step4Data.advanceBookingHours} Stunden</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reisekosten:</span>
                <span className="font-medium">
                  {step4Data.travelCosts ? 
                    `${step4Data.travelCostPerKm || 0} €/km` : 
                    'Keine'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max. Entfernung:</span>
                <span className="font-medium">{step4Data.maxTravelDistance} km</span>
              </div>
              {step4Data.serviceAreas && step4Data.serviceAreas.length > 0 && (
                <div>
                  <span className="text-gray-600">Service-Gebiete:</span>
                  <div className="mt-1">
                    {step4Data.serviceAreas.map((area, index) => (
                      <span key={index} className="inline-block bg-[#14ad9f] text-white px-2 py-1 rounded text-xs mr-1 mb-1">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={goToPreviousStep}
          className="px-6"
        >
          Zurück
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!isValid}
          className="px-6 bg-[#14ad9f] hover:bg-[#129488] text-white disabled:bg-gray-300"
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}

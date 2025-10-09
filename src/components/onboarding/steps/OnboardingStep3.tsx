'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Camera, Upload, Plus, Trash2, Users, Star, AlertCircle } from 'lucide-react';
import { RequiredFieldLabel, RequiredFieldIndicator } from '@/components/onboarding/RequiredFieldLabel';

// Harmonisierte Step3Data Interface
interface Step3Data {
  // Branding & Darstellung
  companyLogo?: string;
  profileBannerImage?: string;

  // Skills & Kompetenzen
  skills?: string[];
  specialties?: string[];

  // Sprachen
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;


}

interface OnboardingStep3Props {
  companyUid?: string;
}

export default function OnboardingStep3({ companyUid }: OnboardingStep3Props) {
  const { stepData, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [step3Data, setStep3Data] = useState<Step3Data>(stepData[3] || {});

  const [newSkill, setNewSkill] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');

  const updateField = (field: keyof Step3Data, value: any) => {
    const updatedData = { ...step3Data, [field]: value };
    setStep3Data(updatedData);
    // Nur lokal updaten - KEIN automatisches Firestore-Save!
    // Firestore-Save erfolgt nur beim Step-Wechsel oder manuell
    updateStepData(3, updatedData);
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = step3Data.skills || [];
      updateField('skills', [...currentSkills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    const currentSkills = step3Data.skills || [];
    updateField(
      'skills',
      currentSkills.filter((_, i) => i !== index)
    );
  };

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      const currentSpecialties = step3Data.specialties || [];
      updateField('specialties', [...currentSpecialties, newSpecialty.trim()]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    const currentSpecialties = step3Data.specialties || [];
    updateField(
      'specialties',
      currentSpecialties.filter((_, i) => i !== index)
    );
  };

  const addLanguage = () => {
    const currentLanguages = step3Data.languages || [];
    updateField('languages', [...currentLanguages, { language: '', proficiency: '' }]);
  };

  const updateLanguage = (index: number, field: 'language' | 'proficiency', value: string) => {
    const currentLanguages = step3Data.languages || [];
    const updatedLanguages = currentLanguages.map((lang, i) =>
      i === index ? { ...lang, [field]: value } : lang
    );
    updateField('languages', updatedLanguages);
  };

  const removeLanguage = (index: number) => {
    const currentLanguages = step3Data.languages || [];
    updateField(
      'languages',
      currentLanguages.filter((_, i) => i !== index)
    );
  };



  const handleNext = () => {
    goToNextStep();
  };

  // Validierungsstatus prüfen
  const isValidForNext = () => {
    const skills = step3Data.skills || [];
    return skills.length > 0;
  };

  const getValidationMessage = () => {
    const skills = step3Data.skills || [];
    if (skills.length === 0) {
      return "Mindestens eine Fähigkeit ist erforderlich";
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil & Service-Details</h1>
        <p className="text-gray-600">
          Gestalten Sie Ihr Unternehmensprofil und präsentieren Sie Ihre Services
        </p>
      </div>

      {/* Required Fields Indicator */}
      <RequiredFieldIndicator />

      <div className="space-y-6">
        {/* Branding & Darstellung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Branding & Darstellung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo-Upload entfernt - wird bereits in der Registrierung hochgeladen */}
            <div>
              <Label htmlFor="profileBannerImage">Banner-Bild</Label>
              <div className="flex flex-col gap-3">
                <input
                  id="profileBannerImage"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const imageUrl = URL.createObjectURL(file);
                      updateField('profileBannerImage', imageUrl);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('profileBannerImage')?.click()}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded-md flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Banner hochladen
                  </button>
                  {step3Data.profileBannerImage && (
                    <span className="text-sm text-green-600">✓ Banner hochgeladen</span>
                  )}
                </div>
                {/* Banner-Vorschau */}
                {step3Data.profileBannerImage && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Vorschau:</p>
                    <div className="relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={step3Data.profileBannerImage}
                        alt="Banner Vorschau"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills & Kompetenzen */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Kompetenzen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <RequiredFieldLabel 
                required={true}
                tooltip="Mindestens eine Fähigkeit ist erforderlich - beschreibt Ihre Kernkompetenzen"
              >
                Fähigkeiten
              </RequiredFieldLabel>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Neue Fähigkeit hinzufügen"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSkill()}
                />
                <Button onClick={addSkill} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(step3Data.skills || []).map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-[#14ad9f] text-white px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                    <button onClick={() => removeSkill(index)} className="ml-2 hover:text-gray-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <RequiredFieldLabel 
                required={false}
                tooltip="Optional: Spezifische Bereiche Ihrer Expertise"
              >
                Spezialisierungen
              </RequiredFieldLabel>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Neue Spezialisierung hinzufügen"
                  value={newSpecialty}
                  onChange={e => setNewSpecialty(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSpecialty()}
                />
                <Button onClick={addSpecialty} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(step3Data.specialties || []).map((specialty, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-[#14ad9f] text-white px-3 py-1 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      onClick={() => removeSpecialty(index)}
                      className="ml-2 hover:text-gray-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sprachen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RequiredFieldLabel 
                required={false}
                tooltip="Optional: Sprachen die Sie sprechen - hilfreich für internationale Kunden"
              >
                Sprachen
              </RequiredFieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(step3Data.languages || []).map((language, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Sprache"
                    value={language.language}
                    onChange={e => updateLanguage(index, 'language', e.target.value)}
                  />
                  <Input
                    placeholder="Niveau (z.B. Muttersprache, Fließend)"
                    value={language.proficiency}
                    onChange={e => updateLanguage(index, 'proficiency', e.target.value)}
                  />
                  <Button variant="outline" size="sm" onClick={() => removeLanguage(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={addLanguage} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Sprache hinzufügen
              </Button>
            </div>
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
          className="px-6 bg-[#14ad9f] hover:bg-[#129488] text-white"
          disabled={!isValidForNext()}
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}

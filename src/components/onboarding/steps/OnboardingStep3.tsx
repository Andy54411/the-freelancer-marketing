'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/contexts/OnboardingContext';
import Image from 'next/image';
import { 
  Upload, 
  Plus, 
  X, 
  Globe, 
  Sparkles, 
  Target,
  ImageIcon,
  AlertCircle
} from 'lucide-react';
import { RequiredFieldLabel, RequiredFieldIndicator } from '@/components/onboarding/RequiredFieldLabel';

// Harmonisierte Step3Data Interface
interface Step3Data {
  companyLogo?: string;
  profileBannerImage?: string;
  skills?: string[];
  specialties?: string[];
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
}

// Verfügbare Sprachen für Dropdown
const AVAILABLE_LANGUAGES = [
  'Deutsch',
  'Englisch',
  'Französisch',
  'Spanisch',
  'Italienisch',
  'Portugiesisch',
  'Niederländisch',
  'Polnisch',
  'Russisch',
  'Türkisch',
  'Arabisch',
  'Chinesisch',
  'Japanisch',
  'Koreanisch',
  'Griechisch',
  'Rumänisch',
  'Ungarisch',
  'Tschechisch',
  'Kroatisch',
  'Serbisch',
  'Ukrainisch',
  'Vietnamesisch',
  'Thailändisch',
  'Hindi',
  'Persisch',
];

// Sprachniveaus für Dropdown
const PROFICIENCY_LEVELS = [
  { value: 'muttersprache', label: 'Muttersprache' },
  { value: 'fliessend', label: 'Fließend (C1-C2)' },
  { value: 'sehr_gut', label: 'Sehr gut (B2)' },
  { value: 'gut', label: 'Gut (B1)' },
  { value: 'grundkenntnisse', label: 'Grundkenntnisse (A1-A2)' },
];

// Vorgeschlagene Skills
const SUGGESTED_SKILLS = [
  'Projektmanagement',
  'Kundenberatung',
  'Qualitätssicherung',
  'Teamführung',
  'Buchhaltung',
  'Marketing',
  'Webdesign',
  'IT-Support',
  'Vertrieb',
  'Logistik',
];

interface OnboardingStep3Props {
  companyUid?: string;
}

export default function OnboardingStep3(_props: OnboardingStep3Props) {
  const { stepData, updateStepData, goToNextStep, goToPreviousStep } = useOnboarding();

  // Normalisiere die Daten bei der Initialisierung
  const normalizeStep3Data = (data: Record<string, unknown> | undefined): Step3Data => {
    if (!data) return { skills: [], specialties: [], languages: [] };
    
    const rawSkills = data.skills;
    const rawSpecialties = data.specialties;
    const rawLanguages = data.languages;
    
    let parsedSkills: string[] = [];
    if (Array.isArray(rawSkills)) {
      parsedSkills = rawSkills as string[];
    } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
      parsedSkills = rawSkills.split(',').map((s: string) => s.trim());
    }
    
    let parsedSpecialties: string[] = [];
    if (Array.isArray(rawSpecialties)) {
      parsedSpecialties = rawSpecialties as string[];
    } else if (typeof rawSpecialties === 'string' && rawSpecialties.trim()) {
      parsedSpecialties = rawSpecialties.split(',').map((s: string) => s.trim());
    }
    
    return {
      companyLogo: typeof data.companyLogo === 'string' ? data.companyLogo : undefined,
      profileBannerImage: typeof data.profileBannerImage === 'string' ? data.profileBannerImage : undefined,
      skills: parsedSkills,
      specialties: parsedSpecialties,
      languages: Array.isArray(rawLanguages) ? rawLanguages as Step3Data['languages'] : [],
    };
  };

  const [step3Data, setStep3Data] = useState<Step3Data>(() => normalizeStep3Data(stepData[3] as Record<string, unknown>));
  const [newSkill, setNewSkill] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const updateField = useCallback((field: keyof Step3Data, value: Step3Data[keyof Step3Data]) => {
    const updatedData = { ...step3Data, [field]: value };
    setStep3Data(updatedData);
    updateStepData(3, updatedData);
  }, [step3Data, updateStepData]);

  // Skills Management
  const addSkill = useCallback(() => {
    if (newSkill.trim()) {
      const currentSkills = step3Data.skills || [];
      if (!currentSkills.includes(newSkill.trim())) {
        updateField('skills', [...currentSkills, newSkill.trim()]);
      }
      setNewSkill('');
    }
  }, [newSkill, step3Data.skills, updateField]);

  const addSuggestedSkill = useCallback((skill: string) => {
    const currentSkills = step3Data.skills || [];
    if (!currentSkills.includes(skill)) {
      updateField('skills', [...currentSkills, skill]);
    }
  }, [step3Data.skills, updateField]);

  const removeSkill = useCallback((index: number) => {
    const currentSkills = step3Data.skills || [];
    updateField('skills', currentSkills.filter((_, i) => i !== index));
  }, [step3Data.skills, updateField]);

  // Specialties Management
  const addSpecialty = useCallback(() => {
    if (newSpecialty.trim()) {
      const currentSpecialties = step3Data.specialties || [];
      if (!currentSpecialties.includes(newSpecialty.trim())) {
        updateField('specialties', [...currentSpecialties, newSpecialty.trim()]);
      }
      setNewSpecialty('');
    }
  }, [newSpecialty, step3Data.specialties, updateField]);

  const removeSpecialty = useCallback((index: number) => {
    const currentSpecialties = step3Data.specialties || [];
    updateField('specialties', currentSpecialties.filter((_, i) => i !== index));
  }, [step3Data.specialties, updateField]);

  // Languages Management
  const addLanguage = useCallback(() => {
    const currentLanguages = step3Data.languages || [];
    updateField('languages', [...currentLanguages, { language: '', proficiency: '' }]);
  }, [step3Data.languages, updateField]);

  const updateLanguage = useCallback((index: number, field: 'language' | 'proficiency', value: string) => {
    const currentLanguages = step3Data.languages || [];
    const updatedLanguages = currentLanguages.map((lang, i) =>
      i === index ? { ...lang, [field]: value } : lang
    );
    updateField('languages', updatedLanguages);
  }, [step3Data.languages, updateField]);

  const removeLanguage = useCallback((index: number) => {
    const currentLanguages = step3Data.languages || [];
    updateField('languages', currentLanguages.filter((_, i) => i !== index));
  }, [step3Data.languages, updateField]);

  // Banner Upload
  const handleBannerUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      updateField('profileBannerImage', imageUrl);
    }
  }, [updateField]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleBannerUpload(file);
  }, [handleBannerUpload]);

  const handleNext = () => {
    goToNextStep(true);
  };

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

  const skillsCount = step3Data.skills?.length || 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil & Service-Details</h1>
          <p className="text-gray-600">
            Gestalten Sie Ihr Unternehmensprofil und präsentieren Sie Ihre Services
          </p>
        </div>

        {/* Required Fields Indicator */}
        <RequiredFieldIndicator />

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="grid gap-8">
            
            {/* Banner Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[#14ad9f]" />
                <RequiredFieldLabel 
                  required={false}
                  tooltip="Optional: Ein professionelles Banner für Ihr Profil"
                >
                  Profilbanner
                </RequiredFieldLabel>
              </div>
              
              {step3Data.profileBannerImage ? (
                <div className="relative group">
                  <div className="aspect-3/1 rounded-lg overflow-hidden bg-gray-100 relative">
                    <Image
                      src={step3Data.profileBannerImage}
                      alt="Banner Vorschau"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                    <button
                      onClick={() => document.getElementById('profileBannerImage')?.click()}
                      className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      Ändern
                    </button>
                    <button
                      onClick={() => updateField('profileBannerImage', undefined)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('profileBannerImage')?.click()}
                  className={`aspect-3/1 rounded-lg border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    dragOver 
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5' 
                      : 'border-gray-300 hover:border-[#14ad9f]/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Bild hierher ziehen oder <span className="text-[#14ad9f]">durchsuchen</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG bis 5MB (empfohlen: 1200x400px)</p>
                  </div>
                </div>
              )}
              <input
                id="profileBannerImage"
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleBannerUpload(file);
                }}
                className="hidden"
              />
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#14ad9f]" />
                <RequiredFieldLabel 
                  required={true}
                  tooltip="Mindestens eine Fähigkeit ist erforderlich - beschreibt Ihre Kernkompetenzen"
                >
                  Fähigkeiten
                </RequiredFieldLabel>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="z.B. Projektmanagement, Webdesign..."
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1"
                />
                <Button 
                  onClick={addSkill}
                  disabled={!newSkill.trim()}
                  className="bg-[#14ad9f] hover:bg-[#12a08f]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggestions */}
              {skillsCount === 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-3">Vorschläge zum Starten:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_SKILLS.slice(0, 6).map((skill) => (
                      <button
                        key={skill}
                        onClick={() => addSuggestedSkill(skill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm hover:border-[#14ad9f] hover:text-[#14ad9f] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Skills */}
              {skillsCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(step3Data.skills || []).map((skill, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#14ad9f] text-white rounded-full text-sm"
                    >
                      {skill}
                      <button 
                        onClick={() => removeSkill(index)} 
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Specialties */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#14ad9f]" />
                <RequiredFieldLabel 
                  required={false}
                  tooltip="Optional: Spezifische Bereiche Ihrer Expertise"
                >
                  Spezialisierungen
                </RequiredFieldLabel>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="z.B. E-Commerce, B2B-Vertrieb..."
                  value={newSpecialty}
                  onChange={e => setNewSpecialty(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  className="flex-1"
                />
                <Button 
                  onClick={addSpecialty}
                  disabled={!newSpecialty.trim()}
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Added Specialties */}
              {(step3Data.specialties || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(step3Data.specialties || []).map((specialty, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500 text-white rounded-full text-sm"
                    >
                      {specialty}
                      <button 
                        onClick={() => removeSpecialty(index)} 
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Languages */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#14ad9f]" />
                <RequiredFieldLabel 
                  required={false}
                  tooltip="Optional: Sprachen die Sie sprechen - hilfreich für internationale Kunden"
                >
                  Sprachen
                </RequiredFieldLabel>
              </div>
              
              {(step3Data.languages || []).length > 0 && (
                <div className="space-y-3">
                  {(step3Data.languages || []).map((language, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                      <select
                        value={language.language}
                        onChange={e => updateLanguage(index, 'language', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      >
                        <option value="">Sprache wählen...</option>
                        {AVAILABLE_LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                      <select
                        value={language.proficiency}
                        onChange={e => updateLanguage(index, 'proficiency', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      >
                        <option value="">Niveau wählen...</option>
                        {PROFICIENCY_LEVELS.map(level => (
                          <option key={level.value} value={level.label}>{level.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeLanguage(index)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={addLanguage} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Sprache hinzufügen
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Message */}
        {!isValidForNext() && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Erforderliche Felder fehlen:</span>
            </div>
            <p className="mt-1 text-sm text-amber-700">{getValidationMessage()}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={goToPreviousStep}
          >
            Zurück
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!isValidForNext()}
            className="bg-[#14ad9f] hover:bg-[#12a08f] text-white"
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}

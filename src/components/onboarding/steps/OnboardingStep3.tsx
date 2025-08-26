'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Camera, Upload, Plus, Trash2, Users, Star, MessageCircle } from 'lucide-react';

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

  // Service-Pakete
  servicePackages?: Array<{
    title: string;
    description: string;
    price: number;
    duration: string;
  }>;

  // Portfolio
  portfolio?: Array<{
    title: string;
    description: string;
    imageUrl: string;
  }>;

  // FAQ
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export default function OnboardingStep3() {
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

  const addServicePackage = () => {
    const currentPackages = step3Data.servicePackages || [];
    updateField('servicePackages', [
      ...currentPackages,
      { title: '', description: '', price: 0, duration: '' },
    ]);
  };

  const updateServicePackage = (index: number, field: string, value: any) => {
    const currentPackages = step3Data.servicePackages || [];
    const updatedPackages = currentPackages.map((pkg, i) =>
      i === index ? { ...pkg, [field]: value } : pkg
    );
    updateField('servicePackages', updatedPackages);
  };

  const removeServicePackage = (index: number) => {
    const currentPackages = step3Data.servicePackages || [];
    updateField(
      'servicePackages',
      currentPackages.filter((_, i) => i !== index)
    );
  };

  const addPortfolioItem = () => {
    const currentPortfolio = step3Data.portfolio || [];
    updateField('portfolio', [...currentPortfolio, { title: '', description: '', imageUrl: '' }]);
  };

  const updatePortfolioItem = (index: number, field: string, value: string) => {
    const currentPortfolio = step3Data.portfolio || [];
    const updatedPortfolio = currentPortfolio.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    updateField('portfolio', updatedPortfolio);
  };

  const removePortfolioItem = (index: number) => {
    const currentPortfolio = step3Data.portfolio || [];
    updateField(
      'portfolio',
      currentPortfolio.filter((_, i) => i !== index)
    );
  };

  const addFAQ = () => {
    const currentFAQs = step3Data.faqs || [];
    updateField('faqs', [...currentFAQs, { question: '', answer: '' }]);
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const currentFAQs = step3Data.faqs || [];
    const updatedFAQs = currentFAQs.map((faq, i) =>
      i === index ? { ...faq, [field]: value } : faq
    );
    updateField('faqs', updatedFAQs);
  };

  const removeFAQ = (index: number) => {
    const currentFAQs = step3Data.faqs || [];
    updateField(
      'faqs',
      currentFAQs.filter((_, i) => i !== index)
    );
  };

  const handleNext = () => {
    goToNextStep();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil & Service-Details</h1>
        <p className="text-gray-600">
          Gestalten Sie Ihr Unternehmensprofil und präsentieren Sie Ihre Services
        </p>
      </div>

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
              <Label>Fähigkeiten</Label>
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
                    <button onClick={() => removeSkill(index)} className="ml-2 hover:text-red-200">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Spezialisierungen</Label>
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
                      className="ml-2 hover:text-red-200"
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
            <CardTitle>Sprachen</CardTitle>
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

        {/* Service-Pakete */}
        <Card>
          <CardHeader>
            <CardTitle>Service-Pakete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(step3Data.servicePackages || []).map((pkg, index) => (
                <div key={index} className="border p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Paket {index + 1}</h4>
                    <Button variant="outline" size="sm" onClick={() => removeServicePackage(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Paket-Titel"
                    value={pkg.title}
                    onChange={e => updateServicePackage(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Beschreibung"
                    value={pkg.description}
                    onChange={e => updateServicePackage(index, 'description', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Preis (€)"
                      value={pkg.price}
                      onChange={e => updateServicePackage(index, 'price', Number(e.target.value))}
                    />
                    <Input
                      placeholder="Dauer (z.B. 2 Stunden)"
                      value={pkg.duration}
                      onChange={e => updateServicePackage(index, 'duration', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <Button onClick={addServicePackage} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Service-Paket hinzufügen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(step3Data.portfolio || []).map((item, index) => (
                <div key={index} className="border p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Portfolio-Eintrag {index + 1}</h4>
                    <Button variant="outline" size="sm" onClick={() => removePortfolioItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Projekt-Titel"
                    value={item.title}
                    onChange={e => updatePortfolioItem(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Projekt-Beschreibung"
                    value={item.description}
                    onChange={e => updatePortfolioItem(index, 'description', e.target.value)}
                  />
                  <Input
                    placeholder="Bild-URL"
                    value={item.imageUrl}
                    onChange={e => updatePortfolioItem(index, 'imageUrl', e.target.value)}
                  />
                </div>
              ))}
              <Button onClick={addPortfolioItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Portfolio-Eintrag hinzufügen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Häufig gestellte Fragen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(step3Data.faqs || []).map((faq, index) => (
                <div key={index} className="border p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">FAQ {index + 1}</h4>
                    <Button variant="outline" size="sm" onClick={() => removeFAQ(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Frage"
                    value={faq.question}
                    onChange={e => updateFAQ(index, 'question', e.target.value)}
                  />
                  <Textarea
                    placeholder="Antwort"
                    value={faq.answer}
                    onChange={e => updateFAQ(index, 'answer', e.target.value)}
                  />
                </div>
              ))}
              <Button onClick={addFAQ} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                FAQ hinzufügen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={goToPreviousStep} className="px-6">
          Zurück
        </Button>
        <Button onClick={handleNext} className="px-6 bg-[#14ad9f] hover:bg-[#129488] text-white">
          Weiter
        </Button>
      </div>
    </div>
  );
}

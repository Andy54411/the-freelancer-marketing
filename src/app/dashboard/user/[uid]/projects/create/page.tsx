'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { categories } from '@/lib/categoriesData'; // Import zentrale Kategorien
import {
  PlusCircle,
  Upload,
  Euro,
  Users,
  Clock,
  FileText,
  ArrowLeft,
  Sparkles,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown } from 'lucide-react';
import SubcategoryFormManager from '@/components/subcategory-forms/SubcategoryFormManager';
import { SubcategoryData } from '@/types/subcategoryData';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProjectRequest {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  budgetAmount?: number;
  maxBudget?: number;
  timeline: string;
  startDate?: string;
  endDate?: string;
  preferredDate?: string;
  location?: string;
  isRemote: boolean;
  requiredSkills: string[];
  attachments: File[];
  urgency: 'low' | 'medium' | 'high';
  subcategoryData?: any; // Spezifische Unterkategorie-Daten
}

export default function CreateProjectRequestPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params?.uid as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePlanning, setShowDatePlanning] = useState(false);
  const [subcategoryFormValid, setSubcategoryFormValid] = useState(true);
  const [formData, setFormData] = useState<ProjectRequest>({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    budgetType: 'negotiable',
    timeline: '',
    startDate: '',
    endDate: '',
    preferredDate: '',
    location: '',
    isRemote: false,
    requiredSkills: [],
    attachments: [],
    urgency: 'medium',
    subcategoryData: null,
  });

  // Gradient Hintergrund Effect
  useEffect(() => {
    return () => {
      // Cleanup wenn Komponente unmounted wird
    };
  }, []);

  // Initialisierung der Subcategory-Daten
  const getInitialSubcategoryData = (subcategory: string): SubcategoryData => {
    switch (subcategory) {
      case 'Mietkoch':
        return {
          kochAnlass: '',
          anzahlPersonen: 1,
          menuWuensche: '',
          allergien: '',
          kuechenausstattung: '',
          einkaufService: false,
          aufbauService: false,
          abspuelService: false,
          erfahrungsJahre: 0,
          referenzen: [],
        };
      case 'Webentwicklung':
        return {
          projektTyp: '',
          technologien: [],
          designVorhanden: false,
          cms: false,
          ecommerce: false,
          wartung: false,
          hosting: false,
          seo: false,
          responsive: true,
          mehrsprachig: false,
          deadline: '',
          referenzWebsites: [],
        };
      case 'Catering':
        return {
          veranstaltungsTyp: '',
          anzahlGaeste: 1,
          veranstaltungsort: '',
          menuArt: '',
          buffetOderService: '',
          getraenkeService: false,
          dekoration: false,
          aufbauAbbau: false,
          geschirr: false,
          personal: false,
          allergien: '',
          besonderheiten: '',
        };
      case 'Elektriker':
        return {
          arbeitsTyp: '',
          raumAnzahl: 1,
          notfall: false,
          pruefungErforderlich: false,
          materialInkludiert: false,
          entsorgung: false,
          garantie: false,
          terminFlexibel: true,
          zugang: '',
          sicherheitsbestimmungen: '',
          dokumentation: false,
        };
      default:
        return {};
    }
  };

  // Navigation zwischen Steps
  const nextStep = () => {
    if (currentStep === 1 && formData.subcategory) {
      // Initialisiere subcategoryData wenn Subkategorie vorhanden
      if (!formData.subcategoryData) {
        const initialData = getInitialSubcategoryData(formData.subcategory);
        setFormData(prev => ({ ...prev, subcategoryData: initialData }));
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!uid) {
    return <div>Ungültige Benutzer-ID</div>;
  }

  const selectedCategory = categories.find(cat => cat.title === formData.category);

  const handleInputChange = (field: keyof ProjectRequest, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSkillAdd = (skill: string) => {
    if (skill.trim() && !formData.requiredSkills.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skill.trim()],
      }));
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(skill => skill !== skillToRemove),
    }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newFiles],
      }));
    }
  };

  const handleSubcategoryDataChange = useCallback((data: SubcategoryData) => {
    setFormData(prev => ({
      ...prev,
      subcategoryData: data,
    }));
  }, []);

  const handleSubcategoryValidationChange = useCallback((isValid: boolean) => {
    setSubcategoryFormValid(isValid);
  }, []);

  const handleSubmit = async () => {
    if (!user || !uid) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }

    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsSubmitting(true);

    try {
      // Erstelle Projektanfrage über API
      const response = await fetch('/api/project-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          customerUid: uid,
          customerEmail: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Projektanfrage');
      }

      const result = await response.json();
      console.log('✅ Projektanfrage erstellt:', result);

      toast.success('Projektanfrage erfolgreich erstellt!');
      router.push(`/dashboard/user/${uid}/projects`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Projektanfrage:', error);
      toast.error(
        error instanceof Error ? error.message : 'Fehler beim Erstellen der Projektanfrage'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title" className="text-[#14ad9f] font-medium">
          Projekt Titel *
        </Label>
        <Input
          id="title"
          placeholder="z.B. Moderne Website für mein Restaurant"
          value={formData.title}
          onChange={e => handleInputChange('title', e.target.value)}
          className="mt-2 bg-white/95 backdrop-blur-sm border-white/20"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-[#14ad9f] font-medium">
          Projektbeschreibung *
        </Label>
        <Textarea
          id="description"
          placeholder="Beschreiben Sie Ihr Projekt im Detail. Was soll erreicht werden? Welche Anforderungen haben Sie?"
          value={formData.description}
          onChange={e => handleInputChange('description', e.target.value)}
          rows={6}
          className="mt-2 bg-white/95 backdrop-blur-sm border-white/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-[#14ad9f] font-medium">Kategorie *</Label>
          <Select onValueChange={value => handleInputChange('category', value)}>
            <SelectTrigger className="mt-2 bg-white/95 backdrop-blur-sm border-white/20">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.title} value={cat.title}>
                  {cat.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCategory && (
          <div>
            <Label className="text-[#14ad9f] font-medium">Unterkategorie</Label>
            <Select onValueChange={value => handleInputChange('subcategory', value)}>
              <SelectTrigger className="mt-2 bg-white/95 backdrop-blur-sm border-white/20">
                <SelectValue placeholder="Unterkategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {selectedCategory.subcategories.map(subcat => (
                  <SelectItem key={subcat} value={subcat}>
                    {subcat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2WithSubcategory = () => {
    return (
      <div className="space-y-6">
        {/* Budget Sektion */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Budget und Vergütung</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Budgettyp</label>
                <select
                  value={formData.budgetType}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      budgetType: e.target.value as 'fixed' | 'hourly' | 'negotiable',
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                >
                  <option value="fixed">Festpreis</option>
                  <option value="hourly">Stundenlohn</option>
                  <option value="negotiable">Verhandelbar</option>
                </select>
              </div>

              {formData.budgetType !== 'negotiable' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {formData.budgetType === 'fixed' ? 'Budget (€)' : 'Stundenlohn (€)'}
                  </label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={e =>
                      setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zeitplanung Sektion */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Zeitplanung</h3>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Terminplanung</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDatePlanning(!showDatePlanning)}
                  className="text-[#14ad9f] hover:text-[#129488]"
                >
                  {showDatePlanning ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showDatePlanning ? 'Weniger' : 'Termine hinzufügen'}
                </Button>
              </div>
            </CardHeader>
            {showDatePlanning && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Startdatum</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Enddatum</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bevorzugter Termin</label>
                    <input
                      type="date"
                      value={formData.preferredDate}
                      onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] min-h-[48px]"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Unterkategorie-spezifische Felder */}
        {formData.subcategory && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Service-spezifische Details</h3>
            <SubcategoryFormManager
              subcategory={formData.subcategory}
              data={formData.subcategoryData}
              onDataChange={handleSubcategoryDataChange}
              onValidationChange={handleSubcategoryValidationChange}
              hideSubmitButton={true}
            />
          </div>
        )}
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-8">
      {/* Budget Sektion */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-[#14ad9f] mb-2">Budget festlegen</h3>
          <p className="text-[#14ad9f]/90 text-sm mb-4">
            Wie möchten Sie für Ihr Projekt bezahlen? Dies hilft Anbietern, passende Angebote zu
            erstellen.
          </p>
        </div>

        <div>
          <Label className="text-[#14ad9f] font-medium">Abrechnungsart *</Label>
          <Select
            value={formData.budgetType}
            onValueChange={(value: 'fixed' | 'hourly' | 'negotiable') =>
              handleInputChange('budgetType', value)
            }
          >
            <SelectTrigger className="mt-2 bg-white/95 backdrop-blur-sm border-white/20">
              <SelectValue placeholder="Wählen Sie eine Abrechnungsart" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">
                <div className="flex flex-col">
                  <span className="font-medium">Festpreis</span>
                  <span className="text-xs text-gray-500">
                    Einmalzahlung für das komplette Projekt
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="hourly">
                <div className="flex flex-col">
                  <span className="font-medium">Stundenbasis</span>
                  <span className="text-xs text-gray-500">
                    Bezahlung nach tatsächlich geleisteten Stunden
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="negotiable">
                <div className="flex flex-col">
                  <span className="font-medium">Verhandelbar</span>
                  <span className="text-xs text-gray-500">
                    Budget wird mit Anbietern besprochen
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.budgetType === 'fixed' && (
          <div className="bg-white/10 p-4 rounded-lg">
            <Label className="text-[#14ad9f] font-medium">Ihr Festpreis-Budget (€) *</Label>
            <p className="text-[#14ad9f]/80 text-sm mt-1 mb-3">
              Geben Sie an, wie viel Sie für das gesamte Projekt ausgeben möchten.
            </p>
            <Input
              type="number"
              placeholder="z.B. 2500"
              value={formData.budgetAmount || ''}
              onChange={e =>
                handleInputChange('budgetAmount', parseFloat(e.target.value) || undefined)
              }
              className="mt-2 bg-white/95 backdrop-blur-sm border-white/20"
            />
          </div>
        )}

        {formData.budgetType === 'hourly' && (
          <div className="bg-white/10 p-4 rounded-lg space-y-4">
            <div>
              <Label className="text-[#14ad9f] font-medium">Maximaler Stundensatz (€) *</Label>
              <p className="text-[#14ad9f]/80 text-sm mt-1 mb-3">
                Wie viel möchten Sie maximal pro Stunde bezahlen?
              </p>
              <Input
                type="number"
                placeholder="z.B. 75"
                value={formData.budgetAmount || ''}
                onChange={e =>
                  handleInputChange('budgetAmount', parseFloat(e.target.value) || undefined)
                }
                className="mt-2 bg-white/95 backdrop-blur-sm border-white/20"
              />
            </div>

            <div>
              <Label className="text-[#14ad9f] font-medium">Geschätztes Gesamtbudget (€)</Label>
              <p className="text-[#14ad9f]/80 text-sm mt-1 mb-3">
                Optional: Schätzen Sie das Gesamtbudget für das Projekt (Stunden × Stundensatz)
              </p>
              <Input
                type="number"
                placeholder="z.B. 5000"
                value={formData.maxBudget || ''}
                onChange={e =>
                  handleInputChange('maxBudget', parseFloat(e.target.value) || undefined)
                }
                className="mt-2 bg-white/95 backdrop-blur-sm border-white/20"
              />
            </div>
          </div>
        )}

        {formData.budgetType === 'negotiable' && (
          <div className="bg-white/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-[#14ad9f]">
              <span className="text-lg font-bold">✓</span>
              <div>
                <p className="font-medium">Perfekt!</p>
                <p className="text-sm text-[#14ad9f]/80">
                  Sie werden mit den Anbietern über das Budget sprechen können.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zeitrahmen Sektion */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-[#14ad9f] mb-2">Zeitrahmen</h3>
          <p className="text-[#14ad9f]/90 text-sm mb-4">
            Wann soll Ihr Projekt abgeschlossen sein? Dies hilft bei der Planung.
          </p>
        </div>

        <div>
          <Label className="text-[#14ad9f] font-medium">Gewünschter Abschluss *</Label>
          <Select onValueChange={value => handleInputChange('timeline', value)}>
            <SelectTrigger className="mt-2 bg-white/95 backdrop-blur-sm border-white/20">
              <SelectValue placeholder="Wann soll das Projekt fertig sein?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asap">Sofort - So schnell wie möglich</SelectItem>
              <SelectItem value="1week">1 Woche - Innerhalb 1 Woche</SelectItem>
              <SelectItem value="2weeks">2 Wochen - Innerhalb 2 Wochen</SelectItem>
              <SelectItem value="1month">1 Monat - Innerhalb 1 Monat</SelectItem>
              <SelectItem value="3months">3 Monate - Innerhalb 3 Monate</SelectItem>
              <SelectItem value="6months">6 Monate - Innerhalb 6 Monate</SelectItem>
              <SelectItem value="flexible">Flexibel - Kein Zeitdruck</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[#14ad9f] font-medium">Projektumfang</Label>
            <p className="text-[#14ad9f]/80 text-sm mt-1 mb-3">Wie umfangreich ist Ihr Projekt?</p>
            <Select
              value={formData.projectSize}
              onValueChange={(value: 'small' | 'medium' | 'large') =>
                handleInputChange('projectSize', value)
              }
            >
              <SelectTrigger className="mt-2 bg-white/95 backdrop-blur-sm border-white/20">
                <SelectValue placeholder="Projektumfang wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Klein - Wenige Tage bis 1 Monat</SelectItem>
                <SelectItem value="medium">Mittel - 1 bis 3 Monate</SelectItem>
                <SelectItem value="large">Groß - Mehr als 3 Monate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#14ad9f] font-medium">Dringlichkeit</Label>
            <p className="text-[#14ad9f]/80 text-sm mt-1 mb-3">
              Wie dringend benötigen Sie das Projekt?
            </p>
            <Select
              value={formData.urgency}
              onValueChange={(value: 'low' | 'medium' | 'high') =>
                handleInputChange('urgency', value)
              }
            >
              <SelectTrigger className="mt-2 bg-white/95 backdrop-blur-sm border-white/20">
                <SelectValue placeholder="Dringlichkeit wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig - Kann warten</SelectItem>
                <SelectItem value="medium">Normal - Standard Bearbeitung</SelectItem>
                <SelectItem value="high">Hoch - Sehr dringend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Datum Sektion als Option Card */}
        <div className="space-y-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <h4 className="text-lg font-semibold text-[#14ad9f] mb-2">Terminplanung</h4>
            <p className="text-[#14ad9f]/90 text-sm mb-4">
              Möchten Sie spezielle Termine für Ihr Projekt festlegen?
            </p>
          </div>

          {/* Option Card */}
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              showDatePlanning
                ? 'border-[#14ad9f] bg-[#14ad9f]/10'
                : 'border-white/30 bg-white/5 hover:border-white/50'
            }`}
            onClick={() => setShowDatePlanning(!showDatePlanning)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    showDatePlanning ? 'border-[#14ad9f] bg-[#14ad9f]' : 'border-white/50'
                  }`}
                >
                  {showDatePlanning && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <h5 className="font-medium text-[#14ad9f]">Termine festlegen</h5>
                  <p className="text-sm text-[#14ad9f]/80">
                    Start-, End- und Wunschtermine definieren
                  </p>
                </div>
              </div>
              <div
                className={`transform transition-transform ${showDatePlanning ? 'rotate-180' : ''}`}
              >
                <svg
                  className="w-5 h-5 text-[#14ad9f]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Erweiterte Terminfelder - nur sichtbar wenn ausgewählt */}
          {showDatePlanning && (
            <div className="bg-white/10 p-4 rounded-lg space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="h-[4.5rem] flex flex-col justify-between">
                    <Label className="text-[#14ad9f] font-medium">Startdatum</Label>
                    <p className="text-[#14ad9f]/80 text-sm">
                      Wann soll das Projekt frühestens beginnen?
                    </p>
                  </div>
                  <Input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={e => handleInputChange('startDate', e.target.value)}
                    className="bg-white/95 backdrop-blur-sm border-white/20"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-3">
                  <div className="h-[4.5rem] flex flex-col justify-between">
                    <Label className="text-[#14ad9f] font-medium">Enddatum</Label>
                    <p className="text-[#14ad9f]/80 text-sm">
                      Bis wann soll das Projekt abgeschlossen sein?
                    </p>
                  </div>
                  <Input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={e => handleInputChange('endDate', e.target.value)}
                    className="bg-white/95 backdrop-blur-sm border-white/20"
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="h-[4.5rem] flex flex-col justify-between">
                  <Label className="text-[#14ad9f] font-medium">Bevorzugtes Datum (optional)</Label>
                  <p className="text-[#14ad9f]/80 text-sm">
                    Haben Sie einen speziellen Wunschtermin für die Durchführung?
                  </p>
                </div>
                <Input
                  type="date"
                  value={formData.preferredDate || ''}
                  onChange={e => handleInputChange('preferredDate', e.target.value)}
                  className="bg-white/95 backdrop-blur-sm border-white/20"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Switch
          checked={formData.isRemote}
          onCheckedChange={checked => handleInputChange('isRemote', checked)}
        />
        <Label className="text-[#14ad9f] font-medium">Remote-Arbeit möglich</Label>
      </div>

      {!formData.isRemote && (
        <div>
          <Label className="text-[#14ad9f] font-medium">Standort</Label>
          <Input
            placeholder="z.B. München, Deutschland"
            value={formData.location || ''}
            onChange={e => handleInputChange('location', e.target.value)}
            className="mt-2 bg-white/95 backdrop-blur-sm border-white/20"
          />
        </div>
      )}

      <div>
        <Label className="text-[#14ad9f] font-medium">Benötigte Fähigkeiten</Label>
        <div className="mt-2 space-y-3">
          <Input
            placeholder="Fähigkeit hinzufügen und Enter drücken"
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSkillAdd(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="bg-white/95 backdrop-blur-sm border-white/20"
          />

          {formData.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.requiredSkills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-[#14ad9f]/20 text-[#14ad9f] hover:bg-[#14ad9f]/30 cursor-pointer border border-[#14ad9f]/40"
                  onClick={() => handleSkillRemove(skill)}
                >
                  {skill} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-white font-medium">Anhänge (optional)</Label>
        <div className="mt-2">
          <input
            type="file"
            multiple
            onChange={e => handleFileUpload(e.target.files)}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          <Label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full h-24 border-2 border-dashed border-white/40 rounded-lg cursor-pointer hover:border-white/60 transition-colors"
          >
            <div className="text-center text-white/80">
              <Upload className="mx-auto mb-2 h-6 w-6" />
              <p className="text-sm">Dateien hochladen</p>
              <p className="text-xs">PDF, DOC, Bilder</p>
            </div>
          </Label>

          {formData.attachments.length > 0 && (
            <div className="mt-3 space-y-1">
              {formData.attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white/10 p-2 rounded"
                >
                  <span className="text-white text-sm">{file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newAttachments = formData.attachments.filter((_, i) => i !== index);
                      handleInputChange('attachments', newAttachments);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 -mt-16">
      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative z-10 pt-20 pb-12 px-4 lg:px-6">
        {/* Adjusted padding */}

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <PlusCircle className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">Eine Projektanfrage posten</h1>
              <p className="text-xl text-white/80">
                Finden Sie die perfekten Experten für Ihr Projekt
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-center space-x-4">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                          ${currentStep >= step ? 'bg-white text-[#14ad9f]' : 'bg-white/20 text-white/60'}`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 
                            ${currentStep > step ? 'bg-white' : 'bg-white/20'}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <p className="text-white/80">
                Schritt {currentStep} von 3: {currentStep === 1 && 'Projekt Details'}
                {currentStep === 2 && 'Budget & Zeitrahmen'}
                {currentStep === 3 && 'Anforderungen & Dateien'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/95 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep === 1 && <FileText className="h-5 w-5 text-[#14ad9f]" />}
                  {currentStep === 2 && <Euro className="h-5 w-5 text-[#14ad9f]" />}
                  {currentStep === 3 && <Target className="h-5 w-5 text-[#14ad9f]" />}

                  {currentStep === 1 && 'Projekt Details'}
                  {currentStep === 2 && 'Budget & Zeitrahmen'}
                  {currentStep === 3 && 'Anforderungen & Dateien'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2WithSubcategory()}
                {currentStep === 3 && renderStep3()}

                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  >
                    Zurück
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      onClick={nextStep}
                      disabled={currentStep === 2 && formData.subcategory && !subcategoryFormValid}
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      Weiter
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Erstelle Anfrage...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Projektanfrage posten
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Preview */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-white mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Qualifizierte Experten</h3>
                  <p className="text-sm text-white/80">
                    Erhalten Sie Angebote von verifizierten Fachkräften
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-white mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Schnelle Antworten</h3>
                  <p className="text-sm text-white/80">
                    Erste Angebote bereits innerhalb weniger Stunden
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-white mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Sichere Abwicklung</h3>
                  <p className="text-sm text-white/80">Geschützte Zahlungen und Bewertungssystem</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Lightbulb,
  Target,
  HelpCircle,
  Loader2,
  CheckCircle,
  Clock,
  Euro,
  ArrowRight,
} from 'lucide-react';
import { Gemini } from '@/components/logos';
import { toast } from 'sonner';
import DetailedProjectWizard from './DetailedProjectWizard';

interface ProjectAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface ProjectIdea {
  title: string;
  description: string;
  category: string;
  estimatedBudget: number;
  timeline: string;
  services: string[];
  priority: 'low' | 'medium' | 'high';
  recommendedProviders?: string[];
}

interface ProviderRecommendation {
  id: string;
  companyName?: string;
  name?: string;
  description?: string;
  services?: string[];
  categories?: string[];
  location?: any;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  priceRange: string;
  specialties: string[];
  distance: string;
  reviews: Array<{
    rating: number;
    comment: string;
    customerName?: string;
  }>;
  isVerified?: boolean;
  responseTime?: string;
  availability?: string;
  profilePictureURL?: string;
}

const ProjectAssistantModal: React.FC<ProjectAssistantModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<
    'ideas' | 'detailed' | 'consultation' | 'analysis' | 'providers'
  >('ideas');
  const [loading, setLoading] = useState(false);
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[]>([]);
  const [projectDescription, setProjectDescription] = useState('');
  const [consultationQuestion, setConsultationQuestion] = useState('');
  const [consultationResponse, setConsultationResponse] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectIdea | null>(null);
  const [providerRecommendations, setProviderRecommendations] = useState<ProviderRecommendation[]>(
    []
  );
  const [showDetailedWizard, setShowDetailedWizard] = useState(false);
  const [smartQuestions, setSmartQuestions] = useState<any[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState<Record<number, string[]>>({});
  const [selectedProviders, setSelectedProviders] = useState<
    Record<number, ProviderRecommendation[]>
  >({});
  const [showProviderSelection, setShowProviderSelection] = useState<number | null>(null);

  // Standardmäßig alle Services auswählen wenn neue Projektideen geladen werden
  useEffect(() => {
    if (projectIdeas.length > 0) {
      const initialSelections: Record<number, string[]> = {};
      projectIdeas.forEach((idea, index) => {
        if (!selectedServices[index]) {
          initialSelections[index] = [...idea.services]; // Alle Services standardmäßig auswählen
        }
      });

      if (Object.keys(initialSelections).length > 0) {
        setSelectedServices(prev => ({ ...prev, ...initialSelections }));
      }
    }
  }, [projectIdeas]);

  const generateSmartQuestions = async () => {
    if (!projectDescription.trim()) {
      toast.error('Bitte beschreibe zuerst, was du vorhast');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateSmartQuestions',
          data: {
            userInput: projectDescription.trim(),
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSmartQuestions(result.data.questions || []);
        setDetectedCategory(result.data.detectedCategory || '');
        setShowQuestions(true);
        toast.success(
          `${result.data.questions?.length || 0} Fragen generiert für bessere Projektplanung!`
        );
      } else {
        console.error('API Response:', result);
        throw new Error(result.error || 'Fehler beim Generieren der Fragen');
      }
    } catch (error) {
      console.error('Fehler beim Generieren der intelligenten Fragen:', error);
      toast.error('Fehler beim Generieren der Fragen');
    } finally {
      setLoading(false);
    }
  };

  const createDetailedProject = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createDetailedProject',
          data: {
            originalDescription: projectDescription,
            category: detectedCategory,
            answers: questionAnswers,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Erstelle das Projekt mit den detaillierten Informationen
        await createProject(result.data);
      } else {
        throw new Error(
          result.error || 'Fehler beim Erstellen der detaillierten Projektbeschreibung'
        );
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des detaillierten Projekts:', error);
      toast.error('Fehler beim Erstellen des Projekts');
    } finally {
      setLoading(false);
    }
  };

  // Funktion zum Togglen von Services für ein spezifisches Projekt
  const toggleService = (projectIndex: number, service: string) => {
    setSelectedServices(prev => {
      const currentServices = prev[projectIndex] || projectIdeas[projectIndex]?.services || [];
      const isSelected = currentServices.includes(service);

      if (isSelected) {
        // Service entfernen
        return {
          ...prev,
          [projectIndex]: currentServices.filter(s => s !== service),
        };
      } else {
        // Service hinzufügen
        return {
          ...prev,
          [projectIndex]: [...currentServices, service],
        };
      }
    });
  };

  // Hilfsfunktion um ausgewählte Services für ein Projekt zu bekommen
  const getSelectedServices = (projectIndex: number): string[] => {
    return selectedServices[projectIndex] || projectIdeas[projectIndex]?.services || [];
  };

  // Dienstleister für ein Projekt auswählen/abwählen
  const toggleProviderSelection = (projectIndex: number, provider: ProviderRecommendation) => {
    console.log('[ProjectAssistant] toggleProviderSelection called with:', {
      projectIndex,
      providerId: provider.id,
      providerName: provider.companyName || provider.name,
    });

    setSelectedProviders(prev => {
      const currentProviders = prev[projectIndex] || [];
      const isSelected = currentProviders.some(p => p.id === provider.id);

      console.log('[ProjectAssistant] Current selectedProviders state:', {
        currentProviders: currentProviders.map(p => ({ id: p.id, name: p.companyName || p.name })),
        isSelected,
        allSelectedProviders: Object.keys(prev).reduce((acc, key) => {
          acc[key] = prev[parseInt(key)].map(p => ({ id: p.id, name: p.companyName || p.name }));
          return acc;
        }, {} as any),
      });

      if (isSelected) {
        // Dienstleister entfernen
        const newState = {
          ...prev,
          [projectIndex]: currentProviders.filter(p => p.id !== provider.id),
        };
        console.log('[ProjectAssistant] Provider removed, new state:', {
          projectIndex,
          removedProvider: { id: provider.id, name: provider.companyName || provider.name },
          remainingProviders: newState[projectIndex].map(p => ({
            id: p.id,
            name: p.companyName || p.name,
          })),
        });
        return newState;
      } else {
        // Dienstleister hinzufügen
        const newState = {
          ...prev,
          [projectIndex]: [...currentProviders, provider],
        };
        console.log('[ProjectAssistant] Provider selection toggled successfully:', {
          projectIndex,
          addedProvider: { id: provider.id, name: provider.companyName || provider.name },
          allProviders: newState[projectIndex].map(p => ({
            id: p.id,
            name: p.companyName || p.name,
          })),
        });
        return newState;
      }
    });
  };

  // Ausgewählte Dienstleister für ein Projekt bekommen
  const getSelectedProviders = (projectIndex: number): ProviderRecommendation[] => {
    return selectedProviders[projectIndex] || [];
  };

  // Zurück zur Projektauswahl
  const goBackToProjects = () => {
    setShowProviderSelection(null);
    setSelectedProject(null);
    setProviderRecommendations([]);
  };

  // Neue Funktion: Erstelle alle Projekte mit ausgewählten Services
  const createAllSelectedProjects = async () => {
    setLoading(true);

    try {
      const projectsToCreate: Array<{
        idea: ProjectIdea;
        index: number;
        selectedServices: string[];
        selectedProviders?: ProviderRecommendation[];
      }> = [];

      // Sammle alle Projekte mit ausgewählten Services
      projectIdeas.forEach((idea, index) => {
        const services = getSelectedServices(index);
        const providers = selectedProviders[index] || [];

        console.log(`🔍 DEBUG Projekt ${index} (${idea.title}):`, {
          services: services.length,
          providers: providers.length,
          providerNames: providers.map(p => p.companyName || p.name),
        });

        if (services.length > 0) {
          projectsToCreate.push({
            idea,
            index,
            selectedServices: services,
            selectedProviders: providers,
          });
        }
      });

      if (projectsToCreate.length === 0) {
        toast.error('Bitte wähle mindestens einen Service aus');
        setLoading(false);
        return;
      }

      console.log('🚀 Erstelle mehrere Projekte:', projectsToCreate);

      // Erstelle Bundle-Daten für übergeordnete Organisation
      const bundleData = {
        title: `${projectDescription} - Projekt-Gruppe`,
        description: `Automatisch erstellte Projekt-Gruppe für: ${projectDescription}`,
        originalPrompt: projectDescription,
        projectCount: projectsToCreate.length,
        totalBudget: projectsToCreate.reduce((sum, p) => sum + (p.idea.estimatedBudget || 0), 0),
        category: projectsToCreate[0]?.idea.category || 'Allgemein',
      };

      let successCount = 0;
      let errorCount = 0;
      let createdBundleId: string | null = null;

      // Erstelle alle Projekte nacheinander
      for (const { idea, selectedServices, selectedProviders } of projectsToCreate) {
        try {
          const projectData = {
            title: idea.title,
            description: idea.description,
            category: idea.category,
            subcategory: idea.category, // Verwende category als subcategory fallback
            estimatedBudget: idea.estimatedBudget,
            timeline: idea.timeline,
            services: selectedServices, // Nur ausgewählte Services
            priority: idea.priority,
            originalPrompt: projectDescription,
            requirements: [], // ProjectIdea hat keine requirements
            location: '', // ProjectIdea hat keine location
            specialRequirements: '', // ProjectIdea hat keine specialRequirements
            deliverables: [], // ProjectIdea hat keine deliverables
          };

          console.log(`📤 Erstelle Projekt ${successCount + 1}:`, projectData);

          const response = await fetch('/api/ai-project-creation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              projectData,
              selectedProviders:
                selectedProviders?.map(p => ({
                  id: p.id,
                  companyName: p.companyName || p.name,
                  rating: p.rating,
                  priceRange: p.priceRange,
                })) || [],
              bundleData: successCount === 0 ? bundleData : null, // Nur beim ersten Projekt Bundle erstellen
              existingBundleId: createdBundleId, // Verwende Bundle-ID für nachfolgende Projekte
            }),
          });

          const result = await response.json();

          if (result.success) {
            successCount++;
            console.log(`✅ Projekt ${successCount} erfolgreich erstellt:`, result.project.title);

            // Speichere Bundle-ID vom ersten Projekt für nachfolgende Projekte
            if (successCount === 1 && result.bundleId) {
              createdBundleId = result.bundleId;
              console.log('📦 Bundle-ID gespeichert für nachfolgende Projekte:', createdBundleId);
            }
          } else {
            errorCount++;
            console.error(`❌ Fehler bei Projekt ${idea.title}:`, result.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Fehler bei Projekt ${idea.title}:`, error);
        }
      }

      // Erfolg/Fehler-Meldung
      if (successCount > 0) {
        if (errorCount === 0) {
          toast.success(
            `🎉 Alle ${successCount} Projekte erfolgreich erstellt! Dienstleister können sich jetzt bewerben.`
          );
        } else {
          toast.success(`✅ ${successCount} Projekte erstellt. ${errorCount} Fehler aufgetreten.`);
        }

        // Schließe Modal und lade Projekte neu
        onClose();

        // Weiterleitung zur Projektübersicht
        setTimeout(() => {
          window.location.href = `/dashboard/user/${userId}/projects`;
        }, 1000);
      } else {
        toast.error(`❌ Fehler beim Erstellen der Projekte. Versuche es erneut.`);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Projekte:', error);
      toast.error('Fehler beim Erstellen der Projekte');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (idea: ProjectIdea | any, projectIndex?: number) => {
    setLoading(true);
    try {
      // Verwende ausgewählte Services falls verfügbar
      const servicesToUse =
        projectIndex !== undefined ? getSelectedServices(projectIndex) : idea.services;

      // Verwende ausgewählte Provider falls verfügbar
      const providersToUse = projectIndex !== undefined ? getSelectedProviders(projectIndex) : [];

      console.log('🔍 Creating project with:', {
        title: idea.title,
        projectIndex,
        originalServices: idea.services,
        selectedServices: servicesToUse,
        allSelectedServices: selectedServices,
        selectedProviders: providersToUse,
        hasProviders: providersToUse.length > 0,
      });

      if (servicesToUse.length === 0) {
        toast.error('Bitte wähle mindestens einen Service aus');
        setLoading(false);
        return;
      }

      const projectData = {
        title: idea.title,
        description: idea.description,
        category: idea.category,
        estimatedBudget: idea.estimatedBudget,
        timeline: idea.timeline,
        services: servicesToUse, // Verwende ausgewählte Services
        priority: idea.priority,
        originalPrompt: projectDescription,
        requirements: [], // ProjectIdea hat keine requirements
        location: '', // ProjectIdea hat keine location
        specialRequirements: '', // ProjectIdea hat keine specialRequirements
        deliverables: [], // ProjectIdea hat keine deliverables
      };

      console.log('📤 Sending project data:', {
        projectData,
        selectedProviders: providersToUse,
        isDirectAssignment: providersToUse.length > 0,
      });

      const response = await fetch('/api/ai-project-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          projectData,
          selectedProviders: projectIndex !== undefined ? getSelectedProviders(projectIndex) : [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Projekt erfolgreich erstellt! Dienstleister können sich jetzt bewerben.');

        // Schließe Modal und lade Projekte neu
        onClose();

        // Weiterleitung zur Projektübersicht nach kurzer Verzögerung
        setTimeout(() => {
          window.location.href = `/dashboard/user/${userId}/projects`;
        }, 1000);
      } else {
        throw new Error(result.error || 'Fehler beim Erstellen des Projekts');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Projekts:', error);
      toast.error('Fehler beim Erstellen des Projekts');
    } finally {
      setLoading(false);
    }
  };

  const generateProjectIdeas = async () => {
    if (!projectDescription.trim()) {
      toast.error('Bitte beschreibe, was du vorhast');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateProjectIdeas',
          data: {
            userId,
            userInput: projectDescription.trim(),
          },
        }),
      });

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setProjectIdeas(result.data);
        toast.success('Projektideen erfolgreich generiert!');
      } else {
        console.error('API Response:', result);
        throw new Error(result.error || 'Ungültige Antwort von der KI');
      }
    } catch (error) {
      console.error('Fehler beim Generieren der Projektideen:', error);
      toast.error('Fehler beim Generieren der Projektideen');
    } finally {
      setLoading(false);
    }
  };

  const findProviders = async (project: ProjectIdea, projectIndex?: number) => {
    setSelectedProject(project);
    setLoading(true);

    console.log('🔍 DEBUG findProviders called:', {
      projectTitle: project.title,
      projectIndex,
      showProviderSelectionBefore: showProviderSelection,
    });

    // Wenn projectIndex gegeben ist, zeige Dienstleister-Auswahl für dieses spezifische Projekt
    if (projectIndex !== undefined) {
      setShowProviderSelection(projectIndex);
      console.log('✅ showProviderSelection gesetzt auf:', projectIndex);
    } else {
      console.log('❌ projectIndex ist undefined - showProviderSelection bleibt null!');
    }

    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'findProviders',
          data: {
            userId,
            title: project.title,
            description: project.description,
            category: project.category,
            services:
              projectIndex !== undefined ? getSelectedServices(projectIndex) : project.services,
          },
        }),
      });

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setProviderRecommendations(result.data);

        // Wechsle immer zum Providers Tab um die gefundenen Dienstleister anzuzeigen
        setActiveTab('providers');

        toast.success('Passende Dienstleister gefunden!');
      } else {
        console.error('API Response:', result);
        throw new Error('Ungültige Antwort von der KI');
      }
    } catch (error) {
      console.error('Fehler beim Finden der Dienstleister:', error);
      toast.error('Fehler beim Finden der Dienstleister');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultation = async () => {
    if (!consultationQuestion.trim()) {
      toast.error('Bitte gib eine Frage ein');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'projectConsultation',
          data: {
            question: consultationQuestion,
            userId,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConsultationResponse(result.data.text || JSON.stringify(result.data, null, 2));
        toast.success('Beratung erfolgreich erhalten!');
      } else {
        throw new Error('Ungültige Antwort von der KI');
      }
    } catch (error) {
      console.error('Fehler bei der Beratung:', error);
      toast.error('Fehler bei der Beratung');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-[90vw] !w-[90vw] max-h-[85vh] overflow-y-auto"
        style={{ maxWidth: '90vw', width: '90vw' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gemini className="h-6 w-6" />
            KI-Projekt Assistent
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === 'ideas'
                ? 'bg-[#14ad9f] text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Schnell-Ideen
            </div>
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === 'detailed'
                ? 'bg-[#14ad9f] text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Detailliertes Projekt
            </div>
          </button>
          <button
            onClick={() => setActiveTab('consultation')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === 'consultation'
                ? 'bg-[#14ad9f] text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Beratung
            </div>
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === 'providers'
                ? 'bg-[#14ad9f] text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Dienstleister
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'ideas' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">KI-generierte Projektideen</h3>
                <p className="text-gray-600 mb-4">
                  Beschreibe, was du vorhast, und lass dir von der KI personalisierte Projektideen
                  basierend auf den Taskilo-Services vorschlagen
                </p>
              </div>

              {/* Benutzereingabe */}
              <div className="space-y-3">
                <label
                  htmlFor="projectDescription"
                  className="block text-sm font-medium text-gray-700"
                >
                  Was hast du vor? Beschreibe dein Vorhaben:
                </label>
                <Textarea
                  id="projectDescription"
                  placeholder="z.B. Ich möchte mein Wohnzimmer renovieren, brauche Hilfe bei der Website-Erstellung für mein Startup, plane eine Firmenfeier, etc."
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full"
                />
                <Button
                  onClick={generateProjectIdeas}
                  disabled={loading || !projectDescription.trim()}
                  className="bg-[#14ad9f] hover:bg-[#0f8a7e] w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generiere Ideen...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Schnelle Projektideen
                    </>
                  )}
                </Button>
                <Button
                  onClick={generateSmartQuestions}
                  disabled={loading || !projectDescription.trim()}
                  variant="outline"
                  className="w-full border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generiere Fragen...
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Detaillierte Projekt-Analyse
                    </>
                  )}
                </Button>
              </div>

              {/* Intelligente Fragen Bereich */}
              {showQuestions && smartQuestions.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-[#14ad9f]" />
                    KI-Detailanalyse für: {detectedCategory}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Beantworte diese Fragen für eine präzise Projektausschreibung:
                  </p>

                  <div className="space-y-4">
                    {smartQuestions.map((question, index) => (
                      <div key={question.id} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {index + 1}. {question.question}
                          {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {question.type === 'date_range' ? (
                          <input
                            type="text"
                            placeholder={
                              question.placeholder || 'z.B. nächste Woche, bis Ende März'
                            }
                            value={questionAnswers[question.id] || ''}
                            onChange={e =>
                              setQuestionAnswers(prev => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                          />
                        ) : question.type === 'budget_range' ? (
                          <input
                            type="text"
                            placeholder={question.placeholder || 'z.B. 500-1000 Euro, verhandelbar'}
                            value={questionAnswers[question.id] || ''}
                            onChange={e =>
                              setQuestionAnswers(prev => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                          />
                        ) : (
                          <textarea
                            placeholder={
                              question.placeholder || 'Bitte geben Sie Ihre Antwort ein...'
                            }
                            value={questionAnswers[question.id] || ''}
                            onChange={e =>
                              setQuestionAnswers(prev => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                          />
                        )}
                      </div>
                    ))}

                    <Button
                      onClick={createDetailedProject}
                      disabled={loading || Object.keys(questionAnswers).length === 0}
                      className="bg-[#14ad9f] hover:bg-[#0f8a7e] w-full mt-4"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Erstelle detailliertes Projekt...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Detailliertes Projekt erstellen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Projekt-Ideen Liste */}
              {projectIdeas.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {projectIdeas.map((idea, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{idea.title}</CardTitle>
                          <Badge className={getPriorityColor(idea.priority)}>{idea.priority}</Badge>
                        </div>
                        <CardDescription>{idea.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4 text-gray-500" />
                              <span>{idea.category}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Euro className="h-4 w-4 text-green-500" />
                              <span>€{idea.estimatedBudget.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-blue-500" />
                              <span>{idea.timeline}</span>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Benötigte Services (wähle aus):
                            </p>
                            <div className="space-y-2">
                              {idea.services.map((service, serviceIndex) => {
                                const isSelected = getSelectedServices(index).includes(service);
                                return (
                                  <label
                                    key={serviceIndex}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleService(index, service)}
                                      className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
                                    />
                                    <span
                                      className={`text-xs px-2 py-1 rounded ${
                                        isSelected
                                          ? 'bg-[#14ad9f] text-white'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {service}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            {getSelectedServices(index).length > 0 && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-xs text-green-700">
                                  {getSelectedServices(index).length} Service(s) ausgewählt
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => findProviders(idea, index)}
                              className="w-full"
                            >
                              Dienstleister finden
                            </Button>
                            {/* Einzelne "Projekt erstellen" Buttons entfernt - nur noch zentraler Button */}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Zentraler Button für alle ausgewählten Projekte - Verbessertes Design */}
              {projectIdeas.length > 0 &&
                (() => {
                  const projectsWithSelectedServices = projectIdeas.filter(
                    (_, index) => getSelectedServices(index).length > 0
                  );

                  if (projectsWithSelectedServices.length > 0) {
                    return (
                      <div className="mt-8 p-6 bg-gradient-to-r from-[#14ad9f] to-[#0f8a7e] rounded-xl shadow-lg text-white">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-full">
                              <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold">
                                {projectsWithSelectedServices.length === 1
                                  ? 'Projekt bereit!'
                                  : `${projectsWithSelectedServices.length} Projekte bereit!`}
                              </h4>
                              <p className="text-sm opacity-90">
                                {projectsWithSelectedServices.length === 1
                                  ? 'Dein Projekt kann jetzt erstellt werden'
                                  : 'Alle deine Projekte können erstellt werden'}
                              </p>
                            </div>
                          </div>

                          {/* Projekt-Liste - Besseres Design */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                            {projectsWithSelectedServices.map((idea, i) => {
                              const projectIndex = projectIdeas.indexOf(idea);
                              const selectedServices = getSelectedServices(projectIndex);
                              const selectedProvidersForProject =
                                getSelectedProviders(projectIndex);
                              return (
                                <div
                                  key={i}
                                  className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-30"
                                >
                                  <div className="text-left">
                                    <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                      <Target className="h-4 w-4 text-[#14ad9f]" />
                                      {idea.title}
                                    </h5>
                                    <div className="flex items-center gap-2 text-xs mb-2">
                                      <Badge className="bg-[#14ad9f] text-white border-0">
                                        {idea.category}
                                      </Badge>
                                      <span className="text-gray-700 font-medium">
                                        €{idea.estimatedBudget}
                                      </span>
                                      <span className="text-gray-700">{idea.timeline}</span>
                                    </div>
                                    <div className="text-xs mb-2">
                                      <span className="text-gray-600">Services: </span>
                                      <span className="font-medium text-gray-800">
                                        {selectedServices.join(', ')}
                                      </span>
                                    </div>
                                    {/* Ausgewählte Dienstleister anzeigen */}
                                    {selectedProvidersForProject.length > 0 && (
                                      <div className="text-xs">
                                        <span className="text-gray-600">Dienstleister: </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {selectedProvidersForProject.map(
                                            (provider, providerIndex) => (
                                              <Badge
                                                key={providerIndex}
                                                variant="outline"
                                                className="text-xs bg-green-50 text-green-700 border-green-200"
                                              >
                                                ✓ {provider.companyName || provider.name}
                                              </Badge>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <Button
                            onClick={createAllSelectedProjects}
                            disabled={loading}
                            className="bg-white text-[#14ad9f] hover:bg-gray-100 font-bold py-4 px-8 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                                Erstelle{' '}
                                {projectsWithSelectedServices.length === 1
                                  ? 'Projekt'
                                  : `alle ${projectsWithSelectedServices.length} Projekte`}
                                ...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-6 w-6 mr-3" />
                                {projectsWithSelectedServices.length === 1
                                  ? 'Projekt jetzt erstellen'
                                  : `Alle ${projectsWithSelectedServices.length} Projekte erstellen`}
                                <ArrowRight className="h-6 w-6 ml-3" />
                              </>
                            )}
                          </Button>

                          <p className="text-xs opacity-75 mt-3">
                            Nach der Erstellung können Dienstleister Angebote abgeben
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
            </div>
          )}

          {activeTab === 'detailed' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Detailliertes Projekt erstellen</h3>
                <p className="text-gray-600 mb-4">
                  Beantworte spezifische Fragen um eine präzise Projektausschreibung zu erstellen
                </p>
              </div>

              <DetailedProjectWizard
                onProjectCreate={createProject}
                onBack={() => setActiveTab('ideas')}
                initialDescription={projectDescription}
              />
            </div>
          )}

          {activeTab === 'consultation' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">KI-Projektberatung</h3>
                <p className="text-gray-600 mb-4">
                  Stelle Fragen zu deinen Projekten und erhalte professionelle Beratung
                </p>
              </div>

              <div className="space-y-4">
                <Textarea
                  placeholder="Stelle deine Projektfrage hier... (z.B. 'Wie plane ich am besten eine Hausrenovierung?' oder 'Welche Services brauche ich für mein IT-Projekt?')"
                  value={consultationQuestion}
                  onChange={e => setConsultationQuestion(e.target.value)}
                  rows={4}
                />

                <Button
                  onClick={handleConsultation}
                  disabled={loading || !consultationQuestion.trim()}
                  className="bg-[#14ad9f] hover:bg-[#0f8a7e]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Beratung läuft...
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Beratung erhalten
                    </>
                  )}
                </Button>

                {consultationResponse && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        KI-Beratung
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm">{consultationResponse}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-4">
              {selectedProject ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-center flex-1">
                      <h3 className="text-lg font-semibold mb-2">Passende Dienstleister</h3>
                      <p className="text-gray-600">
                        Für das Projekt: <strong>{selectedProject.title}</strong>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveTab('ideas');
                        setSelectedProject(null);
                        setProviderRecommendations([]);
                      }}
                      className="ml-4"
                    >
                      ← Zurück zu Projekt-Ideen
                    </Button>
                  </div>

                  {/* Ausgewählte Dienstleister Anzeige */}
                  {Object.values(selectedProviders).some(providers => providers.length > 0) && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-green-800 mb-3">
                        Ausgewählte Dienstleister ({Object.values(selectedProviders).flat().length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.values(selectedProviders)
                          .flat()
                          .map(provider => (
                            <div
                              key={provider.id}
                              className="flex items-center justify-between bg-white border border-green-300 rounded-lg p-3"
                            >
                              <div className="flex items-center space-x-3">
                                {provider.profilePictureURL && (
                                  <img
                                    src={provider.profilePictureURL}
                                    alt={provider.companyName || provider.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {provider.companyName || provider.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Bewertung: {provider.rating}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {providerRecommendations.length > 0 ? (
                    <div className="grid gap-4">
                      {providerRecommendations.map((provider, index) => {
                        const companyName =
                          provider.companyName || provider.name || 'Unbekannte Firma';
                        const description = provider.description || 'Keine Beschreibung verfügbar';
                        const services = provider.services || [];

                        return (
                          <Card
                            key={provider.id || index}
                            className="hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  {/* Profilbild */}
                                  {provider.profilePictureURL && (
                                    <img
                                      src={provider.profilePictureURL}
                                      alt={companyName}
                                      className="w-12 h-12 rounded-full object-cover"
                                    />
                                  )}
                                  <div>
                                    <CardTitle className="text-lg">{companyName}</CardTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                      {/* Bewertungen immer anzeigen, auch bei 0 */}
                                      <Badge
                                        variant="secondary"
                                        className="bg-yellow-100 text-yellow-800"
                                      >
                                        ⭐{' '}
                                        {provider.rating > 0 ? provider.rating.toFixed(1) : '0.0'} (
                                        {provider.reviewCount} Bewertungen)
                                      </Badge>
                                      {provider.isVerified && (
                                        <Badge
                                          variant="secondary"
                                          className="bg-green-100 text-green-800"
                                        >
                                          ✓ Verifiziert
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Beschreibung ohne Umbrüche, maximal 150 Zeichen */}
                              <CardDescription className="mt-2 line-clamp-2">
                                {description.length > 150
                                  ? description.substring(0, 150) + '...'
                                  : description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <span>Entfernung: {provider.distance}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>{provider.completedJobs} abgeschlossene Projekte</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>{provider.priceRange}</span>
                                  </div>
                                  {provider.responseTime && (
                                    <div className="flex items-center gap-1">
                                      <span>Antwortzeit: {provider.responseTime}</span>
                                    </div>
                                  )}
                                </div>{' '}
                                {services.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                      Services:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {services
                                        .slice(0, 4)
                                        .map((service: string, serviceIndex: number) => (
                                          <Badge
                                            key={serviceIndex}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {service}
                                          </Badge>
                                        ))}
                                      {services.length > 4 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{services.length - 4} weitere
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {provider.reviews.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                      Letzte Bewertung:
                                    </p>
                                    <div className="bg-gray-50 p-2 rounded text-xs">
                                      <div className="flex items-center gap-1 mb-1">
                                        <span>⭐ {provider.reviews[0].rating}/5</span>
                                        {provider.reviews[0].customerName && (
                                          <span className="text-gray-500">
                                            - {provider.reviews[0].customerName}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-gray-600">
                                        {provider.reviews[0].comment?.substring(0, 100)}
                                        {provider.reviews[0].comment?.length > 100 && '...'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                      // Öffne Anbieter-Profil in neuem Tab mit korrektem Pfad
                                      window.open(`/profile/${provider.id}`, '_blank');
                                    }}
                                  >
                                    Profil ansehen
                                  </Button>
                                  <Button
                                    size="sm"
                                    className={`flex-1 ${
                                      selectedProviders[showProviderSelection || 0]?.some(
                                        p => p.id === provider.id
                                      )
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-[#14ad9f] hover:bg-[#129488] text-white'
                                    }`}
                                    onClick={() => {
                                      console.log('🔍 DEBUG Button-Click:', {
                                        showProviderSelection,
                                        providerId: provider.id,
                                        providerName: provider.companyName || provider.name,
                                      });

                                      if (showProviderSelection !== null) {
                                        toggleProviderSelection(showProviderSelection, provider);
                                      } else {
                                        console.log(
                                          '❌ showProviderSelection ist null - Button funktioniert nicht!'
                                        );
                                      }
                                    }}
                                  >
                                    {selectedProviders[showProviderSelection || 0]?.some(
                                      p => p.id === provider.id
                                    )
                                      ? 'Ausgewählt ✓'
                                      : 'Auswählen'}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Suche nach passenden Dienstleistern...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Dienstleister finden</h3>
                  <p className="text-gray-600 mb-4">
                    Wähle zuerst eine Projektidee aus, um passende Dienstleister zu finden
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Target className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-blue-700">
                      Gehe zum Tab &quot;Projektideen&quot; und klicke auf &quot;Dienstleister
                      finden&quot;
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectAssistantModal;

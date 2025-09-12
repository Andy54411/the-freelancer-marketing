'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, CheckCircle, ArrowRight, Circle } from 'lucide-react';
import { Gemini } from '@/components/logos';
import { toast } from 'sonner';

interface ProjectAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ProviderLocation {
  city?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

interface Provider {
  id: string;
  companyName: string;
  name: string;
  description?: string;
  location?: ProviderLocation;
  rating?: number;
  completedProjects?: number;
  completedJobs?: number;
  services?: string[];
  priceRange?: string;
  profilePictureURL?: string;
  reviewCount?: number;
  isVerified?: boolean;
  createdAt?: string;
  accountAge?: number; // in Monaten
}

interface SmartQuestion {
  id: string;
  question: string;
  type: 'text' | 'location' | 'date_range' | 'budget_range';
  required: boolean;
  placeholder?: string;
  category: string;
}

const ProjectAssistantModal: React.FC<ProjectAssistantModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [step, setStep] = useState<'chat' | 'recommendations' | 'creating'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [detectedCategory, setDetectedCategory] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [recommendedProviders, setRecommendedProviders] = useState<Provider[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initialisiere Chat mit Begrüßung
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bot',
        content:
          'Hallo! Ich helfe Ihnen dabei, Ihr Projekt zu erstellen. Beschreiben Sie mir bitte, was Sie vorhaben.',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const addMessage = (content: string, type: 'user' | 'bot') => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const generateQuestions = async (description: string) => {
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateSmartQuestions',
          data: {
            userInput: description,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const questions = result.data.questions || [];

        setSmartQuestions(questions);
        setDetectedCategory(result.data.detectedCategory || '');

        // Starte mit der ersten Frage
        if (questions.length > 0) {
          setCurrentQuestionIndex(0);
          addMessage(questions[0].question, 'bot');
        }

        return true;
      } else {
        throw new Error(result.error || 'Fehler beim Generieren der Fragen');
      }
    } catch (error) {
      console.error('❌ Error generating questions:', error);
      addMessage(
        'Entschuldigung, es gab einen Fehler beim Analysieren Ihres Projekts. Können Sie es noch einmal versuchen?',
        'bot'
      );
      return false;
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < smartQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      addMessage(smartQuestions[nextIndex].question, 'bot');
    } else {
      // Alle Fragen beantwortet - zeige Firmenempfehlungen
      addMessage(
        'Perfekt! Lassen Sie mich passende Dienstleister für Ihr Projekt finden...',
        'bot'
      );
      findRecommendedProviders();
    }
  };

  const findRecommendedProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'findProviders',
          data: {
            category: detectedCategory,
            location: questionAnswers['location'] || '',
            answers: questionAnswers,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Debug: Log first provider's profile picture
        if (result.data[0]) {
        }
        setRecommendedProviders(result.data);
        setStep('recommendations');

        if (result.data.length > 0) {
          addMessage(
            `Ich habe ${result.data.length} passende Dienstleister für Ihr ${detectedCategory}-Projekt gefunden. Sie können optional welche auswählen oder direkt mit der Projekt-Erstellung fortfahren.`,
            'bot'
          );
        } else {
          addMessage(
            'Leider habe ich keine spezifischen Dienstleister in Ihrer Nähe gefunden, aber Ihr Projekt wird trotzdem öffentlich ausgeschrieben.',
            'bot'
          );
          setStep('recommendations'); // Zeige trotzdem den Bereich mit "Projekt erstellen" Button
        }
      } else {
        addMessage(
          'Ich konnte keine spezifischen Empfehlungen finden, aber wir können trotzdem Ihr Projekt erstellen.',
          'bot'
        );
        setStep('recommendations');
      }
    } catch (error) {
      console.error('❌ Error finding providers:', error);
      addMessage(
        'Es gab einen Fehler beim Suchen nach Dienstleistern, aber wir können trotzdem Ihr Projekt erstellen.',
        'bot'
      );
      setStep('recommendations');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    setStep('creating');

    try {
      // Erstelle detaillierte Projektbeschreibung
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
        // Erstelle das Projekt in der Datenbank
        const projectCreationResponse = await fetch('/api/ai-project-creation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            projectData: {
              title: result.data.title,
              description: result.data.description,
              category: result.data.category,
              subcategory: result.data.subcategory || result.data.category,
              estimatedBudget: result.data.estimatedBudget || 0,
              timeline: result.data.timeline || questionAnswers['timing'] || 'Flexibel',
              services: result.data.services || [],
              priority: result.data.priority || 'medium',
              originalPrompt: projectDescription,
              location: questionAnswers['location'] || '',
              requirements: result.data.requirements || [],
              specialRequirements: result.data.specialRequirements || '',
              deliverables: result.data.deliverables || [],
              recommendedProviders: selectedProviders, // Ausgewählte Provider hinzufügen
            },
          }),
        });

        const projectResult = await projectCreationResponse.json();

        if (projectResult.success) {
          addMessage(
            '🎉 Perfekt! Ihr Projekt wurde erfolgreich erstellt und ist jetzt für Dienstleister sichtbar.',
            'bot'
          );
          toast.success('Projekt erfolgreich erstellt!');

          // Warte kurz und schließe dann das Modal
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 2000);
        } else {
          throw new Error('Fehler beim Erstellen des Projekts');
        }
      } else {
        throw new Error(result.error || 'Fehler beim Erstellen der Projektbeschreibung');
      }
    } catch (error) {
      console.error('❌ Error creating project:', error);
      addMessage(
        'Es gab einen Fehler beim Erstellen Ihres Projekts. Bitte versuchen Sie es noch einmal.',
        'bot'
      );
      setStep('chat');
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || loading) return;

    const userMessage = currentInput.trim();
    addMessage(userMessage, 'user');
    setCurrentInput('');
    setLoading(true);

    try {
      if (currentQuestionIndex === -1) {
        // Erste Nachricht - Projektbeschreibung
        setProjectDescription(userMessage);
        addMessage(
          'Verstanden! Lassen Sie mich einige spezifische Fragen stellen, um Ihr Projekt optimal zu gestalten.',
          'bot'
        );

        // Generiere Fragen
        await generateQuestions(userMessage);
      } else {
        // Beantworte aktuelle Frage
        const currentQuestion = smartQuestions[currentQuestionIndex];
        setQuestionAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: userMessage,
        }));

        // Nächste Frage oder Projekt erstellen
        handleNextQuestion();
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      addMessage('Es gab einen Fehler. Bitte versuchen Sie es noch einmal.', 'bot');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetModal = () => {
    setStep('chat');
    setMessages([]);
    setCurrentInput('');
    setSmartQuestions([]);
    setCurrentQuestionIndex(-1);
    setQuestionAnswers({});
    setDetectedCategory('');
    setProjectDescription('');
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        resetModal();
        onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gemini className="h-6 w-6" />
            KI-Projekt Assistent von Taskilo
          </DialogTitle>
          <DialogDescription>
            Chatten Sie mit der KI, um Ihr perfektes Projekt zu erstellen
          </DialogDescription>
        </DialogHeader>

        {step === 'chat' ? (
          <div className="flex flex-col h-[600px]">
            {/* Chat-Bereich */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg mb-4">
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-[#14ad9f] text-white ml-4'
                          : 'bg-white border shadow-sm mr-4'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'bot' && (
                          <Bot className="h-5 w-5 mt-0.5 text-[#14ad9f] flex-shrink-0" />
                        )}
                        {message.type === 'user' && (
                          <User className="h-5 w-5 mt-0.5 text-white flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm rounded-lg p-3 mr-4">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-[#14ad9f]" />
                        <Loader2 className="h-4 w-4 animate-spin text-[#14ad9f]" />
                        <span className="text-sm text-gray-600">KI denkt nach...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input-Bereich */}
            <div className="flex gap-2">
              <Textarea
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ihre Antwort..."
                className="flex-1 resize-none"
                rows={2}
                disabled={loading}
              />

              <Button
                onClick={handleSendMessage}
                disabled={loading || !currentInput.trim()}
                className="bg-[#14ad9f] hover:bg-[#0f8a7e] px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : step === 'recommendations' ? (
          // Anbieter-Empfehlungen
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#14ad9f]" />
                <h3 className="text-lg font-semibold">Passende Anbieter gefunden</h3>
              </div>
              <p className="text-gray-600">
                Basierend auf Ihren Anforderungen haben wir diese Anbieter für Sie ausgewählt:
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedProviders.length > 0 ? (
                <>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {recommendedProviders.map(provider => (
                      <div
                        key={provider.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedProviders.includes(provider.id)
                            ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                            : 'border-gray-200 hover:border-[#14ad9f]/50'
                        }`}
                        onClick={() => {
                          setSelectedProviders(prev => {
                            const newSelection = prev.includes(provider.id)
                              ? prev.filter(id => id !== provider.id)
                              : [...prev, provider.id];
                            return newSelection;
                          });
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Profilbild */}
                          <div className="flex-shrink-0">
                            {provider.profilePictureURL &&
                            provider.profilePictureURL !== 'null' &&
                            provider.profilePictureURL !== '' ? (
                              <img
                                src={provider.profilePictureURL}
                                alt={provider.companyName}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={e => {
                                  // Hide broken image and show fallback
                                  const fallback = e.currentTarget
                                    .nextElementSibling as HTMLElement;
                                  e.currentTarget.style.display = 'none';
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-12 h-12 rounded-full bg-[#14ad9f] flex items-center justify-center text-white font-semibold ${
                                provider.profilePictureURL &&
                                provider.profilePictureURL !== 'null' &&
                                provider.profilePictureURL !== ''
                                  ? 'hidden'
                                  : 'flex'
                              }`}
                            >
                              {provider.companyName?.charAt(0) || 'U'}
                            </div>
                          </div>

                          {/* Provider-Informationen */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {provider.companyName}
                                </h4>
                                {provider.isVerified && (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Verifiziert
                                  </div>
                                )}
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                {selectedProviders.includes(provider.id) ? (
                                  <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Bewertung und Status */}
                            <div className="flex items-center gap-3 mt-1">
                              {provider.rating && provider.rating > 0 ? (
                                <div className="flex items-center gap-1">
                                  <div className="flex items-center gap-1 text-yellow-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-900">
                                      {provider.rating.toFixed(1)}
                                    </span>
                                  </div>
                                  {provider.reviewCount && provider.reviewCount > 0 && (
                                    <span className="text-xs text-gray-500">
                                      ({provider.reviewCount} Bewertungen)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  Noch keine Bewertungen
                                </div>
                              )}

                              {/* Status Badge */}
                              {provider.completedJobs && provider.completedJobs >= 5 ? (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {provider.completedJobs} Projekte erfolgreich
                                </div>
                              ) : provider.completedJobs && provider.completedJobs > 0 ? (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {provider.completedJobs} Projekt
                                  {provider.completedJobs > 1 ? 'e' : ''}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 2C5.058 2 1 6.058 1 11s4.058 9 9 9 9-4.058 9-9-4.058-9-9-9zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Neues Unternehmen
                                </div>
                              )}
                            </div>

                            {/* Standort */}
                            {provider.location &&
                              (provider.location.city || provider.location.postalCode) && (
                                <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span>
                                    {provider.location.city} {provider.location.postalCode}
                                  </span>
                                </div>
                              )}

                            {/* Beschreibung */}
                            {provider.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {provider.description}
                              </p>
                            )}

                            {/* Preis */}
                            {provider.priceRange && (
                              <div className="mt-2">
                                <span className="text-sm font-medium text-[#14ad9f]">
                                  {provider.priceRange}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProviders([]);
                        setStep('creating');
                        createProject();
                      }}
                      className="flex-1"
                    >
                      Ohne Auswahl fortfahren
                    </Button>
                    <Button
                      onClick={() => {
                        setStep('creating');
                        createProject();
                      }}
                      className="flex-1 bg-[#14ad9f] hover:bg-[#0f8a7e] text-white"
                    >
                      Mit {selectedProviders.length} Anbieter
                      {selectedProviders.length !== 1 ? 'n' : ''} fortfahren
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Keine passenden Anbieter gefunden.</p>
                  <Button
                    onClick={() => {
                      setStep('creating');
                      createProject();
                    }}
                    className="mt-4 bg-[#14ad9f] hover:bg-[#0f8a7e] text-white"
                  >
                    Trotzdem Projekt erstellen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Projekt wird erstellt
          <Card>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#14ad9f]" />
                <h3 className="text-lg font-semibold">Projekt wird erstellt...</h3>
                <p className="text-gray-600">
                  Die KI erstellt basierend auf Ihren Antworten eine detaillierte
                  Projektausschreibung
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectAssistantModal;

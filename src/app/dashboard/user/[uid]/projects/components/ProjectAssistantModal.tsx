'use client';

import React, { useState } from 'react';
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
}

const ProjectAssistantModal: React.FC<ProjectAssistantModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'ideas' | 'consultation' | 'analysis'>('ideas');
  const [loading, setLoading] = useState(false);
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[]>([]);
  const [consultationQuestion, setConsultationQuestion] = useState('');
  const [consultationResponse, setConsultationResponse] = useState('');

  const generateProjectIdeas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/project-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateProjectIdeas',
          data: { userId },
        }),
      });

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setProjectIdeas(result.data);
        toast.success('Projektideen erfolgreich generiert!');
      } else {
        throw new Error('Ungültige Antwort von der KI');
      }
    } catch (error) {
      console.error('Fehler beim Generieren der Projektideen:', error);
      toast.error('Fehler beim Generieren der Projektideen');
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
              Projektideen
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
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === 'analysis'
                ? 'bg-[#14ad9f] text-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Analyse
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
                  Lass dir von der KI innovative Projektideen basierend auf den Tasko-Services
                  vorschlagen
                </p>
                <Button
                  onClick={generateProjectIdeas}
                  disabled={loading}
                  className="bg-[#14ad9f] hover:bg-[#0f8a7e]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generiere Ideen...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Projektideen generieren
                    </>
                  )}
                </Button>
              </div>

              {/* Projekt-Ideen Liste */}
              {projectIdeas.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              Benötigte Services:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {idea.services.map((service, serviceIndex) => (
                                <Badge key={serviceIndex} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              toast.success('Projekt-Template wird vorbereitet...');
                              // TODO: Implementiere Projekt-Erstellung
                            }}
                          >
                            Projekt erstellen
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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

          {activeTab === 'analysis' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Projektanalyse</h3>
                <p className="text-gray-600 mb-4">
                  Diese Funktion wird verfügbar, sobald du Projekte erstellt hast
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Target className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-700">
                    Erstelle zuerst ein Projekt, um die KI-Analyse-Features zu nutzen
                  </p>
                </div>
              </div>
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

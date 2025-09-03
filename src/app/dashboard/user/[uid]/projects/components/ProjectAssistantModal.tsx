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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
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
  const [step, setStep] = useState<'chat' | 'creating'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [detectedCategory, setDetectedCategory] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
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
        id: 'welcome',
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
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const generateQuestions = async (description: string) => {
    try {
      console.log('🚀 Generating questions for:', description);

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
      console.log('📊 API Response:', result);

      if (result.success && result.data) {
        const questions = result.data.questions || [];
        console.log('✅ Setting questions:', questions);

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
      // Alle Fragen beantwortet - erstelle Projekt
      addMessage(
        'Vielen Dank! Ich erstelle jetzt Ihr Projekt basierend auf Ihren Antworten...',
        'bot'
      );
      createProject();
    }
  };

  const createProject = async () => {
    setStep('creating');

    try {
      console.log('🚀 Creating detailed project with answers:', questionAnswers);

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
      console.log('📊 Detailed project result:', result);

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
            },
          }),
        });

        const projectResult = await projectCreationResponse.json();
        console.log('📊 Project creation result:', projectResult);

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
            KI-Projekt Assistent
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

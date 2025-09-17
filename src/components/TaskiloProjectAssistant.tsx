// KI-Projekt-Assistent für Taskilo
// Erweitert den bestehenden Support-Assistenten für Auftragserstellung und Projektbegleitung

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  MapPin,
  Euro,
  Star,
  Lightbulb,
  ArrowRight,
  User,
  Briefcase,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { validateSensitiveData, getSensitiveDataWarning } from '@/lib/sensitiveDataValidator';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    step?: ProjectStep;
    suggestions?: string[];
    actionRequired?: boolean;
    orderData?: Partial<OrderData>;
  };
}

interface OrderData {
  category: string;
  subcategory: string;
  description: string;
  location: {
    address: string;
    city: string;
    postalCode: string;
  };
  timeline: {
    startDate: string;
    endDate?: string;
    flexibility: 'rigid' | 'flexible' | 'very-flexible';
  };
  budget: {
    min: number;
    max: number;
    currency: 'EUR';
  };
  requirements: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

type ProjectStep =
  | 'welcome'
  | 'category-selection'
  | 'description'
  | 'location'
  | 'timeline'
  | 'budget'
  | 'requirements'
  | 'review'
  | 'provider-matching'
  | 'project-monitoring'
  | 'completion';

interface TaskiloProjectAssistantProps {
  userId: string;
  onOrderCreate?: (orderData: OrderData) => void;
  existingOrderId?: string;
}

export default function TaskiloProjectAssistant({
  userId,
  onOrderCreate,
  existingOrderId,
}: TaskiloProjectAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProjectStep>('welcome');
  const [orderData, setOrderData] = useState<Partial<OrderData>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [validationError, setValidationError] = useState<string>(''); // Für Validierungsfehler
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialisierung des Assistenten
  useEffect(() => {
    if (existingOrderId) {
      // Lade bestehenden Auftrag und starte Projektbegleitung
      initializeExistingProject();
    } else {
      // Starte neuen Auftragserstellungsprozess
      initializeNewProject();
    }
  }, [existingOrderId]);

  const initializeNewProject = () => {
    const welcomeMessage: Message = {
      id: generateId(),
      type: 'assistant',
      content: `👋 Hallo! Ich bin Ihr Taskilo KI-Assistent und helfe Ihnen dabei, den perfekten Auftrag zu erstellen und Ihr Projekt erfolgreich umzusetzen.

Ich begleite Sie durch jeden Schritt:
🎯 Auftragserstellung und Anforderungen definieren
🔍 Passende Dienstleister finden
📋 Projektplanung und Timeline
💬 Kommunikation koordinieren
✅ Projektfortschritt überwachen

Lassen Sie uns anfangen! Was für ein Projekt haben Sie im Sinn?`,
      timestamp: new Date(),
      metadata: {
        step: 'welcome',
        suggestions: [
          'Handwerker für Renovierung',
          'Reinigungsservice',
          'IT-Support',
          'Gartenpflege',
          'Umzugshilfe',
        ],
      },
    };
    setMessages([welcomeMessage]);
  };

  const initializeExistingProject = () => {
    const projectMessage: Message = {
      id: generateId(),
      type: 'assistant',
      content: `🚀 Willkommen zurück! Ich überwache Ihr laufendes Projekt und stehe für alle Fragen zur Verfügung.

📊 **Projekt-Status:**
• Auftrag bestätigt ✅
• Dienstleister zugewiesen ✅
• Nächster Termin: Morgen um 10:00 📅

Wie kann ich Ihnen heute helfen?`,
      timestamp: new Date(),
      metadata: {
        step: 'project-monitoring',
        suggestions: [
          'Projekt-Status prüfen',
          'Termin verschieben',
          'Zusätzliche Anforderungen',
          'Mit Dienstleister chatten',
          'Rechnung anfordern',
        ],
      },
    };
    setMessages([projectMessage]);
    setCurrentStep('project-monitoring');
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Finale Validierung vor dem Senden
    const validation = validateSensitiveData(inputValue.trim());
    if (!validation.isValid) {
      toast.error(getSensitiveDataWarning(validation.blockedType!), {
        duration: 5000,
        action: {
          label: 'Verstanden',
          onClick: () => {},
        },
      });
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setValidationError(''); // Validierungsfehler zurücksetzen
    setIsLoading(true);

    // Simuliere KI-Verarbeitung
    setTimeout(() => {
      const response = generateAIResponse(inputValue, currentStep);
      setMessages(prev => [...prev, response]);
      setIsLoading(false);

      // Update step if needed
      if (response.metadata?.step) {
        setCurrentStep(response.metadata.step);
      }
    }, 1500);
  };

  // Validiere Eingabe bei jeder Änderung
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Lösche vorherige Validierungsfehler wenn Eingabe leer ist
    if (!value.trim()) {
      setValidationError('');
      return;
    }

    // Validiere auf sensible Daten
    const validation = validateSensitiveData(value);
    if (!validation.isValid) {
      setValidationError(getSensitiveDataWarning(validation.blockedType!));
    } else {
      setValidationError('');
    }
  };

  const generateAIResponse = (userInput: string, step: ProjectStep): Message => {
    const responses: Record<ProjectStep, () => Message> = {
      welcome: () => ({
        id: generateId(),
        type: 'assistant',
        content: `Perfekt! "${userInput}" ist eine großartige Wahl.

🎯 **Nächste Schritte:**
1. Kategorie spezifizieren
2. Detaillierte Beschreibung
3. Standort festlegen
4. Zeitrahmen planen
5. Budget definieren

Können Sie mir mehr Details zu Ihrem ${userInput.toLowerCase()}-Projekt geben? Was genau soll gemacht werden?`,
        timestamp: new Date(),
        metadata: {
          step: 'description',
          actionRequired: true,
        },
      }),

      'category-selection': () => ({
        id: generateId(),
        type: 'assistant',
        content: `Ausgezeichnete Wahl! Lassen Sie mich Ihnen bei der optimalen Umsetzung helfen.`,
        timestamp: new Date(),
        metadata: { step: 'description' },
      }),

      description: () => ({
        id: generateId(),
        type: 'assistant',
        content: `Danke für die Details! Das hört sich nach einem spannenden Projekt an.

📍 **Wo soll das Projekt stattfinden?**
Bitte geben Sie Ihre Adresse oder PLZ ein, damit ich passende Dienstleister in Ihrer Nähe finden kann.

💡 *Tipp: Je genauer die Ortsangabe, desto besser kann ich lokale Experten für Sie finden.*`,
        timestamp: new Date(),
        metadata: {
          step: 'location',
          suggestions: ['München', 'Berlin', 'Hamburg', 'Köln'],
        },
      }),

      location: () => ({
        id: generateId(),
        type: 'assistant',
        content: `Perfect! Ich habe bereits 12 qualifizierte Dienstleister in Ihrer Nähe gefunden.

⏰ **Wann soll das Projekt starten?**
- Sofort / Diese Woche
- Nächste Woche
- Flexibel innerhalb des nächsten Monats
- Konkretes Datum

📅 Gibt es bestimmte Tage oder Uhrzeiten, die besonders gut passen?`,
        timestamp: new Date(),
        metadata: {
          step: 'timeline',
          suggestions: ['Diese Woche', 'Nächste Woche', 'Flexibel', 'Bestimmtes Datum'],
        },
      }),

      timeline: () => ({
        id: generateId(),
        type: 'assistant',
        content: `Zeitplanung notiert!

💰 **Budget-Rahmen festlegen:**
Basierend auf ähnlichen Projekten in Ihrer Region liegen die Kosten typischerweise zwischen **150€ - 800€**.

Welcher Budgetrahmen schwebt Ihnen vor?

💡 *Tipp: Ein realistisches Budget hilft mir, die besten Angebote für Sie zu finden.*`,
        timestamp: new Date(),
        metadata: {
          step: 'budget',
          suggestions: ['150-300€', '300-500€', '500-800€', 'Über 800€'],
        },
      }),

      budget: () => ({
        id: generateId(),
        type: 'assistant',
        content: `Perfekt! Ihr Budget ist realistisch für ein hochwertiges Ergebnis.

✅ **Zusammenfassung Ihres Auftrags:**
🏷️ Kategorie: ${orderData.category || 'Handwerk'}
📝 Beschreibung: ${userInput}
📍 Ort: ${orderData.location?.city || 'Ihre Stadt'}
📅 Zeitrahmen: ${orderData.timeline?.startDate || 'Flexibel'}
💰 Budget: ${orderData.budget?.min || 150}€ - ${orderData.budget?.max || 500}€

Soll ich jetzt passende Dienstleister für Sie suchen? Ich kann Ihnen die 3 besten Optionen vorschlagen!`,
        timestamp: new Date(),
        metadata: {
          step: 'provider-matching',
          actionRequired: true,
          suggestions: ['Ja, Dienstleister suchen', 'Noch etwas ändern'],
        },
      }),

      requirements: () => ({
        id: generateId(),
        type: 'assistant',
        content: `Zusätzliche Anforderungen notiert!`,
        timestamp: new Date(),
        metadata: { step: 'review' },
      }),

      review: () => ({
        id: generateId(),
        type: 'assistant',
        content: `🎉 **Auftrag erfolgreich erstellt!**

Ich habe 3 perfekte Dienstleister für Sie gefunden:

⭐ **Max Müller Handwerk** (4.9/5) - 280€
• 15 Jahre Erfahrung • Verfügbar diese Woche

⭐ **ProFix Solutions** (4.8/5) - 320€
• Spezialist für Ihr Projekt • Verfügbar nächste Woche

⭐ **Heimwerker-Profis** (4.7/5) - 250€
• Lokaler Betrieb • Sofort verfügbar

Welchen Dienstleister möchten Sie kontaktieren?`,
        timestamp: new Date(),
        metadata: {
          step: 'provider-matching',
          suggestions: [
            'Max Müller wählen',
            'ProFix wählen',
            'Heimwerker-Profis wählen',
            'Alle Details vergleichen',
          ],
        },
      }),

      'provider-matching': () => ({
        id: generateId(),
        type: 'assistant',
        content: `✅ **Auftrag bestätigt!**

Ihr Projekt läuft jetzt. Hier ist Ihr persönlicher Projekt-Hub:

📋 **Nächste Schritte:**
• Dienstleister kontaktiert Sie in 2h
• Termin-Koordination läuft
• Ich überwache den Fortschritt

💬 **Bleiben Sie im Loop:**
Ich halte Sie über alle Entwicklungen auf dem Laufenden und unterstütze bei Fragen!`,
        timestamp: new Date(),
        metadata: {
          step: 'project-monitoring',
          suggestions: ['Projekt-Status zeigen', 'Dienstleister chatten', 'Termin ändern'],
        },
      }),

      'project-monitoring': () => ({
        id: generateId(),
        type: 'assistant',
        content: `📊 **Aktueller Projekt-Status:**

🟢 **Alles läuft planmäßig!**
• Nächster Termin: Morgen 10:00
• Fortschritt: 60% abgeschlossen
• Qualität: Hervorragend ⭐⭐⭐⭐⭐

${
  userInput.toLowerCase().includes('problem') || userInput.toLowerCase().includes('issue')
    ? '🔧 **Unterstützung:** Ich koordiniere sofort eine Lösung mit Ihrem Dienstleister!'
    : '💡 **Tipp:** Alles läuft super! Der Abschluss ist für übermorgen geplant.'
}

Gibt es noch etwas, womit ich helfen kann?`,
        timestamp: new Date(),
        metadata: {
          suggestions: ['Zahlung vorbereiten', 'Bewertung planen', 'Weiteres Projekt starten'],
        },
      }),

      completion: () => ({
        id: generateId(),
        type: 'assistant',
        content: `🎉 **Projekt erfolgreich abgeschlossen!**

Herzlichen Glückwunsch! Ihr Taskilo-Projekt wurde erfolgreich umgesetzt.

⭐ **Bitte bewerten Sie:**
Wie zufrieden sind Sie mit dem Ergebnis? Ihre Bewertung hilft anderen Kunden!

🔄 **Weiteres Projekt?**
Haben Sie bereits das nächste Projekt im Kopf? Ich helfe gerne wieder!`,
        timestamp: new Date(),
        metadata: {
          suggestions: ['5 Sterne geben', 'Bewertung schreiben', 'Neues Projekt starten'],
        },
      }),
    };

    return responses[step]();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  const getStepIcon = (step: ProjectStep) => {
    const icons: Record<ProjectStep, React.ReactNode> = {
      welcome: <Bot className="h-4 w-4" />,
      'category-selection': <Briefcase className="h-4 w-4" />,
      description: <FileText className="h-4 w-4" />,
      location: <MapPin className="h-4 w-4" />,
      timeline: <Calendar className="h-4 w-4" />,
      budget: <Euro className="h-4 w-4" />,
      requirements: <Settings className="h-4 w-4" />,
      review: <CheckCircle className="h-4 w-4" />,
      'provider-matching': <User className="h-4 w-4" />,
      'project-monitoring': <Clock className="h-4 w-4" />,
      completion: <Star className="h-4 w-4" />,
    };
    return icons[step];
  };

  const getStepLabel = (step: ProjectStep) => {
    const labels: Record<ProjectStep, string> = {
      welcome: 'Willkommen',
      'category-selection': 'Kategorie',
      description: 'Beschreibung',
      location: 'Standort',
      timeline: 'Zeitplan',
      budget: 'Budget',
      requirements: 'Anforderungen',
      review: 'Überprüfung',
      'provider-matching': 'Dienstleister-Suche',
      'project-monitoring': 'Projektbegleitung',
      completion: 'Abschluss',
    };
    return labels[step];
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          size="lg"
          className="rounded-full bg-[#14ad9f] hover:bg-[#0f9d84] shadow-lg h-14 w-14 p-0"
        >
          <Bot className="h-6 w-6" />
        </Button>
        {currentStep === 'project-monitoring' && (
          <Badge className="absolute -top-2 -left-2 bg-orange-500">
            <Clock className="h-3 w-3 mr-1" />
            Update
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[600px] shadow-2xl border-0 bg-white dark:bg-gray-900">
        <CardHeader className="pb-3 bg-[#14ad9f] text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-lg">Taskilo KI-Assistent</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {getStepIcon(currentStep)}
                <span className="ml-1 text-xs">{getStepLabel(currentStep)}</span>
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[calc(600px-80px)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-[#14ad9f] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                  {/* Suggestions */}
                  {message.metadata?.suggestions && (
                    <div className="mt-3 space-y-1">
                      {message.metadata.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left justify-start text-xs h-8 bg-white/10 border-white/20 hover:bg-white/20"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t dark:border-gray-700">
            {/* Validierungsfehler anzeigen */}
            {validationError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}

            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Ihre Nachricht..."
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                className={`flex-1 transition-colors ${
                  validationError ? 'border-red-300 focus:border-red-500' : ''
                }`}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || !!validationError}
                size="sm"
                className="bg-[#14ad9f] hover:bg-[#0f9d84]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

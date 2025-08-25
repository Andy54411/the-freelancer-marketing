'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Briefcase,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Users,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Zap,
  FileText,
  Calendar,
  DollarSign,
  PenTool,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function CompanyAIAssistantPage() {
  const { user } = useAuth();
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const companyAssistantFeatures = [
    {
      id: 'profile-optimizer',
      title: 'Profil-Optimierungs-Assistent',
      description: 'Optimiert Ihr Unternehmensprofil für bessere Kundengewinnung',
      icon: PenTool,
      color: 'bg-[#14ad9f]',
      features: [
        'Automatische Beschreibungsverbesserung',
        'SEO-optimierte Inhalte',
        'Professionelle Formulierungen',
        'Branchenspezifische Anpassungen',
      ],
      stats: {
        'Profil-Aufrufe': '+67%',
        Anfragen: '+45%',
        Conversion: '+23%',
      },
    },
    {
      id: 'order-manager',
      title: 'Auftrags-Management-Assistent',
      description: 'Verwaltet und optimiert Ihre Aufträge automatisch',
      icon: Briefcase,
      color: 'bg-blue-600',
      features: [
        'Intelligente Auftragspriorisierung',
        'Automatische Angebotserstellung',
        'Terminkoordination',
        'Nachfass-Management',
      ],
      stats: {
        'Aufträge/Monat': '47',
        Abschlussrate: '89%',
        'Ø Bearbeitungszeit': '2.3h',
      },
    },
    {
      id: 'customer-communication',
      title: 'Kunden-Kommunikations-Assistent',
      description: 'Verbessert die Kommunikation mit Ihren Kunden',
      icon: MessageSquare,
      color: 'bg-purple-600',
      features: [
        'Automatische Antwortvorschläge',
        'Stimmungsanalyse',
        'Konfliktprävention',
        'Follow-up Erinnerungen',
      ],
      stats: {
        Antwortzeit: '< 1h',
        Kundenzufriedenheit: '4.9/5',
        Reaktionsrate: '96%',
      },
    },
    {
      id: 'business-analytics',
      title: 'Business-Analytics-Assistent',
      description: 'Analysiert Ihre Geschäftsdaten und gibt strategische Empfehlungen',
      icon: BarChart3,
      color: 'bg-orange-600',
      features: [
        'Umsatz-Trend-Analyse',
        'Kundenverhalten-Insights',
        'Preisoptimierung',
        'Wachstumsprognosen',
      ],
      stats: {
        Umsatzsteigerung: '+34%',
        Kostenersparnis: '€3.2k',
        ROI: '240%',
      },
    },
    {
      id: 'content-creator',
      title: 'Content-Erstellungs-Assistent',
      description: 'Erstellt professionelle Inhalte für Ihr Marketing',
      icon: FileText,
      color: 'bg-green-600',
      features: [
        'Automatische Blog-Artikel',
        'Social Media Posts',
        'Marketing-Texte',
        'SEO-optimierte Inhalte',
      ],
      stats: {
        'Content-Stücke': '156',
        Engagement: '+78%',
        Traffic: '+112%',
      },
    },
    {
      id: 'scheduler',
      title: 'Terminplanungs-Assistent',
      description: 'Optimiert Ihre Terminplanung und Ressourcenverwaltung',
      icon: Calendar,
      color: 'bg-indigo-600',
      features: [
        'Intelligente Terminkoordination',
        'Ressourcenoptimierung',
        'Konfliktprävention',
        'Automatische Erinnerungen',
      ],
      stats: {
        Terminfindung: '3x schneller',
        'No-Shows': '-78%',
        Auslastung: '94%',
      },
    },
  ];

  const quickActions = [
    {
      title: 'Unternehmensbeschreibung optimieren',
      description: 'KI optimiert Ihre Profilbeschreibung',
      icon: PenTool,
      action: 'profile-description',
      color: 'bg-[#14ad9f]',
    },
    {
      title: 'Angebot erstellen',
      description: 'Automatisches Angebot für neuen Kunden',
      icon: FileText,
      action: 'create-proposal',
      color: 'bg-blue-600',
    },
    {
      title: 'Marketing-Text generieren',
      description: 'Content für Social Media & Website',
      icon: MessageSquare,
      action: 'marketing-content',
      color: 'bg-purple-600',
    },
    {
      title: 'FAQ optimieren',
      description: 'Häufige Kundenfragen aktualisieren',
      icon: Lightbulb,
      action: 'faq-optimization',
      color: 'bg-orange-600',
    },
  ];

  const aiInsights = [
    {
      title: 'Profiloptimierung empfohlen',
      description: 'Ihre Beschreibung könnte 34% mehr Anfragen generieren',
      type: 'opportunity',
      action: 'Jetzt optimieren',
      actionFunction: () => handleQuickAction('profile-description'),
    },
    {
      title: 'Peak-Zeit erkannt',
      description: 'Donnerstag 14-16 Uhr: 2.3x mehr Kundenanfragen',
      type: 'insight',
      action: 'Verfügbarkeit anpassen',
      actionFunction: () =>

  const handleQuickAction = async (action: string) => {
    setIsGenerating(true);

    try {
      switch (action) {
        case 'profile-description':
          // Direkte Integration mit unserem Gemini-Service
          try {
            const response = await fetch('/api/generate-description', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                companyName: 'Ihr Unternehmen', // Hier könnte der echte Name stehen
                services: 'Ihre Services', // Hier könnten die echten Services stehen
                industry: 'Ihre Branche', // Hier könnte die echte Branche stehen
              }),
            });

            if (response.ok) {
              const data = await response.json();
              // Zeige die generierte Beschreibung in einem Modal oder navigiere zum Profil
              toast.success('Profil-Beschreibung wurde optimiert! Navigiere zum Profil...');
              // Optional: Kurze Verzögerung und Navigation zum Profil
              setTimeout(() => {
                window.location.href = `/dashboard/company/${uid}/profile`;
              }, 1500);
            } else {
              throw new Error('Fehler beim Generieren der Beschreibung');
            }
          } catch (error) {
            toast.error('Fehler beim Optimieren der Beschreibung');
          }
          break;

        case 'create-proposal':
          // Hier könnte ein Angebots-Generator stehen
          await new Promise(resolve => setTimeout(resolve, 2000));
          toast.success('Angebot-Template wurde erstellt!');
          break;

        case 'marketing-content':
          // Content-Generator
          await new Promise(resolve => setTimeout(resolve, 1500));
          toast.success('Marketing-Content wurde generiert!');
          break;

        case 'faq-optimization':
          // FAQ-Optimierung
          toast.info('Navigiere zu FAQ-Bearbeitung...');
          window.location.href = `/dashboard/company/${uid}/profile`;
          break;

        default:
          toast.info('Feature wird entwickelt...');
      }
    } catch (error) {
      toast.error('Fehler bei der Ausführung');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-12 w-12 bg-[#14ad9f] rounded-xl flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KI-Business-Assistent</h1>
            <p className="text-gray-600">
              Intelligente Unterstützung für Ihr Unternehmen auf Taskilo
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-[#14ad9f]" />
                <div>
                  <p className="text-sm text-gray-600">KI-Aktionen heute</p>
                  <p className="text-2xl font-bold text-gray-900">23</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Effizienzsteigerung</p>
                  <p className="text-2xl font-bold text-green-600">+67%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Zusatzumsatz</p>
                  <p className="text-2xl font-bold text-blue-600">€2.4k</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Zeit gespart</p>
                  <p className="text-2xl font-bold text-purple-600">12h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-[#14ad9f]" />
            <span>Schnellaktionen</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 p-4 flex flex-col items-center justify-center space-y-2 hover:border-[#14ad9f] transition-colors"
                onClick={() => handleQuickAction(action.action)}
                disabled={isGenerating}
              >
                <action.icon className={`h-6 w-6 text-white rounded p-1 ${action.color}`} />
                <div className="text-center">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-orange-500" />
            <span>KI-Empfehlungen</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aiInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      insight.type === 'opportunity'
                        ? 'bg-green-500'
                        : insight.type === 'insight'
                          ? 'bg-blue-500'
                          : 'bg-orange-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={insight.actionFunction}
                  className="hover:bg-[#14ad9f] hover:text-white"
                >
                  {insight.action}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {companyAssistantFeatures.map(assistant => (
          <Card key={assistant.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div
                  className={`h-12 w-12 ${assistant.color} rounded-xl flex items-center justify-center`}
                >
                  <assistant.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{assistant.title}</CardTitle>
                  <p className="text-sm text-gray-600">{assistant.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  {assistant.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  {Object.entries(assistant.stats).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500">{key}</p>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full bg-[#14ad9f] hover:bg-[#129488]"
                  onClick={() => setActiveAssistant(assistant.id)}
                >
                  Assistent aktivieren
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <Bot className="h-6 w-6 text-[#14ad9f] animate-pulse" />
              <span className="text-lg font-medium">KI arbeitet...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

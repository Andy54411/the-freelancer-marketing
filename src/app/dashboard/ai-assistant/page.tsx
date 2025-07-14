// KI-Assistenten Übersichtsseite
// src/app/dashboard/ai-assistant/page.tsx

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
} from 'lucide-react';
import TaskiloProjectAssistant from '@/components/TaskiloProjectAssistant';
import { useAuth } from '@/contexts/AuthContext';

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);

  const assistantFeatures = [
    {
      id: 'project-creation',
      title: 'Projekt-Erstellungs-Assistent',
      description: 'Erstellt automatisch optimierte Aufträge basierend auf Ihren Beschreibungen',
      icon: Briefcase,
      color: 'bg-[#14ad9f]',
      features: [
        'Intelligente Kategorie-Erkennung',
        'Automatische Preis-Schätzung',
        'Standort-basierte Dienstleister-Suche',
        'Optimierte Projektbeschreibungen',
      ],
      stats: {
        Erfolgsrate: '94%',
        'Ø Erstellungszeit': '3 Min',
        Zufriedenheit: '4.8/5',
      },
    },
    {
      id: 'project-monitoring',
      title: 'Projekt-Überwachungs-Assistent',
      description:
        'Überwacht aktive Projekte und koordiniert automatisch zwischen allen Beteiligten',
      icon: TrendingUp,
      color: 'bg-blue-600',
      features: [
        'Echtzeit Fortschritts-Tracking',
        'Automatische Termin-Koordination',
        'Qualitäts-Überwachung',
        'Proaktive Problem-Lösung',
      ],
      stats: {
        'Aktive Projekte': '127',
        'Ø Erfolgsrate': '96%',
        'Zeit-Ersparnis': '40%',
      },
    },
    {
      id: 'communication',
      title: 'Kommunikations-Assistent',
      description: 'Vermittelt zwischen Kunden und Dienstleistern für reibungslose Kommunikation',
      icon: MessageSquare,
      color: 'bg-purple-600',
      features: [
        'Automatische Übersetzung',
        'Missverständnis-Erkennung',
        'Eskalations-Management',
        'Multi-Channel Support',
      ],
      stats: {
        'Nachrichten/Tag': '2.4k',
        Auflösungsrate: '89%',
        'Ø Antwortzeit': '< 2 Min',
      },
    },
    {
      id: 'analytics',
      title: 'Analytics-Assistent',
      description: 'Analysiert Ihre Projekte und gibt personalisierte Verbesserungsvorschläge',
      icon: BarChart3,
      color: 'bg-orange-600',
      features: [
        'Projekt-Performance-Analyse',
        'Kosten-Optimierung',
        'Trend-Erkennung',
        'Personalisierte Empfehlungen',
      ],
      stats: {
        'Daten-Punkte': '50k+',
        Einsparungen: '€2.3k',
        Optimierungen: '234',
      },
    },
  ];

  const aiInsights = [
    {
      title: 'Wöchentliche Projekt-Analyse',
      description: 'Ihre Projektkosten sind diese Woche um 15% gesunken',
      type: 'success',
      action: 'Details anzeigen',
    },
    {
      title: 'Neue Dienstleister verfügbar',
      description: '3 neue Top-bewertete Anbieter in Ihrer Region verfügbar',
      type: 'info',
      action: 'Anbieter ansehen',
    },
    {
      title: 'Verbesserungsvorschlag',
      description: 'Durch präzisere Projektbeschreibungen 20% bessere Angebote erhalten',
      type: 'tip',
      action: 'Tipps ansehen',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 bg-[#14ad9f] rounded-xl flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KI-Assistenten</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Intelligente Unterstützung für all Ihre Projekte
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-[#14ad9f]" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">KI-Interaktionen</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">1.2k</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Zeit gespart</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">24h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Erfolgsrate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">94%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Zufriedenheit</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">4.8/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KI-Insights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-[#14ad9f]" />
              <span>KI-Insights & Empfehlungen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h3>
                    <Badge
                      variant={
                        insight.type === 'success'
                          ? 'default'
                          : insight.type === 'info'
                            ? 'secondary'
                            : 'outline'
                      }
                      className={
                        insight.type === 'success'
                          ? 'bg-green-100 text-green-800'
                          : insight.type === 'info'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {insight.type === 'success'
                        ? 'Erfolg'
                        : insight.type === 'info'
                          ? 'Info'
                          : 'Tipp'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {insight.description}
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    {insight.action}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assistenten-Übersicht */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {assistantFeatures.map(assistant => (
            <Card key={assistant.id} className="overflow-hidden">
              <CardHeader className={`${assistant.color} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <assistant.icon className="h-6 w-6" />
                    <div>
                      <CardTitle className="text-lg">{assistant.title}</CardTitle>
                      <p className="text-sm opacity-90">{assistant.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveAssistant(assistant.id)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    Starten
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Features */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Funktionen:</h4>
                  <ul className="space-y-2">
                    {assistant.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-[#14ad9f]" />
                        <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Statistiken */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Performance:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(assistant.stats).map(([key, value], index) => (
                      <div key={index} className="text-center">
                        <p className="text-lg font-bold text-[#14ad9f]">{value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{key}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setActiveAssistant('project-creation')}
                className="h-16 bg-[#14ad9f] hover:bg-[#0f9d84]"
              >
                <div className="text-center">
                  <Briefcase className="h-6 w-6 mx-auto mb-1" />
                  <span>Neues Projekt erstellen</span>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => setActiveAssistant('project-monitoring')}
                className="h-16"
              >
                <div className="text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-1" />
                  <span>Projekte überwachen</span>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => setActiveAssistant('analytics')}
                className="h-16"
              >
                <div className="text-center">
                  <BarChart3 className="h-6 w-6 mx-auto mb-1" />
                  <span>Analytics anzeigen</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projekt-Assistent */}
      {user?.uid && (
        <TaskiloProjectAssistant
          userId={user.uid}
          onOrderCreate={orderData => {
            console.log('Order created:', orderData);
          }}
        />
      )}
    </div>
  );
}

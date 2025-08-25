// KI-Assistenten Übersichtsseite
// src/app/dashboard/ai-assistant/page.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Briefcase, Clock, Star, CheckCircle, Lightbulb, ArrowRight } from 'lucide-react';
import TaskiloProjectAssistant from '@/components/TaskiloProjectAssistant';
import { useAuth } from '@/contexts/AuthContext';

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);

  const projectCreationAssistant = {
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
  };

  const projectInsights = [
    {
      title: 'Erfolgreiche Projekt-Erstellung',
      description: 'Ihre letzten 5 Projekte wurden erfolgreich mit dem KI-Assistenten erstellt',
      type: 'success',
      action: 'Details anzeigen',
    },
    {
      title: 'Optimierte Beschreibungen',
      description: 'KI-generierte Projektbeschreibungen führten zu 20% besseren Angeboten',
      type: 'tip',
      action: 'Tipps ansehen',
    },
    {
      title: 'Neue Features verfügbar',
      description: 'Erweiterte Kategorie-Erkennung für noch präzisere Projekterstellung',
      type: 'info',
      action: 'Mehr erfahren',
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Projekt-Erstellungs-Assistent
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Intelligente Unterstützung für die Erstellung Ihrer Projekte
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-[#14ad9f]" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Projekte erstellt</p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ø Erstellungszeit</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">3 Min</p>
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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-[#14ad9f]" />
              <span>Projekt-Erstellungs Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projectInsights.map((insight, index) => (
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

        {/* Projekt-Erstellungs-Assistent */}
        <div className="mb-8">
          <Card className="overflow-hidden">
            <CardHeader className={`${projectCreationAssistant.color} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <projectCreationAssistant.icon className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-lg">{projectCreationAssistant.title}</CardTitle>
                    <p className="text-sm opacity-90">{projectCreationAssistant.description}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveAssistant(projectCreationAssistant.id)}
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
                  {projectCreationAssistant.features.map((feature, index) => (
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
                  {Object.entries(projectCreationAssistant.stats).map(([key, value], index) => (
                    <div key={index} className="text-center">
                      <p className="text-lg font-bold text-[#14ad9f]">{String(value)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{key}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projekt erstellen */}
        <Card>
          <CardHeader>
            <CardTitle>Neues Projekt erstellen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Button
                onClick={() => setActiveAssistant('project-creation')}
                className="h-20 w-full bg-[#14ad9f] hover:bg-[#0f9d84] text-lg"
              >
                <div className="text-center">
                  <Briefcase className="h-8 w-8 mx-auto mb-2" />
                  <span>KI-Assistenten für Projekt-Erstellung starten</span>
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

          }}
        />
      )}
    </div>
  );
}

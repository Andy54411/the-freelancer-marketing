// Test-Seite für den KI-Assistenten
// src/app/test-ai/page.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Play, 
  Settings, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import TaskiloProjectAssistant from '@/components/TaskiloProjectAssistant';
import { TaskiloAIFeatures } from '@/lib/ai/projectAssistantFeatures';

export default function AITestPage() {
  const [showAssistant, setShowAssistant] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Test-Daten für KI-Features
  const testProjectData = {
    category: 'handwerk',
    description: 'Komplett-Renovierung des Badezimmers mit neuen Fliesen, Dusche und moderner Einrichtung',
    location: {
      city: 'München',
      postalCode: '80331'
    },
    budget: {
      min: 2000,
      max: 4000,
      currency: 'EUR'
    },
    timeline: {
      startDate: '2024-02-15',
      flexibility: 'flexible'
    }
  };

  const runAITests = async () => {
    console.log('Running AI tests...');
    
    // Test verschiedene KI-Features
    const optimization = TaskiloAIFeatures.optimizeProject(testProjectData);
    const risks = TaskiloAIFeatures.assessProjectRisks(testProjectData);
    const scheduling = TaskiloAIFeatures.generateSmartScheduling(testProjectData);
    const providers = await TaskiloAIFeatures.getSmartProviderRecommendations(testProjectData);

    setTestResults({
      optimization,
      risks,
      scheduling,
      providers
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-[#14ad9f] rounded-xl flex items-center justify-center">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KI-Assistent Test</h1>
                <p className="text-gray-600 dark:text-gray-400">Teste alle KI-Features des Projekt-Assistenten</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={runAITests} className="bg-[#14ad9f] hover:bg-[#0f9d84]">
                <Play className="h-4 w-4 mr-2" />
                KI-Tests starten
              </Button>
              <Button 
                onClick={() => setShowAssistant(!showAssistant)}
                variant="outline"
              >
                <Bot className="h-4 w-4 mr-2" />
                {showAssistant ? 'Assistent ausblenden' : 'Assistent anzeigen'}
              </Button>
            </div>
          </div>
        </div>

        {/* Test-Projekt */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test-Projekt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Kategorie</h4>
                <Badge variant="secondary">{testProjectData.category}</Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Standort</h4>
                <p className="text-sm text-gray-600">{testProjectData.location.city}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Budget</h4>
                <p className="text-sm text-gray-600">€{testProjectData.budget.min} - €{testProjectData.budget.max}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Flexibilität</h4>
                <p className="text-sm text-gray-600">{testProjectData.timeline.flexibility}</p>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Beschreibung</h4>
              <p className="text-sm text-gray-600">{testProjectData.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Test-Ergebnisse */}
        {testResults && (
          <div className="space-y-6">
            {/* Projekt-Optimierung */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-[#14ad9f]" />
                  <span>Projekt-Optimierung</span>
                  <Badge variant="secondary">
                    {Math.round(testResults.optimization.confidence * 100)}% Konfidenz
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Budget-Optimierung</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Aktuell:</span>
                        <span>€{testResults.optimization.currentBudget.min} - €{testResults.optimization.currentBudget.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Optimiert:</span>
                        <span className="text-[#14ad9f] font-semibold">
                          €{testResults.optimization.optimizedBudget.min} - €{testResults.optimization.optimizedBudget.max}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ersparnis:</span>
                        <span className="text-green-600 font-semibold">€{testResults.optimization.savings}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="font-semibold mb-2">Empfehlungen</h4>
                    <ul className="space-y-1">
                      {testResults.optimization.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risiko-Bewertung */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Risiko-Bewertung</span>
                  <Badge 
                    variant={testResults.risks.overallRisk === 'low' ? 'default' : 
                            testResults.risks.overallRisk === 'medium' ? 'secondary' : 'destructive'}
                    className={
                      testResults.risks.overallRisk === 'low' ? 'bg-green-100 text-green-800' :
                      testResults.risks.overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }
                  >
                    {testResults.risks.overallRisk.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Risikofaktoren</h4>
                    <div className="space-y-3">
                      {testResults.risks.riskFactors.map((risk: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium capitalize">{risk.type}</span>
                            <Badge 
                              variant={risk.level === 'low' ? 'default' : risk.level === 'medium' ? 'secondary' : 'destructive'}
                              className={
                                risk.level === 'low' ? 'bg-green-100 text-green-800' :
                                risk.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {risk.level}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            <strong>Lösung:</strong> {risk.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Empfohlene Maßnahmen</h4>
                    <ul className="space-y-2">
                      {testResults.risks.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intelligente Terminplanung */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>Intelligente Terminplanung</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Optimierter Zeitplan</h4>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Start:</span>
                        <span>{testResults.scheduling.optimizedTimeline.startDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ende:</span>
                        <span>{testResults.scheduling.optimizedTimeline.endDate}</span>
                      </div>
                    </div>
                    
                    <h5 className="font-medium mb-2">Meilensteine</h5>
                    <div className="space-y-2">
                      {testResults.scheduling.optimizedTimeline.milestones.map((milestone: any, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-2 rounded border border-gray-200 dark:border-gray-700">
                          <div className={`w-2 h-2 rounded-full ${milestone.critical ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{milestone.description}</p>
                            <p className="text-xs text-gray-500">{milestone.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Alternative Termine</h4>
                    <div className="space-y-3">
                      {testResults.scheduling.alternatives.map((alt: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">Start: {alt.startDate}</p>
                          <div className="mb-2">
                            <p className="text-sm text-green-600 font-medium mb-1">Vorteile:</p>
                            <ul className="text-xs space-y-1">
                              {alt.benefits.map((benefit: string, bIndex: number) => (
                                <li key={bIndex} className="flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm text-orange-600 font-medium mb-1">Nachteile:</p>
                            <ul className="text-xs space-y-1">
                              {alt.tradeoffs.map((tradeoff: string, tIndex: number) => (
                                <li key={tIndex} className="flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                  <span>{tradeoff}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dienstleister-Empfehlungen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>KI-Dienstleister-Empfehlungen</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {testResults.providers.map((provider: any, index: number) => (
                    <Card key={index} className="border border-gray-200 dark:border-gray-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-semibold">{Math.round(provider.score * 100)}%</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-lg font-bold text-[#14ad9f]">€{provider.pricing.estimate}</p>
                          <p className="text-sm text-gray-500">Verfügbar: {provider.availability.earliest}</p>
                        </div>
                        
                        <div>
                          <p className="font-medium mb-2">Warum empfohlen:</p>
                          <ul className="text-sm space-y-1">
                            {provider.reasons.map((reason: string, rIndex: number) => (
                              <li key={rIndex} className="flex items-start space-x-1">
                                <CheckCircle className="h-3 w-3 text-[#14ad9f] mt-1 flex-shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {provider.riskFactors.length > 0 && (
                          <div>
                            <p className="font-medium mb-2 text-orange-600">Zu beachten:</p>
                            <ul className="text-sm space-y-1">
                              {provider.riskFactors.map((risk: string, rIndex: number) => (
                                <li key={rIndex} className="flex items-start space-x-1">
                                  <AlertTriangle className="h-3 w-3 text-orange-500 mt-1 flex-shrink-0" />
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <Button className="w-full bg-[#14ad9f] hover:bg-[#0f9d84]">
                          Anbieter kontaktieren
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projekt-Assistent (wenn aktiviert) */}
        {showAssistant && (
          <TaskiloProjectAssistant 
            userId="test-user-123"
            onOrderCreate={(orderData) => {
              console.log('Test order created:', orderData);
            }}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Settings,
  Lightbulb,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Activity,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AIOptimizationSuggestion {
  id: string;
  type: 'cost_reduction' | 'efficiency' | 'coverage' | 'employee_satisfaction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings?: number;
  implementation: string;
  confidence: number;
}

interface AIMetrics {
  costOptimization: number;
  efficiencyGain: number;
  coverageScore: number;
  satisfactionIndex: number;
  predictiveAccuracy: number;
}

interface PredictiveData {
  weeklyForecast: {
    day: string;
    predictedRevenue: number;
    recommendedStaff: number;
    actualStaff?: number;
  }[];
  busyHours: { hour: number; intensity: number }[];
  seasonalTrends: { month: string; factor: number }[];
}

export default function AISchedulePlanningPage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = useAuth();
  const resolvedParams = React.use(params);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AIMetrics>({
    costOptimization: 0,
    efficiencyGain: 0,
    coverageScore: 0,
    satisfactionIndex: 0,
    predictiveAccuracy: 0,
  });

  const optimizationSuggestions: AIOptimizationSuggestion[] = [
    {
      id: '1',
      type: 'cost_reduction',
      title: 'Optimierung der Frühschicht',
      description:
        'Reduzierung der Personalstärke in der Frühschicht um 15% basierend auf historischen Umsatzdaten',
      impact: 'high',
      savings: 2400,
      implementation: 'Schichtplan für nächste Woche anpassen',
      confidence: 92,
    },
    {
      id: '2',
      type: 'efficiency',
      title: 'Cross-Training Empfehlung',
      description:
        'Ausbildung von 3 Mitarbeitern in zusätzlichen Bereichen für flexiblere Einsatzplanung',
      impact: 'medium',
      implementation: 'Schulungsplan erstellen',
      confidence: 87,
    },
    {
      id: '3',
      type: 'coverage',
      title: 'Wochenend-Verstärkung',
      description:
        'Erhöhung der Personalstärke am Samstag Abend um 20% aufgrund steigender Reservierungen',
      impact: 'high',
      implementation: 'Zusätzliche Schichten planen',
      confidence: 95,
    },
    {
      id: '4',
      type: 'employee_satisfaction',
      title: 'Work-Life-Balance Verbesserung',
      description: 'Gleichmäßigere Verteilung der Wochenendschichten unter allen Mitarbeitern',
      impact: 'medium',
      implementation: 'Schichtrotation implementieren',
      confidence: 83,
    },
  ];

  const predictiveData: PredictiveData = {
    weeklyForecast: [
      { day: 'Montag', predictedRevenue: 3200, recommendedStaff: 8, actualStaff: 10 },
      { day: 'Dienstag', predictedRevenue: 2800, recommendedStaff: 7, actualStaff: 8 },
      { day: 'Mittwoch', predictedRevenue: 3100, recommendedStaff: 8, actualStaff: 8 },
      { day: 'Donnerstag', predictedRevenue: 3800, recommendedStaff: 10, actualStaff: 9 },
      { day: 'Freitag', predictedRevenue: 5200, recommendedStaff: 14, actualStaff: 12 },
      { day: 'Samstag', predictedRevenue: 6100, recommendedStaff: 16, actualStaff: 14 },
      { day: 'Sonntag', predictedRevenue: 4200, recommendedStaff: 11, actualStaff: 10 },
    ],
    busyHours: [
      { hour: 11, intensity: 60 },
      { hour: 12, intensity: 85 },
      { hour: 13, intensity: 90 },
      { hour: 17, intensity: 70 },
      { hour: 18, intensity: 95 },
      { hour: 19, intensity: 100 },
      { hour: 20, intensity: 85 },
      { hour: 21, intensity: 60 },
    ],
    seasonalTrends: [
      { month: 'Jan', factor: 0.8 },
      { month: 'Feb', factor: 0.85 },
      { month: 'Mär', factor: 0.9 },
      { month: 'Apr', factor: 1.0 },
      { month: 'Mai', factor: 1.1 },
      { month: 'Jun', factor: 1.2 },
    ],
  };

  useEffect(() => {
    if (user && resolvedParams.uid) {
      loadAIData();
    }
  }, [user, resolvedParams.uid]);

  const loadAIData = async () => {
    try {
      setLoading(true);
      const employeesData = await PersonalService.getEmployees(resolvedParams.uid);
      setEmployees(employeesData);

      // Mock AI Metrics - würde in der Realität von KI-Service kommen
      setAiMetrics({
        costOptimization: 23,
        efficiencyGain: 18,
        coverageScore: 94,
        satisfactionIndex: 87,
        predictiveAccuracy: 91,
      });
    } catch (error) {
      toast.error('Fehler beim Laden der KI-Daten');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestionId: string) => {
    const suggestion = optimizationSuggestions.find(s => s.id === suggestionId);
    toast.success(`Optimierung "${suggestion?.title}" wird angewendet...`);
  };

  const runAIOptimization = async () => {
    toast.success('KI-Optimierung läuft... Dies kann einige Minuten dauern.');
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_reduction':
        return <DollarSign className="h-5 w-5" />;
      case 'efficiency':
        return <Zap className="h-5 w-5" />;
      case 'coverage':
        return <Users className="h-5 w-5" />;
      case 'employee_satisfaction':
        return <Target className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="h-8 w-8 text-[#14ad9f]" />
            KI-optimierte Dienstplanung
          </h1>
          <p className="text-gray-600">
            Nutzen Sie künstliche Intelligenz für optimale Personalplanung basierend auf Umsatz,
            Gästezahlen und historischen Daten
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            KI-Einstellungen
          </Button>
          <Button
            onClick={runAIOptimization}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Optimierung starten
          </Button>
        </div>
      </div>

      {/* AI Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kosteneinsparung</p>
                <p className="text-2xl font-bold text-green-600">{aiMetrics.costOptimization}%</p>
                <Progress value={aiMetrics.costOptimization} className="mt-2 h-2" />
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Effizienz-Gewinn</p>
                <p className="text-2xl font-bold text-blue-600">{aiMetrics.efficiencyGain}%</p>
                <Progress value={aiMetrics.efficiencyGain} className="mt-2 h-2" />
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Abdeckung</p>
                <p className="text-2xl font-bold text-purple-600">{aiMetrics.coverageScore}%</p>
                <Progress value={aiMetrics.coverageScore} className="mt-2 h-2" />
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mitarbeiter-Zufriedenheit</p>
                <p className="text-2xl font-bold text-orange-600">{aiMetrics.satisfactionIndex}%</p>
                <Progress value={aiMetrics.satisfactionIndex} className="mt-2 h-2" />
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vorhersage-Genauigkeit</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {aiMetrics.predictiveAccuracy}%
                </p>
                <Progress value={aiMetrics.predictiveAccuracy} className="mt-2 h-2" />
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <Brain className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suggestions">Optimierungsvorschläge</TabsTrigger>
          <TabsTrigger value="predictions">Vorhersagen</TabsTrigger>
          <TabsTrigger value="analytics">KI-Analytics</TabsTrigger>
          <TabsTrigger value="settings">Konfiguration</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-[#14ad9f]" />
                Aktuelle Optimierungsvorschläge
              </CardTitle>
              <CardDescription>
                KI-generierte Empfehlungen zur Verbesserung Ihrer Dienstplanung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizationSuggestions.map(suggestion => (
                  <Card key={suggestion.id} className="p-4 border-l-4 border-l-[#14ad9f]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getTypeIcon(suggestion.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
                            <Badge className={getImpactColor(suggestion.impact)}>
                              {suggestion.impact === 'high'
                                ? 'Hoher Impact'
                                : suggestion.impact === 'medium'
                                  ? 'Mittlerer Impact'
                                  : 'Geringer Impact'}
                            </Badge>
                            <Badge variant="outline">{suggestion.confidence}% Vertrauen</Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{suggestion.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>📋 {suggestion.implementation}</span>
                            {suggestion.savings && (
                              <span className="text-green-600 font-medium">
                                💰 {suggestion.savings}€/Monat Einsparung
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => applySuggestion(suggestion.id)}
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                          size="sm"
                        >
                          Anwenden
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Wöchentliche Prognose</CardTitle>
                <CardDescription>Umsatz-Vorhersage und empfohlene Personalstärke</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictiveData.weeklyForecast.map(day => (
                    <div
                      key={day.day}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{day.day}</p>
                        <p className="text-sm text-gray-600">{day.predictedRevenue}€ Umsatz</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {day.recommendedStaff} Mitarbeiter
                          {day.actualStaff && (
                            <span
                              className={`ml-2 text-sm ${
                                day.actualStaff < day.recommendedStaff
                                  ? 'text-red-600'
                                  : day.actualStaff > day.recommendedStaff
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                              }`}
                            >
                              (aktuell: {day.actualStaff})
                              {day.actualStaff < day.recommendedStaff ? (
                                <ArrowUp className="inline h-3 w-3 ml-1" />
                              ) : day.actualStaff > day.recommendedStaff ? (
                                <ArrowDown className="inline h-3 w-3 ml-1" />
                              ) : (
                                <CheckCircle className="inline h-3 w-3 ml-1" />
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stoßzeiten-Analyse</CardTitle>
                <CardDescription>Empfohlene Personalverteilung nach Tageszeit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictiveData.busyHours.map(hour => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {hour.hour}:00 - {hour.hour + 1}:00
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#14ad9f] h-2 rounded-full"
                            style={{ width: `${hour.intensity}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{hour.intensity}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>KI-Performance</CardTitle>
                <CardDescription>Leistung des KI-Systems im Zeitverlauf</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vorhersage-Genauigkeit</span>
                    <span className="font-medium text-green-600">↗ +5% diese Woche</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Implementierte Vorschläge</span>
                    <span className="font-medium">12 von 15</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Kosteneinsparung</span>
                    <span className="font-medium text-green-600">4.800€ diesen Monat</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mitarbeiter-Feedback</span>
                    <span className="font-medium">4.2/5 ⭐</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Datenquellen</CardTitle>
                <CardDescription>Aktive Integrationen für KI-Training</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Kassensystem</span>
                    <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reservierungssystem</span>
                    <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Historische Daten</span>
                    <Badge className="bg-green-100 text-green-800">24 Monate</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Wetterdaten</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Optional</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>KI-Parameter</CardTitle>
                <CardDescription>Anpassung der KI-Algorithmus-Einstellungen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Optimierungsziel</label>
                  <select className="w-full mt-1 p-2 border rounded-md">
                    <option>Kosteneinsparung priorisieren</option>
                    <option>Servicequalität priorisieren</option>
                    <option>Ausgewogene Optimierung</option>
                    <option>Mitarbeiterzufriedenheit priorisieren</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Vorhersage-Horizont</label>
                  <select className="w-full mt-1 p-2 border rounded-md">
                    <option>1 Woche</option>
                    <option>2 Wochen</option>
                    <option>1 Monat</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Automatische Anwendung</label>
                  <select className="w-full mt-1 p-2 border rounded-md">
                    <option>Manuell genehmigen</option>
                    <option>Automatisch bei hohem Vertrauen</option>
                    <option>Vollautomatisch</option>
                  </select>
                </div>
                <Button className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white">
                  Einstellungen speichern
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training & Lernen</CardTitle>
                <CardDescription>KI-System Training und Verbesserung</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Training läuft</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Das KI-System lernt kontinuierlich aus neuen Daten
                  </p>
                  <Progress value={76} className="mb-2" />
                  <p className="text-xs text-gray-500">76% - Erwartete Fertigstellung: 2 Stunden</p>
                </div>
                <Button variant="outline" className="w-full">
                  Training-Status anzeigen
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

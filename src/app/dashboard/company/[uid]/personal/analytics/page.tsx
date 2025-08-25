'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Award,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  PieChart,
  Activity,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalService, type PersonalStats } from '@/services/personalService';

interface ProductivityMetric {
  metric: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

interface PerformanceData {
  department: string;
  productivity: number;
  satisfaction: number;
  retention: number;
  growth: number;
}

export default function PersonalAnalyticsPage() {
  const params = useParams();
  const companyId = params?.uid as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [productivityMetrics, setProductivityMetrics] = useState<ProductivityMetric[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    if (companyId) {
      loadAnalytics();
    }
  }, [companyId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const personalStats = await PersonalService.getPersonalStats(companyId);
      setStats(personalStats);

      // Mock Productivity Metrics
      const metrics: ProductivityMetric[] = [
        {
          metric: 'Durchschnittliche Arbeitszeit',
          value: 42.5,
          target: 40,
          trend: 'up',
          unit: 'Std/Woche',
        },
        {
          metric: 'Projekt-Abschlussrate',
          value: 94.2,
          target: 90,
          trend: 'up',
          unit: '%',
        },
        {
          metric: 'Kundenzufriedenheit',
          value: 4.7,
          target: 4.5,
          trend: 'stable',
          unit: '/5',
        },
        {
          metric: 'Krankenstand',
          value: 3.8,
          target: 5.0,
          trend: 'down',
          unit: '%',
        },
        {
          metric: 'Mitarbeiterzufriedenheit',
          value: 8.3,
          target: 8.0,
          trend: 'up',
          unit: '/10',
        },
        {
          metric: 'Fluktuationsrate',
          value: 2.1,
          target: 5.0,
          trend: 'down',
          unit: '%',
        },
      ];
      setProductivityMetrics(metrics);

      // Mock Performance Data per Department
      const performance: PerformanceData[] = personalStats.departmentBreakdown.map(
        (dept, index) => ({
          department: dept.department,
          productivity: 85 + Math.random() * 15, // 85-100%
          satisfaction: 80 + Math.random() * 20, // 80-100%
          retention: 90 + Math.random() * 10, // 90-100%
          growth: -5 + Math.random() * 20, // -5% to +15%
        })
      );
      setPerformanceData(performance);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const exportAnalyticsReport = async () => {
    try {
      // Erstelle Analytics-Report als CSV
      const headers = ['Metrik', 'Wert', 'Ziel', 'Trend', 'Einheit'];
      const csvRows = [headers.join(',')];

      productivityMetrics.forEach(metric => {
        const row = [
          metric.metric,
          metric.value.toString(),
          metric.target.toString(),
          metric.trend,
          metric.unit,
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {

    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#14ad9f]" />
          <p className="text-gray-600">Lade Analytics-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Personal-Analytics</h1>
          <p className="text-gray-600 mt-2">Leistungsanalyse, Produktivität und KPIs Ihres Teams</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={exportAnalyticsReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team-Produktivität</CardTitle>
            <Zap className="h-4 w-4 text-[#14ad9f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +2.1% vom Vormonat
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitarbeiterzufriedenheit</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.3/10</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +0.4 vom Vormonat
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">97.9%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Sehr gut
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Krankenstand</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.8%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1 scale-y-[-1]" />
              -1.2% vom Vormonat
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productivity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="productivity">Produktivität</TabsTrigger>
          <TabsTrigger value="performance">Leistung</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Produktivitäts-Metriken */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
                  Produktivitäts-Metriken
                </CardTitle>
                <CardDescription>
                  Aktuelle Leistungskennzahlen im Vergleich zu den Zielvorgaben
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {productivityMetrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{metric.metric}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {metric.value} {metric.unit}
                          </span>
                          <Badge
                            variant={
                              metric.trend === 'up'
                                ? 'default'
                                : metric.trend === 'down'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(metric.value / metric.target) * 100}
                          className="flex-1 h-2"
                        />
                        <span className="text-xs text-gray-500">
                          Ziel: {metric.target} {metric.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#14ad9f]" />
                  Zielerreichung
                </CardTitle>
                <CardDescription>Übersicht der erreichten und verfehlten Ziele</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productivityMetrics.map((metric, index) => {
                    const achievement = (metric.value / metric.target) * 100;
                    const status =
                      achievement >= 100 ? 'erreicht' : achievement >= 80 ? 'nah' : 'verfehlt';

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-sm">{metric.metric}</div>
                          <div className="text-xs text-gray-500">
                            {achievement.toFixed(1)}% erreicht
                          </div>
                        </div>
                        <Badge
                          variant={
                            status === 'erreicht'
                              ? 'default'
                              : status === 'nah'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {status === 'erreicht'
                            ? '✓ Erreicht'
                            : status === 'nah'
                              ? '~ Nah dran'
                              : '✗ Verfehlt'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Abteilungs-Performance */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-[#14ad9f]" />
                Performance nach Abteilungen
              </CardTitle>
              <CardDescription>
                Vergleich der Leistungskennzahlen zwischen den Abteilungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {performanceData.map((dept, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-lg">{dept.department}</h3>
                      <Badge variant={dept.growth > 0 ? 'default' : 'destructive'}>
                        {dept.growth > 0 ? '+' : ''}
                        {dept.growth.toFixed(1)}% Wachstum
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Produktivität</div>
                        <div className="flex items-center gap-2">
                          <Progress value={dept.productivity} className="flex-1 h-2" />
                          <span className="text-sm font-medium">
                            {dept.productivity.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500 mb-1">Zufriedenheit</div>
                        <div className="flex items-center gap-2">
                          <Progress value={dept.satisfaction} className="flex-1 h-2" />
                          <span className="text-sm font-medium">
                            {dept.satisfaction.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500 mb-1">Retention</div>
                        <div className="flex items-center gap-2">
                          <Progress value={dept.retention} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{dept.retention.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#14ad9f]" />
                Langzeit-Trends
              </CardTitle>
              <CardDescription>
                Entwicklung der wichtigsten KPIs über die letzten 12 Monate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: 'Produktivitätsentwicklung',
                    data: [88, 89, 91, 89, 92, 94, 93, 95, 94, 96, 95, 94],
                    color: 'text-[#14ad9f]',
                  },
                  {
                    title: 'Mitarbeiterzufriedenheit',
                    data: [7.8, 7.9, 8.0, 7.9, 8.1, 8.2, 8.1, 8.3, 8.2, 8.4, 8.3, 8.3],
                    color: 'text-blue-600',
                  },
                  {
                    title: 'Krankenstand (%)',
                    data: [4.2, 5.1, 4.8, 4.5, 3.9, 3.2, 3.5, 3.8, 4.1, 3.9, 3.6, 3.8],
                    color: 'text-orange-600',
                  },
                  {
                    title: 'Fluktuationsrate (%)',
                    data: [3.2, 2.8, 2.5, 2.3, 2.1, 1.9, 2.2, 2.0, 1.8, 2.1, 2.0, 2.1],
                    color: 'text-red-600',
                  },
                ].map((trend, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className={`font-medium mb-3 ${trend.color}`}>{trend.title}</h3>
                    <div className="flex items-end gap-1 h-24">
                      {trend.data.map((value, i) => (
                        <div
                          key={i}
                          className="bg-[#14ad9f] rounded-t opacity-70 flex-1"
                          style={{
                            height: `${(value / Math.max(...trend.data)) * 100}%`,
                            minHeight: '4px',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Jan</span>
                      <span>Dez</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#14ad9f]" />
                  Positive Entwicklungen
                </CardTitle>
                <CardDescription>Bereiche mit besonders guter Leistung</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Niedrige Fluktuationsrate',
                      description: 'Mit 2.1% deutlich unter dem Branchendurchschnitt von 8%',
                      impact: 'Hohe Mitarbeiterbindung',
                    },
                    {
                      title: 'Überdurchschnittliche Produktivität',
                      description: 'Team erreicht 94.2% der Zielvorgaben',
                      impact: 'Effiziente Arbeitsabläufe',
                    },
                    {
                      title: 'Reduzierter Krankenstand',
                      description: 'Verbesserung um 1.2% im letzten Monat',
                      impact: 'Bessere Work-Life-Balance',
                    },
                  ].map((insight, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-800">{insight.title}</div>
                      <div className="text-sm text-green-600">{insight.description}</div>
                      <div className="text-xs text-green-500 mt-1">→ {insight.impact}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Optimierungsbereiche
                </CardTitle>
                <CardDescription>Bereiche mit Verbesserungspotential</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      title: 'Überstunden-Management',
                      description: 'Durchschnittlich 2.5 Stunden über Sollarbeitszeit',
                      suggestion: 'Bessere Ressourcenplanung implementieren',
                    },
                    {
                      title: 'Weiterbildungsquote',
                      description: 'Nur 68% der Mitarbeiter nutzen Weiterbildungsangebote',
                      suggestion: 'Attraktivere Schulungsprogramme entwickeln',
                    },
                    {
                      title: 'Interne Kommunikation',
                      description: 'Feedback-Score von 7.2/10 ausbaufähig',
                      suggestion: 'Regelmäßige Team-Meetings und Feedback-Runden',
                    },
                  ].map((area, index) => (
                    <div
                      key={index}
                      className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div className="font-medium text-orange-800">{area.title}</div>
                      <div className="text-sm text-orange-600">{area.description}</div>
                      <div className="text-xs text-orange-500 mt-1">💡 {area.suggestion}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

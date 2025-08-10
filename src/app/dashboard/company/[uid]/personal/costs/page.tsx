'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Users,
  PieChart,
  Download,
  RefreshCw,
  AlertCircle,
  Target,
  Building,
  Clock,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalService, type PersonalStats } from '@/services/personalService';

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface DepartmentCosts {
  department: string;
  totalCosts: number;
  employeeCount: number;
  averageCost: number;
  budgetUtilization: number;
}

export default function PersonalCostsPage() {
  const params = useParams();
  const companyId = params?.uid as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [departmentCosts, setDepartmentCosts] = useState<DepartmentCosts[]>([]);

  useEffect(() => {
    if (companyId) {
      loadPersonalCosts();
    }
  }, [companyId]);

  const loadPersonalCosts = async () => {
    try {
      setLoading(true);
      const personalStats = await PersonalService.getPersonalStats(companyId);
      setStats(personalStats);

      // Berechne Kostenaufschlüsselung
      const totalCosts = personalStats.totalMonthlyCosts;
      const breakdown: CostBreakdown[] = [
        {
          category: 'Bruttogehälter',
          amount: totalCosts * 0.65, // ~65% Bruttogehälter
          percentage: 65,
          color: 'bg-[#14ad9f]',
        },
        {
          category: 'Sozialversicherung',
          amount: totalCosts * 0.2, // ~20% SV-Beiträge
          percentage: 20,
          color: 'bg-blue-500',
        },
        {
          category: 'Benefits & Zusatzleistungen',
          amount: totalCosts * 0.1, // ~10% Benefits
          percentage: 10,
          color: 'bg-green-500',
        },
        {
          category: 'Ausbildung & Weiterbildung',
          amount: totalCosts * 0.03, // ~3% Training
          percentage: 3,
          color: 'bg-purple-500',
        },
        {
          category: 'Equipment & Sonstiges',
          amount: totalCosts * 0.02, // ~2% Equipment
          percentage: 2,
          color: 'bg-orange-500',
        },
      ];
      setCostBreakdown(breakdown);

      // Berechne Abteilungskosten
      const departments: DepartmentCosts[] = personalStats.departmentBreakdown.map(dept => ({
        department: dept.department,
        totalCosts: dept.totalCosts,
        employeeCount: dept.count,
        averageCost: dept.totalCosts / dept.count,
        budgetUtilization: Math.min((dept.totalCosts / (totalCosts * 0.25)) * 100, 100), // Annahme: jede Abt. hat 25% Budget
      }));
      setDepartmentCosts(departments);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Personalkosten:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCostReport = async () => {
    try {
      const csv = await PersonalService.exportEmployeesCSV(companyId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personalkosten-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Fehler beim Export:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#14ad9f]" />
          <p className="text-gray-600">Lade Kostenanalyse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Personalkostenkalkulation</h1>
          <p className="text-gray-600 mt-2">
            Detaillierte Analyse und Aufschlüsselung der Personalkosten
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadPersonalCosts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={exportCostReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monatskosten Gesamt</CardTitle>
            <DollarSign className="h-4 w-4 text-[#14ad9f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalMonthlyCosts.toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Jahreskosten:{' '}
              {stats?.totalYearlyCosts.toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnitt pro Mitarbeiter</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats
                ? (stats.totalMonthlyCosts / stats.activeEmployees).toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })
                : '€0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeEmployees} aktive Mitarbeiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnittlicher Stundensatz</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageHourlyRate.toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
            <p className="text-xs text-muted-foreground">Effektive Gesamtkosten pro Stunde</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kostenwachstum</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12.5%</div>
            <p className="text-xs text-muted-foreground">Verglichen zum Vormonat</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="breakdown" className="space-y-6">
        <TabsList>
          <TabsTrigger value="breakdown">Kostenaufschlüsselung</TabsTrigger>
          <TabsTrigger value="departments">Abteilungskosten</TabsTrigger>
          <TabsTrigger value="projections">Projektionen</TabsTrigger>
          <TabsTrigger value="optimization">Optimierung</TabsTrigger>
        </TabsList>

        {/* Kostenaufschlüsselung */}
        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kreisdiagramm-Simulation mit Balken */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-[#14ad9f]" />
                  Kostenverteilung
                </CardTitle>
                <CardDescription>
                  Aufschlüsselung der monatlichen Personalkosten nach Kategorien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costBreakdown.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.category}</span>
                        <div className="text-right">
                          <div className="font-medium">
                            {item.amount.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Kosten-Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#14ad9f]" />
                  Kosten-Trends
                </CardTitle>
                <CardDescription>
                  Entwicklung der Personalkosten über die letzten 6 Monate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Vereinfachte Trend-Darstellung */}
                  {[
                    { month: 'Februar', amount: 45000, change: +5.2 },
                    { month: 'März', amount: 47500, change: +5.6 },
                    { month: 'April', amount: 48200, change: +1.5 },
                    { month: 'Mai', amount: 49800, change: +3.3 },
                    { month: 'Juni', amount: 51200, change: +2.8 },
                    { month: 'Juli', amount: stats?.totalMonthlyCosts || 52500, change: +2.5 },
                  ].map((trend, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{trend.month}</div>
                        <div className="text-sm text-gray-500">
                          {trend.amount.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </div>
                      </div>
                      <Badge variant={trend.change > 0 ? 'default' : 'secondary'}>
                        {trend.change > 0 ? '+' : ''}
                        {trend.change}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Abteilungskosten */}
        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-[#14ad9f]" />
                Kosten nach Abteilungen
              </CardTitle>
              <CardDescription>
                Detaillierte Kostenaufschlüsselung für jede Abteilung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentCosts.map((dept, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-lg">{dept.department}</h3>
                        <p className="text-sm text-gray-500">{dept.employeeCount} Mitarbeiter</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {dept.totalCosts.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </div>
                        <div className="text-sm text-gray-500">monatlich</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-gray-500">Durchschnitt pro Mitarbeiter</div>
                        <div className="font-medium">
                          {dept.averageCost.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Budget-Auslastung</div>
                        <div className="flex items-center gap-2">
                          <Progress value={dept.budgetUtilization} className="flex-1 h-2" />
                          <span className="text-sm font-medium">
                            {dept.budgetUtilization.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Jahreskosten</div>
                        <div className="font-medium">
                          {(dept.totalCosts * 12).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projektionen */}
        <TabsContent value="projections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#14ad9f]" />
                Kostenprognosen
              </CardTitle>
              <CardDescription>Projektionen für zukünftige Personalkosten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    period: 'Nächste 3 Monate',
                    amount: (stats?.totalMonthlyCosts || 0) * 3 * 1.025,
                    growth: '+2.5%',
                  },
                  {
                    period: 'Nächste 6 Monate',
                    amount: (stats?.totalMonthlyCosts || 0) * 6 * 1.055,
                    growth: '+5.5%',
                  },
                  {
                    period: 'Nächstes Jahr',
                    amount: (stats?.totalYearlyCosts || 0) * 1.12,
                    growth: '+12%',
                  },
                ].map((projection, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">{projection.period}</div>
                    <div className="text-xl font-bold mb-2">
                      {projection.amount.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </div>
                    <Badge variant="outline">{projection.growth} Wachstum</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimierung */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#14ad9f]" />
                Optimierungsempfehlungen
              </CardTitle>
              <CardDescription>
                Potentiale zur Kosteneinsparung und Effizienzsteigerung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: 'Remote Work Policy',
                    description: 'Reduzierung der Bürokosten durch Homeoffice-Regelung',
                    savings: '€2,500/Monat',
                    effort: 'Niedrig',
                    icon: '🏠',
                  },
                  {
                    title: 'Weiterbildungsbudget optimieren',
                    description: 'Fokus auf Online-Training statt teurer Präsenz-Seminare',
                    savings: '€1,200/Monat',
                    effort: 'Mittel',
                    icon: '📚',
                  },
                  {
                    title: 'Flexible Arbeitszeiten',
                    description: 'Reduzierung von Überstunden durch bessere Planung',
                    savings: '€3,800/Monat',
                    effort: 'Hoch',
                    icon: '⏰',
                  },
                  {
                    title: 'Benefit-Programme überprüfen',
                    description: 'Anpassung der Zusatzleistungen an tatsächliche Nutzung',
                    savings: '€800/Monat',
                    effort: 'Niedrig',
                    icon: '🎁',
                  },
                ].map((optimization, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#14ad9f]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{optimization.icon}</span>
                          <h3 className="font-medium">{optimization.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {optimization.effort} Aufwand
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{optimization.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{optimization.savings}</div>
                        <div className="text-xs text-gray-500">Einsparung</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

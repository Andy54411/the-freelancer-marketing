'use client';

import React, { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Euro,
  FileText,
  Download,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { PersonalService, Employee, EmployeeEvaluation } from '@/services/personalService';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default function AuswertungPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, EmployeeEvaluation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  useEffect(() => {
    loadData();
  }, [resolvedParams.uid]);

  useEffect(() => {
    if (employees.length > 0) {
      loadEvaluations();
    }
  }, [employees, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeeList = await PersonalService.getEmployees(resolvedParams.uid);
      setEmployees(employeeList);
    } catch {
      // Fehler ignorieren
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    const newEvaluations = new Map<string, EmployeeEvaluation>();
    
    for (const emp of employees) {
      if (!emp.id) continue;
      
      try {
        const evaluation = await PersonalService.getEmployeeEvaluation(
          resolvedParams.uid,
          emp.id,
          startDate,
          endDate
        );
        if (evaluation) {
          newEvaluations.set(emp.id, evaluation);
        }
      } catch {
        // Fehler ignorieren
      }
    }
    
    setEvaluations(newEvaluations);
  };

  const handlePeriodChange = (period: 'week' | 'month' | 'custom') => {
    setSelectedPeriod(period);
    const now = new Date();
    
    if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(endOfWeek.toISOString().split('T')[0]);
    } else if (period === 'month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    }
  };

  // Zusammenfassung berechnen
  const totalEmployees = employees.length;
  const totalPlannedHours = Array.from(evaluations.values()).reduce((sum, e) => sum + e.plannedHours, 0);
  const totalActualHours = Array.from(evaluations.values()).reduce((sum, e) => sum + e.actualHours, 0);
  const totalConflicts = Array.from(evaluations.values()).reduce((sum, e) => sum + e.totalConflicts, 0);
  const totalUnreviewed = Array.from(evaluations.values()).reduce((sum, e) => sum + e.unreviewedEntries, 0);
  const totalSurcharges = Array.from(evaluations.values()).reduce((sum, e) => sum + e.totalSurcharges, 0);
  const totalEstimatedPay = Array.from(evaluations.values()).reduce((sum, e) => sum + e.estimatedGrossPay, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auswertung</h1>
          <p className="text-gray-600">Stundenauswertung und Konfliktübersicht aller Mitarbeiter</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadEvaluations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Zeitraum-Auswahl */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Zeitraum:</Label>
              <Select value={selectedPeriod} onValueChange={(v) => handlePeriodChange(v as 'week' | 'month' | 'custom')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Diese Woche</SelectItem>
                  <SelectItem value="month">Dieser Monat</SelectItem>
                  <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedPeriod === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Von:</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Bis:</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
            <div className="text-sm text-gray-500">
              {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zusammenfassung */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Mitarbeiter</p>
                <p className="text-xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-xs text-muted-foreground">Geplant</p>
                <p className="text-xl font-bold">{totalPlannedHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Gearbeitet</p>
                <p className="text-xl font-bold">{totalActualHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={totalConflicts > 0 ? 'border-orange-300' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${totalConflicts > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Konflikte</p>
                <p className={`text-xl font-bold ${totalConflicts > 0 ? 'text-orange-600' : ''}`}>{totalConflicts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={totalUnreviewed > 0 ? 'border-yellow-300' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className={`h-5 w-5 ${totalUnreviewed > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Unbestätigt</p>
                <p className={`text-xl font-bold ${totalUnreviewed > 0 ? 'text-yellow-600' : ''}`}>{totalUnreviewed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Zuschläge</p>
                <p className="text-xl font-bold">{totalSurcharges.toFixed(0)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mitarbeiter-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Mitarbeiter-Auswertung</CardTitle>
          <CardDescription>
            Detaillierte Stundenübersicht pro Mitarbeiter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">Mitarbeiter</th>
                  <th className="text-right py-3 px-2 font-medium">Plan</th>
                  <th className="text-right py-3 px-2 font-medium">Ist</th>
                  <th className="text-right py-3 px-2 font-medium">Diff</th>
                  <th className="text-right py-3 px-2 font-medium">AZK</th>
                  <th className="text-center py-3 px-2 font-medium">Konflikte</th>
                  <th className="text-center py-3 px-2 font-medium">Offen</th>
                  <th className="text-right py-3 px-2 font-medium">Zuschläge</th>
                  <th className="text-right py-3 px-4 font-medium">Lohn (ca.)</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const evaluation = evaluations.get(emp.id || '');
                  const diff = evaluation ? evaluation.actualHours - evaluation.plannedHours : 0;
                  
                  return (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-gray-500">{emp.position}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">
                        {evaluation?.plannedHours.toFixed(1) || '-'}h
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        {evaluation?.actualHours.toFixed(1) || '-'}h
                      </td>
                      <td className={`text-right py-3 px-2 font-medium ${
                        diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}h
                      </td>
                      <td className={`text-right py-3 px-2 font-medium ${
                        (evaluation?.azkBalance || 0) >= 0 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {(evaluation?.azkBalance || 0) >= 0 ? '+' : ''}{(evaluation?.azkBalance || 0).toFixed(1)}h
                      </td>
                      <td className="text-center py-3 px-2">
                        {evaluation?.totalConflicts ? (
                          <Badge variant="destructive" className="text-xs">
                            {evaluation.totalConflicts}
                          </Badge>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {evaluation?.unreviewedEntries ? (
                          <Badge variant="secondary" className="text-xs">
                            {evaluation.unreviewedEntries}
                          </Badge>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </td>
                      <td className="text-right py-3 px-2 text-green-600">
                        +{evaluation?.totalSurcharges.toFixed(0) || 0}€
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {evaluation?.estimatedGrossPay.toFixed(0) || '-'}€
                      </td>
                      <td className="py-3 px-2">
                        <Link href={`/dashboard/company/${resolvedParams.uid}/personal/edit/${emp.id}?tab=time`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-medium">
                  <td className="py-3 px-4">Gesamt</td>
                  <td className="text-right py-3 px-2">{totalPlannedHours.toFixed(1)}h</td>
                  <td className="text-right py-3 px-2">{totalActualHours.toFixed(1)}h</td>
                  <td className={`text-right py-3 px-2 ${
                    totalActualHours - totalPlannedHours > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totalActualHours - totalPlannedHours > 0 ? '+' : ''}
                    {(totalActualHours - totalPlannedHours).toFixed(1)}h
                  </td>
                  <td className="text-right py-3 px-2">-</td>
                  <td className="text-center py-3 px-2">
                    {totalConflicts > 0 && (
                      <Badge variant="destructive">{totalConflicts}</Badge>
                    )}
                  </td>
                  <td className="text-center py-3 px-2">
                    {totalUnreviewed > 0 && (
                      <Badge variant="secondary">{totalUnreviewed}</Badge>
                    )}
                  </td>
                  <td className="text-right py-3 px-2 text-green-600">+{totalSurcharges.toFixed(0)}€</td>
                  <td className="text-right py-3 px-4">{totalEstimatedPay.toFixed(0)}€</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info-Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Gastromatic-Auswertung</h4>
              <p className="text-sm text-blue-700 mt-1">
                Diese Auswertung zeigt Plan-Ist-Vergleiche, Arbeitszeitkonflikte (nach ArbZG), 
                automatisch berechnete Zuschläge und geschätzte Lohnkosten für den gewählten Zeitraum.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

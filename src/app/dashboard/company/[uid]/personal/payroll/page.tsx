'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Euro,
  Calculator,
  FileText,
  Download,
  Upload,
  Plus,
  Edit,
  Eye,
  Send,
  Archive,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Payroll {
  id: string;
  employeeId: string;
  employee?: Employee;
  period: {
    year: number;
    month: number;
  };
  grossSalary: number;
  workingHours: number;
  overtime: number;
  deductions: {
    taxClass: string;
    incomeTax: number;
    churchTax: number;
    solidarityTax: number;
    socialSecurity: {
      pension: number;
      unemployment: number;
      health: number;
      care: number;
    };
  };
  additions: {
    bonuses: number;
    benefits: number;
    expenses: number;
  };
  netSalary: number;
  employerCosts: {
    socialSecurity: number;
    other: number;
  };
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'SENT' | 'PAID';
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

export default function PayrollPage({ params }: { params: { uid: string } }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (user && params.uid) {
      loadData();
    }
  }, [user, params.uid, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeeData = await PersonalService.getEmployees(params.uid);
      setEmployees(employeeData.filter(emp => emp.isActive));

      // TODO: Implement payroll loading from Firestore
      // const payrollData = await PayrollService.getPayrolls(params.uid, selectedMonth);
      // setPayrolls(payrollData);

      // Mock data for demo
      setPayrolls([
        {
          id: '1',
          employeeId: 'emp1',
          period: selectedMonth,
          grossSalary: 4500,
          workingHours: 160,
          overtime: 8,
          deductions: {
            taxClass: '1',
            incomeTax: 850,
            churchTax: 68,
            solidarityTax: 46.75,
            socialSecurity: {
              pension: 418.5,
              unemployment: 58.5,
              health: 328.5,
              care: 72.9,
            },
          },
          additions: {
            bonuses: 200,
            benefits: 150,
            expenses: 75,
          },
          netSalary: 2950.35,
          employerCosts: {
            socialSecurity: 878,
            other: 120,
          },
          status: 'CALCULATED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          employeeId: 'emp2',
          period: selectedMonth,
          grossSalary: 3800,
          workingHours: 160,
          overtime: 0,
          deductions: {
            taxClass: '3',
            incomeTax: 520,
            churchTax: 41.6,
            solidarityTax: 28.6,
            socialSecurity: {
              pension: 353.4,
              unemployment: 49.4,
              health: 277.4,
              care: 61.56,
            },
          },
          additions: {
            bonuses: 0,
            benefits: 100,
            expenses: 50,
          },
          netSalary: 2667.44,
          employerCosts: {
            socialSecurity: 741.4,
            other: 95,
          },
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    } catch (error) {

      toast.error('Fehler beim Laden der Gehaltsabrechnungen');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'CALCULATED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'SENT':
        return 'bg-purple-100 text-purple-800';
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Entwurf';
      case 'CALCULATED':
        return 'Berechnet';
      case 'APPROVED':
        return 'Genehmigt';
      case 'SENT':
        return 'Versendet';
      case 'PAID':
        return 'Bezahlt';
      default:
        return status;
    }
  };

  const getTotalPayrollCosts = () => {
    return payrolls.reduce(
      (sum, payroll) =>
        sum +
        payroll.grossSalary +
        payroll.employerCosts.socialSecurity +
        payroll.employerCosts.other,
      0
    );
  };

  const getTotalNetSalaries = () => {
    return payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0);
  };

  const getMonthName = (month: number) => {
    const months = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gehaltsabrechnung</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gehaltsabrechnung</h1>
          <p className="text-gray-600 mt-1">
            {getMonthName(selectedMonth.month)} {selectedMonth.year} - {payrolls.length}{' '}
            Abrechnungen
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Alle exportieren
          </Button>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Abrechnung erstellen
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Jahr</label>
              <select
                value={selectedMonth.year}
                onChange={e =>
                  setSelectedMonth(prev => ({ ...prev, year: parseInt(e.target.value) }))
                }
                className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-[#14ad9f] focus:ring-[#14ad9f]"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Monat</label>
              <select
                value={selectedMonth.month}
                onChange={e =>
                  setSelectedMonth(prev => ({ ...prev, month: parseInt(e.target.value) }))
                }
                className="block w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-[#14ad9f] focus:ring-[#14ad9f]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamtkosten</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getTotalPayrollCosts().toLocaleString()}€
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Euro className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Netto-Gehälter</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getTotalNetSalaries().toLocaleString()}€
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mitarbeiter</p>
                <p className="text-2xl font-bold text-gray-900">{payrolls.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {payrolls.filter(p => p.status === 'APPROVED' || p.status === 'PAID').length}/
                  {payrolls.length}
                </p>
              </div>
              <div className="h-12 w-12 bg-[#14ad9f] bg-opacity-20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-[#14ad9f]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Gehaltsabrechnungen
          </CardTitle>
          <CardDescription>
            Übersicht aller Gehaltsabrechnungen für {getMonthName(selectedMonth.month)}{' '}
            {selectedMonth.year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrolls.map(payroll => {
              const employee = employees.find(emp => emp.id === payroll.employeeId);

              return (
                <div
                  key={payroll.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={employee?.avatar} />
                        <AvatarFallback className="bg-[#14ad9f] text-white">
                          {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {employee
                            ? `${employee.firstName} ${employee.lastName}`
                            : 'Unbekannter Mitarbeiter'}
                        </h4>
                        <p className="text-sm text-gray-600">{employee?.position}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Brutto</p>
                        <p className="font-medium">{payroll.grossSalary.toLocaleString()}€</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Netto</p>
                        <p className="font-medium text-green-600">
                          {payroll.netSalary.toLocaleString()}€
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">AG-Kosten</p>
                        <p className="font-medium text-red-600">
                          {(
                            payroll.grossSalary +
                            payroll.employerCosts.socialSecurity +
                            payroll.employerCosts.other
                          ).toLocaleString()}
                          €
                        </p>
                      </div>
                      <div>
                        <Badge className={getStatusColor(payroll.status)}>
                          {getStatusLabel(payroll.status)}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayroll(payroll);
                            setShowPayrollDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Details Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gehaltsabrechnung Details</DialogTitle>
            <DialogDescription>Detaillierte Ansicht der Gehaltsabrechnung</DialogDescription>
          </DialogHeader>

          {selectedPayroll && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={employees.find(emp => emp.id === selectedPayroll.employeeId)?.avatar}
                  />
                  <AvatarFallback className="bg-[#14ad9f] text-white text-lg">
                    {employees.find(emp => emp.id === selectedPayroll.employeeId)?.firstName[0]}
                    {employees.find(emp => emp.id === selectedPayroll.employeeId)?.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {employees.find(emp => emp.id === selectedPayroll.employeeId)?.firstName}{' '}
                    {employees.find(emp => emp.id === selectedPayroll.employeeId)?.lastName}
                  </h3>
                  <p className="text-gray-600">
                    {employees.find(emp => emp.id === selectedPayroll.employeeId)?.position}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getMonthName(selectedPayroll.period.month)} {selectedPayroll.period.year}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge className={getStatusColor(selectedPayroll.status)}>
                    {getStatusLabel(selectedPayroll.status)}
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Zusammenfassung</TabsTrigger>
                  <TabsTrigger value="deductions">Abzüge</TabsTrigger>
                  <TabsTrigger value="employer">AG-Kosten</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Grunddaten</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Bruttogehalt:</span>
                          <span className="font-medium">
                            {selectedPayroll.grossSalary.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arbeitsstunden:</span>
                          <span>{selectedPayroll.workingHours}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Überstunden:</span>
                          <span>{selectedPayroll.overtime}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Steuerklasse:</span>
                          <span>{selectedPayroll.deductions.taxClass}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Zusätze</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Bonuszahlungen:</span>
                          <span className="font-medium text-green-600">
                            +{selectedPayroll.additions.bonuses.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Benefits:</span>
                          <span className="font-medium text-green-600">
                            +{selectedPayroll.additions.benefits.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Erstattungen:</span>
                          <span className="font-medium text-green-600">
                            +{selectedPayroll.additions.expenses.toLocaleString()}€
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Netto-Gehalt:</span>
                      <span className="text-green-600">
                        {selectedPayroll.netSalary.toLocaleString()}€
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="deductions" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Steuern</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Lohnsteuer:</span>
                          <span className="text-red-600">
                            -{selectedPayroll.deductions.incomeTax.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kirchensteuer:</span>
                          <span className="text-red-600">
                            -{selectedPayroll.deductions.churchTax.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Solidaritätszuschlag:</span>
                          <span className="text-red-600">
                            -{selectedPayroll.deductions.solidarityTax.toLocaleString()}€
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Sozialversicherung (AN-Anteil)
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Rentenversicherung:</span>
                          <span className="text-red-600">
                            -{selectedPayroll.deductions.socialSecurity.pension.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arbeitslosenversicherung:</span>
                          <span className="text-red-600">
                            -
                            {selectedPayroll.deductions.socialSecurity.unemployment.toLocaleString()}
                            €
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Krankenversicherung:</span>
                          <span className="text-red-600">
                            -{selectedPayroll.deductions.socialSecurity.health.toLocaleString()}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pflegeversicherung:</span>
                          <span className="text-red-600">
                            -{selectedPayroll.deductions.socialSecurity.care.toLocaleString()}€
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="employer" className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Arbeitgeber-Kosten</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Bruttogehalt:</span>
                        <span>{selectedPayroll.grossSalary.toLocaleString()}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AG-Anteil Sozialversicherung:</span>
                        <span className="text-red-600">
                          +{selectedPayroll.employerCosts.socialSecurity.toLocaleString()}€
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sonstige Kosten:</span>
                        <span className="text-red-600">
                          +{selectedPayroll.employerCosts.other.toLocaleString()}€
                        </span>
                      </div>
                      <div className="border-t pt-2 font-semibold">
                        <div className="flex justify-between">
                          <span>Gesamtkosten Arbeitgeber:</span>
                          <span className="text-red-600">
                            {(
                              selectedPayroll.grossSalary +
                              selectedPayroll.employerCosts.socialSecurity +
                              selectedPayroll.employerCosts.other
                            ).toLocaleString()}
                            €
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF erstellen
                  </Button>
                  <Button variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Per E-Mail senden
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPayrollDialog(false)}>
                    Schließen
                  </Button>
                  {selectedPayroll.status === 'CALCULATED' && (
                    <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                      Genehmigen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* No Payrolls State */}
      {payrolls.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Gehaltsabrechnungen</h3>
            <p className="text-gray-600 mb-6">
              Für {getMonthName(selectedMonth.month)} {selectedMonth.year} wurden noch keine
              Gehaltsabrechnungen erstellt.
            </p>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              Abrechnungen erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Upload,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Send,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calculator,
  TrendingUp,
  Euro,
  Briefcase,
  Moon,
  Sun,
  Coffee,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { PersonalService, Employee, TimeEntry } from '@/services/personalService';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Zuschlagsarten
interface Surcharge {
  id: string;
  name: string;
  type: 'NIGHT' | 'SUNDAY' | 'HOLIDAY' | 'OVERTIME' | 'CUSTOM';
  percentage: number;
  startTime?: string;
  endTime?: string;
}

// Lohnabrechnungsdaten pro Mitarbeiter
interface PayrollData {
  employeeId: string;
  employee: Employee;
  month: string;
  year: number;
  
  // Arbeitszeiten
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  sundayHours: number;
  holidayHours: number;
  
  // Abwesenheiten
  vacationDays: number;
  sickDays: number;
  
  // Beträge
  baseSalary: number;
  overtimePay: number;
  nightSurcharge: number;
  sundaySurcharge: number;
  holidaySurcharge: number;
  totalGross: number;
  
  // Status
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'EXPORTED';
  reviewedBy?: string;
  reviewedAt?: string;
  exportedAt?: string;
}

const months = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function PayrollPage() {
  const params = useParams();
  const companyId = params.uid as string;

  // State
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  // Zuschlagseinstellungen
  const [surcharges, setSurcharges] = useState<Surcharge[]>([
    { id: '1', name: 'Nachtzuschlag', type: 'NIGHT', percentage: 25, startTime: '22:00', endTime: '06:00' },
    { id: '2', name: 'Sonntagszuschlag', type: 'SUNDAY', percentage: 50 },
    { id: '3', name: 'Feiertagszuschlag', type: 'HOLIDAY', percentage: 100 },
    { id: '4', name: 'Überstundenzuschlag', type: 'OVERTIME', percentage: 25 },
  ]);

  // Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Mitarbeiter laden
      const employeeList = await PersonalService.getEmployees(companyId);
      const activeEmployees = employeeList.filter(emp => emp.isActive);
      setEmployees(activeEmployees);

      // Zeiteinträge für den Monat laden
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      
      const entries = await PersonalService.getTimeEntries(
        companyId,
        undefined,
        startDate,
        endDate
      );
      setTimeEntries(entries);

      // Payroll-Daten berechnen
      const payroll = calculatePayrollData(activeEmployees, entries);
      setPayrollData(payroll);

    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Payroll-Daten berechnen
  const calculatePayrollData = (employees: Employee[], entries: TimeEntry[]): PayrollData[] => {
    return employees.map(employee => {
      const empEntries = entries.filter(e => e.employeeId === employee.id);
      
      // Stunden berechnen
      let regularHours = 0;
      let overtimeHours = 0;
      let nightHours = 0;
      let sundayHours = 0;
      let holidayHours = 0;

      empEntries.forEach(entry => {
        const duration = (entry.duration || 0) / 60; // In Stunden
        
        if (entry.category === 'WORK') {
          // Prüfe auf Nachtarbeit
          if (entry.startTime) {
            const startHour = parseInt(entry.startTime.split(':')[0]);
            if (startHour >= 22 || startHour < 6) {
              nightHours += duration * 0.5; // Vereinfacht
            }
          }
          
          // Prüfe auf Sonntag
          const entryDate = new Date(entry.date);
          if (entryDate.getDay() === 0) {
            sundayHours += duration;
          }
          
          regularHours += duration;
        }
      });

      // Überstunden berechnen
      const weeklyTarget = employee.workingHours.weekly || 40;
      const monthlyTarget = weeklyTarget * 4.33;
      if (regularHours > monthlyTarget) {
        overtimeHours = regularHours - monthlyTarget;
        regularHours = monthlyTarget;
      }

      // Stundensatz berechnen
      const hourlyRate = employee.hourlyRate || (employee.grossSalary / 160);

      // Zuschläge berechnen
      const nightSurcharge = nightHours * hourlyRate * 0.25;
      const sundaySurcharge = sundayHours * hourlyRate * 0.50;
      const holidaySurcharge = holidayHours * hourlyRate * 1.00;
      const overtimePay = overtimeHours * hourlyRate * 1.25;

      // Basislohn
      const baseSalary = employee.employmentType === 'FULL_TIME' 
        ? employee.grossSalary 
        : regularHours * hourlyRate;

      return {
        employeeId: employee.id!,
        employee,
        month: months[selectedMonth],
        year: selectedYear,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        nightHours: Math.round(nightHours * 100) / 100,
        sundayHours: Math.round(sundayHours * 100) / 100,
        holidayHours: Math.round(holidayHours * 100) / 100,
        vacationDays: 0, // TODO: Aus Abwesenheiten berechnen
        sickDays: 0,
        baseSalary: Math.round(baseSalary * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        nightSurcharge: Math.round(nightSurcharge * 100) / 100,
        sundaySurcharge: Math.round(sundaySurcharge * 100) / 100,
        holidaySurcharge: Math.round(holidaySurcharge * 100) / 100,
        totalGross: Math.round((baseSalary + overtimePay + nightSurcharge + sundaySurcharge + holidaySurcharge) * 100) / 100,
        status: 'DRAFT',
      };
    });
  };

  // Navigation
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // DATEV-Export generieren
  const generateDatevExport = async () => {
    try {
      setExporting(true);

      const exportData = payrollData
        .filter(p => selectedEmployees.size === 0 || selectedEmployees.has(p.employeeId))
        .map(p => ({
          // DATEV-Felder
          Personalnummer: p.employee.employeeNumber || p.employeeId,
          Name: `${p.employee.lastName}, ${p.employee.firstName}`,
          Abrechnungsmonat: `${selectedMonth + 1}/${selectedYear}`,
          Bruttogehalt: p.baseSalary.toFixed(2).replace('.', ','),
          Überstunden_Stunden: p.overtimeHours.toFixed(2).replace('.', ','),
          Überstunden_Betrag: p.overtimePay.toFixed(2).replace('.', ','),
          Nachtzuschlag: p.nightSurcharge.toFixed(2).replace('.', ','),
          Sonntagszuschlag: p.sundaySurcharge.toFixed(2).replace('.', ','),
          Feiertagszuschlag: p.holidaySurcharge.toFixed(2).replace('.', ','),
          Gesamt_Brutto: p.totalGross.toFixed(2).replace('.', ','),
          Urlaubstage: p.vacationDays,
          Krankheitstage: p.sickDays,
          Arbeitsstunden: p.regularHours.toFixed(2).replace('.', ','),
        }));

      // CSV erstellen
      const headers = Object.keys(exportData[0] || {}).join(';');
      const rows = exportData.map(row => Object.values(row).join(';'));
      const csv = [headers, ...rows].join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DATEV_Lohnexport_${months[selectedMonth]}_${selectedYear}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      // Status aktualisieren
      toast.success('DATEV-Export erfolgreich erstellt');
      setShowExportModal(false);

    } catch (error) {
      toast.error('Fehler beim Export');
    } finally {
      setExporting(false);
    }
  };

  // Excel-Export generieren
  const generateExcelExport = async () => {
    try {
      setExporting(true);

      const exportData = payrollData
        .filter(p => selectedEmployees.size === 0 || selectedEmployees.has(p.employeeId))
        .map(p => ({
          Mitarbeiter: `${p.employee.firstName} ${p.employee.lastName}`,
          Position: p.employee.position,
          Abteilung: p.employee.department,
          Arbeitsstunden: p.regularHours,
          Überstunden: p.overtimeHours,
          Nachtstunden: p.nightHours,
          Sonntagsstunden: p.sundayHours,
          Urlaubstage: p.vacationDays,
          Krankheitstage: p.sickDays,
          Grundgehalt: p.baseSalary,
          'Überstunden-Vergütung': p.overtimePay,
          Nachtzuschlag: p.nightSurcharge,
          Sonntagszuschlag: p.sundaySurcharge,
          'Brutto Gesamt': p.totalGross,
        }));

      // CSV erstellen
      const headers = Object.keys(exportData[0] || {}).join(';');
      const rows = exportData.map(row => Object.values(row).join(';'));
      const csv = [headers, ...rows].join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lohnabrechnung_${months[selectedMonth]}_${selectedYear}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Export erfolgreich erstellt');
      setShowExportModal(false);

    } catch (error) {
      toast.error('Fehler beim Export');
    } finally {
      setExporting(false);
    }
  };

  // Alle auswählen
  const toggleAllEmployees = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.id!)));
    }
  };

  // Statistiken
  const stats = {
    totalGross: payrollData.reduce((sum, p) => sum + p.totalGross, 0),
    totalHours: payrollData.reduce((sum, p) => sum + p.regularHours + p.overtimeHours, 0),
    totalOvertime: payrollData.reduce((sum, p) => sum + p.overtimeHours, 0),
    avgHours: payrollData.length > 0 ? payrollData.reduce((sum, p) => sum + p.regularHours, 0) / payrollData.length : 0,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lohnvorbereitung</h1>
          <p className="text-gray-500">
            Stundenauswertung und Lohnexport für {months[selectedMonth]} {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Monatsnavigation */}
          <div className="flex items-center bg-white border rounded-lg">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-4 text-sm font-medium">
              {months[selectedMonth]} {selectedYear}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Gesamt Brutto</p>
                <p className="text-lg font-semibold">{stats.totalGross.toLocaleString('de-DE')} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Gesamtstunden</p>
                <p className="text-lg font-semibold">{Math.round(stats.totalHours)} h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Überstunden</p>
                <p className="text-lg font-semibold">{Math.round(stats.totalOvertime)} h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Mitarbeiter</p>
                <p className="text-lg font-semibold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="surcharges">Zuschläge</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        {/* Übersicht Tab */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedEmployees.size === employees.length}
                          onCheckedChange={toggleAllEmployees}
                        />
                      </TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead className="text-right">Std.</TableHead>
                      <TableHead className="text-right">Überst.</TableHead>
                      <TableHead className="text-right">Nacht</TableHead>
                      <TableHead className="text-right">Sonntag</TableHead>
                      <TableHead className="text-right">Grundgehalt</TableHead>
                      <TableHead className="text-right">Zuschläge</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.map(data => (
                      <TableRow key={data.employeeId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEmployees.has(data.employeeId)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedEmployees);
                              if (checked) {
                                newSet.add(data.employeeId);
                              } else {
                                newSet.delete(data.employeeId);
                              }
                              setSelectedEmployees(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={data.employee.avatar} />
                              <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xs">
                                {data.employee.firstName[0]}{data.employee.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {data.employee.firstName} {data.employee.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{data.employee.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {data.regularHours.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {data.overtimeHours > 0 && (
                            <span className="text-orange-600">+{data.overtimeHours.toFixed(1)}</span>
                          )}
                          {data.overtimeHours === 0 && '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {data.nightHours > 0 ? data.nightHours.toFixed(1) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {data.sundayHours > 0 ? data.sundayHours.toFixed(1) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {data.baseSalary.toLocaleString('de-DE')} €
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {(data.overtimePay + data.nightSurcharge + data.sundaySurcharge + data.holidaySurcharge) > 0 && (
                            <span className="text-green-600">
                              +{(data.overtimePay + data.nightSurcharge + data.sundaySurcharge + data.holidaySurcharge).toLocaleString('de-DE')} €
                            </span>
                          )}
                          {(data.overtimePay + data.nightSurcharge + data.sundaySurcharge + data.holidaySurcharge) === 0 && '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {data.totalGross.toLocaleString('de-DE')} €
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            data.status === 'APPROVED' ? 'default' :
                            data.status === 'EXPORTED' ? 'secondary' : 'outline'
                          } className={
                            data.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''
                          }>
                            {data.status === 'DRAFT' ? 'Entwurf' :
                             data.status === 'REVIEWED' ? 'Geprüft' :
                             data.status === 'APPROVED' ? 'Freigegeben' : 'Exportiert'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayroll(data);
                              setShowDetailModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zuschläge Tab */}
        <TabsContent value="surcharges">
          <Card>
            <CardHeader>
              <CardTitle>Zuschlagseinstellungen</CardTitle>
              <CardDescription>
                Definieren Sie die Zuschläge für Nacht-, Sonntags- und Feiertagsarbeit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {surcharges.map(surcharge => (
                  <div key={surcharge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {surcharge.type === 'NIGHT' && <Moon className="w-5 h-5 text-indigo-500" />}
                      {surcharge.type === 'SUNDAY' && <Sun className="w-5 h-5 text-orange-500" />}
                      {surcharge.type === 'HOLIDAY' && <Calendar className="w-5 h-5 text-red-500" />}
                      {surcharge.type === 'OVERTIME' && <Clock className="w-5 h-5 text-blue-500" />}
                      <div>
                        <p className="font-medium">{surcharge.name}</p>
                        {surcharge.startTime && surcharge.endTime && (
                          <p className="text-sm text-gray-500">
                            {surcharge.startTime} - {surcharge.endTime}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg font-semibold">
                        +{surcharge.percentage}%
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Einstellungen Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Export-Einstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie den DATEV-Export und andere Einstellungen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-medium">DATEV-Export</h4>
                    <p className="text-sm text-gray-500">
                      Exportieren Sie Lohndaten im DATEV-kompatiblen Format
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Berater-Nummer</Label>
                    <Input placeholder="z.B. 12345" />
                  </div>
                  <div>
                    <Label>Mandanten-Nummer</Label>
                    <Input placeholder="z.B. 67890" />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-4">Automatische Berechnung</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="auto-night" defaultChecked />
                    <label htmlFor="auto-night" className="text-sm">Nachtzuschläge automatisch berechnen</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="auto-overtime" defaultChecked />
                    <label htmlFor="auto-overtime" className="text-sm">Überstunden automatisch ermitteln</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="auto-sunday" defaultChecked />
                    <label htmlFor="auto-sunday" className="text-sm">Sonntagsarbeit automatisch erkennen</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lohndaten exportieren</DialogTitle>
            <DialogDescription>
              Wählen Sie das Exportformat für {months[selectedMonth]} {selectedYear}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              {selectedEmployees.size > 0 
                ? `${selectedEmployees.size} Mitarbeiter ausgewählt`
                : 'Alle Mitarbeiter werden exportiert'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                onClick={generateDatevExport}
                disabled={exporting}
              >
                <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                <h4 className="font-medium">DATEV-Export</h4>
                <p className="text-sm text-gray-500">Für Ihren Steuerberater</p>
              </button>

              <button
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                onClick={generateExcelExport}
                disabled={exporting}
              >
                <FileText className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-medium">Excel/CSV</h4>
                <p className="text-sm text-gray-500">Detaillierte Übersicht</p>
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Lohndetails - {selectedPayroll?.employee.firstName} {selectedPayroll?.employee.lastName}
            </DialogTitle>
            <DialogDescription>
              {months[selectedMonth]} {selectedYear}
            </DialogDescription>
          </DialogHeader>

          {selectedPayroll && (
            <div className="space-y-6">
              {/* Arbeitszeiten */}
              <div>
                <h4 className="font-medium mb-3">Arbeitszeiten</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Regulär</p>
                    <p className="text-lg font-semibold">{selectedPayroll.regularHours.toFixed(1)} h</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-gray-500">Überstunden</p>
                    <p className="text-lg font-semibold text-orange-600">{selectedPayroll.overtimeHours.toFixed(1)} h</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-gray-500">Nachtarbeit</p>
                    <p className="text-lg font-semibold text-indigo-600">{selectedPayroll.nightHours.toFixed(1)} h</p>
                  </div>
                </div>
              </div>

              {/* Vergütung */}
              <div>
                <h4 className="font-medium mb-3">Vergütung</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Grundgehalt</span>
                    <span className="font-medium">{selectedPayroll.baseSalary.toLocaleString('de-DE')} €</span>
                  </div>
                  {selectedPayroll.overtimePay > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Überstundenvergütung</span>
                      <span className="font-medium text-green-600">+{selectedPayroll.overtimePay.toLocaleString('de-DE')} €</span>
                    </div>
                  )}
                  {selectedPayroll.nightSurcharge > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Nachtzuschlag</span>
                      <span className="font-medium text-green-600">+{selectedPayroll.nightSurcharge.toLocaleString('de-DE')} €</span>
                    </div>
                  )}
                  {selectedPayroll.sundaySurcharge > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Sonntagszuschlag</span>
                      <span className="font-medium text-green-600">+{selectedPayroll.sundaySurcharge.toLocaleString('de-DE')} €</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 bg-gray-50 rounded-lg px-3 font-semibold">
                    <span>Brutto Gesamt</span>
                    <span className="text-[#14ad9f]">{selectedPayroll.totalGross.toLocaleString('de-DE')} €</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

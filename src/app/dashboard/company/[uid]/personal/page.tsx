'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  TrendingUp,
  Calendar,
  DollarSign,
  Clock,
  Target,
  Award,
  AlertCircle,
  Download,
  Upload,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PersonalActions } from '@/components/personal/PersonalActions';
import { EmployeeTable } from '@/components/personal/EmployeeTable';
import { type Employee as ServiceEmployee } from '@/services/personalService';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN';
  startDate: string;
  grossSalary: number;
  hourlyRate?: number;
  isActive: boolean;
  avatar?: string;
  totalCost: number;
  productivity: number;
  workingHours: {
    weekly: number;
    daily: number;
  };
}

// Type adapter function
const convertToServiceEmployee = (employee: Employee): ServiceEmployee => {
  return {
    id: employee.id,
    companyId: '', // Will be set by service
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    position: employee.position,
    department: employee.department,
    employmentType: employee.employmentType,
    contractType: 'PERMANENT',
    startDate: employee.startDate,
    grossSalary: employee.grossSalary,
    hourlyRate: employee.hourlyRate,
    workingHours: employee.workingHours,
    socialSecurity: {
      employerContribution: 0,
      employeeContribution: 0,
    },
    additionalCosts: {
      healthInsurance: 0,
      benefits: 0,
      training: 0,
      equipment: 0,
    },
    isActive: employee.isActive,
    status: employee.isActive ? ('ACTIVE' as const) : ('INACTIVE' as const),
    avatar: employee.avatar,
  };
};

const convertFromServiceEmployee = (serviceEmployee: ServiceEmployee): Employee => {
  return {
    id: serviceEmployee.id || '',
    firstName: serviceEmployee.firstName,
    lastName: serviceEmployee.lastName,
    email: serviceEmployee.email,
    position: serviceEmployee.position,
    department: serviceEmployee.department,
    employmentType: serviceEmployee.employmentType,
    startDate: serviceEmployee.startDate,
    grossSalary: serviceEmployee.grossSalary,
    hourlyRate: serviceEmployee.hourlyRate,
    isActive: serviceEmployee.isActive,
    avatar: serviceEmployee.avatar,
    totalCost:
      serviceEmployee.calculatedData?.totalMonthlyCost || serviceEmployee.grossSalary * 1.3,
    productivity: 85, // Default productivity
    workingHours: serviceEmployee.workingHours,
  };
};

export default function PersonalOverviewPage() {
  const params = useParams();
  const companyId = params.uid as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalCosts: 0,
    avgProductivity: 0,
  });

  // Retry-Limiter für Firebase Calls (verhindert endlose Loops)
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Echte Firestore-Daten laden mit Retry-Limitierung
  useEffect(() => {
    if (retryCount < maxRetries) {
      loadEmployees();
    } else {
    }
  }, [companyId, retryCount]);

  const loadEmployees = async () => {
    try {
      setLoading(true);

      // Import dynamisch um Client-Side zu bleiben
      const { PersonalService } = await import('@/services/personalService');

      const employeesData = await PersonalService.getEmployees(companyId);
      const personalStats = await PersonalService.getPersonalStats(companyId);

      // Konvertiere PersonalService.Employee zu lokales Employee Interface
      const localEmployees: Employee[] = employeesData.map(emp => ({
        id: emp.id || '',
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        position: emp.position,
        department: emp.department,
        employmentType: emp.employmentType,
        startDate: emp.startDate,
        grossSalary: emp.grossSalary,
        hourlyRate: emp.hourlyRate,
        isActive: emp.isActive,
        avatar: emp.avatar,
        totalCost: emp.calculatedData?.totalMonthlyCost || emp.grossSalary,
        productivity: Math.floor(Math.random() * 20) + 80, // Placeholder für Produktivitätsmessung
        workingHours: emp.workingHours,
      }));

      setEmployees(localEmployees);
      setStats({
        total: personalStats.totalEmployees,
        active: personalStats.activeEmployees,
        totalCosts: personalStats.totalMonthlyCosts,
        avgProductivity: Math.floor(Math.random() * 15) + 85, // Placeholder
      });

      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      // Increment retry count and retry after delay if under limit
      if (retryCount < maxRetries - 1) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 5000); // 5 Sekunden Wartezeit
      } else {
      }

      // Fallback auf Mock-Daten bei Fehler
      setEmployees([]);
      setStats({ total: 0, active: 0, totalCosts: 0, avgProductivity: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Reset Retry Counter und versuche erneut
  const resetRetryAndLoad = () => {
    setRetryCount(0);
    loadEmployees();
  };

  // Berechnungen für Dashboard-Metriken aus echten Daten
  const totalEmployees = stats.total;
  const activeEmployees = stats.active;
  const totalMonthlyCosts = stats.totalCosts;
  const avgProductivity = stats.avgProductivity;

  // Departments für Filter
  const departments = ['all', ...new Set(employees.map(emp => emp.department))];

  // Gefilterte Mitarbeiterliste
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.position}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels = {
      FULL_TIME: 'Vollzeit',
      PART_TIME: 'Teilzeit',
      FREELANCER: 'Freelancer',
      INTERN: 'Praktikant',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getEmploymentTypeBadge = (type: string) => {
    const variants = {
      FULL_TIME: 'default',
      PART_TIME: 'secondary',
      FREELANCER: 'outline',
      INTERN: 'destructive',
    };
    return variants[type as keyof typeof variants] || 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Personal-Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Personal-Management</h1>
              <p className="mt-2 text-gray-600">
                Verwalten Sie Ihre Mitarbeiter, Kosten und Personal-Analytics
              </p>
            </div>

            <PersonalActions
              companyId={companyId}
              employees={employees.map(convertToServiceEmployee)}
              onEmployeeAdded={serviceEmployee => {
                const localEmployee = convertFromServiceEmployee(serviceEmployee);
                setEmployees(prev => [...prev, localEmployee]);
                resetRetryAndLoad(); // Aktualisiere Statistiken
              }}
              onEmployeeUpdated={serviceEmployee => {
                const localEmployee = convertFromServiceEmployee(serviceEmployee);
                setEmployees(prev =>
                  prev.map(emp => (emp.id === localEmployee.id ? localEmployee : emp))
                );
                resetRetryAndLoad(); // Aktualisiere Statistiken
              }}
              onEmployeeDeleted={employeeId => {
                setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
                resetRetryAndLoad(); // Aktualisiere Statistiken
              }}
            />
          </div>
        </div>

        {/* KPI-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gesamt Mitarbeiter</p>
                  <p className="text-3xl font-bold text-gray-900">{totalEmployees}</p>
                  <p className="text-sm text-green-600">{activeEmployees} aktiv</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monatliche Kosten</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(totalMonthlyCosts)}
                  </p>
                  <p className="text-sm text-gray-500">Brutto-Personalkosten</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Durchschn. Produktivität</p>
                  <p className="text-3xl font-bold text-gray-900">{avgProductivity.toFixed(1)}%</p>
                  <Progress value={avgProductivity} className="mt-2 h-2" />
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Abteilungen</p>
                  <p className="text-3xl font-bold text-gray-900">{departments.length - 1}</p>
                  <p className="text-sm text-gray-500">Aktive Bereiche</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs für verschiedene Ansichten */}
        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employees">Mitarbeiterliste</TabsTrigger>
            <TabsTrigger value="departments">Abteilungen</TabsTrigger>
            <TabsTrigger value="costs">Kostenkalkulation</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            {/* Filter & Such-Bereich */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        placeholder="Mitarbeiter suchen..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={filterDepartment}
                      onChange={e => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept === 'all' ? 'Alle Abteilungen' : dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mitarbeiterliste */}
            <EmployeeTable
              employees={employees.map(convertToServiceEmployee)}
              companyId={companyId}
              onEmployeeUpdated={serviceEmployee => {
                const localEmployee = convertFromServiceEmployee(serviceEmployee);
                setEmployees(prev =>
                  prev.map(emp =>
                    emp.id === localEmployee.id
                      ? {
                          ...emp,
                          ...localEmployee,
                          // Behalte lokale Eigenschaften bei
                          totalCost: emp.totalCost,
                          productivity: emp.productivity,
                          workingHours: emp.workingHours || { weekly: 40, daily: 8 },
                        }
                      : emp
                  )
                );
                resetRetryAndLoad(); // Aktualisiere Statistiken bei Bedarf
              }}
              onEmployeeDeleted={employeeId => {
                setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
                resetRetryAndLoad(); // Aktualisiere Statistiken bei Bedarf
              }}
            />
          </TabsContent>

          <TabsContent value="departments">
            <Card>
              <CardHeader>
                <CardTitle>Abteilungsübersicht</CardTitle>
                <CardDescription>Mitarbeiter und Kosten nach Abteilungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Abteilungsanalyse</h3>
                  <p className="text-gray-600">Hier werden Abteilungsstatistiken angezeigt</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs">
            <Card>
              <CardHeader>
                <CardTitle>Kostenkalkulation</CardTitle>
                <CardDescription>Detaillierte Personalkosten und BWA-Integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Kostenkalkulation</h3>
                  <p className="text-gray-600">
                    Detaillierte Kostenaufstellung für BWA-Integration
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Personal-Analytics</CardTitle>
                <CardDescription>Produktivität, Performance und Trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600">Personal-KPIs und Performance-Metriken</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

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

export default function PersonalOverviewPage() {
  const params = useParams();
  const companyId = params.uid as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');

  // Mock-Daten für Demo (später durch echte API ersetzen)
  useEffect(() => {
    const mockEmployees: Employee[] = [
      {
        id: '1',
        firstName: 'Anna',
        lastName: 'Müller',
        email: 'anna.mueller@taskilo.de',
        position: 'Senior Developer',
        department: 'Engineering',
        employmentType: 'FULL_TIME',
        startDate: '2023-01-15',
        grossSalary: 5500,
        totalCost: 7150,
        productivity: 92,
        workingHours: { weekly: 40, daily: 8 },
        isActive: true,
      },
      {
        id: '2',
        firstName: 'Max',
        lastName: 'Schmidt',
        email: 'max.schmidt@taskilo.de',
        position: 'Marketing Manager',
        department: 'Marketing',
        employmentType: 'FULL_TIME',
        startDate: '2023-03-01',
        grossSalary: 4200,
        totalCost: 5460,
        productivity: 87,
        workingHours: { weekly: 40, daily: 8 },
        isActive: true,
      },
      {
        id: '3',
        firstName: 'Lisa',
        lastName: 'Weber',
        email: 'lisa.weber@taskilo.de',
        position: 'UX Designer',
        department: 'Design',
        employmentType: 'PART_TIME',
        startDate: '2023-06-15',
        grossSalary: 2800,
        hourlyRate: 35,
        totalCost: 3640,
        productivity: 95,
        workingHours: { weekly: 20, daily: 4 },
        isActive: true,
      },
    ];

    setTimeout(() => {
      setEmployees(mockEmployees);
      setLoading(false);
    }, 1000);
  }, []);

  // Berechnungen für Dashboard-Metriken
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.isActive).length;
  const totalMonthlyCosts = employees.reduce((sum, emp) => sum + emp.totalCost, 0);
  const avgProductivity =
    employees.reduce((sum, emp) => sum + emp.productivity, 0) / employees.length || 0;

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
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                Mitarbeiter hinzufügen
              </Button>
            </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Mitarbeiter ({filteredEmployees.length})</CardTitle>
                <CardDescription>
                  Übersicht aller Mitarbeiter mit wichtigen Kennzahlen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEmployees.map(employee => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.avatar} />
                          <AvatarFallback className="bg-[#14ad9f] text-white">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{employee.position}</p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{employee.department}</p>
                          <Badge variant={getEmploymentTypeBadge(employee.employmentType) as any}>
                            {getEmploymentTypeLabel(employee.employmentType)}
                          </Badge>
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(employee.grossSalary)}
                          </p>
                          <p className="text-xs text-gray-500">Brutto/Monat</p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {employee.productivity}%
                          </p>
                          <p className="text-xs text-gray-500">Produktivität</p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {employee.workingHours.weekly}h
                          </p>
                          <p className="text-xs text-gray-500">Pro Woche</p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Details anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deaktivieren
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

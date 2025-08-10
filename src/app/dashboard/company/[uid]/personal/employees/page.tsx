'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee, PersonalStats } from '@/services/personalService';
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
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Euro,
  Clock,
  UserCheck,
  UserX,
  Plus,
  Download,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function EmployeesPage({ params }: { params: { uid: string } }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Retry-Limiter für Firebase Calls (verhindert endlose Loops)
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (user && params.uid && retryCount < maxRetries) {
      loadEmployees();
    } else if (retryCount >= maxRetries) {
      console.warn('❌ Max Retries erreicht für Employee loading');
    }
  }, [user, params.uid, retryCount]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      console.log(
        `🔄 Lade Mitarbeiter für Company: ${params.uid} (Versuch ${retryCount + 1}/${maxRetries})`
      );
      const data = await PersonalService.getEmployees(params.uid);
      setEmployees(data);
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Mitarbeiter:', error);

      // Increment retry count and retry after delay if under limit
      if (retryCount < maxRetries - 1) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 5000); // 5 Sekunden Wartezeit
      } else {
        console.warn('❌ Max Retries erreicht - verwende Fallback-Daten');
        toast.error('Mitarbeiter konnten nicht geladen werden');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    // Suchfilter
    if (searchTerm) {
      filtered = filtered.filter(
        emp =>
          emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Abteilungsfilter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    // Statusfilter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(emp => emp.isActive);
      } else {
        filtered = filtered.filter(emp => !emp.isActive);
      }
    }

    setFilteredEmployees(filtered);
  };

  const handleDeactivateEmployee = async (employee: Employee) => {
    try {
      await PersonalService.deactivateEmployee(params.uid, employee.id!);
      toast.success(`${employee.firstName} ${employee.lastName} wurde deaktiviert`);
      loadEmployees();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('❌ Fehler beim Deaktivieren:', error);
      toast.error('Fehler beim Deaktivieren des Mitarbeiters');
    }
  };

  const exportEmployees = async () => {
    try {
      const csvData = await PersonalService.exportEmployeesCSV(params.uid);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mitarbeiter_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Mitarbeiterdaten exportiert');
    } catch (error) {
      console.error('❌ Export-Fehler:', error);
      toast.error('Fehler beim Export');
    }
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'FULL_TIME':
        return 'bg-green-100 text-green-800';
      case 'PART_TIME':
        return 'bg-blue-100 text-blue-800';
      case 'FREELANCER':
        return 'bg-purple-100 text-purple-800';
      case 'INTERN':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Vollzeit';
      case 'PART_TIME':
        return 'Teilzeit';
      case 'FREELANCER':
        return 'Freelancer';
      case 'INTERN':
        return 'Praktikant';
      default:
        return type;
    }
  };

  const departments = [...new Set(employees.map(emp => emp.department))];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre {employees.length} Mitarbeiter</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportEmployees} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href={`/dashboard/company/${params.uid}/personal/add`}>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Mitarbeiter hinzufügen
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Nach Namen, E-Mail oder Position suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              <option value="all">Alle Abteilungen</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Mitarbeiter-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map(employee => (
          <Card key={employee.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
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
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>
                        {employee.firstName} {employee.lastName}
                      </DialogTitle>
                      <DialogDescription>Mitarbeiterdetails und Informationen</DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Übersicht</TabsTrigger>
                        <TabsTrigger value="employment">Beschäftigung</TabsTrigger>
                        <TabsTrigger value="costs">Kosten</TabsTrigger>
                        <TabsTrigger value="documents">Dokumente</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Kontaktdaten</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span>{employee.email}</span>
                              </div>
                              {employee.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <span>{employee.phone}</span>
                                </div>
                              )}
                              {employee.address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span>
                                    {employee.address.street}, {employee.address.city}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                            <div className="space-y-2">
                              <Badge
                                className={
                                  employee.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                              </Badge>
                              <Badge className={getEmploymentTypeColor(employee.employmentType)}>
                                {getEmploymentTypeLabel(employee.employmentType)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="employment" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Beschäftigungsdetails
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Abteilung:</span>{' '}
                                {employee.department}
                              </p>
                              <p>
                                <span className="font-medium">Vertragsart:</span>{' '}
                                {employee.contractType}
                              </p>
                              <p>
                                <span className="font-medium">Startdatum:</span>{' '}
                                {employee.startDate}
                              </p>
                              {employee.endDate && (
                                <p>
                                  <span className="font-medium">Enddatum:</span> {employee.endDate}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Arbeitszeit</h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Wochenstunden:</span>{' '}
                                {employee.workingHours.weekly}h
                              </p>
                              <p>
                                <span className="font-medium">Tagesstunden:</span>{' '}
                                {employee.workingHours.daily}h
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="costs" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Gehaltskosten</h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Bruttogehalt:</span>{' '}
                                {employee.grossSalary.toLocaleString()}€
                              </p>
                              <p>
                                <span className="font-medium">AG-Anteil SV:</span>{' '}
                                {employee.socialSecurity.employerContribution.toLocaleString()}€
                              </p>
                              <p>
                                <span className="font-medium">Gesamtkosten:</span>{' '}
                                {employee.calculatedData?.totalMonthlyCost.toLocaleString()}€
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Zusatzkosten</h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Krankenversicherung:</span>{' '}
                                {employee.additionalCosts.healthInsurance.toLocaleString()}€
                              </p>
                              <p>
                                <span className="font-medium">Benefits:</span>{' '}
                                {employee.additionalCosts.benefits.toLocaleString()}€
                              </p>
                              <p>
                                <span className="font-medium">Fortbildung:</span>{' '}
                                {employee.additionalCosts.training.toLocaleString()}€
                              </p>
                              <p>
                                <span className="font-medium">Ausstattung:</span>{' '}
                                {employee.additionalCosts.equipment.toLocaleString()}€
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="space-y-4">
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            Dokumentenverwaltung wird bald verfügbar sein.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-between pt-4">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowDeleteDialog(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <UserX className="h-4 w-4" />
                        Deaktivieren
                      </Button>
                      <Link href={`/dashboard/company/${params.uid}/personal/edit/${employee.id}`}>
                        <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Bearbeiten
                        </Button>
                      </Link>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Abteilung</span>
                  <span className="text-sm font-medium">{employee.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Typ</span>
                  <Badge className={getEmploymentTypeColor(employee.employmentType)}>
                    {getEmploymentTypeLabel(employee.employmentType)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gesamtkosten</span>
                  <span className="text-sm font-medium text-[#14ad9f]">
                    {employee.calculatedData?.totalMonthlyCost.toLocaleString() ||
                      employee.grossSalary.toLocaleString()}
                    €
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge
                    className={
                      employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }
                  >
                    {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter gefunden</h3>
            <p className="text-gray-600 mb-6">
              {employees.length === 0
                ? 'Sie haben noch keine Mitarbeiter hinzugefügt.'
                : 'Keine Mitarbeiter entsprechen den aktuellen Filterkriterien.'}
            </p>
            {employees.length === 0 && (
              <Link href={`/dashboard/company/${params.uid}/personal/add`}>
                <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                  Ersten Mitarbeiter hinzufügen
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter deaktivieren</DialogTitle>
            <DialogDescription>
              Möchten Sie {selectedEmployee?.firstName} {selectedEmployee?.lastName} wirklich
              deaktivieren? Der Mitarbeiter wird nicht gelöscht, sondern nur als inaktiv markiert.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedEmployee && handleDeactivateEmployee(selectedEmployee)}
            >
              Deaktivieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

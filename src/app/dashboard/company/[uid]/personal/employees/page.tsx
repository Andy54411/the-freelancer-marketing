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
} from '@/components/ui/dialog';
import { Users, Search, Filter, Plus, Download, Upload, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function EmployeesPage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = useAuth();
  const resolvedParams = React.use(params);
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
    if (user && resolvedParams.uid && retryCount < maxRetries) {
      loadEmployees();
    } else if (retryCount >= maxRetries) {
    }
  }, [user, resolvedParams.uid, retryCount]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);

      const employeeData = await PersonalService.getEmployees(resolvedParams.uid);
      setEmployees(employeeData || []);
      setRetryCount(0); // Reset auf Erfolg
    } catch (error) {
      setRetryCount(prev => prev + 1);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(
        employee =>
          employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(employee => employee.department === departmentFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(employee =>
        statusFilter === 'active' ? employee.isActive : !employee.isActive
      );
    }

    setFilteredEmployees(filtered);
  };

  const exportEmployees = async () => {
    try {
      const csvData = employees.map(emp => ({
        Name: `${emp.firstName} ${emp.lastName}`,
        Email: emp.email,
        Telefon: emp.phone || '',
        Abteilung: emp.department,
        Position: emp.position,
        Gehalt: emp.grossSalary,
        Status: emp.isActive ? 'Aktiv' : 'Inaktiv',
        Startdatum: emp.startDate,
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `mitarbeiter-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Mitarbeiterdaten exportiert');
    } catch (error) {
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

  const handleDeactivateEmployee = async (employee: Employee) => {
    if (!employee.id) {
      toast.error('Mitarbeiter-ID nicht gefunden');
      return;
    }

    try {
      await PersonalService.updateEmployee(resolvedParams.uid, employee.id, {
        ...employee,
        isActive: false,
      });

      setEmployees(prev =>
        prev.map(emp => (emp.id === employee.id ? { ...emp, isActive: false } : emp))
      );

      setShowDeleteDialog(false);
      setSelectedEmployee(null);
      toast.success('Mitarbeiter wurde deaktiviert');
    } catch (error) {
      toast.error('Fehler beim Deaktivieren des Mitarbeiters');
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
                <div className="h-4 bg-gray-200 rounded"></div>
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
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Mitarbeiter und deren Informationen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportEmployees}>
            <Download className="h-4 w-4 mr-2" />
            Exportieren
          </Button>
          <Link href={`/dashboard/company/${resolvedParams.uid}/personal/add`}>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Mitarbeiter hinzufügen
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-[#14ad9f]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktiv</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(emp => emp.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Abteilungen</p>
                <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Kosten/Monat</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees
                    .reduce(
                      (sum, emp) => sum + (emp.calculatedData?.totalMonthlyCost || emp.grossSalary),
                      0
                    )
                    .toLocaleString()}
                  €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Mitarbeiter suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
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
                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
              >
                <option value="all">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
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
                    <Link
                      href={`/dashboard/company/${resolvedParams.uid}/personal/employees/${employee.id}`}
                      className="hover:text-[#14ad9f] transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-600">{employee.position}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Link
                  href={`/dashboard/company/${resolvedParams.uid}/personal/employees/${employee.id}`}
                >
                  <Button variant="ghost" size="sm" className="text-[#14ad9f] hover:text-[#129488]">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href={`/dashboard/company/${resolvedParams.uid}/personal/edit/${employee.id}`}
                >
                  <Button size="sm" className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                    Bearbeiten
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
              <Link href={`/dashboard/company/${resolvedParams.uid}/personal/add`}>
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

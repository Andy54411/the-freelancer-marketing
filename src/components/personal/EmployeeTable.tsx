'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import { type Employee } from '@/services/personalService';
import { DeleteEmployeeModal } from './DeleteEmployeeModal';
import Link from 'next/link';

interface EmployeeTableProps {
  employees: Employee[];
  companyId: string;
  onEmployeeUpdated: (employee: Employee) => void;
  onEmployeeDeleted: (employeeId: string) => void;
}

export function EmployeeTable({
  employees,
  companyId,
  onEmployeeUpdated,
  onEmployeeDeleted,
}: EmployeeTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states - nur noch Delete Modal benötigt
  const [showDeleteEmployee, setShowDeleteEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filtering
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch =
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && employee.isActive) ||
      (statusFilter === 'inactive' && !employee.isActive);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Unique departments for filter
  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEmploymentTypeLabel = (type: Employee['employmentType']) => {
    const labels = {
      FULL_TIME: 'Vollzeit',
      PART_TIME: 'Teilzeit',
      FREELANCER: 'Freelancer',
      INTERN: 'Praktikant',
    };
    return labels[type];
  };

  const getEmploymentTypeBadge = (type: Employee['employmentType']) => {
    const variants = {
      FULL_TIME: 'default',
      PART_TIME: 'secondary',
      FREELANCER: 'outline',
      INTERN: 'destructive',
    };
    return variants[type];
  };

  const handleEditEmployee = (employee: Employee) => {
    router.push(`/dashboard/company/${companyId}/personal/edit/${employee.id}`);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteEmployee(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    router.push(`/dashboard/company/${companyId}/personal/edit/${employee.id}`);
  };

  const handleContactEmployee = (employee: Employee, type: 'email' | 'phone') => {
    if (type === 'email') {
      window.open(`mailto:${employee.email}`, '_blank');
    } else if (type === 'phone' && employee.phone) {
      window.open(`tel:${employee.phone}`, '_blank');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Mitarbeiterliste</CardTitle>

            {/* Filter und Suche */}
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Mitarbeiter suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Abteilung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {filteredEmployees.length} von {employees.length} Mitarbeitern
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">Keine Mitarbeiter gefunden</div>
                <div className="text-sm text-gray-500">
                  {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all'
                    ? 'Versuchen Sie andere Suchkriterien'
                    : 'Fügen Sie Ihren ersten Mitarbeiter hinzu'}
                </div>
              </div>
            ) : (
              filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Employee Info */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.avatar} alt={employee.firstName} />
                      <AvatarFallback className="bg-[#14ad9f] text-white">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        {employee.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {employee.appAccess?.registered && (
                          <Smartphone className="h-4 w-4 text-blue-500" title="App-Zugang aktiv" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                      <p className="text-xs text-gray-500">{employee.email}</p>
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div className="hidden md:flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {employee.department || 'Nicht zugewiesen'}
                      </p>
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
                        {new Date(employee.startDate).toLocaleDateString('de-DE')}
                      </p>
                      <p className="text-xs text-gray-500">Startdatum</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContactEmployee(employee, 'email')}
                      className="hidden sm:flex"
                    >
                      <Mail className="h-3 w-3" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Details anzeigen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleContactEmployee(employee, 'email')}>
                          <Mail className="h-4 w-4 mr-2" />
                          E-Mail senden
                        </DropdownMenuItem>
                        {employee.phone && (
                          <DropdownMenuItem
                            onClick={() => handleContactEmployee(employee, 'phone')}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Anrufen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Modal */}
      {showDeleteEmployee && selectedEmployee && (
        <DeleteEmployeeModal
          isOpen={showDeleteEmployee}
          onClose={() => {
            setShowDeleteEmployee(false);
            setSelectedEmployee(null);
          }}
          onEmployeeDeleted={employeeId => {
            onEmployeeDeleted(employeeId);
            setShowDeleteEmployee(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          companyId={companyId}
        />
      )}
    </>
  );
}

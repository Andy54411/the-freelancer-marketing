'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Calendar,
  Download,
  Upload,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
} from 'lucide-react';
import { type Employee, type AbsenceRequest } from '@/services/personalService';
import { CreateAbsenceRequestModal } from './CreateAbsenceRequestModal';
import { AbsenceApprovalModal } from './AbsenceApprovalModal';
import { DeleteEmployeeModal } from './DeleteEmployeeModal';

interface PersonalActionsProps {
  companyId: string;
  employees: Employee[];
  departments?: string[];
  filterDepartment?: string;
  onFilterChange?: (department: string) => void;
  onRefresh?: () => void;
  onEmployeeAdded?: (employee: Employee) => void;
  onEmployeeUpdated?: (employee: Employee) => void;
  onEmployeeDeleted?: (employeeId: string) => void;
  onAbsenceRequestCreated?: (request: AbsenceRequest) => void;
  onAbsenceRequestProcessed?: (
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ) => void;
}

export function PersonalActions({
  companyId,
  employees,
  departments = [],
  filterDepartment = 'all',
  onFilterChange,
  onRefresh,
  onEmployeeAdded: _onEmployeeAdded,
  onEmployeeUpdated: _onEmployeeUpdated,
  onEmployeeDeleted,
  onAbsenceRequestCreated,
  onAbsenceRequestProcessed,
}: PersonalActionsProps) {
  // Modal States - nur noch benötigte Modals
  const [showDeleteEmployee, setShowDeleteEmployee] = useState(false);
  const [showCreateAbsenceRequest, setShowCreateAbsenceRequest] = useState(false);
  const [showAbsenceApproval, setShowAbsenceApproval] = useState(false);

  // Selected Items
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedAbsenceRequest, setSelectedAbsenceRequest] = useState<AbsenceRequest | null>(null);

  // Employee Actions - verwende jetzt Links statt Modals
  const handleEditEmployee = (_employee: Employee) => {
    // Navigation wird über Link gemacht
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteEmployee(true);
  };

  const handleViewEmployee = (_employee: Employee) => {
    // Navigation wird über Link gemacht
  };
  // Absence Actions
  const handleCreateAbsenceRequest = () => {
    setShowCreateAbsenceRequest(true);
  };

  const handleApproveAbsenceRequest = (request: AbsenceRequest) => {
    // Nur Requests mit gültiger ID können bearbeitet werden
    if (request.id) {
      setSelectedAbsenceRequest(request);
      setShowAbsenceApproval(true);
    }
  };

  // Export/Import Actions
  const handleExportEmployees = () => {
    // CSV Export Funktionalität
    const csvContent = [
      'Vorname,Nachname,E-Mail,Position,Abteilung,Beschäftigungsart,Bruttogehalt,Status',
      ...employees.map(
        emp =>
          `${emp.firstName},${emp.lastName},${emp.email},${emp.position},${emp.department || ''},${emp.employmentType},${emp.grossSalary},${emp.isActive ? 'Aktiv' : 'Inaktiv'}`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mitarbeiter_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportEmployees = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          const _csv = e.target?.result as string;
          // Hier würde die CSV-Import-Logik implementiert werden
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Utility Components
  const _EmployeeDropdownActions = ({ employee }: { employee: Employee }) => (
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
        <DropdownMenuItem>
          <Mail className="h-4 w-4 mr-2" />
          E-Mail senden
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Phone className="h-4 w-4 mr-2" />
          Kontaktieren
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDeleteEmployee(employee)} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const _AbsenceRequestActions = ({ request }: { request: AbsenceRequest }) => (
    <div className="flex gap-1">
      {request.status === 'PENDING' && (
        <>
          <Button
            size="sm"
            onClick={() => handleApproveAbsenceRequest(request)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Genehmigen
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleApproveAbsenceRequest(request)}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Ablehnen
          </Button>
        </>
      )}
      <Button size="sm" variant="outline">
        <Eye className="h-3 w-3 mr-1" />
        Details
      </Button>
    </div>
  );

  return (
    <>
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/company/${companyId}/personal/add`}>
          <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Mitarbeiter hinzufügen
          </Button>
        </Link>

        <Button
          onClick={handleCreateAbsenceRequest}
          variant="outline"
          className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Abwesenheitsantrag
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export/Import
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportEmployees}>
              <Download className="h-4 w-4 mr-2" />
              Als CSV exportieren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportEmployees}>
              <Upload className="h-4 w-4 mr-2" />
              CSV importieren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={filterDepartment !== 'all' ? 'border-[#14ad9f] text-[#14ad9f]' : ''}>
              <Filter className="h-4 w-4 mr-2" />
              {filterDepartment === 'all' ? 'Filter' : filterDepartment}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFilterChange?.('all')}>
              Alle Abteilungen
            </DropdownMenuItem>
            {departments.filter(d => d !== 'all').map(dept => (
              <DropdownMenuItem key={dept} onClick={() => onFilterChange?.(dept)}>
                {dept}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Modals - nur noch benötigte */}
      {showDeleteEmployee && selectedEmployee && (
        <DeleteEmployeeModal
          isOpen={showDeleteEmployee}
          onClose={() => {
            setShowDeleteEmployee(false);
            setSelectedEmployee(null);
          }}
          onEmployeeDeleted={employeeId => {
            onEmployeeDeleted?.(employeeId);
            setShowDeleteEmployee(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          companyId={companyId}
        />
      )}

      {showCreateAbsenceRequest && (
        <CreateAbsenceRequestModal
          isOpen={showCreateAbsenceRequest}
          onClose={() => setShowCreateAbsenceRequest(false)}
          onRequestCreated={request => {
            onAbsenceRequestCreated?.(request);
            setShowCreateAbsenceRequest(false);
          }}
          companyId={companyId}
          employees={employees.map(emp => ({
            id: emp.id!,
            firstName: emp.firstName,
            lastName: emp.lastName,
          }))}
        />
      )}

      {showAbsenceApproval && selectedAbsenceRequest && (
        <AbsenceApprovalModal
          isOpen={showAbsenceApproval}
          onClose={() => {
            setShowAbsenceApproval(false);
            setSelectedAbsenceRequest(null);
          }}
          onRequestProcessed={(requestId, status, notes) => {
            onAbsenceRequestProcessed?.(requestId, status, notes);
            setShowAbsenceApproval(false);
            setSelectedAbsenceRequest(null);
          }}
          request={selectedAbsenceRequest}
        />
      )}
    </>
  );
}

// Export individual action functions
export const PersonalActionHandlers = {
  handleAddEmployee: () => {},
};

'use client';

import React from 'react';
import { Employee } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreVertical, Edit, Mail, Phone, MapPin, Calendar, Euro, UserX } from 'lucide-react';
import Link from 'next/link';

interface EmployeeDetailsModalProps {
  employee: Employee;
  companyId: string;
  onDeactivate?: (employee: Employee) => void;
}

export default function EmployeeDetailsModal({
  employee,
  companyId,
  onDeactivate,
}: EmployeeDetailsModalProps) {
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

  return (
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
                <h4 className="font-medium text-gray-900 mb-2">Personaldaten</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Geburtsdatum:</span>{' '}
                    {employee.dateOfBirth
                      ? new Date(employee.dateOfBirth).toLocaleDateString('de-DE')
                      : 'Nicht angegeben'}
                  </p>
                  <p>
                    <span className="font-medium">Personalnummer:</span>{' '}
                    {employee.employeeNumber || 'Nicht vergeben'}
                  </p>
                  <p>
                    <span className="font-medium">Sozialversicherungsnummer:</span>{' '}
                    {employee.socialSecurityNumber || 'Nicht angegeben'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Beschäftigung</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Abteilung:</span> {employee.department}
                  </p>
                  <p>
                    <span className="font-medium">Position:</span> {employee.position}
                  </p>
                  <p>
                    <span className="font-medium">Beschäftigungsart:</span>{' '}
                    <Badge className={getEmploymentTypeColor(employee.employmentType)}>
                      {getEmploymentTypeLabel(employee.employmentType)}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium">Einstellungsdatum:</span>{' '}
                    {new Date(employee.startDate).toLocaleDateString('de-DE')}
                  </p>
                  {employee.endDate && (
                    <p>
                      <span className="font-medium">Austrittsdatum:</span>{' '}
                      {new Date(employee.endDate).toLocaleDateString('de-DE')}
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
                    <span className="font-medium">Tagesstunden:</span> {employee.workingHours.daily}
                    h
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
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Dokumente</h4>
              <div className="text-sm text-gray-600">
                <p>Dokumentenverwaltung wird in der Bearbeitungsansicht verfügbar sein.</p>
                <p className="mt-2">
                  Verfügbare Dokumenttypen: Arbeitsvertrag, Zeugnisse, Fortbildungsnachweise,
                  Gesundheitszeugnisse, etc.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onDeactivate?.(employee)}
            className="flex items-center gap-2"
          >
            <UserX className="h-4 w-4" />
            Deaktivieren
          </Button>
          <Link href={`/dashboard/company/${companyId}/personal/edit/${employee.id}`}>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Bearbeiten
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

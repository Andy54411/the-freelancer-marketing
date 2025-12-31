'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, Edit, Mail, Phone, Building, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PersonalService, Employee } from '@/services/personalService';
import Link from 'next/link';

// Importiere dieselben Tab-Komponenten wie die Edit-Seite
import BasicInfoTab from '@/components/personal/BasicInfoTab';
import DocumentsTab from '@/components/personal/DocumentsTab';
import FeedbackTab from '@/components/personal/FeedbackTab';
import TimeTrackingTab from '@/components/personal/TimeTrackingTab';
import QualificationsTab from '@/components/personal/QualificationsTab';
import ComplianceTab from '@/components/personal/ComplianceTab';
import DisciplinaryTab from '@/components/personal/DisciplinaryTab';
import ContractsTab from '@/components/personal/ContractsTab';
import VacationContainer from '@/components/personal/tabs/VacationContainer';
import { AppAccessTab } from '@/components/personal/AppAccessTab';

interface EmployeeDetailPageProps {
  params: Promise<{ uid: string; employeeId: string }>;
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/');
      return;
    }

    if (resolvedParams.employeeId) {
      loadEmployee();
    }
  }, [user, authLoading, resolvedParams.employeeId, router]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const employees = await PersonalService.getEmployees(resolvedParams.uid);
      const employeeData = employees.find(emp => emp.id === resolvedParams.employeeId);

      if (employeeData) {
        setEmployee(employeeData);
        setFormData(employeeData);
      } else {
        toast.error('Mitarbeiter nicht gefunden');
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Mitarbeiterdaten');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updates: Partial<Employee>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setEmployee(prev => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = async () => {
    try {
      if (!employee) return;

      await PersonalService.updateEmployee(resolvedParams.uid, resolvedParams.employeeId, formData);
      setEmployee({ ...employee, ...formData });
      setIsEditing(false);
      toast.success('Mitarbeiterdaten erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Speichern der Mitarbeiterdaten');
    }
  };

  const handleCancel = () => {
    if (employee) {
      setFormData(employee);
    }
    setIsEditing(false);
  };

  // Loading state während Auth geprüft wird
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
            <p className="text-gray-600">Authentifizierung wird geprüft...</p>
          </div>
        </div>
      </div>
    );
  }

  // Nicht authentifiziert
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nicht angemeldet</h2>
            <p className="text-gray-600 mb-4">Sie werden zur Anmeldung weitergeleitet...</p>
            <Button
              onClick={() => router.push('/')}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              Zur Anmeldung
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Laden
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14ad9f]"></div>
        </div>
      </div>
    );
  }

  // Mitarbeiter nicht gefunden
  if (!employee) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Mitarbeiter nicht gefunden</h1>
          <p className="mt-2 text-gray-600">
            Der angeforderte Mitarbeiter konnte nicht geladen werden.
          </p>
          <Button
            onClick={() => router.back()}
            className="mt-4 bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header mit Profil-Übersicht */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={(employee as unknown as { avatar?: string }).avatar || ''}
                alt={`${employee.firstName} ${employee.lastName}`}
              />
              <AvatarFallback className="text-xl bg-[#14ad9f] text-white">
                {employee.firstName.charAt(0)}
                {employee.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-gray-600">
                {employee.position} • {employee.department}
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                {employee.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }
          >
            {employee.isActive ? 'Aktiv' : 'Inaktiv'}
          </Badge>
          <Link
            href={`/dashboard/company/${resolvedParams.uid}/personal/edit/${resolvedParams.employeeId}`}
          >
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
              <Edit className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </Link>
        </div>
      </div>

      {/* Kurzinfo-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Abteilung</p>
                <p className="font-medium">{employee.department || 'Nicht angegeben'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Eintrittsdatum</p>
                <p className="font-medium">
                  {employee.startDate
                    ? new Date(employee.startDate).toLocaleDateString('de-DE')
                    : 'Nicht angegeben'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Beschäftigungsart</p>
                <p className="font-medium">
                  {employee.employmentType === 'FULL_TIME'
                    ? 'Vollzeit'
                    : employee.employmentType === 'PART_TIME'
                      ? 'Teilzeit'
                      : employee.employmentType === 'FREELANCER'
                        ? 'Freiberufler'
                        : employee.employmentType === 'INTERN'
                          ? 'Praktikant'
                          : 'Nicht angegeben'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Standort</p>
                <p className="font-medium">
                  {employee.address?.city || 'Nicht angegeben'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation - Identisch zur Edit-Seite */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-1">
              <TabsTrigger value="basic" className="text-xs">
                Grunddaten
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                Dokumente
              </TabsTrigger>
              <TabsTrigger value="vacation" className="text-xs">
                Urlaub
              </TabsTrigger>
              <TabsTrigger value="qualifications" className="text-xs">
                Qualifikationen
              </TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs">
                Compliance
              </TabsTrigger>
              <TabsTrigger value="contracts" className="text-xs">
                Verträge
              </TabsTrigger>
              <TabsTrigger value="disciplinary" className="text-xs">
                Disziplin
              </TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs">
                Feedback
              </TabsTrigger>
              <TabsTrigger value="time" className="text-xs">
                Arbeitszeit
              </TabsTrigger>
              <TabsTrigger value="app" className="text-xs">
                App-Zugang
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-6">
              <BasicInfoTab
                employee={employee}
                isEditing={isEditing}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <DocumentsTab
                employeeId={resolvedParams.employeeId}
                companyId={resolvedParams.uid}
                employee={employee as unknown as { documents?: { name: string; type: string; url: string; uploadedAt?: string }[] }}
              />
            </TabsContent>

            <TabsContent value="vacation" className="mt-6">
              <VacationContainer
                employee={employee}
                companyId={resolvedParams.uid}
                isEditing={isEditing}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
              />
            </TabsContent>

            <TabsContent value="qualifications" className="mt-6">
              <QualificationsTab
                employee={employee}
                isEditing={isEditing}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
              />
            </TabsContent>

            <TabsContent value="compliance" className="mt-6">
              <ComplianceTab
                employee={employee}
                isEditing={isEditing}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
              />
            </TabsContent>

            <TabsContent value="contracts" className="mt-6">
              <ContractsTab
                employee={employee}
                isEditing={isEditing}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
              />
            </TabsContent>

            <TabsContent value="disciplinary" className="mt-6">
              <DisciplinaryTab
                employee={employee}
                isEditing={isEditing}
                onUpdate={handleUpdate}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
              />
            </TabsContent>

            <TabsContent value="feedback" className="mt-6">
              <FeedbackTab employeeId={resolvedParams.employeeId} companyId={resolvedParams.uid} />
            </TabsContent>

            <TabsContent value="time" className="mt-6">
              <TimeTrackingTab
                employeeId={resolvedParams.employeeId}
                companyId={resolvedParams.uid}
              />
            </TabsContent>

            <TabsContent value="app" className="mt-6">
              <AppAccessTab
                employee={employee}
                companyId={resolvedParams.uid}
                onEmployeeUpdated={(updatedEmployee) => {
                  setEmployee(updatedEmployee);
                  setFormData(updatedEmployee);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

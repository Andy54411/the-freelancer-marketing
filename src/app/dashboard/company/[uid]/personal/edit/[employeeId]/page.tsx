'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, User, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { PersonalService, Employee } from '@/services/personalService';
import BasicInfoTab from '@/components/personal/BasicInfoTab';
import DocumentsTab from '@/components/personal/DocumentsTab';
import FeedbackTab from '@/components/personal/FeedbackTab';
import TimeTrackingTab from '@/components/personal/TimeTrackingTab';
import QualificationsTab from '@/components/personal/QualificationsTab';
import ComplianceTab from '@/components/personal/ComplianceTab';
import DisciplinaryTab from '@/components/personal/DisciplinaryTab';
import ContractsTab from '@/components/personal/ContractsTab';
import VacationContainer from '@/components/personal/tabs/VacationContainer';
import WorkSettingsTab from '@/components/personal/tabs/WorkSettingsTab';
import { AppAccessTab } from '@/components/personal/AppAccessTab';

interface EditEmployeePageProps {
  params: Promise<{ uid: string; employeeId: string }>;
}

export default function EditEmployeePage({ params }: EditEmployeePageProps) {
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
      return; // Warte auf Auth-Status
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (resolvedParams.employeeId) {
      loadEmployee();
    }
  }, [user, authLoading, resolvedParams.employeeId, router]);

  const loadEmployee = async () => {
    try {
      setLoading(true);

      // Verwende getEmployees und filtere dann nach der spezifischen ID
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

  // Show detailed loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
            <p className="text-gray-600">Authentifizierung wird geprüft...</p>
            <p className="text-xs text-gray-400 mt-2">
              Status: {authLoading ? 'Lädt...' : 'Abgeschlossen'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if user is not authenticated after auth loading completes
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nicht angemeldet</h2>
            <p className="text-gray-600 mb-4">Sie werden zur Anmeldung weitergeleitet...</p>
            <Button
              onClick={() => router.push('/login')}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              Zur Anmeldung
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14ad9f]"></div>
        </div>
      </div>
    );
  }

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
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#14ad9f] rounded-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-600">
              {employee.position} • {employee.department}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full justify-start gap-1 flex-wrap">
              <TabsTrigger value="basic" className="text-xs">
                Grunddaten
              </TabsTrigger>
              <TabsTrigger value="worksettings" className="text-xs">
                Arbeitszeit-Einst.
              </TabsTrigger>
              <TabsTrigger value="vacation" className="text-xs">
                Urlaub
              </TabsTrigger>
              <TabsTrigger value="time" className="text-xs">
                Arbeitszeit
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                Dokumente
              </TabsTrigger>
              <TabsTrigger value="qualifications" className="text-xs">
                Qualifikationen
              </TabsTrigger>
              <TabsTrigger value="app" className="text-xs">
                App-Zugang
              </TabsTrigger>
              
              {/* Dropdown für weitere Tabs */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs data-[state=open]:bg-muted">
                    <MoreHorizontal className="h-4 w-4 mr-1" />
                    Mehr
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setActiveTab('compliance')}>
                    Compliance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('contracts')}>
                    Verträge
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('disciplinary')}>
                    Disziplin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('feedback')}>
                    Feedback
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

            <TabsContent value="worksettings" className="mt-6">
              <WorkSettingsTab
                employee={employee}
                companyId={resolvedParams.uid}
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
                employee={employee}
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

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PersonalService, Employee as EmployeeType } from '@/services/personalService';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Award,
  FileText,
  Edit,
  Trash2,
  Save,
  X,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Import der 8 Tab-Komponenten
import BasicInfoTab from '@/components/personal/BasicInfoTab';
import DocumentsTab from '@/components/personal/DocumentsTab';
import QualificationsTab from '@/components/personal/QualificationsTab';
import ComplianceTab from '@/components/personal/ComplianceTab';
import ContractsTab from '@/components/personal/ContractsTab';
import DisciplinaryTab from '@/components/personal/DisciplinaryTab';
import FeedbackTab from '@/components/personal/FeedbackTab';
import TimeTrackingTab from '@/components/personal/TimeTrackingTab';
import VacationContainer from '@/components/personal/tabs/VacationContainer';

export default function AddEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;

  const [employee, setEmployee] = useState<Partial<EmployeeType>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    employmentType: 'FULL_TIME',
    contractType: 'PERMANENT',
    startDate: new Date().toISOString().split('T')[0],
    grossSalary: 0,
    workingHours: {
      weekly: 40,
      daily: 8,
    },
    socialSecurity: {
      employerContribution: 0,
      employeeContribution: 0,
      taxClass: '1',
    },
    additionalCosts: {
      healthInsurance: 0,
      benefits: 0,
      training: 0,
      equipment: 0,
    },
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Deutschland',
    },
    notes: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tab-Management
  const [activeTab, setActiveTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(true); // Beim Hinzufügen immer im Edit-Modus

  // Handler für Mitarbeiter-Updates
  const handleUpdate = (updates: Partial<EmployeeType>) => {
    setEmployee(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const handleCancel = () => {
    // Reset zu ursprünglichen Werten oder zurück zur Übersicht
    router.back();
  };

  // Automatische Berechnung der Sozialversicherungsbeiträge
  useEffect(() => {
    if (employee.grossSalary && employee.grossSalary > 0) {
      // Deutsche Sozialversicherungssätze 2025 (ungefähr)
      const svRate = 0.195; // 19.5% SV-Beiträge gesamt
      const employerRate = svRate / 2; // 50/50 Aufteilung

      setEmployee(prev => ({
        ...prev,
        socialSecurity: {
          ...prev.socialSecurity!,
          employerContribution: Math.round(prev.grossSalary! * employerRate),
          employeeContribution: Math.round(prev.grossSalary! * employerRate),
        },
      }));
    }
  }, [employee.grossSalary]);

  // Berechnung der Gesamtkosten
  const calculateTotalCosts = () => {
    const grossSalary = employee.grossSalary || 0;
    const employerSV = employee.socialSecurity?.employerContribution || 0;
    const healthInsurance = employee.additionalCosts?.healthInsurance || 0;
    const benefits = employee.additionalCosts?.benefits || 0;
    const training = employee.additionalCosts?.training || 0;
    const equipment = employee.additionalCosts?.equipment || 0;

    return grossSalary + employerSV + healthInsurance + benefits + training + equipment;
  };

  // Stundensatz-Berechnung
  const calculateHourlyRate = () => {
    const totalCosts = calculateTotalCosts();
    const weeklyHours = employee.workingHours?.weekly || 40;
    const monthlyHours = (weeklyHours * 52) / 12; // Jahresstunden / 12 Monate

    return monthlyHours > 0 ? totalCosts / monthlyHours : 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setEmployee(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        const parentKey = keys[0] as keyof typeof prev;
        const childKey = keys[1];
        const parentValue = prev[parentKey];

        if (parentValue && typeof parentValue === 'object') {
          return {
            ...prev,
            [parentKey]: {
              ...parentValue,
              [childKey]: value,
            },
          };
        }
      }
      return prev;
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employee.firstName?.trim()) {
      newErrors.firstName = 'Vorname ist erforderlich';
    }
    if (!employee.lastName?.trim()) {
      newErrors.lastName = 'Nachname ist erforderlich';
    }
    if (!employee.email?.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }
    if (!employee.position?.trim()) {
      newErrors.position = 'Position ist erforderlich';
    }
    if (!employee.department?.trim()) {
      newErrors.department = 'Abteilung ist erforderlich';
    }
    if (!employee.grossSalary || employee.grossSalary <= 0) {
      newErrors.grossSalary = 'Gehalt muss größer als 0 sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Speichere Mitarbeiter mit allen Tab-Daten:', employee);

      // Bereinige undefined Werte für Firebase und füge erweiterte Daten hinzu
      const cleanEmployeeData = {
        firstName: employee.firstName!,
        lastName: employee.lastName!,
        email: employee.email!,
        ...(employee.phone && { phone: employee.phone }),
        ...(employee.employeeNumber && { employeeNumber: employee.employeeNumber }),
        ...(employee.dateOfBirth && { dateOfBirth: employee.dateOfBirth }),
        ...(employee.placeOfBirth && { placeOfBirth: employee.placeOfBirth }),
        ...(employee.socialSecurityNumber && {
          socialSecurityNumber: employee.socialSecurityNumber,
        }),
        ...(employee.taxId && { taxId: employee.taxId }),
        ...(employee.personalId && { personalId: employee.personalId }),
        position: employee.position!,
        department: employee.department!,
        employmentType: employee.employmentType!,
        contractType: employee.contractType!,
        startDate: employee.startDate!,
        ...(employee.endDate && { endDate: employee.endDate }),
        ...(employee.probationPeriodEnd && { probationPeriodEnd: employee.probationPeriodEnd }),
        grossSalary: employee.grossSalary!,
        ...(employee.hourlyRate && { hourlyRate: employee.hourlyRate }),
        workingHours: employee.workingHours!,
        socialSecurity: employee.socialSecurity!,
        additionalCosts: employee.additionalCosts!,
        ...(employee.address && {
          address: {
            ...(employee.address.street && { street: employee.address.street }),
            ...(employee.address.city && { city: employee.address.city }),
            ...(employee.address.postalCode && { postalCode: employee.address.postalCode }),
            country: employee.address.country || 'Deutschland',
          },
        }),
        ...(employee.emergencyContact && { emergencyContact: employee.emergencyContact }),
        ...(employee.maritalStatus && { maritalStatus: employee.maritalStatus }),
        ...(employee.numberOfChildren && { numberOfChildren: employee.numberOfChildren }),
        ...(employee.nationality && { nationality: employee.nationality }),
        ...(employee.healthInsurance && { healthInsurance: employee.healthInsurance }),
        ...(employee.bankAccount && { bankAccount: employee.bankAccount }),
        ...(employee.qualifications && { qualifications: employee.qualifications }),
        ...(employee.compliance && { compliance: employee.compliance }),
        ...(employee.contracts && { contracts: employee.contracts }),
        ...(employee.disciplinary && { disciplinary: employee.disciplinary }),
        ...(employee.notes && { notes: employee.notes }),
        
        // **WICHTIG: Alle Tab-Daten mit einbeziehen**
        // Urlaubsdaten
        ...(employee.vacation && { vacation: employee.vacation }),
        
        // Status-Felder
        isActive: employee.isActive!,
        status: employee.isActive ? ('ACTIVE' as const) : ('INACTIVE' as const),
        ...(employee.avatar && { avatar: employee.avatar }),
      };

      // Verwende PersonalService für echte Datenbankoperationen
      const newEmployee = await PersonalService.addEmployee(companyId, cleanEmployeeData);
      
      console.log('✅ Mitarbeiter mit ID erstellt:', newEmployee.id);

      // **PHASE 2: Tab-spezifische Daten speichern (falls vorhanden)**
      if (newEmployee.id) {
        console.log('🔄 Speichere Tab-spezifische Daten...');
        
        // Urlaubseinstellungen speichern (falls konfiguriert)
        if (employee.vacation?.settings) {
          try {
            await PersonalService.updateVacationSettings(companyId, newEmployee.id, employee.vacation.settings);
            console.log('✅ Urlaubseinstellungen gespeichert');
          } catch (error) {
            console.warn('⚠️ Urlaubseinstellungen konnten nicht gespeichert werden:', error);
          }
        }
        
        // Hier können weitere Tab-spezifische Speichervorgänge hinzugefügt werden
        // z.B. Dokumente, Qualifikationen, etc.
        
        console.log('✅ Alle Tab-Daten erfolgreich gespeichert');
      }

      console.log('✅ Mitarbeiter vollständig gespeichert:', newEmployee);
      toast.success(`${employee.firstName} ${employee.lastName} wurde erfolgreich mit allen Daten hinzugefügt!`);

      // Zurück zur Übersicht
      router.push(`/dashboard/company/${companyId}/personal/employees`);
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern des Mitarbeiters');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Neuer Mitarbeiter</h1>
              <p className="mt-2 text-gray-600">
                Fügen Sie einen neuen Mitarbeiter zum Personal-System hinzu
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => router.back()} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        </div>

        {/* Kostenübersicht */}
        <Card className="mb-8 bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm opacity-90">Bruttogehalt</p>
                <p className="text-2xl font-bold">{formatCurrency(employee.grossSalary || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm opacity-90">Gesamtkosten</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateTotalCosts())}</p>
              </div>
              <div className="text-center">
                <p className="text-sm opacity-90">Stundensatz</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateHourlyRate())}/h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Umfassende Mitarbeiter-Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 gap-1">
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
              </TabsList>

              <TabsContent value="basic" className="mt-6">
                <BasicInfoTab
                  employee={employee as EmployeeType}
                  isEditing={isEditing}
                  onUpdate={handleUpdate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <DocumentsTab employeeId="" companyId={companyId} />
              </TabsContent>

              <TabsContent value="vacation" className="mt-6">
                <VacationContainer
                  employee={employee as EmployeeType}
                  companyId={companyId}
                  isEditing={isEditing}
                  onUpdate={handleUpdate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="qualifications" className="mt-6">
                <QualificationsTab
                  employee={employee as EmployeeType}
                  isEditing={isEditing}
                  onUpdate={handleUpdate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="compliance" className="mt-6">
                <ComplianceTab
                  employee={employee as EmployeeType}
                  isEditing={isEditing}
                  onUpdate={handleUpdate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="contracts" className="mt-6">
                <ContractsTab
                  employee={employee as EmployeeType}
                  isEditing={isEditing}
                  onUpdate={handleUpdate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="disciplinary" className="mt-6">
                <DisciplinaryTab
                  employee={employee as EmployeeType}
                  isEditing={isEditing}
                  onUpdate={handleUpdate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={() => setIsEditing(true)}
                />
              </TabsContent>

              <TabsContent value="feedback" className="mt-6">
                <FeedbackTab employeeId="" companyId={companyId} />
              </TabsContent>

              <TabsContent value="time" className="mt-6">
                <TimeTrackingTab employeeId="" companyId={companyId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

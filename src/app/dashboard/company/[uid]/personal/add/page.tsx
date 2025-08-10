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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN';
  contractType: 'PERMANENT' | 'TEMPORARY' | 'PROJECT_BASED';
  startDate: string;
  endDate?: string;
  grossSalary: number;
  hourlyRate?: number;
  workingHours: {
    weekly: number;
    daily: number;
  };
  socialSecurity: {
    employerContribution: number;
    employeeContribution: number;
    taxClass?: string;
  };
  additionalCosts: {
    healthInsurance: number;
    benefits: number;
    training: number;
    equipment: number;
  };
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
  isActive: boolean;
  avatar?: string;
}

export default function AddEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.uid as string;

  const [employee, setEmployee] = useState<Partial<Employee>>({
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
      console.log('🔄 Speichere Mitarbeiter:', employee);

      // Verwende PersonalService für echte Datenbankoperationen
      const newEmployee = await PersonalService.addEmployee(companyId, {
        firstName: employee.firstName!,
        lastName: employee.lastName!,
        email: employee.email!,
        phone: employee.phone,
        position: employee.position!,
        department: employee.department!,
        employmentType: employee.employmentType!,
        contractType: employee.contractType!,
        startDate: employee.startDate!,
        endDate: employee.endDate,
        grossSalary: employee.grossSalary!,
        hourlyRate: employee.hourlyRate,
        workingHours: employee.workingHours!,
        socialSecurity: employee.socialSecurity!,
        additionalCosts: employee.additionalCosts!,
        address: employee.address,
        notes: employee.notes,
        isActive: employee.isActive!,
        avatar: employee.avatar,
      });

      console.log('✅ Mitarbeiter erfolgreich gespeichert:', newEmployee);
      toast.success(`${employee.firstName} ${employee.lastName} wurde erfolgreich hinzugefügt!`);

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

        {/* Formular-Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Grunddaten</TabsTrigger>
            <TabsTrigger value="employment">Beschäftigung</TabsTrigger>
            <TabsTrigger value="costs">Kosten & Gehalt</TabsTrigger>
            <TabsTrigger value="additional">Zusatzinformationen</TabsTrigger>
          </TabsList>

          {/* Grunddaten */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Persönliche Daten</CardTitle>
                <CardDescription>Grundlegende Informationen zum Mitarbeiter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input
                      id="firstName"
                      value={employee.firstName || ''}
                      onChange={e => handleInputChange('firstName', e.target.value)}
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input
                      id="lastName"
                      value={employee.lastName || ''}
                      onChange={e => handleInputChange('lastName', e.target.value)}
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={employee.email || ''}
                      onChange={e => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={employee.phone || ''}
                      onChange={e => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Adresse</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Straße</Label>
                      <Input
                        id="street"
                        value={employee.address?.street || ''}
                        onChange={e => handleInputChange('address.street', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">PLZ</Label>
                      <Input
                        id="postalCode"
                        value={employee.address?.postalCode || ''}
                        onChange={e => handleInputChange('address.postalCode', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Stadt</Label>
                      <Input
                        id="city"
                        value={employee.address?.city || ''}
                        onChange={e => handleInputChange('address.city', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beschäftigung */}
          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle>Beschäftigungsdaten</CardTitle>
                <CardDescription>Position, Abteilung und Arbeitszeiten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={employee.position || ''}
                      onChange={e => handleInputChange('position', e.target.value)}
                      className={errors.position ? 'border-red-500' : ''}
                    />
                    {errors.position && (
                      <p className="text-sm text-red-600 mt-1">{errors.position}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="department">Abteilung *</Label>
                    <Input
                      id="department"
                      value={employee.department || ''}
                      onChange={e => handleInputChange('department', e.target.value)}
                      className={errors.department ? 'border-red-500' : ''}
                    />
                    {errors.department && (
                      <p className="text-sm text-red-600 mt-1">{errors.department}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="employmentType">Beschäftigungsart</Label>
                    <Select
                      value={employee.employmentType}
                      onValueChange={value => handleInputChange('employmentType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Vollzeit</SelectItem>
                        <SelectItem value="PART_TIME">Teilzeit</SelectItem>
                        <SelectItem value="FREELANCER">Freelancer</SelectItem>
                        <SelectItem value="INTERN">Praktikant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contractType">Vertragsart</Label>
                    <Select
                      value={employee.contractType}
                      onValueChange={value => handleInputChange('contractType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERMANENT">Unbefristet</SelectItem>
                        <SelectItem value="TEMPORARY">Befristet</SelectItem>
                        <SelectItem value="PROJECT_BASED">Projektbasiert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="startDate">Startdatum</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={employee.startDate || ''}
                      onChange={e => handleInputChange('startDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="weeklyHours">Wochenstunden</Label>
                    <Input
                      id="weeklyHours"
                      type="number"
                      min="1"
                      max="60"
                      value={employee.workingHours?.weekly || ''}
                      onChange={e =>
                        handleInputChange('workingHours.weekly', parseInt(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="dailyHours">Tagesstunden</Label>
                    <Input
                      id="dailyHours"
                      type="number"
                      min="1"
                      max="12"
                      value={employee.workingHours?.daily || ''}
                      onChange={e =>
                        handleInputChange('workingHours.daily', parseInt(e.target.value))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kosten & Gehalt */}
          <TabsContent value="costs">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vergütung</CardTitle>
                  <CardDescription>Gehalt und Stundensätze</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="grossSalary">Bruttogehalt (monatlich) *</Label>
                      <Input
                        id="grossSalary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={employee.grossSalary || ''}
                        onChange={e => handleInputChange('grossSalary', parseFloat(e.target.value))}
                        className={errors.grossSalary ? 'border-red-500' : ''}
                      />
                      {errors.grossSalary && (
                        <p className="text-sm text-red-600 mt-1">{errors.grossSalary}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="hourlyRate">Stundenlohn (optional)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={employee.hourlyRate || ''}
                        onChange={e => handleInputChange('hourlyRate', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sozialversicherung</CardTitle>
                  <CardDescription>Automatisch berechnete Beiträge</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="employerSV">AG-Anteil SV</Label>
                      <Input
                        id="employerSV"
                        type="number"
                        value={employee.socialSecurity?.employerContribution || 0}
                        onChange={e =>
                          handleInputChange(
                            'socialSecurity.employerContribution',
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="employeeSV">AN-Anteil SV</Label>
                      <Input
                        id="employeeSV"
                        type="number"
                        value={employee.socialSecurity?.employeeContribution || 0}
                        onChange={e =>
                          handleInputChange(
                            'socialSecurity.employeeContribution',
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="taxClass">Steuerklasse</Label>
                      <Select
                        value={employee.socialSecurity?.taxClass}
                        onValueChange={value => handleInputChange('socialSecurity.taxClass', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Klasse 1</SelectItem>
                          <SelectItem value="2">Klasse 2</SelectItem>
                          <SelectItem value="3">Klasse 3</SelectItem>
                          <SelectItem value="4">Klasse 4</SelectItem>
                          <SelectItem value="5">Klasse 5</SelectItem>
                          <SelectItem value="6">Klasse 6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Zusatzkosten</CardTitle>
                  <CardDescription>Weitere Arbeitgeberkosten</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="healthInsurance">Krankenkasse (AG-Anteil)</Label>
                      <Input
                        id="healthInsurance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={employee.additionalCosts?.healthInsurance || ''}
                        onChange={e =>
                          handleInputChange(
                            'additionalCosts.healthInsurance',
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="benefits">Benefits (Firmenwagen, etc.)</Label>
                      <Input
                        id="benefits"
                        type="number"
                        min="0"
                        step="0.01"
                        value={employee.additionalCosts?.benefits || ''}
                        onChange={e =>
                          handleInputChange('additionalCosts.benefits', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="training">Fortbildungskosten</Label>
                      <Input
                        id="training"
                        type="number"
                        min="0"
                        step="0.01"
                        value={employee.additionalCosts?.training || ''}
                        onChange={e =>
                          handleInputChange('additionalCosts.training', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="equipment">Ausstattung/Equipment</Label>
                      <Input
                        id="equipment"
                        type="number"
                        min="0"
                        step="0.01"
                        value={employee.additionalCosts?.equipment || ''}
                        onChange={e =>
                          handleInputChange('additionalCosts.equipment', parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Zusatzinformationen */}
          <TabsContent value="additional">
            <Card>
              <CardHeader>
                <CardTitle>Notizen & Zusatzinformationen</CardTitle>
                <CardDescription>Weitere Informationen zum Mitarbeiter</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    rows={6}
                    value={employee.notes || ''}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    placeholder="Zusätzliche Informationen, Besonderheiten, etc."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

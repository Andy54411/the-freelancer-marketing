'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Euro,
  Clock,
  Building,
  FileText,
  Star,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface EditEmployeePageProps {
  params: { uid: string; employeeId: string };
}

export default function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && params.employeeId) {
      loadEmployee();
    }
  }, [user, params.employeeId]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const employeeData = await PersonalService.getEmployee(params.uid, params.employeeId);
      if (employeeData) {
        setEmployee(employeeData);
        setFormData(employeeData);
      }
    } catch (error) {
      console.error('Error loading employee:', error);
      toast.error('Fehler beim Laden der Mitarbeiterdaten');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedInputChange = (parent: keyof Employee, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      setSaving(true);
      await PersonalService.updateEmployee(params.uid, params.employeeId, formData);
      toast.success('Mitarbeiterdaten erfolgreich aktualisiert');
      router.push(`/dashboard/company/${params.uid}/personal/employees`);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Fehler beim Speichern der Mitarbeiterdaten');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Mitarbeiter nicht gefunden</h3>
        <p className="text-gray-600 mb-6">
          Der angeforderte Mitarbeiter konnte nicht geladen werden.
        </p>
        <Link href={`/dashboard/company/${params.uid}/personal/employees`}>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/company/${params.uid}/personal/employees`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mitarbeiter bearbeiten</h1>
            <p className="text-gray-600">
              {employee.firstName} {employee.lastName} - {employee.position}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profilinformationen */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Persönliche Informationen
              </CardTitle>
              <CardDescription>Grundlegende Informationen des Mitarbeiters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || ''}
                    onChange={e => handleInputChange('firstName', e.target.value)}
                    placeholder="Vorname eingeben"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || ''}
                    onChange={e => handleInputChange('lastName', e.target.value)}
                    placeholder="Nachname eingeben"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="+49 123 456789"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position || ''}
                  onChange={e => handleInputChange('position', e.target.value)}
                  placeholder="z.B. Software Entwickler"
                />
              </div>

              <div>
                <Label htmlFor="department">Abteilung</Label>
                <Select
                  value={formData.department || ''}
                  onValueChange={value => handleInputChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Abteilung wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entwicklung">Entwicklung</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Vertrieb">Vertrieb</SelectItem>
                    <SelectItem value="Verwaltung">Verwaltung</SelectItem>
                    <SelectItem value="Geschäftsführung">Geschäftsführung</SelectItem>
                    <SelectItem value="Kundenservice">Kundenservice</SelectItem>
                    <SelectItem value="Finanzen">Finanzen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Beschäftigungsdetails */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Beschäftigungsdetails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Beschäftigungsart</Label>
                  <Select
                    value={formData.employmentType || ''}
                    onValueChange={value => handleInputChange('employmentType', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Art wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Vollzeit</SelectItem>
                      <SelectItem value="PART_TIME">Teilzeit</SelectItem>
                      <SelectItem value="FREELANCER">Freiberufler</SelectItem>
                      <SelectItem value="INTERN">Praktikant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vertragsart</Label>
                  <Select
                    value={formData.contractType || ''}
                    onValueChange={value => handleInputChange('contractType', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vertragsart wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERMANENT">Unbefristet</SelectItem>
                      <SelectItem value="TEMPORARY">Befristet</SelectItem>
                      <SelectItem value="PROJECT_BASED">Projektbasiert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Startdatum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ''}
                    onChange={e => handleInputChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Enddatum (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ''}
                    onChange={e => handleInputChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gehalt und Kosten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Gehalt und Kosten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grossSalary">Bruttogehalt (monatlich)</Label>
                  <Input
                    id="grossSalary"
                    type="number"
                    value={formData.grossSalary || ''}
                    onChange={e =>
                      handleInputChange('grossSalary', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Stundenlohn (optional)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate || ''}
                    onChange={e => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Arbeitszeiten</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weeklyHours">Wochenstunden</Label>
                    <Input
                      id="weeklyHours"
                      type="number"
                      value={formData.workingHours?.weekly || ''}
                      onChange={e =>
                        handleNestedInputChange(
                          'workingHours',
                          'weekly',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyHours">Tagesstunden</Label>
                    <Input
                      id="dailyHours"
                      type="number"
                      value={formData.workingHours?.daily || ''}
                      onChange={e =>
                        handleNestedInputChange(
                          'workingHours',
                          'daily',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notizen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notizen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes || ''}
                onChange={e => handleInputChange('notes', e.target.value)}
                placeholder="Zusätzliche Notizen zum Mitarbeiter..."
                className="min-h-24"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Mitarbeiter Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.avatar} />
                  <AvatarFallback className="bg-[#14ad9f] text-white text-lg">
                    {formData.firstName?.[0] || 'M'}
                    {formData.lastName?.[0] || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {formData.firstName || 'Vorname'} {formData.lastName || 'Nachname'}
                  </h3>
                  <p className="text-gray-600">{formData.position || 'Position'}</p>
                  <Badge
                    className={
                      formData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }
                  >
                    {formData.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{formData.email || 'Keine E-Mail'}</span>
                </div>
                {formData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{formData.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span>{formData.department || 'Keine Abteilung'}</span>
                </div>
                {formData.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Seit {new Date(formData.startDate).toLocaleDateString('de-DE')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mitarbeiter aktiv</span>
                  <Button
                    variant={formData.isActive ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleInputChange('isActive', !formData.isActive)}
                  >
                    {formData.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  Status: {formData.isActive ? 'Aktiv' : 'Inaktiv'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

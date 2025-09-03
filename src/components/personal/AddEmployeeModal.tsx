'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, X, Plus } from 'lucide-react';
import { PersonalService, type Employee } from '@/services/personalService';
import { toast } from 'sonner';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeAdded: (employee: Employee) => void;
  companyId: string;
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onEmployeeAdded,
  companyId,
}: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    department: '',
    employmentType: 'FULL_TIME' as Employee['employmentType'],
    startDate: new Date().toISOString().split('T')[0],
    grossSalary: 0,
    hourlyRate: 0,
    benefits: [] as string[],
    skills: [] as string[],
  });

  const [newBenefit, setNewBenefit] = useState('');
  const [newSkill, setNewSkill] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addBenefit = () => {
    if (newBenefit.trim() && !formData.benefits.includes(newBenefit.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(b => b !== benefit),
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      setLoading(true);

      const newEmployee: Omit<Employee, 'id'> = {
        companyId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        position: formData.position,
        department: formData.department,
        employmentType: formData.employmentType,
        contractType: 'PERMANENT', // Standard-Vertragsart
        startDate: formData.startDate,
        grossSalary: formData.grossSalary,
        hourlyRate: formData.hourlyRate,
        workingHours: {
          weekly: 40,
          daily: 8,
        },
        socialSecurity: {
          employerContribution: formData.grossSalary * 0.2, // 20% Arbeitgeberanteil
          employeeContribution: formData.grossSalary * 0.2, // 20% Arbeitnehmeranteil
          taxClass: '1',
        },
        additionalCosts: {
          healthInsurance: 400, // Standard-Krankenversicherung
          benefits: 200, // Standard-Benefits
          training: 100, // Standard-Weiterbildungskosten
          equipment: 150, // Standard-Ausstattungskosten
        },
        isActive: true,
        benefits: formData.benefits,
        skills: formData.skills,
        performance: {
          rating: 0,
          goals: [],
          lastReview: '',
        },
        vacation: {
          totalDays: 30,
          usedDays: 0,
          remainingDays: 30,
        },
      };

      const employee = await PersonalService.addEmployee(companyId, newEmployee);
      toast.success('Mitarbeiter erfolgreich hinzugefügt');
      onEmployeeAdded(employee);
      onClose();

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        position: '',
        department: '',
        employmentType: 'FULL_TIME',
        startDate: new Date().toISOString().split('T')[0],
        grossSalary: 0,
        hourlyRate: 0,
        benefits: [],
        skills: [],
      });
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Mitarbeiters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#14ad9f]" />
            Neuen Mitarbeiter hinzufügen
          </DialogTitle>
          <DialogDescription>
            Fügen Sie einen neuen Mitarbeiter zu Ihrem Unternehmen hinzu und konfigurieren Sie
            dessen Berechtigungen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Persönliche Daten */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Persönliche Daten</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={e => handleInputChange('firstName', e.target.value)}
                    placeholder="Vorname"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={e => handleInputChange('lastName', e.target.value)}
                    placeholder="Nachname"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="E-Mail-Adresse"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Berufliche Daten */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Berufliche Daten</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={e => handleInputChange('position', e.target.value)}
                    placeholder="z.B. Senior Developer"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Abteilung</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={e => handleInputChange('department', e.target.value)}
                    placeholder="z.B. IT"
                  />
                </div>
                <div>
                  <Label htmlFor="employmentType">Beschäftigungsart</Label>
                  <Select
                    value={formData.employmentType}
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
                  <Label htmlFor="startDate">Startdatum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={e => handleInputChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="grossSalary">Bruttogehalt (€/Monat)</Label>
                  <Input
                    id="grossSalary"
                    type="number"
                    min="0"
                    value={formData.grossSalary || ''}
                    onChange={e =>
                      handleInputChange('grossSalary', parseFloat(e.target.value) || 0)
                    }
                    placeholder="3500"
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Stundensatz (€/Stunde)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourlyRate || ''}
                    onChange={e => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                    placeholder="25.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Benefits & Zusatzleistungen</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={e => setNewBenefit(e.target.value)}
                    placeholder="z.B. Firmenwagen, Jobticket..."
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                  />
                  <Button type="button" onClick={addBenefit} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {benefit}
                      <button
                        type="button"
                        onClick={() => removeBenefit(benefit)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Fähigkeiten & Kompetenzen</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    placeholder="z.B. TypeScript, Project Management..."
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {loading ? 'Wird hinzugefügt...' : 'Mitarbeiter hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

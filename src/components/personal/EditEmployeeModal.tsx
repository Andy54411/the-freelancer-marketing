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
import { Textarea } from '@/components/ui/textarea';
import { Edit, X, Plus } from 'lucide-react';
import { PersonalService, type Employee } from '@/services/personalService';
import { toast } from 'sonner';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeUpdated: (employee: Employee) => void;
  employee: Employee;
  companyId: string;
}

export function EditEmployeeModal({
  isOpen,
  onClose,
  onEmployeeUpdated,
  employee,
  companyId,
}: EditEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    position: employee.position,
    department: employee.department,
    employmentType: employee.employmentType,
    grossSalary: employee.grossSalary,
    hourlyRate: employee.hourlyRate || 0,
    benefits: employee.benefits || [],
    skills: employee.skills || [],
    notes: employee.notes || '',
    isActive: employee.isActive,
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

      const updates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        position: formData.position,
        department: formData.department,
        employmentType: formData.employmentType,
        grossSalary: formData.grossSalary,
        hourlyRate: formData.hourlyRate,
        benefits: formData.benefits,
        skills: formData.skills,
        notes: formData.notes,
        isActive: formData.isActive,
      };

      await PersonalService.updateEmployee(companyId, employee.id!, updates);

      // Aktualisiere das lokale Employee Objekt
      const updatedEmployee: Employee = {
        ...employee,
        ...updates,
      };

      toast.success('Mitarbeiter erfolgreich aktualisiert');
      onEmployeeUpdated(updatedEmployee);
      onClose();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Mitarbeiters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#14ad9f]" />
            Mitarbeiter bearbeiten: {employee.firstName} {employee.lastName}
          </DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Daten und Einstellungen für diesen Mitarbeiter.
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={e => handleInputChange('lastName', e.target.value)}
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Abteilung</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={e => handleInputChange('department', e.target.value)}
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
                  <Label htmlFor="grossSalary">Bruttogehalt (€/Monat)</Label>
                  <Input
                    id="grossSalary"
                    type="number"
                    min="0"
                    value={formData.grossSalary || ''}
                    onChange={e =>
                      handleInputChange('grossSalary', parseFloat(e.target.value) || 0)
                    }
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
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onValueChange={value => handleInputChange('isActive', value === 'active')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="inactive">Inaktiv</SelectItem>
                    </SelectContent>
                  </Select>
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

          {/* Notizen */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Notizen</h3>
              <Textarea
                value={formData.notes}
                onChange={e => handleInputChange('notes', e.target.value)}
                placeholder="Zusätzliche Informationen zum Mitarbeiter..."
                rows={3}
              />
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
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              {loading ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

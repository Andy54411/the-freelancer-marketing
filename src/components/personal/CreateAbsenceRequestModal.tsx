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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, FileText } from 'lucide-react';
import { AbsenceRequest, PersonalService } from '@/services/personalService';
import { toast } from 'sonner';

interface CreateAbsenceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: (request: AbsenceRequest) => void;
  companyId: string;
  employees: Array<{ id: string; firstName: string; lastName: string }>;
}

export function CreateAbsenceRequestModal({
  isOpen,
  onClose,
  onRequestCreated,
  companyId,
  employees,
}: CreateAbsenceRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'VACATION' as AbsenceRequest['type'],
    startDate: '',
    endDate: '',
    reason: '',
    notes: '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date

    return Math.max(0, diffDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('Das Enddatum muss nach dem Startdatum liegen');
      return;
    }

    try {
      setLoading(true);

      const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
      if (!selectedEmployee) {
        toast.error('Mitarbeiter nicht gefunden');
        return;
      }

      const days = calculateDays(formData.startDate, formData.endDate);

      const newRequest: Omit<AbsenceRequest, 'id'> = {
        companyId: companyId,
        employeeId: formData.employeeId,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days,
        status: 'PENDING',
        reason: formData.reason,
        notes: formData.notes,
        requestedAt: new Date().toISOString(),
      };

      // API-Call zur Erstellung der Abwesenheitsanfrage
      const requestId = await PersonalService.createAbsenceRequest(newRequest);

      // Erstelle das vollständige Request-Objekt für die UI
      const createdRequest: AbsenceRequest = {
        ...newRequest,
        id: requestId,
      };

      toast.success('Abwesenheitsantrag erfolgreich erstellt');
      onRequestCreated(createdRequest);
      onClose();

      // Reset form
      setFormData({
        employeeId: '',
        type: 'VACATION',
        startDate: '',
        endDate: '',
        reason: '',
        notes: '',
      });
    } catch (error) {

      toast.error('Fehler beim Erstellen des Abwesenheitsantrags');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: AbsenceRequest['type']) => {
    const labels = {
      VACATION: 'Urlaub',
      SICK: 'Krankheit',
      PERSONAL: 'Persönlich',
      TRAINING: 'Weiterbildung',
      OTHER: 'Sonstiges',
    };
    return labels[type];
  };

  const calculatedDays = calculateDays(formData.startDate, formData.endDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14ad9f]" />
            Abwesenheitsantrag erstellen
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mitarbeiter Auswahl */}
          <div>
            <Label htmlFor="employeeId">Mitarbeiter *</Label>
            <Select
              value={formData.employeeId}
              onValueChange={value => handleInputChange('employeeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mitarbeiter auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(employee => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Art der Abwesenheit */}
          <div>
            <Label htmlFor="type">Art der Abwesenheit *</Label>
            <Select value={formData.type} onValueChange={value => handleInputChange('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VACATION">Urlaub</SelectItem>
                <SelectItem value="SICK">Krankheit</SelectItem>
                <SelectItem value="PERSONAL">Persönlich</SelectItem>
                <SelectItem value="TRAINING">Weiterbildung</SelectItem>
                <SelectItem value="OTHER">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zeitraum */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Startdatum *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={e => handleInputChange('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">Enddatum *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={e => handleInputChange('endDate', e.target.value)}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {/* Anzahl Tage */}
          {calculatedDays > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Anzahl Tage: {calculatedDays}</span>
              </div>
            </div>
          )}

          {/* Grund */}
          <div>
            <Label htmlFor="reason">Grund *</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={e => handleInputChange('reason', e.target.value)}
              placeholder="z.B. Sommerurlaub, Fortbildung..."
              required
            />
          </div>

          {/* Notizen */}
          <div>
            <Label htmlFor="notes">Zusätzliche Notizen</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => handleInputChange('notes', e.target.value)}
              placeholder="Weitere Informationen zur Abwesenheit..."
              rows={3}
            />
          </div>

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
              <FileText className="h-4 w-4 mr-2" />
              {loading ? 'Wird erstellt...' : 'Antrag erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Trash2 } from 'lucide-react';
import { PersonalService, type Employee } from '@/services/personalService';
import { toast } from 'sonner';

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeDeleted: (employeeId: string) => void;
  employee: Employee;
  companyId: string;
}

export function DeleteEmployeeModal({
  isOpen,
  onClose,
  onEmployeeDeleted,
  employee,
  companyId,
}: DeleteEmployeeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);

      await PersonalService.deleteEmployee(companyId, employee.id!);

      toast.success('Mitarbeiter erfolgreich gelöscht');
      onEmployeeDeleted(employee.id!);
      onClose();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Fehler beim Löschen des Mitarbeiters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Mitarbeiter löschen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Name:</span>
                  <span>
                    {employee.firstName} {employee.lastName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Position:</span>
                  <span>{employee.position}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Abteilung:</span>
                  <span>{employee.department || 'Nicht zugewiesen'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                    {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-sm text-gray-600">
            Möchten Sie den Mitarbeiter{' '}
            <strong>
              {employee.firstName} {employee.lastName}
            </strong>{' '}
            wirklich unwiderruflich löschen?
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? 'Wird gelöscht...' : 'Endgültig löschen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

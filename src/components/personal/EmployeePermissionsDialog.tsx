'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Shield, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmployeePermissions {
  overview: boolean;
  personal: boolean;
  employees: boolean;
  shiftPlanning: boolean;
  timeTracking: boolean;
  absences: boolean;
  evaluations: boolean;
  orders: boolean;
  quotes: boolean;
  invoices: boolean;
  customers: boolean;
  calendar: boolean;
  workspace: boolean;
  finance: boolean;
  expenses: boolean;
  inventory: boolean;
  settings: boolean;
}

interface EmployeePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  employeeId: string;
  employeeName: string;
  currentPermissions: EmployeePermissions;
  onSuccess?: () => void;
}

// Standard-Berechtigungen für verschiedene Rollen
const permissionPresets = {
  basic: {
    overview: true,
    personal: false,
    employees: false,
    shiftPlanning: true,
    timeTracking: true,
    absences: true,
    evaluations: false,
    orders: false,
    quotes: false,
    invoices: false,
    customers: false,
    calendar: true,
    workspace: true,
    finance: false,
    expenses: false,
    inventory: false,
    settings: true,
  },
  extended: {
    overview: true,
    personal: true,
    employees: false,
    shiftPlanning: true,
    timeTracking: true,
    absences: true,
    evaluations: true,
    orders: true,
    quotes: false,
    invoices: false,
    customers: true,
    calendar: true,
    workspace: true,
    finance: false,
    expenses: false,
    inventory: true,
    settings: true,
  },
  manager: {
    overview: true,
    personal: true,
    employees: true,
    shiftPlanning: true,
    timeTracking: true,
    absences: true,
    evaluations: true,
    orders: true,
    quotes: true,
    invoices: true,
    customers: true,
    calendar: true,
    workspace: true,
    finance: true,
    expenses: true,
    inventory: true,
    settings: true,
  },
};

const permissionLabels: Record<string, string> = {
  overview: 'Dashboard-Übersicht',
  personal: 'Mein Bereich',
  employees: 'Mitarbeiterverwaltung',
  shiftPlanning: 'Dienstplanung',
  timeTracking: 'Zeiterfassung',
  absences: 'Urlaub & Abwesenheit',
  evaluations: 'Auswertungen',
  orders: 'Aufträge',
  quotes: 'Angebote',
  invoices: 'Rechnungen',
  customers: 'Kunden',
  calendar: 'Kalender',
  workspace: 'Workspace',
  finance: 'Finanzen',
  expenses: 'Ausgaben',
  inventory: 'Lagerverwaltung',
  settings: 'Einstellungen',
};

const permissionCategories = {
  core: ['overview', 'personal', 'calendar', 'workspace', 'settings'],
  hr: ['employees', 'shiftPlanning', 'timeTracking', 'absences', 'evaluations'],
  business: ['orders', 'quotes', 'invoices', 'customers', 'finance', 'expenses', 'inventory'],
};

export function EmployeePermissionsDialog({
  isOpen,
  onClose,
  companyId,
  employeeId,
  employeeName,
  currentPermissions,
  onSuccess,
}: EmployeePermissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<EmployeePermissions>(currentPermissions);

  // Reset beim Öffnen
  useEffect(() => {
    if (isOpen) {
      setPermissions(currentPermissions);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, currentPermissions]);

  const handlePresetChange = (preset: 'basic' | 'extended' | 'manager') => {
    setPermissions(permissionPresets[preset]);
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/company/${companyId}/employees/invite`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          permissions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        onSuccess?.();
        // Dialog nach kurzer Verzögerung schließen
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(data.error ?? 'Fehler beim Speichern der Berechtigungen');
      }
    } catch {
      setError('Fehler beim Speichern der Berechtigungen. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onClose();
  };

  const renderPermissionGroup = (keys: string[], title: string) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
      <div className="grid grid-cols-1 gap-2">
        {keys.map((key) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox
              id={`perm-${key}`}
              checked={permissions[key as keyof EmployeePermissions]}
              onCheckedChange={() => togglePermission(key)}
            />
            <Label
              htmlFor={`perm-${key}`}
              className="text-sm font-normal cursor-pointer"
            >
              {permissionLabels[key]}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            Berechtigungen bearbeiten
          </DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Dashboard-Berechtigungen für {employeeName}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Erfolgs-Meldung */}
          {success && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-teal-600" />
                <span className="font-medium text-teal-900">Berechtigungen gespeichert</span>
              </div>
            </div>
          )}

          {/* Fehler-Meldung */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Presets */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Schnellauswahl</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetChange('basic')}
                className="text-xs"
              >
                Basis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetChange('extended')}
                className="text-xs"
              >
                Erweitert
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetChange('manager')}
                className="text-xs"
              >
                Manager
              </Button>
            </div>
          </div>

          {/* Berechtigungen nach Kategorie */}
          <Tabs defaultValue="core" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="core">Allgemein</TabsTrigger>
              <TabsTrigger value="hr">Personal</TabsTrigger>
              <TabsTrigger value="business">Geschäft</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-4">
              {renderPermissionGroup(permissionCategories.core, 'Allgemeine Bereiche')}
            </TabsContent>
            <TabsContent value="hr" className="mt-4">
              {renderPermissionGroup(permissionCategories.hr, 'Personalverwaltung')}
            </TabsContent>
            <TabsContent value="business" className="mt-4">
              {renderPermissionGroup(permissionCategories.business, 'Geschäftsbereiche')}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

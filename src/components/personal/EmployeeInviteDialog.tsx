'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Loader2, UserPlus, AlertCircle, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmployeeInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  onSuccess?: () => void;
}

interface InviteResult {
  success: boolean;
  userAlreadyExisted?: boolean;
  message?: string;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
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

// Sichere Passwort-Generierung
function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%&*';
  const all = lowercase + uppercase + numbers + special;
  
  let password = '';
  // Mindestens ein Zeichen aus jeder Kategorie
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Rest auffüllen
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Mischen
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function EmployeeInviteDialog({
  isOpen,
  onClose,
  companyId,
  employeeId,
  employeeName,
  employeeEmail,
  onSuccess,
}: EmployeeInviteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'basic' | 'extended' | 'manager'>('basic');
  const [permissions, setPermissions] = useState(permissionPresets.basic);

  // Passwort beim Öffnen generieren
  useEffect(() => {
    if (isOpen && !password) {
      setPassword(generatePassword());
    }
  }, [isOpen, password]);

  const handlePresetChange = (preset: 'basic' | 'extended' | 'manager') => {
    setSelectedPreset(preset);
    setPermissions(permissionPresets[preset]);
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const regeneratePassword = () => {
    setPassword(generatePassword());
  };

  const handleCreateAccess = async () => {
    if (!password || password.length < 6) {
      setResult({
        success: false,
        error: 'Passwort muss mindestens 6 Zeichen haben',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/company/${companyId}/employees/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          employeeId,
          password,
          permissions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          userAlreadyExisted: data.userAlreadyExisted,
          message: data.message,
          emailSent: data.emailSent,
          emailError: data.emailError,
        });
        onSuccess?.();
      } else {
        setResult({
          success: false,
          error: data.error,
        });
      }
    } catch {
      setResult({
        success: false,
        error: 'Fehler beim Erstellen des Dashboard-Zugangs. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setPassword('');
    setShowPassword(false);
    setSelectedPreset('basic');
    setPermissions(permissionPresets.basic);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" />
            Dashboard-Zugang erstellen
          </DialogTitle>
          <DialogDescription>
            Erstellen Sie Zugangsdaten für {employeeName}, um auf das Firmen-Dashboard zuzugreifen.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Mitarbeiter-Info */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">{employeeName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-600">{employeeEmail}</span>
            </div>
          </div>

          {/* Ergebnis anzeigen */}
          {result ? (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-teal-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-teal-900">Dashboard-Zugang erstellt</p>
                        <p className="text-sm text-teal-700 mt-1">{result.message}</p>
                      </div>
                    </div>
                  </div>

                  {result.emailSent && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-teal-600" />
                      <span>Zugangsdaten wurden per E-Mail an {employeeEmail} gesendet.</span>
                    </div>
                  )}

                  {result.emailError && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
                      E-Mail konnte nicht gesendet werden: {result.emailError}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Fehler</p>
                      <p className="text-sm text-red-700 mt-1">{result.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Passwort-Eingabe */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium">
                  Passwort für den Mitarbeiter
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passwort eingeben..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={regeneratePassword}
                    title="Neues Passwort generieren"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Das Passwort wird dem Mitarbeiter per E-Mail zugesendet.
                </p>
              </div>

              {/* Berechtigungen */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Shield className="h-4 w-4" />
                  <span>Berechtigungen festlegen</span>
                </div>

                <Tabs value={selectedPreset} onValueChange={(v) => handlePresetChange(v as 'basic' | 'extended' | 'manager')}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basis</TabsTrigger>
                    <TabsTrigger value="extended">Erweitert</TabsTrigger>
                    <TabsTrigger value="manager">Manager</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="mt-3">
                    <p className="text-sm text-gray-500">
                      Grundlegende Funktionen: Dienstplan, Zeiterfassung, Kalender
                    </p>
                  </TabsContent>
                  <TabsContent value="extended" className="mt-3">
                    <p className="text-sm text-gray-500">
                      Erweiterte Funktionen: Aufträge, Kunden, Auswertungen
                    </p>
                  </TabsContent>
                  <TabsContent value="manager" className="mt-3">
                    <p className="text-sm text-gray-500">
                      Voller Zugang: Alle Funktionen inkl. Finanzen und Mitarbeiter
                    </p>
                  </TabsContent>
                </Tabs>

                {/* Detaillierte Berechtigungen */}
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox 
                          id={key} 
                          checked={value}
                          onCheckedChange={() => togglePermission(key)}
                        />
                        <Label 
                          htmlFor={key} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {permissionLabels[key]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {result?.success ? (
            <Button onClick={handleClose} className="bg-teal-600 hover:bg-teal-700 text-white">
              Schließen
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateAccess}
                disabled={loading || !password}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Zugang erstellen
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

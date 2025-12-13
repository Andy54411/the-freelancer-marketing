'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Key,
  Clock,
  Calendar,
  FileText,
  Shield,
  Send,
  RefreshCw,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { PersonalService, type Employee } from '@/services/personalService';
import { toast } from 'sonner';

interface AppAccessTabProps {
  employee: Employee;
  companyId: string;
  onEmployeeUpdated: (employee: Employee) => void;
}

export function AppAccessTab({ employee, companyId, onEmployeeUpdated }: AppAccessTabProps) {
  const [loading, setLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [generatingPin, setGeneratingPin] = useState(false);
  const [permissions, setPermissions] = useState({
    timeTracking: employee.appAccess?.permissions?.timeTracking ?? true,
    schedule: employee.appAccess?.permissions?.schedule ?? true,
    absenceRequest: employee.appAccess?.permissions?.absenceRequest ?? true,
    documents: employee.appAccess?.permissions?.documents ?? false,
  });

  const isRegistered = employee.appAccess?.registered ?? false;

  const handlePermissionChange = async (permission: keyof typeof permissions, value: boolean) => {
    const newPermissions = { ...permissions, [permission]: value };
    setPermissions(newPermissions);

    try {
      setLoading(true);
      await PersonalService.updateEmployee(companyId, employee.id!, {
        appAccess: {
          ...employee.appAccess,
          registered: employee.appAccess?.registered ?? false,
          permissions: newPermissions,
        },
      });

      const updatedEmployee: Employee = {
        ...employee,
        appAccess: {
          ...employee.appAccess,
          registered: employee.appAccess?.registered ?? false,
          permissions: newPermissions,
        },
      };

      onEmployeeUpdated(updatedEmployee);
      toast.success('Berechtigung aktualisiert');
    } catch (error) {
      setPermissions(permissions); // Rollback
      toast.error('Fehler beim Aktualisieren der Berechtigung');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    // Prüfe ob E-Mail vorhanden ist
    if (!employee.email) {
      toast.error('Keine E-Mail-Adresse hinterlegt');
      return;
    }

    try {
      setSendingInvite(true);

      // Generiere einen temporären Registrierungslink
      const registrationToken = crypto.randomUUID();
      const registrationUrl = `${window.location.origin}/employee/register?token=${registrationToken}&company=${companyId}&employee=${employee.id}`;

      // Speichere den Token
      await PersonalService.updateEmployee(companyId, employee.id!, {
        appAccess: {
          ...employee.appAccess,
          registered: false,
          permissions: permissions,
          registrationToken,
          registrationTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 Tage
        },
      });

      // E-Mail senden
      const response = await fetch('/api/personal/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeEmail: employee.email,
          employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          companyId: companyId,
          registrationUrl: registrationUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Einladung wurde an ${employee.email} gesendet`);
        
        // Kopiere Link auch in die Zwischenablage als Backup
        await navigator.clipboard.writeText(registrationUrl);
        toast.info('Link wurde auch in die Zwischenablage kopiert');
      } else {
        // E-Mail konnte nicht gesendet werden - zeige Link zur manuellen Weitergabe
        await navigator.clipboard.writeText(registrationUrl);
        toast.warning('E-Mail konnte nicht gesendet werden. Link wurde in die Zwischenablage kopiert.');
      }

    } catch (error) {
      toast.error('Fehler beim Erstellen der Einladung');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleGeneratePin = async () => {
    try {
      setGeneratingPin(true);

      // Generiere 6-stellige PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      await PersonalService.updateEmployee(companyId, employee.id!, {
        appAccess: {
          ...employee.appAccess,
          registered: employee.appAccess?.registered ?? false,
          pin,
          permissions: permissions,
        },
      });

      const updatedEmployee: Employee = {
        ...employee,
        appAccess: {
          ...employee.appAccess,
          registered: employee.appAccess?.registered ?? false,
          pin,
          permissions: permissions,
        },
      };

      onEmployeeUpdated(updatedEmployee);

      // Zeige PIN an
      toast.success(`Neue PIN: ${pin}`, {
        description: 'Die PIN wurde generiert und gespeichert',
        duration: 10000,
      });
    } catch (error) {
      toast.error('Fehler beim Generieren der PIN');
    } finally {
      setGeneratingPin(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!confirm('Möchten Sie den App-Zugang wirklich widerrufen? Der Mitarbeiter wird ausgeloggt.')) {
      return;
    }

    try {
      setLoading(true);

      await PersonalService.updateEmployee(companyId, employee.id!, {
        appAccess: {
          registered: false,
          authUid: undefined,
          pin: undefined,
          registeredAt: undefined,
          lastLogin: undefined,
          permissions: {
            timeTracking: false,
            schedule: false,
            absenceRequest: false,
            documents: false,
          },
        },
      });

      const updatedEmployee: Employee = {
        ...employee,
        appAccess: {
          registered: false,
          permissions: {
            timeTracking: false,
            schedule: false,
            absenceRequest: false,
            documents: false,
          },
        },
      };

      onEmployeeUpdated(updatedEmployee);
      setPermissions({
        timeTracking: false,
        schedule: false,
        absenceRequest: false,
        documents: false,
      });
      toast.success('App-Zugang wurde widerrufen');
    } catch (error) {
      toast.error('Fehler beim Widerrufen des Zugangs');
    } finally {
      setLoading(false);
    }
  };

  const copyCompanyCode = async () => {
    await navigator.clipboard.writeText(companyId);
    toast.success('Firmencode kopiert');
  };

  return (
    <div className="space-y-6">
      {/* Status Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#14ad9f]" />
            App-Zugang Status
          </CardTitle>
          <CardDescription>
            Verwalten Sie den Zugang zur Taskilo Mitarbeiter-App
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              {isRegistered ? (
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="p-3 bg-gray-100 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {isRegistered ? 'App-Zugang aktiv' : 'Noch nicht registriert'}
                </p>
                {isRegistered && employee.appAccess?.lastLogin && (
                  <p className="text-sm text-gray-500">
                    Letzter Login: {new Date(employee.appAccess.lastLogin).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {isRegistered && employee.appAccess?.registeredAt && (
                  <p className="text-sm text-gray-500">
                    Registriert seit: {new Date(employee.appAccess.registeredAt).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={isRegistered ? 'default' : 'secondary'} className={isRegistered ? 'bg-green-500' : ''}>
              {isRegistered ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>

          {/* Firmencode für Anmeldung */}
          <div className="mt-4 p-4 border rounded-lg">
            <Label className="text-sm font-medium">Firmencode für die Anmeldung</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input value={companyId} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={copyCompanyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Mitarbeiter benötigen diesen Code, um sich in der App anzumelden.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Einladung senden */}
      {!isRegistered && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[#14ad9f]" />
              Einladung senden
            </CardTitle>
            <CardDescription>
              Laden Sie den Mitarbeiter ein, sich in der App zu registrieren
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>E-Mail:</strong> {employee.email}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Der Mitarbeiter erhält einen Link zur Registrierung in der Taskilo-App.
                </p>
              </div>

              <Button
                onClick={handleSendInvite}
                disabled={sendingInvite}
                className="w-full bg-[#14ad9f] hover:bg-[#0d8f84]"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Einladungslink generieren & kopieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIN-Verwaltung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#14ad9f]" />
            PIN für Schnellanmeldung
          </CardTitle>
          <CardDescription>
            Die PIN ermöglicht eine schnelle Anmeldung am Zeiterfassungsterminal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                value={employee.appAccess?.pin ? '******' : 'Keine PIN gesetzt'}
                readOnly
                className="font-mono"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleGeneratePin}
              disabled={generatingPin}
            >
              {generatingPin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {employee.appAccess?.pin ? 'Neue PIN' : 'PIN generieren'}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Die PIN wird dem Mitarbeiter bei der Generierung angezeigt und kann nicht wiederhergestellt werden.
          </p>
        </CardContent>
      </Card>

      {/* Berechtigungen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#14ad9f]" />
            App-Berechtigungen
          </CardTitle>
          <CardDescription>
            Legen Sie fest, welche Funktionen der Mitarbeiter in der App nutzen kann
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Zeiterfassung</p>
                  <p className="text-sm text-gray-500">Ein- und Ausstempeln, Pausenzeiten</p>
                </div>
              </div>
              <Switch
                checked={permissions.timeTracking}
                onCheckedChange={(value) => handlePermissionChange('timeTracking', value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Dienstplan</p>
                  <p className="text-sm text-gray-500">Schichten einsehen und bestätigen</p>
                </div>
              </div>
              <Switch
                checked={permissions.schedule}
                onCheckedChange={(value) => handlePermissionChange('schedule', value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">Abwesenheitsanträge</p>
                  <p className="text-sm text-gray-500">Urlaub, Krankmeldung beantragen</p>
                </div>
              </div>
              <Switch
                checked={permissions.absenceRequest}
                onCheckedChange={(value) => handlePermissionChange('absenceRequest', value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Dokumente</p>
                  <p className="text-sm text-gray-500">Lohnabrechnungen, Verträge einsehen</p>
                </div>
              </div>
              <Switch
                checked={permissions.documents}
                onCheckedChange={(value) => handlePermissionChange('documents', value)}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zugang widerrufen */}
      {isRegistered && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Zugang widerrufen</CardTitle>
            <CardDescription>
              Der Mitarbeiter wird sofort aus der App ausgeloggt und kann sich nicht mehr anmelden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleRevokeAccess}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              App-Zugang widerrufen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

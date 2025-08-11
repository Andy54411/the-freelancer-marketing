'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, CheckCircle, XCircle, AlertCircle, CalendarDays } from 'lucide-react';
import { Employee, PersonalService, AbsenceRequest } from '@/services/personalService';
import { CreateAbsenceRequestModal } from '@/components/personal/CreateAbsenceRequestModal';
import { toast } from 'sonner';

interface VacationTabProps {
  employee: Employee;
  companyId: string;
}

export default function VacationTab({ employee, companyId }: VacationTabProps) {
  const [vacationRequests, setVacationRequests] = useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Urlaubssaldo berechnen
  const totalVacationDays = employee.vacation?.totalDays || 30;
  const usedDays = vacationRequests
    .filter(req => req.status === 'APPROVED' && req.type === 'VACATION')
    .reduce((sum, req) => sum + req.days, 0);
  const pendingDays = vacationRequests
    .filter(req => req.status === 'PENDING' && req.type === 'VACATION')
    .reduce((sum, req) => sum + req.days, 0);
  const remainingDays = totalVacationDays - usedDays;

  useEffect(() => {
    loadVacationData();
  }, [employee.id]);

  const loadVacationData = async () => {
    // Wenn kein employee.id vorhanden ist (Add-Modus), zeige leere Daten
    if (!employee.id) {
      setVacationRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Echte API-Daten laden
      const requests = await PersonalService.getAbsenceRequests(companyId);
      const employeeRequests = requests.filter(req => req.employeeId === employee.id);
      setVacationRequests(employeeRequests);
    } catch (error) {
      console.error('Fehler beim Laden der Urlaubsdaten:', error);
      toast.error('Fehler beim Laden der Urlaubsdaten');
      
      // Fallback zu Mock-Daten wenn Firebase fehlt
      const mockRequests: AbsenceRequest[] = [
        {
          id: '1',
          companyId,
          employeeId: employee.id || '',
          employeeName: `${employee.firstName} ${employee.lastName}`,
          type: 'VACATION',
          startDate: '2025-08-20',
          endDate: '2025-08-24',
          days: 5,
          status: 'APPROVED',
          reason: 'Sommerurlaub',
          requestedAt: '2025-08-01',
          approvedBy: 'HR Team',
          approvedAt: '2025-08-02',
        },
        {
          id: '2',
          companyId,
          employeeId: employee.id || '',
          employeeName: `${employee.firstName} ${employee.lastName}`,
          type: 'VACATION',
          startDate: '2025-09-15',
          endDate: '2025-09-17',
          days: 3,
          status: 'PENDING',
          reason: 'Kurzurlaub',
          requestedAt: '2025-08-10',
        },
        {
          id: '3',
          companyId,
          employeeId: employee.id || '',
          employeeName: `${employee.firstName} ${employee.lastName}`,
          type: 'SICK',
          startDate: '2025-07-15',
          endDate: '2025-07-16',
          days: 2,
          status: 'APPROVED',
          reason: 'Krankheit',
          requestedAt: '2025-07-15',
          approvedBy: 'HR Team',
          approvedAt: '2025-07-15',
        },
      ];
      setVacationRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCreated = (newRequest: AbsenceRequest) => {
    setVacationRequests(prev => [newRequest, ...prev]);
    setIsCreateModalOpen(false);
    toast.success('Urlaubsantrag erfolgreich erstellt');
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

  const getTypeColor = (type: AbsenceRequest['type']) => {
    const colors = {
      VACATION: 'bg-blue-100 text-blue-800',
      SICK: 'bg-red-100 text-red-800',
      PERSONAL: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-green-100 text-green-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  const getStatusBadge = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Wartend
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleApproveRequest = async (requestId: string, approve: boolean) => {
    try {
      // Echte API verwenden
      await PersonalService.processAbsenceRequest(
        companyId,
        requestId,
        approve ? 'APPROVED' : 'REJECTED',
        'HR Team'
      );

      // Bei Genehmigung: Integration mit Dienstplan
      if (approve) {
        const request = vacationRequests.find(req => req.id === requestId);
        if (request) {
          await syncApprovedVacationToSchedule(request);
          toast.success('Antrag genehmigt und im Dienstplan aktualisiert');
        }
      } else {
        toast.success('Antrag abgelehnt');
      }

      // Lokale Daten aktualisieren
      setVacationRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? {
                ...req,
                status: approve ? 'APPROVED' : ('REJECTED' as const),
                approvedBy: 'HR Team',
                approvedAt: new Date().toISOString(),
              }
            : req
        )
      );

      toast.success(approve ? 'Antrag genehmigt und im Dienstplan aktualisiert' : 'Antrag abgelehnt');
    } catch (error) {
      console.error('Fehler beim Verarbeiten des Antrags:', error);
      toast.error('Fehler beim Verarbeiten des Antrags');
    }
  };

  // Integration mit Dienstplan: Genehmigte Urlaubsanträge im Dienstplan anzeigen
  const syncApprovedVacationToSchedule = async (request: AbsenceRequest) => {
    try {
      // Alle Tage zwischen Start- und Enddatum durchgehen
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Prüfen ob bereits eine Schicht für diesen Tag existiert
        const existingShifts = await PersonalService.getShifts(companyId, date, date);
        const employeeShift = existingShifts.find(shift => 
          shift.employeeId === request.employeeId && 
          shift.date === dateStr
        );

        if (employeeShift) {
          // Bestehende Schicht als "ABSENT" markieren
          await PersonalService.updateShift(companyId, employeeShift.id!, {
            status: request.type === 'SICK' ? 'SICK' : 'ABSENT',
            notes: `${getTypeLabel(request.type)}: ${request.reason || ''}`,
          });
        } else {
          // Neue "Abwesenheits-Schicht" erstellen für Visualisierung im Dienstplan
          await PersonalService.createShift({
            companyId,
            employeeId: request.employeeId,
            date: dateStr,
            startTime: '00:00',
            endTime: '23:59',
            position: 'Abwesend',
            department: getTypeLabel(request.type),
            status: request.type === 'SICK' ? 'SICK' : 'ABSENT',
            notes: `${getTypeLabel(request.type)}: ${request.reason || ''}`,
          });
        }
      }
      
      console.log(`✅ Urlaubsantrag ${request.id} in Dienstplan synchronisiert`);
    } catch (error) {
      console.error('❌ Fehler bei Dienstplan-Synchronisation:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dienstplan Integration Info */}
      <Card className="border-[#14ad9f] bg-gradient-to-r from-[#14ad9f]/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[#14ad9f]" />
            <div>
              <h4 className="font-medium text-gray-900">Dienstplan-Integration</h4>
              <p className="text-sm text-gray-600">
                Genehmigte Urlaubsanträge werden automatisch im Dienstplan angezeigt und der Mitarbeiter wird für die Diensteinteilung gesperrt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urlaubssaldo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14ad9f]" />
            Urlaubssaldo
          </CardTitle>
          <CardDescription>
            {employee.id 
              ? 'Übersicht über verfügbare und genommene Urlaubstage'
              : 'Standard-Urlaubseinstellungen für neuen Mitarbeiter'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalVacationDays}</div>
              <div className="text-sm text-blue-800">Gesamte Tage</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{usedDays}</div>
              <div className="text-sm text-green-800">Genommen</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingDays}</div>
              <div className="text-sm text-yellow-800">Ausstehend</div>
            </div>
            <div className="text-center p-4 bg-[#14ad9f]/10 rounded-lg">
              <div className="text-2xl font-bold text-[#14ad9f]">{remainingDays}</div>
              <div className="text-sm text-[#14ad9f]">Verfügbar</div>
            </div>
          </div>

          {/* Dienstplan Status für genehmigte Anträge */}
          {vacationRequests.some(req => req.status === 'APPROVED') && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Dienstplan-Status</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Genehmigte Urlaubszeiten sind im Dienstplan als "Abwesend" markiert und der Mitarbeiter ist für neue Schichten gesperrt.
              </p>
            </div>
          )}

          {/* Urlaubsfortschritt */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Urlaubsfortschritt</span>
              <span>
                {usedDays} von {totalVacationDays} Tagen
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((usedDays / totalVacationDays) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urlaubsanträge */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#14ad9f]" />
                {employee.id ? 'Urlaubsanträge' : 'Urlaubsanträge (verfügbar nach dem Speichern)'}
              </CardTitle>
              <CardDescription>
                {employee.id 
                  ? 'Alle Urlaubsanträge und Abwesenheiten des Mitarbeiters'
                  : 'Urlaubsanträge können nach dem Anlegen des Mitarbeiters erstellt werden'
                }
              </CardDescription>
            </div>
            {employee.id && (
              <Button
                size="sm"
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Neuer Antrag
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {employee.id ? (
            <div className="space-y-4">
              {vacationRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Urlaubsanträge vorhanden</p>
                </div>
              ) : (
                vacationRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(request.type)}>
                            {getTypeLabel(request.type)}
                          </Badge>
                          <Badge variant="outline">
                            {request.days} {request.days === 1 ? 'Tag' : 'Tage'}
                          </Badge>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">Zeitraum:</span>{' '}
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </div>

                        {request.reason && (
                          <div className="text-sm">
                            <span className="font-medium">Grund:</span> {request.reason}
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Eingereicht am: {formatDate(request.requestedAt)}
                        </div>

                        {request.approvedBy && (
                        <div className="text-xs text-gray-500">
                          {request.status === 'APPROVED' ? 'Genehmigt' : 'Abgelehnt'} von{' '}
                          {request.approvedBy} am{' '}
                          {request.approvedAt && formatDate(request.approvedAt)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleApproveRequest(request.id, true)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleApproveRequest(request.id, false)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm">
                        <span className="font-medium">Notizen:</span> {request.notes}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Urlaubsanträge können nach dem Anlegen des Mitarbeiters erstellt werden</p>
              <p className="text-sm mt-2">Speichern Sie zuerst die Grunddaten des Mitarbeiters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Absence Request Modal */}
      <CreateAbsenceRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRequestCreated={handleRequestCreated}
        companyId={companyId}
        employees={[{
          id: employee.id || '',
          firstName: employee.firstName,
          lastName: employee.lastName
        }]}
      />
    </div>
  );
}

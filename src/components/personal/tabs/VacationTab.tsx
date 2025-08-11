'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Employee } from '@/services/personalService';

interface VacationRequest {
  id: string;
  type: 'VACATION' | 'SICK' | 'PERSONAL' | 'TRAINING' | 'OTHER';
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  notes?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface VacationTabProps {
  employee: Employee;
  companyId: string;
}

export default function VacationTab({ employee, companyId }: VacationTabProps) {
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!employee.id) return;

    try {
      setLoading(true);
      // Hier würde die echte API aufgerufen werden
      // const requests = await PersonalService.getAbsenceRequests(companyId, employee.id);

      // Mock-Daten für Demo
      const mockRequests: VacationRequest[] = [
        {
          id: '1',
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
    } catch (error) {
      console.error('Fehler beim Laden der Urlaubsdaten:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: VacationRequest['type']) => {
    const labels = {
      VACATION: 'Urlaub',
      SICK: 'Krankheit',
      PERSONAL: 'Persönlich',
      TRAINING: 'Weiterbildung',
      OTHER: 'Sonstiges',
    };
    return labels[type];
  };

  const getTypeColor = (type: VacationRequest['type']) => {
    const colors = {
      VACATION: 'bg-blue-100 text-blue-800',
      SICK: 'bg-red-100 text-red-800',
      PERSONAL: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-green-100 text-green-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  const getStatusBadge = (status: VacationRequest['status']) => {
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
      // Hier würde die echte API aufgerufen werden
      // await PersonalService.updateAbsenceRequest(companyId, requestId, {
      //   status: approve ? 'APPROVED' : 'REJECTED',
      //   approvedBy: 'HR Team',
      //   approvedAt: new Date().toISOString(),
      // });

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
    } catch (error) {
      console.error('Fehler beim Verarbeiten des Antrags:', error);
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
      {/* Urlaubssaldo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14ad9f]" />
            Urlaubssaldo
          </CardTitle>
          <CardDescription>Übersicht über verfügbare und genommene Urlaubstage</CardDescription>
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
                Urlaubsanträge
              </CardTitle>
              <CardDescription>
                Alle Urlaubsanträge und Abwesenheiten des Mitarbeiters
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              onClick={() => {
                /* Hier würde ein Modal für neuen Antrag geöffnet werden */
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuer Antrag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

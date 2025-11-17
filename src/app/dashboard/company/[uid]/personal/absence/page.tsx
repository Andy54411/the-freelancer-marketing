'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CalendarDays,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Download,
  Search,
  RefreshCw,
  Plane,
  Heart,
  UserX,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PersonalService,
  type Employee,
  type AbsenceRequest as ServiceAbsenceRequest,
} from '@/services/personalService';
import { toast } from 'react-hot-toast';

interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
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

interface VacationBalance {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  carryOverDays: number;
}

export default function PersonalAbsencePage() {
  const params = useParams();
  const companyId = params?.uid as string;

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [vacationBalances, setVacationBalances] = useState<VacationBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (companyId) {
      loadAbsenceData();
    }
  }, [companyId]);

  const loadAbsenceData = async () => {
    try {
      setLoading(true);

      // Lade Mitarbeiter
      const employeeList = await PersonalService.getEmployees(companyId);
      setEmployees(employeeList);

      try {
        // Lade echte Abwesenheitsanträge aus Firestore
        const requests = await PersonalService.getAbsenceRequests(companyId);

        // Mappe Mitarbeiternamen zu den Anträgen
        const requestsWithNames = requests.map(request => {
          const employee = employeeList.find(emp => emp.id === request.employeeId);
          return {
            ...request,
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt',
          } as AbsenceRequest;
        });

        setAbsenceRequests(requestsWithNames);

        // Berechne Urlaubssalden basierend auf echten Daten
        const balances = await Promise.all(
          employeeList.map(async employee => {
            const empRequests = requestsWithNames.filter(req => req.employeeId === employee.id);
            const approvedVacations = empRequests.filter(
              req => req.type === 'VACATION' && req.status === 'APPROVED'
            );
            const pendingVacations = empRequests.filter(
              req => req.type === 'VACATION' && req.status === 'PENDING'
            );

            const usedDays = approvedVacations.reduce((sum, req) => sum + req.days, 0);
            const pendingDays = pendingVacations.reduce((sum, req) => sum + req.days, 0);
            const totalDays = employee.vacation?.totalDays || 30;
            const carryOverDays = 0; // Carry over days not in interface yet

            return {
              employeeId: employee.id!,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              totalDays,
              usedDays,
              pendingDays,
              remainingDays: totalDays + carryOverDays - usedDays - pendingDays,
              carryOverDays,
            } as VacationBalance;
          })
        );

        setVacationBalances(balances);
      } catch (error) {
        // Keine Mock-Daten verwenden - zeige leere Listen für echte Daten
        setAbsenceRequests([]);
        setVacationBalances([]);
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Abwesenheitsdaten');
    } finally {
      setLoading(false);
    }
  };

  const getAbsenceTypeIcon = (type: string) => {
    switch (type) {
      case 'VACATION':
        return <Plane className="h-4 w-4" />;
      case 'SICK':
        return <Heart className="h-4 w-4" />;
      case 'PERSONAL':
        return <UserX className="h-4 w-4" />;
      case 'TRAINING':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Action Handlers
  const handleCreateRequest = async () => {
    try {
      if (employees.length === 0) {
        toast.error('Keine Mitarbeiter verfügbar');
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7); // 1 Woche ab heute
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4); // 5 Tage Urlaub

      const newRequest: Omit<ServiceAbsenceRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        employeeId: employees[0].id!,
        employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
        type: 'VACATION',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: 5,
        status: 'PENDING',
        reason: 'Neuer Urlaubsantrag',
        notes: 'Erstellt über die Verwaltung',
        requestedAt: new Date().toISOString(),
      };

      const requestId = await PersonalService.createAbsenceRequest(newRequest);

      const createdRequest: AbsenceRequest = {
        ...newRequest,
        id: requestId,
        employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
        requestedAt: new Date().toISOString(),
      };

      setAbsenceRequests(prev => [createdRequest, ...prev]);
      toast.success('Abwesenheitsantrag erstellt');
    } catch (error) {
      toast.error('Fehler beim Erstellen des Antrags');
    }
  };

  const handleApproveRequest = async (request: AbsenceRequest, approve: boolean) => {
    try {
      const status = approve ? 'APPROVED' : 'REJECTED';
      const notes = approve ? 'Genehmigt durch HR' : 'Abgelehnt durch HR';

      await PersonalService.updateAbsenceRequest(companyId, request.id, {
        status,
        notes,
        approvedBy: 'HR Team',
        approvedAt: new Date().toISOString(),
      });

      setAbsenceRequests(prev =>
        prev.map(req =>
          req.id === request.id
            ? {
                ...req,
                status,
                notes,
                approvedBy: 'HR Team',
                approvedAt: new Date().toISOString(),
              }
            : req
        )
      );

      toast.success(`Antrag ${approve ? 'genehmigt' : 'abgelehnt'}`);

      // Lade Daten neu um Urlaubssalden zu aktualisieren
      await loadAbsenceData();
    } catch (error) {
      toast.error('Fehler beim Verarbeiten des Antrags');
    }
  };

  const handleExportAbsence = async () => {
    try {
      const csv = await PersonalService.exportAbsenceRequestsCSV(companyId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abwesenheiten-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Abwesenheitsdaten exportiert');
    } catch (error) {
      toast.error('Fehler beim Export');
    }
  };

  const getAbsenceTypeLabel = (type: string) => {
    switch (type) {
      case 'VACATION':
        return 'Urlaub';
      case 'SICK':
        return 'Krankheit';
      case 'PERSONAL':
        return 'Persönlich';
      case 'TRAINING':
        return 'Weiterbildung';
      default:
        return 'Sonstiges';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Wartend
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Genehmigt
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Abgelehnt
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = absenceRequests.filter(request => {
    const matchesSearch =
      request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || request.type === filterType;
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#14ad9f]" />
          <p className="text-gray-600">Lade Abwesenheitsdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Urlaub & Abwesenheit</h1>
          <p className="text-gray-600 mt-2">
            Verwaltung von Urlaubsanträgen, Krankheitstagen und Abwesenheiten
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAbsenceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button onClick={handleExportAbsence} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateRequest} className="bg-[#14ad9f] hover:bg-taskilo-hover">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Antrag
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartende Anträge</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {absenceRequests.filter(req => req.status === 'PENDING').length}
            </div>
            <p className="text-xs text-muted-foreground">Benötigen Genehmigung</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktuelle Abwesenheiten</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Mitarbeiter aktuell abwesend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnittl. Urlaubstage</CardTitle>
            <Plane className="h-4 w-4 text-[#14ad9f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vacationBalances.length > 0
                ? Math.round(
                    vacationBalances.reduce((sum, bal) => sum + bal.usedDays, 0) /
                      vacationBalances.length
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Bereits genommen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Krankenstand</CardTitle>
            <Heart className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.8%</div>
            <p className="text-xs text-muted-foreground">Im letzten Monat</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">Anträge</TabsTrigger>
          <TabsTrigger value="balances">Urlaubssalden</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="reports">Berichte</TabsTrigger>
        </TabsList>

        {/* Anträge */}
        <TabsContent value="requests" className="space-y-6">
          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Mitarbeiter oder Grund suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="VACATION">Urlaub</SelectItem>
                <SelectItem value="SICK">Krankheit</SelectItem>
                <SelectItem value="PERSONAL">Persönlich</SelectItem>
                <SelectItem value="TRAINING">Weiterbildung</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="PENDING">Wartend</SelectItem>
                <SelectItem value="APPROVED">Genehmigt</SelectItem>
                <SelectItem value="REJECTED">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#14ad9f]" />
                Abwesenheitsanträge
              </CardTitle>
              <CardDescription>Übersicht aller eingereichten Anträge</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRequests.map(request => (
                  <div
                    key={request.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#14ad9f]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {request.employeeName
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{request.employeeName}</h3>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              {getAbsenceTypeIcon(request.type)}
                              {getAbsenceTypeLabel(request.type)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(request.startDate).toLocaleDateString('de-DE')} -{' '}
                            {new Date(request.endDate).toLocaleDateString('de-DE')}
                            <span className="ml-2 font-medium">({request.days} Tage)</span>
                          </div>
                          {request.reason && (
                            <div className="text-sm text-gray-500 mt-1">
                              Grund: {request.reason}
                            </div>
                          )}
                          {request.notes && (
                            <div className="text-sm text-orange-600 mt-1">
                              Notiz: {request.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleApproveRequest(request, true)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleApproveRequest(request, false)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {request.approvedBy && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          {request.status === 'APPROVED' ? 'Genehmigt' : 'Abgelehnt'} von{' '}
                          {request.approvedBy} am{' '}
                          {request.approvedAt &&
                            new Date(request.approvedAt).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urlaubssalden */}
        <TabsContent value="balances" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#14ad9f]" />
                Urlaubssalden
              </CardTitle>
              <CardDescription>Übersicht der Urlaubstage aller Mitarbeiter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vacationBalances.map(balance => (
                  <div key={balance.employeeId} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {balance.employeeName
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{balance.employeeName}</h3>
                          <div className="text-sm text-gray-500">
                            {balance.remainingDays} von {balance.totalDays} Tagen verfügbar
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-lg">{balance.remainingDays}</div>
                        <div className="text-sm text-gray-500">Verbleibend</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Verbrauch</span>
                        <span>
                          {balance.usedDays}/{balance.totalDays} Tage
                        </span>
                      </div>
                      <Progress
                        value={(balance.usedDays / balance.totalDays) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <div className="text-gray-500">Genommen</div>
                        <div className="font-medium">{balance.usedDays} Tage</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Wartend</div>
                        <div className="font-medium text-yellow-600">
                          {balance.pendingDays} Tage
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Übertrag</div>
                        <div className="font-medium text-blue-600">
                          {balance.carryOverDays} Tage
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Verfügbar</div>
                        <div className="font-medium text-green-600">
                          {balance.remainingDays} Tage
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kalender */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#14ad9f]" />
                Abwesenheitskalender
              </CardTitle>
              <CardDescription>Monatsübersicht aller Abwesenheiten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">Kalenderansicht</div>
                <div className="text-sm">
                  Hier würde eine Kalenderkomponente die Abwesenheiten aller Mitarbeiter anzeigen
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Berichte */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
                  Abwesenheitsstatistiken
                </CardTitle>
                <CardDescription>Übersicht der verschiedenen Abwesenheitstypen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'Urlaub', count: 45, percentage: 65, color: 'bg-[#14ad9f]' },
                    { type: 'Krankheit', count: 12, percentage: 17, color: 'bg-red-500' },
                    { type: 'Weiterbildung', count: 8, percentage: 12, color: 'bg-blue-500' },
                    { type: 'Persönlich', count: 4, percentage: 6, color: 'bg-purple-500' },
                  ].map((stat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{stat.type}</span>
                        <span className="text-sm">
                          {stat.count} Tage ({stat.percentage}%)
                        </span>
                      </div>
                      <Progress value={stat.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#14ad9f]" />
                  Monatstrends
                </CardTitle>
                <CardDescription>
                  Entwicklung der Abwesenheiten über die letzten Monate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { month: 'Mai', days: 28, change: -5 },
                    { month: 'Juni', days: 35, change: +25 },
                    { month: 'Juli', days: 42, change: +20 },
                    { month: 'August', days: 38, change: -10 },
                  ].map((trend, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{trend.month}</div>
                        <div className="text-sm text-gray-500">{trend.days} Abwesenheitstage</div>
                      </div>
                      <Badge variant={trend.change > 0 ? 'destructive' : 'default'}>
                        {trend.change > 0 ? '+' : ''}
                        {trend.change}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

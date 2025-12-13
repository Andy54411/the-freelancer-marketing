'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Coffee,
  Plane,
  Plus,
  Edit2,
  Trash2,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PersonalService, TimeTracking, Shift, Employee, VacationRequest, AbsenceRequest } from '@/services/personalService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimeEntry {
  id: string;
  date: string;
  type: 'work' | 'break' | 'vacation' | 'sick' | 'overtime';
  startTime?: string;
  endTime?: string;
  hours: number;
  description?: string;
  approved: boolean;
}

interface TimeTrackingTabProps {
  employeeId: string;
  companyId: string;
}

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ employeeId, companyId }) => {
  const [timeEntries, setTimeEntries] = useState<TimeTracking[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todaysShift, setTodaysShift] = useState<Shift | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [newEntry, setNewEntry] = useState<{
    date: string;
    type: 'work' | 'break' | 'vacation' | 'sick' | 'overtime';
    startTime: string;
    endTime: string;
    description: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    type: 'work',
    startTime: '',
    endTime: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    status: 'COMPLETED' as 'ACTIVE' | 'COMPLETED' | 'REVIEWED',
  });

  // Daten laden
  useEffect(() => {
    loadTimeTrackingData();
    loadShiftData();
    loadEmployeeData();
    loadAbsenceRequests();
  }, [employeeId, companyId]);

  const loadAbsenceRequests = async () => {
    try {
      const requests = await PersonalService.getAbsenceRequests(companyId);
      // Filter auf diesen Mitarbeiter
      const employeeRequests = requests.filter(req => req.employeeId === employeeId);
      setAbsenceRequests(employeeRequests);
    } catch (error) {
      console.error('Fehler beim Laden der Abwesenheitsanträge:', error);
    }
  };

  const loadEmployeeData = async () => {
    try {
      const employeeData = await PersonalService.getEmployee(companyId, employeeId);
      setEmployee(employeeData);
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiterdaten:', error);
    }
  };

  const loadTimeTrackingData = async () => {
    try {
      setLoading(true);
      const entries = await PersonalService.getEmployeeTimeTracking(companyId, employeeId);
      setTimeEntries(entries);
    } catch (error) {
      toast.error('Fehler beim Laden der Zeiteinträge');
    } finally {
      setLoading(false);
    }
  };

  const loadShiftData = async () => {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

      const shiftsData = await PersonalService.getShifts(companyId, startOfWeek, endOfWeek);
      const employeeShifts = shiftsData.filter(shift => shift.employeeId === employeeId);
      setShifts(employeeShifts);

      // Heutige Schicht finden
      const todayStr = new Date().toISOString().split('T')[0];
      const todayShift = employeeShifts.find(shift => shift.date === todayStr);
      setTodaysShift(todayShift || null);

      // Vorschlag für heutige Arbeitszeit basierend auf Schichtplan
      if (todayShift && !newEntry.startTime) {
        setNewEntry(prev => ({
          ...prev,
          startTime: todayShift.startTime,
          endTime: todayShift.endTime,
          description: `${todayShift.position} - ${todayShift.department}`,
        }));
      }
    } catch (error) {}
  };

  const calculateHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = end.getTime() - start.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  };

  const handleAddEntry = async () => {
    try {
      setLoading(true);

      if (!newEntry.date) {
        toast.error('Bitte Datum eingeben');
        return;
      }

      let hours = 0;
      let clockIn = newEntry.startTime;
      let clockOut = newEntry.endTime;

      if (newEntry.type === 'work' || newEntry.type === 'overtime') {
        if (!newEntry.startTime || !newEntry.endTime) {
          toast.error('Bitte Start- und Endzeit eingeben');
          return;
        }
        hours = calculateHours(newEntry.startTime, newEntry.endTime);
        if (hours <= 0) {
          toast.error('Endzeit muss nach Startzeit liegen');
          return;
        }
      } else {
        hours = 8; // Standard für Urlaub/Krankheit
        clockIn = '08:00';
        clockOut = '16:00';
      }

      // Überstunden berechnen (über 8 Stunden)
      const overtimeHours = newEntry.type === 'work' && hours > 8 ? hours - 8 : 0;

      const timeEntry: Omit<TimeTracking, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        employeeId,
        date: newEntry.date,
        clockIn,
        clockOut,
        totalHours: hours,
        overtimeHours,
        project: newEntry.description,
        notes: newEntry.description,
        status: 'COMPLETED',
      };

      await PersonalService.addTimeTracking(companyId, timeEntry);
      await loadTimeTrackingData(); // Neu laden

      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        type: 'work',
        startTime: '',
        endTime: '',
        description: '',
      });

      toast.success('Zeiteintrag erfolgreich hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Zeiteintrags');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await PersonalService.deleteTimeTracking(companyId, entryId);
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast.success('Zeiteintrag gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen des Zeiteintrags');
    }
  };

  const handleEditEntry = (entry: TimeTracking) => {
    setEditForm({
      date: entry.date,
      startTime: entry.clockIn || '',
      endTime: entry.clockOut || '',
      description: entry.notes || entry.project || '',
      status: entry.status as 'ACTIVE' | 'COMPLETED' | 'REVIEWED',
    });
    setEditingEntry(entry.id || null);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    
    try {
      setLoading(true);
      
      const hours = calculateHours(editForm.startTime, editForm.endTime);
      
      await PersonalService.updateTimeTracking(companyId, editingEntry, {
        date: editForm.date,
        clockIn: editForm.startTime,
        clockOut: editForm.endTime,
        totalHours: hours,
        notes: editForm.description,
        status: editForm.status,
      });
      
      // Aktualisiere lokalen State
      setTimeEntries(prev => prev.map(entry => 
        entry.id === editingEntry 
          ? { 
              ...entry, 
              date: editForm.date,
              clockIn: editForm.startTime,
              clockOut: editForm.endTime,
              totalHours: hours,
              notes: editForm.description,
              status: editForm.status,
            }
          : entry
      ));
      
      setEditingEntry(null);
      toast.success('Zeiteintrag aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Zeiteintrags');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (status: string) => {
    if (status === 'ACTIVE') return 'Aktiv';
    if (status === 'COMPLETED') return 'Arbeitszeit';
    if (status === 'REVIEWED') return 'Überprüft';
    return status;
  };

  const getTypeColor = (status: string) => {
    if (status === 'ACTIVE') return 'bg-yellow-100 text-yellow-800';
    if (status === 'COMPLETED') return 'bg-blue-100 text-blue-800';
    if (status === 'REVIEWED') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (status: string) => {
    if (status === 'ACTIVE') return <Clock className="h-4 w-4" />;
    if (status === 'COMPLETED') return <CheckCircle className="h-4 w-4" />;
    if (status === 'REVIEWED') return <CheckCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const formatTime = (time: string) => {
    return time ? time.slice(0, 5) : '--:--';
  };

  // Statistiken berechnen
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  const monthlyEntries = timeEntries.filter(entry => entry.date.startsWith(currentMonth));
  const totalHours = monthlyEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
  const workHours = monthlyEntries
    .filter(e => e.status === 'COMPLETED')
    .reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
  const overtimeHours = monthlyEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
  
  // Urlaubstage - verwende PersonalService für konsistente Berechnung wie im VacationTab
  const annualVacationDays = employee?.vacation?.settings?.annualVacationDays || employee?.vacation?.totalDays || 30;
  const availableVacationDays = employee ? PersonalService.calculateAvailableVacationDays(employee) : 0;
  
  // Genommene Urlaubstage aus AbsenceRequests (APPROVED Vacation)
  const approvedVacationDays = absenceRequests
    .filter(req => req.status === 'APPROVED' && req.type === 'VACATION')
    .reduce((sum, req) => sum + req.days, 0);
  
  // Ausstehende Urlaubstage aus AbsenceRequests (PENDING Vacation)
  const pendingVacationDays = absenceRequests
    .filter(req => req.status === 'PENDING' && req.type === 'VACATION')
    .reduce((sum, req) => sum + req.days, 0);
  
  const remainingVacationDays = availableVacationDays - approvedVacationDays;

  const useShiftTime = () => {
    if (todaysShift) {
      setNewEntry(prev => ({
        ...prev,
        startTime: todaysShift.startTime,
        endTime: todaysShift.endTime,
        description: `${todaysShift.position} - ${todaysShift.department}`,
      }));
      toast.success('Schichtzeiten übernommen');
    }
  };

  // Aktiven Eintrag finden (Mitarbeiter ist gerade eingestempelt)
  const activeEntry = timeEntries.find(entry => entry.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Aktiver Zeiteintrag - Mitarbeiter ist eingestempelt */}
      {activeEntry && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full animate-pulse">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-800">Aktuell eingestempelt</h4>
                  <p className="text-sm text-green-600">
                    Seit {formatTime(activeEntry.clockIn)} Uhr • {activeEntry.date}
                    {activeEntry.project && ` • ${activeEntry.project}`}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <Clock className="h-3 w-3 mr-1 animate-pulse" />
                Aktiv
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heutige Schicht Info */}
      {todaysShift && (
        <Card className="border-[#14ad9f] bg-linear-to-r from-[#14ad9f]/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-[#14ad9f]" />
                <div>
                  <h4 className="font-medium text-gray-900">Heutige Schicht</h4>
                  <p className="text-sm text-gray-600">
                    {formatTime(todaysShift.startTime)} - {formatTime(todaysShift.endTime)} •{' '}
                    {todaysShift.position} ({todaysShift.department})
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={useShiftTime}
                className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Schichtzeit übernehmen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kommende Schichten */}
      {shifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#14ad9f]" />
              Kommende Schichten (diese Woche)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shifts.slice(0, 5).map(shift => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(shift.date).toLocaleDateString('de-DE')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)} • {shift.position}
                    </p>
                  </div>
                  <Badge
                    variant={shift.status === 'CONFIRMED' ? 'default' : 'secondary'}
                    className={
                      shift.status === 'CONFIRMED' ? 'bg-[#14ad9f] hover:bg-taskilo-hover' : ''
                    }
                  >
                    {shift.status === 'PLANNED'
                      ? 'Geplant'
                      : shift.status === 'CONFIRMED'
                        ? 'Bestätigt'
                        : shift.status === 'ABSENT'
                          ? 'Abwesend'
                          : 'Krank'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#14ad9f]" />
              <div>
                <p className="text-sm text-muted-foreground">Arbeitsstunden</p>
                <p className="text-2xl font-bold">{workHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Überstunden</p>
                <p className="text-2xl font-bold">{overtimeHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Urlaubstage (genommen)</p>
                <p className="text-2xl font-bold">{approvedVacationDays}</p>
                {annualVacationDays > 0 && (
                  <p className="text-xs text-muted-foreground">
                    von {annualVacationDays} • {remainingVacationDays} übrig
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Gesamt Stunden</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Neuen Eintrag hinzufügen */}
      <Card>
        <CardHeader>
          <CardTitle>Neuen Zeiteintrag hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={newEntry.date}
                onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Typ</Label>
              <select
                id="type"
                value={newEntry.type}
                onChange={e => setNewEntry({ ...newEntry, type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="work">Arbeitszeit</option>
                <option value="overtime">Überstunden</option>
                <option value="vacation">Urlaub</option>
                <option value="sick">Krankheit</option>
              </select>
            </div>
            <div>
              <Label htmlFor="startTime">Startzeit</Label>
              <Input
                id="startTime"
                type="time"
                value={newEntry.startTime}
                onChange={e => setNewEntry({ ...newEntry, startTime: e.target.value })}
                disabled={newEntry.type === 'vacation' || newEntry.type === 'sick'}
              />
            </div>
            <div>
              <Label htmlFor="endTime">Endzeit</Label>
              <Input
                id="endTime"
                type="time"
                value={newEntry.endTime}
                onChange={e => setNewEntry({ ...newEntry, endTime: e.target.value })}
                disabled={newEntry.type === 'vacation' || newEntry.type === 'sick'}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Input
              id="description"
              value={newEntry.description}
              onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
              placeholder="Optionale Beschreibung..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleAddEntry}
              disabled={loading}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Hinzufügen...' : 'Eintrag hinzufügen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zeiteinträge Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Zeiteinträge</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Lade Zeiteinträge...</p>
          ) : timeEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Noch keine Zeiteinträge vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {timeEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(entry.status)}
                      <Badge className={getTypeColor(entry.status)}>
                        {getTypeLabel(entry.status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">
                        {new Date(entry.date).toLocaleDateString('de-DE')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {entry.clockIn && entry.clockOut && (
                          <span>
                            {formatTime(entry.clockIn)} - {formatTime(entry.clockOut)}
                          </span>
                        )}
                        <span>{(entry.totalHours || 0).toFixed(1)}h</span>
                        {entry.overtimeHours && entry.overtimeHours > 0 && (
                          <span className="text-purple-600">
                            +{entry.overtimeHours.toFixed(1)}h Überstunden
                          </span>
                        )}
                        {entry.notes && <span>• {entry.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.approvedBy ? 'default' : 'secondary'}>
                      {entry.approvedBy ? 'Genehmigt' : 'Ausstehend'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEntry(entry)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id || '')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bearbeitungsdialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-[#14ad9f]" />
              Zeiteintrag bearbeiten
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-date">Datum</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startTime">Startzeit</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-endTime">Endzeit</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: 'ACTIVE' | 'COMPLETED' | 'REVIEWED') => 
                  setEditForm(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="COMPLETED">Abgeschlossen</SelectItem>
                  <SelectItem value="REVIEWED">Überprüft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung..."
              />
            </div>
            
            {editForm.startTime && editForm.endTime && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Berechnete Stunden: <strong>{calculateHours(editForm.startTime, editForm.endTime).toFixed(1)}h</strong>
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={loading}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTrackingTab;

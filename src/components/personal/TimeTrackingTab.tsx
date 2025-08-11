'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Coffee, Plane, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
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

  // Mock Daten - würde normalerweise aus Firebase geladen
  useEffect(() => {
    const mockEntries: TimeEntry[] = [
      {
        id: '1',
        date: '2025-08-10',
        type: 'work',
        startTime: '09:00',
        endTime: '17:00',
        hours: 8,
        description: 'Reguläre Arbeitszeit',
        approved: true,
      },
      {
        id: '2',
        date: '2025-08-09',
        type: 'work',
        startTime: '09:00',
        endTime: '19:00',
        hours: 10,
        description: 'Überstunden für Projektabschluss',
        approved: true,
      },
      {
        id: '3',
        date: '2025-08-08',
        type: 'vacation',
        hours: 8,
        description: 'Jahresurlaub',
        approved: true,
      },
    ];
    setTimeEntries(mockEntries);
  }, []);

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
      }

      const entry: TimeEntry = {
        id: Date.now().toString(),
        date: newEntry.date,
        type: newEntry.type,
        startTime: newEntry.startTime || undefined,
        endTime: newEntry.endTime || undefined,
        hours,
        description: newEntry.description,
        approved: false,
      };

      setTimeEntries(prev => [entry, ...prev]);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        type: 'work',
        startTime: '',
        endTime: '',
        description: '',
      });

      toast.success('Zeiteintrag erfolgreich hinzugefügt');
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      toast.error('Fehler beim Hinzufügen des Zeiteintrags');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast.success('Zeiteintrag gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen des Zeiteintrags');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      work: 'Arbeitszeit',
      break: 'Pause',
      vacation: 'Urlaub',
      sick: 'Krankheit',
      overtime: 'Überstunden',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      work: 'bg-blue-100 text-blue-800',
      break: 'bg-yellow-100 text-yellow-800',
      vacation: 'bg-green-100 text-green-800',
      sick: 'bg-red-100 text-red-800',
      overtime: 'bg-purple-100 text-purple-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      work: Clock,
      break: Coffee,
      vacation: Plane,
      sick: Clock,
      overtime: Clock,
    };
    const Icon = icons[type as keyof typeof icons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  // Statistiken berechnen
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyEntries = timeEntries.filter(entry => entry.date.startsWith(currentMonth));
  const totalHours = monthlyEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const workHours = monthlyEntries
    .filter(e => e.type === 'work')
    .reduce((sum, entry) => sum + entry.hours, 0);
  const overtimeHours = monthlyEntries
    .filter(e => e.type === 'overtime')
    .reduce((sum, entry) => sum + entry.hours, 0);
  const vacationDays = monthlyEntries.filter(e => e.type === 'vacation').length;

  return (
    <div className="space-y-6">
      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#14ad9f]" />
              <div>
                <p className="text-sm text-muted-foreground">Arbeitsstunden</p>
                <p className="text-2xl font-bold">{workHours}h</p>
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
                <p className="text-2xl font-bold">{overtimeHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Urlaubstage</p>
                <p className="text-2xl font-bold">{vacationDays}</p>
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
                <p className="text-2xl font-bold">{totalHours}h</p>
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
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
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
          {timeEntries.length === 0 ? (
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
                      {getTypeIcon(entry.type)}
                      <Badge className={getTypeColor(entry.type)}>{getTypeLabel(entry.type)}</Badge>
                    </div>
                    <div>
                      <p className="font-medium">
                        {new Date(entry.date).toLocaleDateString('de-DE')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {entry.startTime && entry.endTime && (
                          <span>
                            {entry.startTime} - {entry.endTime}
                          </span>
                        )}
                        <span>{entry.hours}h</span>
                        {entry.description && <span>• {entry.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.approved ? 'default' : 'secondary'}>
                      {entry.approved ? 'Genehmigt' : 'Ausstehend'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setEditingEntry(entry.id)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
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
    </div>
  );
};

export default TimeTrackingTab;

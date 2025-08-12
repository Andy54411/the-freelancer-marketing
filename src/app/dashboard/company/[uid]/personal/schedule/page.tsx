'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalService, Employee, Shift } from '@/services/personalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Settings,
  Download,
  Upload,
  BarChart3,
  UserCheck,
  UserX,
  AlertCircle,
  Zap,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ModernScheduleView } from '@/components/schedule/ModernScheduleView';
import { cn } from '@/lib/utils';

interface ModernSchedulePageProps {
  params: {
    uid: string;
  };
}

// Schichttypen für Quick Actions
const QUICK_SHIFT_TEMPLATES = [
  {
    id: 'early',
    name: 'Frühschicht',
    startTime: '06:00',
    endTime: '14:00',
    color: 'orange',
    position: 'Standard',
  },
  {
    id: 'middle',
    name: 'Mittelschicht',
    startTime: '10:00',
    endTime: '18:00',
    color: 'blue',
    position: 'Standard',
  },
  {
    id: 'late',
    name: 'Spätschicht',
    startTime: '14:00',
    endTime: '22:00',
    color: 'purple',
    position: 'Standard',
  },
  {
    id: 'night',
    name: 'Nachtschicht',
    startTime: '22:00',
    endTime: '06:00',
    color: 'indigo',
    position: 'Standard',
  },
];

export default function ModernSchedulePage({ params }: ModernSchedulePageProps) {
  const { user } = useAuth();
  const [resolvedParams, setResolvedParams] = useState<{ uid: string } | null>(null);
  
  // State Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  
  // Form State
  const [newShiftForm, setNewShiftForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    position: '',
    department: '',
    notes: '',
    status: 'PLANNED' as Shift['status'],
  });

  // Statistics
  const scheduleStats = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    const weekEnd = new Date(thisWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const todayShifts = shifts.filter(shift => shift.date === today);
    const weekShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= thisWeek && shiftDate <= weekEnd;
    });
    
    return {
      todayTotal: todayShifts.length,
      todayConfirmed: todayShifts.filter(s => s.status === 'CONFIRMED').length,
      weekTotal: weekShifts.length,
      weekPlanned: weekShifts.filter(s => s.status === 'PLANNED').length,
      weekConfirmed: weekShifts.filter(s => s.status === 'CONFIRMED').length,
      absences: shifts.filter(s => s.status === 'ABSENT' || s.status === 'SICK').length,
    };
  }, [shifts]);

  // Resolve params from Promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setResolvedParams(resolved);
    };
    resolveParams();
  }, [params]);

  // Load data when params are resolved
  useEffect(() => {
    if (resolvedParams?.uid) {
      loadData();
    }
  }, [resolvedParams]);

  const loadData = async () => {
    if (!resolvedParams?.uid) return;
    
    try {
      setLoading(true);
      
      // Lade Mitarbeiter
      const employeeList = await PersonalService.getEmployees(resolvedParams.uid);
      setEmployees(employeeList);
      
      // Lade Schichten (aktueller Monat)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      
      const shiftList = await PersonalService.getShifts(
        resolvedParams.uid,
        startOfMonth,
        endOfMonth
      );
      setShifts(shiftList);
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error('Fehler beim Laden der Dienstplan-Daten');
      
      // Fallback: Leere Arrays bei Fehlern
      setEmployees([]);
      setShifts([]);
      
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    try {
      if (!newShiftForm.employeeId || !newShiftForm.position || !newShiftForm.department) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: resolvedParams.uid,
        employeeId: newShiftForm.employeeId,
        date: newShiftForm.date,
        startTime: newShiftForm.startTime,
        endTime: newShiftForm.endTime,
        position: newShiftForm.position,
        department: newShiftForm.department,
        notes: newShiftForm.notes,
        status: newShiftForm.status,
      };

      await PersonalService.createShift(shiftData);
      toast.success('Schicht erfolgreich erstellt');
      
      // Daten neu laden
      await loadData();
      setShowCreateDialog(false);
      
      // Form zurücksetzen
      setNewShiftForm({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        position: '',
        department: '',
        notes: '',
        status: 'PLANNED',
      });
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Schicht:', error);
      toast.error('Fehler beim Erstellen der Schicht');
    }
  };

  const handleQuickCreateShift = async (template: typeof QUICK_SHIFT_TEMPLATES[0], employeeId: string) => {
    try {
      // Finde den Mitarbeiter um seine Abteilung und Position zu verwenden
      const employee = employees.find(emp => emp.id === employeeId);
      
      const shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: resolvedParams.uid,
        employeeId,
        date: new Date().toISOString().split('T')[0],
        startTime: template.startTime,
        endTime: template.endTime,
        position: employee?.position || template.position,
        department: employee?.department || 'Unbekannt',
        notes: `Automatisch erstellt: ${template.name}`,
        status: 'PLANNED',
      };

      await PersonalService.createShift(shiftData);
      toast.success(`${template.name} für Mitarbeiter erstellt`);
      await loadData();
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Schicht:', error);
      toast.error('Fehler beim Erstellen der Schicht');
    }
  };

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
  };

  const handleSlotSelect = (slotInfo: any) => {
    const selectedDate = slotInfo.start.toISOString().split('T')[0];
    setNewShiftForm(prev => ({
      ...prev,
      date: selectedDate,
      startTime: slotInfo.start.toTimeString().slice(0, 5),
      endTime: slotInfo.end.toTimeString().slice(0, 5),
    }));
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-7xl mx-auto p-6 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#14ad9f]" />
            Dienstplan
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Schichten und Arbeitszeiten Ihrer Mitarbeiter
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowBulkCreateDialog(true)}
            className="hover:bg-[#14ad9f]/10 hover:border-[#14ad9f]"
          >
            <Settings className="h-4 w-4 mr-2" />
            Bulk erstellen
          </Button>
          
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Schicht
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="border-l-4 border-l-[#14ad9f] hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Heute</p>
                <p className="text-2xl font-bold text-[#14ad9f]">
                  {scheduleStats.todayConfirmed}/{scheduleStats.todayTotal}
                </p>
                <p className="text-xs text-gray-500">Bestätigt/Geplant</p>
              </div>
              <div className="p-3 bg-[#14ad9f]/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-[#14ad9f]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Diese Woche</p>
                <p className="text-2xl font-bold text-blue-600">
                  {scheduleStats.weekTotal}
                </p>
                <p className="text-xs text-gray-500">Schichten geplant</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Abwesenheiten</p>
                <p className="text-2xl font-bold text-orange-600">
                  {scheduleStats.absences}
                </p>
                <p className="text-xs text-gray-500">Urlaub/Krank</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <UserX className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mitarbeiter</p>
                <p className="text-2xl font-bold text-purple-600">
                  {employees.filter(emp => emp.isActive).length}
                </p>
                <p className="text-xs text-gray-500">Aktiv</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#14ad9f]" />
              Schnellaktionen
            </CardTitle>
            <CardDescription>
              Erstellen Sie schnell Schichten für heute
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.filter(emp => emp.isActive).map(employee => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{employee.firstName} {employee.lastName}</h4>
                      <p className="text-sm text-gray-500">{employee.position}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {QUICK_SHIFT_TEMPLATES.map(template => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCreateShift(template, employee.id!)}
                        className="hover:bg-[#14ad9f]/10 hover:border-[#14ad9f]"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ModernScheduleView
          shifts={shifts}
          employees={employees}
          onShiftClick={handleShiftClick}
          onSlotSelect={handleSlotSelect}
        />
      </motion.div>

      {/* Create Shift Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#14ad9f]" />
              Neue Schicht erstellen
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Schicht für einen Mitarbeiter
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">Mitarbeiter *</Label>
              <Select
                value={newShiftForm.employeeId}
                onValueChange={(value) => setNewShiftForm(prev => ({ ...prev, employeeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(emp => emp.isActive).map(employee => (
                    <SelectItem key={employee.id} value={employee.id!}>
                      {employee.firstName} {employee.lastName} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Datum *</Label>
                <Input
                  id="date"
                  type="date"
                  value={newShiftForm.date}
                  onChange={(e) => setNewShiftForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newShiftForm.status}
                  onValueChange={(value: Shift['status']) => setNewShiftForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Geplant</SelectItem>
                    <SelectItem value="CONFIRMED">Bestätigt</SelectItem>
                    <SelectItem value="ABSENT">Abwesend</SelectItem>
                    <SelectItem value="SICK">Krank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Startzeit *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newShiftForm.startTime}
                  onChange={(e) => setNewShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endTime">Endzeit *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newShiftForm.endTime}
                  onChange={(e) => setNewShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  placeholder="z.B. Servicekraft"
                  value={newShiftForm.position}
                  onChange={(e) => setNewShiftForm(prev => ({ ...prev, position: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="department">Abteilung *</Label>
                <Input
                  id="department"
                  placeholder="z.B. Service"
                  value={newShiftForm.department}
                  onChange={(e) => setNewShiftForm(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Optionale Notizen zur Schicht"
                value={newShiftForm.notes}
                onChange={(e) => setNewShiftForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateShift}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                Schicht erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Save, Timer, Settings } from 'lucide-react';
import { Employee, PersonalService, WorkSettings } from '@/services/personalService';
import { toast } from 'sonner';

interface WorkSettingsTabProps {
  employee: Employee;
  companyId: string;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

export default function WorkSettingsTab({
  employee,
  companyId,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onCancel,
}: WorkSettingsTabProps) {
  const [workSettings, setWorkSettings] = useState<WorkSettings>({
    dailyWorkHours: employee.workSettings?.dailyWorkHours || 8,
    weeklyWorkHours: employee.workSettings?.weeklyWorkHours || 40,
    overtimeThreshold: employee.workSettings?.overtimeThreshold || 8,
    maxDailyHours: employee.workSettings?.maxDailyHours || 10,
    breakAfterHours: employee.workSettings?.breakAfterHours || 6,
    breakDuration: employee.workSettings?.breakDuration || 30,
    overtimeMultiplier: employee.workSettings?.overtimeMultiplier || 1.25,
    weekendMultiplier: employee.workSettings?.weekendMultiplier || 1.5,
    holidayMultiplier: employee.workSettings?.holidayMultiplier || 2.0,
  });

  const [overtimeStats, setOvertimeStats] = useState({
    totalOvertimeHours: 0,
    monthlyOvertimeHours: 0,
    weeklyOvertimeHours: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [_hasChanges, setHasChanges] = useState(false);

  // Überstunden laden
  useEffect(() => {
    const loadOvertimeStats = async () => {
      if (!employee.id) return;
      
      try {
        const entries = await PersonalService.getEmployeeTimeTracking(companyId, employee.id);
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        
        let totalOvertime = 0;
        let monthlyOvertime = 0;
        let weeklyOvertime = 0;
        
        entries.forEach(entry => {
          const overtime = entry.overtimeHours || 0;
          totalOvertime += overtime;
          
          if (entry.date.startsWith(currentMonth)) {
            monthlyOvertime += overtime;
          }
          
          const entryDate = new Date(entry.date);
          if (entryDate >= startOfWeek) {
            weeklyOvertime += overtime;
          }
        });
        
        setOvertimeStats({
          totalOvertimeHours: Math.round(totalOvertime * 10) / 10,
          monthlyOvertimeHours: Math.round(monthlyOvertime * 10) / 10,
          weeklyOvertimeHours: Math.round(weeklyOvertime * 10) / 10,
        });
      } catch (error) {
        console.error('Fehler beim Laden der Überstunden:', error);
      }
    };
    
    loadOvertimeStats();
  }, [employee.id, companyId]);

  const handleWorkSettingsChange = (field: keyof WorkSettings, value: number) => {
    setWorkSettings(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);

    // Update das Parent-Component
    onUpdate({ 
      workSettings: {
        ...workSettings,
        [field]: value,
      }
    });
  };

  const handleSaveSettings = async () => {
    // In Add-Mode (kein employee.id): Nur lokalen State updaten
    if (!employee.id) {
      onUpdate({ workSettings });
      setHasChanges(false);
      toast.success('Arbeitszeiteinstellungen werden beim Speichern des Mitarbeiters mit gespeichert');
      return;
    }

    // Edit-Mode (mit employee.id): Direkt in Firebase speichern
    setIsLoading(true);
    try {
      await PersonalService.updateWorkSettings(companyId, employee.id, workSettings);
      onUpdate({ workSettings });
      onSave();
      setHasChanges(false);
      toast.success('Arbeitszeiteinstellungen erfolgreich gespeichert');
    } catch {
      toast.error('Fehler beim Speichern der Arbeitszeiteinstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Überstunden-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-purple-600" />
            Überstunden-Übersicht
          </CardTitle>
          <CardDescription>
            Aktuelle Überstunden für {employee.firstName} {employee.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{overtimeStats.totalOvertimeHours}h</div>
              <div className="text-sm text-purple-800">Gesamt (Jahr)</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{overtimeStats.monthlyOvertimeHours}h</div>
              <div className="text-sm text-indigo-800">Diesen Monat</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{overtimeStats.weeklyOvertimeHours}h</div>
              <div className="text-sm text-blue-800">Diese Woche</div>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <div className="text-2xl font-bold text-teal-600">{workSettings.overtimeThreshold}h</div>
              <div className="text-sm text-teal-800">Schwelle pro Tag</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arbeitszeiteinstellungen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#14ad9f]" />
                Arbeitszeiteinstellungen
              </CardTitle>
              <CardDescription>Regelarbeitszeit und Überstunden-Konfiguration</CardDescription>
            </div>
            {!isEditing ? (
              <Button
                onClick={onEdit}
                variant="outline"
                size="sm"
                className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                Bearbeiten
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={onCancel} variant="outline" size="sm">
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  size="sm"
                  className="bg-[#14ad9f] hover:bg-[#0d9488] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Speichern...' : 'Speichern'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regelarbeitszeit */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Regelarbeitszeit</h3>
              
              <div>
                <Label htmlFor="dailyWorkHours">Tägliche Arbeitszeit (Stunden)</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="dailyWorkHours"
                      type="number"
                      min="1"
                      max="12"
                      step="0.5"
                      value={workSettings.dailyWorkHours}
                      onChange={e => handleWorkSettingsChange('dailyWorkHours', parseFloat(e.target.value) || 8)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {workSettings.dailyWorkHours}h
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="weeklyWorkHours">Wöchentliche Arbeitszeit (Stunden)</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="weeklyWorkHours"
                      type="number"
                      min="1"
                      max="60"
                      step="0.5"
                      value={workSettings.weeklyWorkHours}
                      onChange={e => handleWorkSettingsChange('weeklyWorkHours', parseFloat(e.target.value) || 40)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {workSettings.weeklyWorkHours}h
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="maxDailyHours">Max. tägliche Arbeitszeit (Stunden)</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="maxDailyHours"
                      type="number"
                      min="1"
                      max="16"
                      step="0.5"
                      value={workSettings.maxDailyHours}
                      onChange={e => handleWorkSettingsChange('maxDailyHours', parseFloat(e.target.value) || 10)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {workSettings.maxDailyHours}h
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Überstunden-Einstellungen */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Überstunden-Regelung</h3>
              
              <div>
                <Label htmlFor="overtimeThreshold">Überstunden ab (Stunden/Tag)</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="overtimeThreshold"
                      type="number"
                      min="1"
                      max="12"
                      step="0.5"
                      value={workSettings.overtimeThreshold}
                      onChange={e => handleWorkSettingsChange('overtimeThreshold', parseFloat(e.target.value) || 8)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {workSettings.overtimeThreshold}h
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">Ab dieser Stundenanzahl werden Überstunden gezählt</span>
                </div>
              </div>

              <div>
                <Label htmlFor="overtimeMultiplier">Überstunden-Zuschlag</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="overtimeMultiplier"
                      type="number"
                      min="1"
                      max="3"
                      step="0.05"
                      value={workSettings.overtimeMultiplier}
                      onChange={e => handleWorkSettingsChange('overtimeMultiplier', parseFloat(e.target.value) || 1.25)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {((workSettings.overtimeMultiplier - 1) * 100).toFixed(0)}%
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">z.B. 1.25 = 25% Zuschlag</span>
                </div>
              </div>

              <div>
                <Label htmlFor="weekendMultiplier">Wochenend-Zuschlag</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="weekendMultiplier"
                      type="number"
                      min="1"
                      max="3"
                      step="0.05"
                      value={workSettings.weekendMultiplier}
                      onChange={e => handleWorkSettingsChange('weekendMultiplier', parseFloat(e.target.value) || 1.5)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {((workSettings.weekendMultiplier - 1) * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="holidayMultiplier">Feiertags-Zuschlag</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <Input
                      id="holidayMultiplier"
                      type="number"
                      min="1"
                      max="3"
                      step="0.05"
                      value={workSettings.holidayMultiplier}
                      onChange={e => handleWorkSettingsChange('holidayMultiplier', parseFloat(e.target.value) || 2.0)}
                      className="w-24"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {((workSettings.holidayMultiplier - 1) * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pausen-Einstellungen */}
          <Separator className="my-6" />
          <h3 className="font-medium text-gray-900 mb-4">Pausen-Regelung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="breakAfterHours">Pflichtpause nach (Stunden)</Label>
              <div className="flex items-center gap-2 mt-1">
                {isEditing ? (
                  <Input
                    id="breakAfterHours"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={workSettings.breakAfterHours}
                    onChange={e => handleWorkSettingsChange('breakAfterHours', parseFloat(e.target.value) || 6)}
                    className="w-24"
                  />
                ) : (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {workSettings.breakAfterHours}h
                  </Badge>
                )}
                <span className="text-sm text-gray-500">Gesetzlich: 30 min nach 6h, 45 min nach 9h</span>
              </div>
            </div>

            <div>
              <Label htmlFor="breakDuration">Pausendauer (Minuten)</Label>
              <div className="flex items-center gap-2 mt-1">
                {isEditing ? (
                  <Input
                    id="breakDuration"
                    type="number"
                    min="15"
                    max="90"
                    step="5"
                    value={workSettings.breakDuration}
                    onChange={e => handleWorkSettingsChange('breakDuration', parseInt(e.target.value) || 30)}
                    className="w-24"
                  />
                ) : (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {workSettings.breakDuration} min
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info-Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Hinweis zur Überstundenberechnung</h4>
              <p className="text-sm text-blue-700 mt-1">
                Überstunden werden automatisch berechnet, wenn die tägliche Arbeitszeit die eingestellte Schwelle überschreitet. 
                Die Zuschläge werden bei der Gehaltsabrechnung berücksichtigt.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

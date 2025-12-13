'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar, Save, Settings, AlertCircle, Minus, Plus, Clock } from 'lucide-react';
import { Employee, VacationSettings, PersonalService } from '@/services/personalService';
import { toast } from 'sonner';

interface VacationSettingsProps {
  employee: Employee;
  companyId: string;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

export default function VacationSettingsTab({
  employee,
  companyId,
  onUpdate,
  onSave,
  isEditing,
  onEdit,
  onCancel,
}: VacationSettingsProps) {
  const [settings, setSettings] = useState<VacationSettings>({
    annualVacationDays: employee.vacation?.settings?.annualVacationDays || 30,
    carryOverDays: employee.vacation?.settings?.carryOverDays || 0,
    maxCarryOverDays: employee.vacation?.settings?.maxCarryOverDays || 5,
    carryOverExpiry: employee.vacation?.settings?.carryOverExpiry || '',
    allowNegativeBalance: employee.vacation?.settings?.allowNegativeBalance || false,
    requireManagerApproval: employee.vacation?.settings?.requireManagerApproval || true,
    minimumAdvanceDays: employee.vacation?.settings?.minimumAdvanceDays || 14,
    maximumConsecutiveDays: employee.vacation?.settings?.maximumConsecutiveDays || 30,
    allowWeekends: employee.vacation?.settings?.allowWeekends || true,
    allowHolidays: employee.vacation?.settings?.allowHolidays || true,
    autoApproveAfterDays: employee.vacation?.settings?.autoApproveAfterDays || 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: keyof VacationSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);

    // Update das Parent-Component
    const updatedVacation = {
      ...employee.vacation,
      settings: {
        ...settings,
        [field]: value,
      },
    };
    onUpdate({ vacation: updatedVacation });
  };

  const handleSaveSettings = async () => {
    // In Add-Mode (kein employee.id): Nur lokalen State updaten
    if (!employee.id) {
      // Update das Employee-Objekt lokal
      const updatedVacation = {
        totalDays: settings.annualVacationDays,
        usedDays: employee.vacation?.usedDays || 0,
        remainingDays: PersonalService.calculateAvailableVacationDays({
          ...employee,
          vacation: {
            ...employee.vacation,
            totalDays: settings.annualVacationDays,
            usedDays: employee.vacation?.usedDays || 0,
            remainingDays: 0,
            yearStart: employee.vacation?.yearStart || new Date().getFullYear().toString(),
            settings,
            requests: employee.vacation?.requests || [],
            history: employee.vacation?.history || [],
          },
        }),
        yearStart: employee.vacation?.yearStart || new Date().getFullYear().toString(),
        settings,
        requests: employee.vacation?.requests || [],
        history: employee.vacation?.history || [],
      };

      onUpdate({ vacation: updatedVacation });
      setHasChanges(false);
      toast.success('Urlaubseinstellungen werden beim Speichern des Mitarbeiters mit gespeichert');

      return;
    }

    // Edit-Mode (mit employee.id): Direkt in Firebase speichern
    setIsLoading(true);
    try {
      // Direkt Firebase-Speicherung für Urlaubseinstellungen
      await PersonalService.updateVacationSettings(companyId, employee.id, settings);

      // Update das Employee-Objekt lokal für sofortige UI-Reaktion
      const updatedVacation = {
        ...employee.vacation,
        settings,
        totalDays: settings.annualVacationDays,
        remainingDays: PersonalService.calculateAvailableVacationDays({
          ...employee,
          vacation: {
            ...employee.vacation,
            settings,
          },
        }),
      };

      // Update sowohl lokalen State als auch Parent-Component
      onUpdate({ vacation: updatedVacation });

      // Rufe auch die Hauptspeicher-Funktion auf für andere mögliche Änderungen
      onSave();

      setHasChanges(false);
      toast.success('Urlaubseinstellungen erfolgreich in der Datenbank gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern der Urlaubseinstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const availableDays = PersonalService.calculateAvailableVacationDays({
    ...employee,
    vacation: {
      ...employee.vacation,
      settings,
    },
  });

  return (
    <div className="space-y-6">
      {/* Aktuelle Urlaubsbilanz */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14ad9f]" />
            Aktuelle Urlaubsbilanz {new Date().getFullYear()}
          </CardTitle>
          <CardDescription>
            Übersicht der aktuellen Urlaubstage für {employee.firstName} {employee.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{availableDays}</div>
              <div className="text-sm text-blue-800">Verfügbar (gesamt)</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{settings.carryOverDays}</div>
              <div className="text-sm text-orange-800">Übertrag</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {employee.vacation?.usedDays || 0}
              </div>
              <div className="text-sm text-red-800">Genommen</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {availableDays - (employee.vacation?.usedDays || 0)}
              </div>
              <div className="text-sm text-green-800">Verbleibend</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urlaubseinstellungen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#14ad9f]" />
                Urlaubseinstellungen
              </CardTitle>
              <CardDescription>Konfiguration der Urlaubstage und -regeln</CardDescription>
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
            {/* Grundeinstellungen */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Grundeinstellungen</h3>

              <div>
                <Label htmlFor="totalDays">Jahresurlaub (Tage)</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleInputChange(
                            'annualVacationDays',
                            Math.max(0, settings.annualVacationDays - 1)
                          )
                        }
                        disabled={settings.annualVacationDays <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="totalDays"
                        type="number"
                        min="0"
                        max="50"
                        value={settings.annualVacationDays}
                        onChange={e =>
                          handleInputChange('annualVacationDays', parseInt(e.target.value) || 0)
                        }
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleInputChange(
                            'annualVacationDays',
                            Math.min(50, settings.annualVacationDays + 1)
                          )
                        }
                        disabled={settings.annualVacationDays >= 50}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {settings.annualVacationDays} Tage
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="carryOverDays">Übertrag aus Vorjahr</Label>
                <div className="flex items-center gap-2 mt-1">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleInputChange(
                            'carryOverDays',
                            Math.max(0, settings.carryOverDays - 1)
                          )
                        }
                        disabled={settings.carryOverDays <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="carryOverDays"
                        type="number"
                        min="0"
                        max={settings.maxCarryOverDays}
                        value={settings.carryOverDays}
                        onChange={e =>
                          handleInputChange('carryOverDays', parseInt(e.target.value) || 0)
                        }
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleInputChange(
                            'carryOverDays',
                            Math.min(settings.maxCarryOverDays, settings.carryOverDays + 1)
                          )
                        }
                        disabled={settings.carryOverDays >= settings.maxCarryOverDays}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {settings.carryOverDays} Tage
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="vacationYear">Urlaubsjahr</Label>
                <div className="mt-1">
                  {isEditing ? (
                    <Input
                      id="vacationYear"
                      type="number"
                      min="2020"
                      max="2030"
                      value={new Date().getFullYear()}
                      onChange={e => {}} // Jahr kann nicht geändert werden
                    />
                  ) : (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {new Date().getFullYear()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Erweiterte Einstellungen */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Erweiterte Einstellungen</h3>

              <div>
                <Label htmlFor="maxCarryOverDays">Max. Übertrag (Tage)</Label>
                <div className="mt-1">
                  {isEditing ? (
                    <Input
                      id="maxCarryOverDays"
                      type="number"
                      min="0"
                      max="20"
                      value={settings.maxCarryOverDays}
                      onChange={e =>
                        handleInputChange('maxCarryOverDays', parseInt(e.target.value) || 5)
                      }
                    />
                  ) : (
                    <Badge variant="outline">{settings.maxCarryOverDays} Tage</Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="minRequestDays">Min. Antragstage</Label>
                <div className="mt-1">
                  {isEditing ? (
                    <Input
                      id="minRequestDays"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.minimumAdvanceDays}
                      onChange={e =>
                        handleInputChange('minimumAdvanceDays', parseInt(e.target.value) || 1)
                      }
                    />
                  ) : (
                    <Badge variant="outline">{settings.minimumAdvanceDays} Tag(e)</Badge>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="maxRequestDays">Max. Antragstage</Label>
                <div className="mt-1">
                  {isEditing ? (
                    <Input
                      id="maxRequestDays"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.maximumConsecutiveDays}
                      onChange={e =>
                        handleInputChange('maximumConsecutiveDays', parseInt(e.target.value) || 30)
                      }
                    />
                  ) : (
                    <Badge variant="outline">{settings.maximumConsecutiveDays} Tage</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Berechnungsvorschau */}
          {isEditing && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Berechnungsvorschau
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Jahresurlaub:</span>
                  <p className="font-medium">{settings.annualVacationDays} Tage</p>
                </div>
                <div>
                  <span className="text-gray-600">+ Übertrag:</span>
                  <p className="font-medium">{settings.carryOverDays} Tage</p>
                </div>
                <div>
                  <span className="text-gray-600">= Gesamt verfügbar:</span>
                  <p className="font-medium text-[#14ad9f]">{availableDays} Tage</p>
                </div>
                <div>
                  <span className="text-gray-600">Verbleibend:</span>
                  <p className="font-medium text-green-600">
                    {availableDays - (employee.vacation?.usedDays || 0)} Tage
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schnellaktionen */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
          <CardDescription>Häufig verwendete Urlaubsaktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                // Reset auf Standard-Urlaubstage
                handleInputChange('annualVacationDays', 30);
                handleInputChange('carryOverDays', 0);
              }}
            >
              <Settings className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-sm">Standard wiederherstellen</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                // Berechne nächstes Jahr - Jahr kann nicht geändert werden, nur Übertragstage
                const remainingDays = availableDays - (employee.vacation?.usedDays || 0);
                handleInputChange(
                  'carryOverDays',
                  Math.min(remainingDays, settings.maxCarryOverDays)
                );
              }}
            >
              <Calendar className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-sm">Neues Urlaubsjahr</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                // Export der Urlaubsdaten
                const data = {
                  employee: `${employee.firstName} ${employee.lastName}`,
                  year: new Date().getFullYear(),
                  settings: settings,
                  availableDays: availableDays,
                  usedDays: employee.vacation?.usedDays || 0,
                  remainingDays: availableDays - (employee.vacation?.usedDays || 0),
                };

                toast.success('Urlaubsdaten in Konsole exportiert');
              }}
            >
              <Clock className="h-6 w-6 text-[#14ad9f]" />
              <span className="text-sm">Daten exportieren</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

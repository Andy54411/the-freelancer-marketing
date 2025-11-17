'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, FileX, Plus, X, Calendar } from 'lucide-react';
import { Employee } from '@/services/personalService';

interface DisciplinaryTabProps {
  employee: Employee | null;
  isEditing: boolean;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

interface DisciplinaryAction {
  id: string;
  type: 'WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION' | 'TERMINATION';
  date: string;
  reason: string;
  description: string;
  issuedBy: string;
  witnessedBy?: string;
  employeeResponse?: string;
  followUpDate?: string;
  resolved: boolean;
  resolutionDate?: string;
  resolutionNotes?: string;
}

interface WorkplaceIncident {
  id: string;
  date: string;
  type: 'ACCIDENT' | 'MISCONDUCT' | 'POLICY_VIOLATION' | 'PERFORMANCE_ISSUE' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  location?: string;
  witnesses?: string[];
  actionTaken?: string;
  preventiveMeasures?: string;
  reportedBy: string;
  followUpRequired: boolean;
}

export default function DisciplinaryTab({
  employee,
  isEditing,
  onUpdate,
  onSave,
  onCancel,
  onEdit,
}: DisciplinaryTabProps) {
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>(
    employee?.disciplinary?.actions || []
  );

  const [workplaceIncidents, setWorkplaceIncidents] = useState<WorkplaceIncident[]>(
    employee?.disciplinary?.incidents || []
  );

  // Disciplinary Actions Management
  const addDisciplinaryAction = () => {
    const newAction: DisciplinaryAction = {
      id: Date.now().toString(),
      type: 'WARNING',
      date: new Date().toISOString().split('T')[0],
      reason: '',
      description: '',
      issuedBy: '',
      resolved: false,
    };
    setDisciplinaryActions([...disciplinaryActions, newAction]);
  };

  const updateDisciplinaryAction = (id: string, field: keyof DisciplinaryAction, value: any) => {
    setDisciplinaryActions(
      disciplinaryActions.map(action => (action.id === id ? { ...action, [field]: value } : action))
    );
  };

  const removeDisciplinaryAction = (id: string) => {
    setDisciplinaryActions(disciplinaryActions.filter(action => action.id !== id));
  };

  // Workplace Incidents Management
  const addWorkplaceIncident = () => {
    const newIncident: WorkplaceIncident = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      type: 'OTHER',
      severity: 'LOW',
      description: '',
      reportedBy: '',
      followUpRequired: false,
    };
    setWorkplaceIncidents([...workplaceIncidents, newIncident]);
  };

  const updateWorkplaceIncident = (id: string, field: keyof WorkplaceIncident, value: any) => {
    setWorkplaceIncidents(
      workplaceIncidents.map(incident =>
        incident.id === id ? { ...incident, [field]: value } : incident
      )
    );
  };

  const removeWorkplaceIncident = (id: string) => {
    setWorkplaceIncidents(workplaceIncidents.filter(incident => incident.id !== id));
  };

  const addWitness = (incidentId: string) => {
    const incident = workplaceIncidents.find(i => i.id === incidentId);
    if (incident) {
      const witnesses = incident.witnesses || [];
      updateWorkplaceIncident(incidentId, 'witnesses', [...witnesses, '']);
    }
  };

  const updateWitness = (incidentId: string, witnessIndex: number, value: string) => {
    const incident = workplaceIncidents.find(i => i.id === incidentId);
    if (incident) {
      const witnesses = [...(incident.witnesses || [])];
      witnesses[witnessIndex] = value;
      updateWorkplaceIncident(incidentId, 'witnesses', witnesses);
    }
  };

  const removeWitness = (incidentId: string, witnessIndex: number) => {
    const incident = workplaceIncidents.find(i => i.id === incidentId);
    if (incident) {
      const witnesses = (incident.witnesses || []).filter((_, index) => index !== witnessIndex);
      updateWorkplaceIncident(incidentId, 'witnesses', witnesses);
    }
  };

  const handleSave = () => {
    onUpdate({
      disciplinary: {
        actions: disciplinaryActions,
        incidents: workplaceIncidents,
      },
    });
    onSave();
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'WRITTEN_WARNING':
        return 'bg-orange-100 text-orange-800';
      case 'FINAL_WARNING':
        return 'bg-red-100 text-red-800';
      case 'SUSPENSION':
        return 'bg-purple-100 text-purple-800';
      case 'TERMINATION':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'WARNING':
        return 'Mündliche Verwarnung';
      case 'WRITTEN_WARNING':
        return 'Schriftliche Abmahnung';
      case 'FINAL_WARNING':
        return 'Letzte Abmahnung';
      case 'SUSPENSION':
        return 'Suspendierung';
      case 'TERMINATION':
        return 'Kündigung';
      default:
        return type;
    }
  };

  if (!employee) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-500">Mitarbeiter nicht gefunden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#14ad9f]" />
            Disziplinarverfahren & Arbeitsrechtliche Maßnahmen
          </CardTitle>
          <p className="text-sm text-gray-600">
            Dokumentation von Abmahnungen, Vorfällen und disziplinarischen Maßnahmen
          </p>
        </CardHeader>
      </Card>

      {/* Disziplinarmaßnahmen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-[#14ad9f]" />
            Disziplinarmaßnahmen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {disciplinaryActions.map(action => (
            <div key={action.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge className={getActionTypeColor(action.type)}>
                    {getActionTypeLabel(action.type)}
                  </Badge>
                  {action.resolved && <Badge className="bg-green-100 text-green-800">Gelöst</Badge>}
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDisciplinaryAction(action.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Art der Maßnahme</Label>
                  <Select
                    value={action.type}
                    onValueChange={value => updateDisciplinaryAction(action.id, 'type', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WARNING">Mündliche Verwarnung</SelectItem>
                      <SelectItem value="WRITTEN_WARNING">Schriftliche Abmahnung</SelectItem>
                      <SelectItem value="FINAL_WARNING">Letzte Abmahnung</SelectItem>
                      <SelectItem value="SUSPENSION">Suspendierung</SelectItem>
                      <SelectItem value="TERMINATION">Kündigung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={action.date}
                    onChange={e => updateDisciplinaryAction(action.id, 'date', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Ausgestellt von</Label>
                  <Input
                    value={action.issuedBy}
                    onChange={e => updateDisciplinaryAction(action.id, 'issuedBy', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Name der ausstellenden Person"
                  />
                </div>
                <div>
                  <Label>Zeuge (optional)</Label>
                  <Input
                    value={action.witnessedBy || ''}
                    onChange={e =>
                      updateDisciplinaryAction(action.id, 'witnessedBy', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Name des Zeugen"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Grund</Label>
                  <Input
                    value={action.reason}
                    onChange={e => updateDisciplinaryAction(action.id, 'reason', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Kurze Zusammenfassung des Grundes"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={action.description}
                    onChange={e =>
                      updateDisciplinaryAction(action.id, 'description', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Detaillierte Beschreibung des Vorfalls"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Stellungnahme des Mitarbeiters</Label>
                  <Textarea
                    value={action.employeeResponse || ''}
                    onChange={e =>
                      updateDisciplinaryAction(action.id, 'employeeResponse', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Antwort/Stellungnahme des Mitarbeiters"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Follow-up Datum</Label>
                  <Input
                    type="date"
                    value={action.followUpDate || ''}
                    onChange={e =>
                      updateDisciplinaryAction(action.id, 'followUpDate', e.target.value)
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`resolved-${action.id}`}
                    checked={action.resolved}
                    onChange={e =>
                      updateDisciplinaryAction(action.id, 'resolved', e.target.checked)
                    }
                    disabled={!isEditing}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`resolved-${action.id}`}>Als gelöst markieren</Label>
                </div>
                {action.resolved && (
                  <>
                    <div>
                      <Label>Lösungsdatum</Label>
                      <Input
                        type="date"
                        value={action.resolutionDate || ''}
                        onChange={e =>
                          updateDisciplinaryAction(action.id, 'resolutionDate', e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label>Lösungsnotizen</Label>
                      <Textarea
                        value={action.resolutionNotes || ''}
                        onChange={e =>
                          updateDisciplinaryAction(action.id, 'resolutionNotes', e.target.value)
                        }
                        disabled={!isEditing}
                        placeholder="Wie wurde das Problem gelöst?"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              onClick={addDisciplinaryAction}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Disziplinarmaßnahme hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Arbeitsplatzvorfälle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#14ad9f]" />
            Arbeitsplatzvorfälle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workplaceIncidents.map(incident => (
            <div key={incident.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(incident.severity)}>
                    {incident.severity === 'CRITICAL'
                      ? 'Kritisch'
                      : incident.severity === 'HIGH'
                        ? 'Hoch'
                        : incident.severity === 'MEDIUM'
                          ? 'Mittel'
                          : 'Niedrig'}
                  </Badge>
                  {incident.followUpRequired && (
                    <Badge className="bg-blue-100 text-blue-800">Follow-up erforderlich</Badge>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWorkplaceIncident(incident.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Art des Vorfalls</Label>
                  <Select
                    value={incident.type}
                    onValueChange={value => updateWorkplaceIncident(incident.id, 'type', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCIDENT">Arbeitsunfall</SelectItem>
                      <SelectItem value="MISCONDUCT">Fehlverhalten</SelectItem>
                      <SelectItem value="POLICY_VIOLATION">Richtlinienverletzung</SelectItem>
                      <SelectItem value="PERFORMANCE_ISSUE">Leistungsproblem</SelectItem>
                      <SelectItem value="OTHER">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Schweregrad</Label>
                  <Select
                    value={incident.severity}
                    onValueChange={value => updateWorkplaceIncident(incident.id, 'severity', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Niedrig</SelectItem>
                      <SelectItem value="MEDIUM">Mittel</SelectItem>
                      <SelectItem value="HIGH">Hoch</SelectItem>
                      <SelectItem value="CRITICAL">Kritisch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={incident.date}
                    onChange={e => updateWorkplaceIncident(incident.id, 'date', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Ort (optional)</Label>
                  <Input
                    value={incident.location || ''}
                    onChange={e => updateWorkplaceIncident(incident.id, 'location', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Wo fand der Vorfall statt?"
                  />
                </div>
                <div>
                  <Label>Gemeldet von</Label>
                  <Input
                    value={incident.reportedBy}
                    onChange={e =>
                      updateWorkplaceIncident(incident.id, 'reportedBy', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Name der meldenden Person"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`follow-up-${incident.id}`}
                    checked={incident.followUpRequired}
                    onChange={e =>
                      updateWorkplaceIncident(incident.id, 'followUpRequired', e.target.checked)
                    }
                    disabled={!isEditing}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`follow-up-${incident.id}`}>Follow-up erforderlich</Label>
                </div>
                <div className="md:col-span-2">
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={incident.description}
                    onChange={e =>
                      updateWorkplaceIncident(incident.id, 'description', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Detaillierte Beschreibung des Vorfalls"
                    rows={3}
                  />
                </div>

                {/* Zeugen */}
                <div className="md:col-span-2">
                  <Label>Zeugen</Label>
                  <div className="space-y-2">
                    {(incident.witnesses || []).map((witness, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={witness}
                          onChange={e => updateWitness(incident.id, index, e.target.value)}
                          disabled={!isEditing}
                          placeholder="Name des Zeugen"
                          className="flex-1"
                        />
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWitness(incident.id, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addWitness(incident.id)}
                        className="border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Zeuge hinzufügen
                      </Button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Ergriffene Maßnahmen</Label>
                  <Textarea
                    value={incident.actionTaken || ''}
                    onChange={e =>
                      updateWorkplaceIncident(incident.id, 'actionTaken', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Welche Maßnahmen wurden ergriffen?"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Präventivmaßnahmen</Label>
                  <Textarea
                    value={incident.preventiveMeasures || ''}
                    onChange={e =>
                      updateWorkplaceIncident(incident.id, 'preventiveMeasures', e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Maßnahmen zur Vermeidung ähnlicher Vorfälle"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              onClick={addWorkplaceIncident}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Vorfall hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isEditing ? (
        <div className="flex gap-3">
          <Button onClick={handleSave} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
            Speichern
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button onClick={onEdit} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
          Bearbeiten
        </Button>
      )}
    </div>
  );
}

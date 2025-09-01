'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeTrackingService } from '@/services/timeTrackingService';
import { Clock, Plus } from 'lucide-react';

interface ManualTimeEntryProps {
  companyId: string;
  userId: string;
  projects: Array<{
    id: string;
    name: string;
    client: string;
    hourlyRate: number;
  }>;
  onTimeEntryCreated: () => void;
}

export function ManualTimeEntry({
  companyId,
  userId,
  projects,
  onTimeEntryCreated,
}: ManualTimeEntryProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workType, setWorkType] = useState<'full-day' | 'split-shift'>('full-day');
  
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
  };
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    pauseMinutes: 30, // Standard Mittagspause
    projectId: '',
    customerId: '',
    customerName: '',
    hourlyRate: 50,
    billable: true,
    category: '',
    notes: '',
    // Für geteilte Schichten
    splitShifts: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '17:00' },
    ],
  });

  // Berechne Arbeitszeit basierend auf Typ
  const calculateWorkingHours = () => {
    if (workType === 'split-shift') {
      return formData.splitShifts.reduce((total, shift) => {
        if (!shift.startTime || !shift.endTime) return total;
        const start = new Date(`2000-01-01T${shift.startTime}:00`);
        const end = new Date(`2000-01-01T${shift.endTime}:00`);
        const diffMs = end.getTime() - start.getTime();
        return total + diffMs / (1000 * 60 * 60);
      }, 0);
    } else {
      if (!formData.startTime || !formData.endTime) return 0;
      const start = new Date(`2000-01-01T${formData.startTime}:00`);
      const end = new Date(`2000-01-01T${formData.endTime}:00`);
      const totalMs = end.getTime() - start.getTime();
      const totalHours = totalMs / (1000 * 60 * 60);
      const pauseHours = formData.pauseMinutes / 60;
      return Math.max(0, totalHours - pauseHours);
    }
  };

  const workingHours = calculateWorkingHours();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Bitte geben Sie eine Beschreibung ein');
      return;
    }

    if (!formData.projectId) {
      toast.error('Bitte wählen Sie ein Projekt aus');
      return;
    }

    if (workingHours <= 0) {
      toast.error('Arbeitszeit muss größer als 0 sein');
      return;
    }

    // Validierung für verschiedene Modi
    if (workType === 'full-day') {
      if (!formData.startTime || !formData.endTime) {
        toast.error('Bitte geben Sie Start- und Endzeit ein');
        return;
      }
    } else {
      // Validierung für geteilte Schichten
      const validShifts = formData.splitShifts.filter(shift => shift.startTime && shift.endTime);
      if (validShifts.length === 0) {
        toast.error('Bitte geben Sie mindestens eine Arbeitszeit ein');
        return;
      }
    }

    setLoading(true);

    try {
      // Finde das ausgewählte Projekt
      const selectedProject = formData.projectId
        ? projects.find(p => p.id === formData.projectId)
        : null;

      // Erstelle Zeiteinträge basierend auf dem Typ
      if (workType === 'split-shift') {
        // Erstelle mehrere Zeiteinträge für geteilte Schichten
        for (const shift of formData.splitShifts) {
          if (!shift.startTime || !shift.endTime) continue;

          const startDateTime = new Date(`${formData.date}T${shift.startTime}:00`);
          const endDateTime = new Date(`${formData.date}T${shift.endTime}:00`);
          const shiftDuration =
            (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

          await TimeTrackingService.createManualTimeEntry({
            companyId,
            userId,
            description: `${formData.description} (Schicht ${shift.startTime}-${shift.endTime})`,
            startTime: startDateTime,
            endTime: endDateTime,
            duration: shiftDuration,
            projectId: selectedProject?.id || undefined,
            projectName: selectedProject?.name?.trim() || 'Kein Projekt',
            customerId: selectedProject?.client || formData.customerId || undefined,
            customerName: selectedProject?.client || formData.customerName || undefined,
            hourlyRate: selectedProject?.hourlyRate || formData.hourlyRate,
            billable: formData.billable,
            category: formData.category || undefined,
            notes: formData.notes || undefined,
            tags: ['split-shift'],
          });
        }
      } else {
        // Standard Zeiteintrag mit Pausen
        const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

        await TimeTrackingService.createManualTimeEntry({
          companyId,
          userId,
          description: formData.description,
          startTime: startDateTime,
          endTime: endDateTime,
          duration: workingHours,
          projectId: selectedProject?.id || undefined,
          projectName: selectedProject?.name?.trim() || 'Kein Projekt',
          customerId: selectedProject?.client || formData.customerId || undefined,
          customerName: selectedProject?.client || formData.customerName || undefined,
          hourlyRate: selectedProject?.hourlyRate || formData.hourlyRate,
          billable: formData.billable,
          category: formData.category || undefined,
          notes: `${formData.notes || ''} (Pause: ${formData.pauseMinutes} Min.)`.trim(),
          tags: formData.pauseMinutes > 0 ? ['with-break'] : [],
        });
      }

      toast.success('Zeiteintrag erfolgreich erstellt');

      // Reset form
      setFormData({
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        pauseMinutes: 30,
        projectId: '',
        customerId: '',
        customerName: '',
        hourlyRate: 50,
        billable: true,
        category: '',
        notes: '',
        splitShifts: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '17:00' },
        ],
      });

      setOpen(false);
      onTimeEntryCreated();
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Zeiteintrags:', error);
      toast.error(`Zeiteintrag konnte nicht erstellt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus size={16} />
          Manueller Eintrag
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">{/* Breiter: max-w-2xl statt max-w-lg */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Clock size={20} />
            Zeiteintrag hinzufügen
          </DialogTitle>
        </DialogHeader>
        <div
          className="flex-1 overflow-y-auto pr-2 -mr-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#14ad9f #f1f5f9' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div>
              <Label htmlFor="description">Beschreibung *</Label>
              <Textarea
                id="description"
                placeholder="Was haben Sie gemacht?"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Projektauswahl */}
            <div>
              <Label htmlFor="project">Projekt * ({projects?.length || 0} verfügbar)</Label>
              
              {(!projects || projects.length === 0) ? (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Keine Projekte verfügbar. Sie können entweder:
                    </p>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      <li>Ein neues Projekt im "Projekte" Tab erstellen</li>
                      <li>Oder manuell Projekt-Details eingeben</li>
                    </ul>
                  </div>
                  
                  {/* Manuelle Projekt-Eingabe */}
                  <div className="space-y-3 p-3 bg-gray-50 border rounded-md">
                    <h4 className="font-medium text-gray-900">Manueller Projekt-Eintrag</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="projectName">Projekt-Name</Label>
                        <Input
                          id="projectName"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="z.B. Website-Entwicklung"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientName">Kunde</Label>
                        <Input
                          id="clientName"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          placeholder="z.B. Musterfirma GmbH"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => {
                      const selectedProject = projects.find(p => p.id === value);
                      setFormData({ 
                        ...formData, 
                        projectId: value,
                        customerName: selectedProject?.client || '',
                        hourlyRate: selectedProject?.hourlyRate || 50
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Projekt auswählen..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {projects.filter(project => project.id && project.id.trim() !== '').map((project) => (
                        <SelectItem 
                          key={project.id} 
                          value={project.id}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{project.name || 'Unnamed Project'}</span>
                            <span className="text-xs text-gray-500">{project.client || 'No Client'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Arbeitszeit-Modus */}
            <div>
              <Label>Arbeitszeit-Typ</Label>
              <div className="flex rounded-lg bg-gray-100 p-1 mt-1">
                <button
                  type="button"
                  onClick={() => setWorkType('full-day')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    workType === 'full-day'
                      ? 'bg-[#14ad9f] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ganzer Tag
                </button>
                <button
                  type="button"
                  onClick={() => setWorkType('split-shift')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    workType === 'split-shift'
                      ? 'bg-[#14ad9f] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Geteilte Schicht
                </button>
              </div>
            </div>

            {/* Datum */}
            <div>
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {workType === 'full-day' ? (
              <>
                {/* Standard Arbeitszeit */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startTime">Von *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Bis *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Pause */}
                <div>
                  <Label htmlFor="pauseMinutes">Pause (Minuten)</Label>
                  <Input
                    id="pauseMinutes"
                    type="number"
                    min="0"
                    max="480"
                    value={formData.pauseMinutes}
                    onChange={e =>
                      setFormData({ ...formData, pauseMinutes: parseInt(e.target.value) || 0 })
                    }
                    placeholder="z.B. 30 für Mittagspause"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard: 30 Min. Mittagspause</p>
                </div>
              </>
            ) : (
              <>
                {/* Geteilte Schichten */}
                <div className="space-y-3">
                  <Label>Arbeitszeiten</Label>
                  {formData.splitShifts.map((shift, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor={`shift-start-${index}`}>Von</Label>
                        <Input
                          id={`shift-start-${index}`}
                          type="time"
                          value={shift.startTime}
                          onChange={e => {
                            const newShifts = [...formData.splitShifts];
                            newShifts[index].startTime = e.target.value;
                            setFormData({ ...formData, splitShifts: newShifts });
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`shift-end-${index}`}>Bis</Label>
                        <Input
                          id={`shift-end-${index}`}
                          type="time"
                          value={shift.endTime}
                          onChange={e => {
                            const newShifts = [...formData.splitShifts];
                            newShifts[index].endTime = e.target.value;
                            setFormData({ ...formData, splitShifts: newShifts });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        splitShifts: [...formData.splitShifts, { startTime: '', endTime: '' }],
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Weitere Arbeitszeit hinzufügen
                  </Button>
                </div>
              </>
            )}

            {/* Arbeitszeit-Anzeige */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-800">
                  Arbeitszeit: {workingHours.toFixed(2)} Stunden
                </span>
                <span className="text-blue-600">
                  {(workingHours * formData.hourlyRate).toFixed(2)}€
                </span>
              </div>
              {workType === 'full-day' && formData.pauseMinutes > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  (inkl. {formData.pauseMinutes} Min. Pause)
                </p>
              )}
            </div>



            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="hourlyRate">Stundensatz (€)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={e =>
                    setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="billable"
                  checked={formData.billable}
                  onCheckedChange={checked => setFormData({ ...formData, billable: !!checked })}
                />
                <Label htmlFor="billable">Abrechenbar</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Zusätzliche Notizen (optional)"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#14ad9f] hover:bg-[#129488]"
              >
                {loading ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import {
  X,
  Plus,
  Tag,
  Trash2,
  Edit,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { db } from '@/firebase/clients';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

interface Label {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

interface LabelManagerProps {
  open: boolean;
  onClose: () => void;
  labels: Label[];
  companyId: string;
  onLabelsChange: () => void;
}

// Available colors for labels
const LABEL_COLORS = [
  { name: 'Rot', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Gelb', value: '#eab308' },
  { name: 'Grün', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blau', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violett', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Grau', value: '#6b7280' },
];

export default function LabelManager({
  open,
  onClose,
  labels,
  companyId,
  onLabelsChange,
}: LabelManagerProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[4].value); // Teal default
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    setSaving(true);
    try {
      const labelsRef = collection(db, 'companies', companyId, 'contactLabels');
      await addDoc(labelsRef, {
        name: newLabelName.trim(),
        color: newLabelColor,
        contactCount: 0,
        createdAt: new Date(),
      });

      toast.success('Label erstellt');
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[4].value);
      onLabelsChange();
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
      toast.error('Fehler beim Erstellen des Labels');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLabel = (label: Label) => {
    setEditingLabel(label);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = async () => {
    if (!editingLabel || !editName.trim()) return;

    setSaving(true);
    try {
      const labelRef = doc(db, 'companies', companyId, 'contactLabels', editingLabel.id);
      await updateDoc(labelRef, {
        name: editName.trim(),
        color: editColor,
        updatedAt: new Date(),
      });

      toast.success('Label aktualisiert');
      setEditingLabel(null);
      onLabelsChange();
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Fehler beim Aktualisieren des Labels');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm('Möchten Sie dieses Label wirklich löschen?')) return;

    setDeleting(labelId);
    try {
      const labelRef = doc(db, 'companies', companyId, 'contactLabels', labelId);
      await deleteDoc(labelRef);

      toast.success('Label gelöscht');
      onLabelsChange();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen des Labels');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-teal-600" />
            Labels verwalten
          </DialogTitle>
          <DialogDescription>
            Erstellen und verwalten Sie Labels, um Ihre Kontakte zu organisieren.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Create new label */}
          <div className="space-y-3 mb-6">
            <Label>Neues Label erstellen</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label-Name"
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                {LABEL_COLORS.slice(0, 5).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewLabelColor(color.value)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-all',
                      newLabelColor === color.value
                        ? 'ring-2 ring-offset-2 ring-gray-400'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <Button
                onClick={handleCreateLabel}
                disabled={saving || !newLabelName.trim()}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {/* More colors */}
            <div className="flex items-center gap-1 pl-2">
              {LABEL_COLORS.slice(5).map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewLabelColor(color.value)}
                  className={cn(
                    'w-5 h-5 rounded-full transition-all',
                    newLabelColor === color.value
                      ? 'ring-2 ring-offset-1 ring-gray-400'
                      : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Labels list */}
          <div className="space-y-2">
            <Label>Vorhandene Labels</Label>
            <ScrollArea className="h-64 rounded-md border">
              {labels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <Tag className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    Noch keine Labels vorhanden
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg transition-colors',
                        editingLabel?.id === label.id
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      {editingLabel?.id === label.id ? (
                        // Edit mode
                        <>
                          <div className="flex items-center gap-1">
                            {LABEL_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setEditColor(color.value)}
                                className={cn(
                                  'w-4 h-4 rounded-full transition-all',
                                  editColor === color.value
                                    ? 'ring-2 ring-offset-1 ring-gray-400'
                                    : 'hover:scale-110'
                                )}
                                style={{ backgroundColor: color.value }}
                              />
                            ))}
                          </div>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLabel(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        // View mode
                        <>
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 text-sm font-medium">
                            {label.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {label.contactCount}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLabel(label)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLabel(label.id)}
                            disabled={deleting === label.id}
                            className="h-7 w-7 p-0"
                          >
                            {deleting === label.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schliessen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

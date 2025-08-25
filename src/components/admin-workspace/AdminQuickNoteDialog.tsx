'use client';

import React, { useState } from 'react';
import { StickyNote, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import type {
  AdminWorkspace,
  AdminWorkspaceTask,
  AdminWorkspaceBoardColumn,
} from '@/services/AdminWorkspaceService';

interface AdminQuickNoteDialogProps {
  workspaces: AdminWorkspace[];
  adminId: string;
  userId: string;
  onNoteAdded?: () => void;
}

export function AdminQuickNoteDialog({
  workspaces,
  adminId,
  userId,
  onNoteAdded,
}: AdminQuickNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loading, setLoading] = useState(false);

  // Filter only active workspaces for quick notes
  const activeWorkspaces = workspaces.filter(w => w.status === 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !noteTitle.trim()) return;

    setLoading(true);
    try {
      const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
      if (!selectedWorkspace) return;

      // Create a new task as a quick note
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: noteTitle.trim(),
        description: noteContent.trim() || undefined,
        status: 'todo',
        priority,
        assignee: userId,
        assignees: [userId],
        assignedTo: [userId],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['schnell-notiz'],
        position: 0,
        columnId: 'todo',
        workspaceId: selectedWorkspaceId,
        labels: [],
        checklist: [],
      } as AdminWorkspaceTask;

      // Add to the first column (usually "Zu erledigen")
      const boardColumns = selectedWorkspace.boardColumns || [];
      const todoColumn = boardColumns.find(col => col.id === 'todo') || boardColumns[0];

      if (todoColumn) {
        // Add new task to the beginning of the column
        const updatedTasks = [newTask, ...todoColumn.tasks];
        const updatedColumns = boardColumns.map(col =>
          col.id === todoColumn.id
            ? { ...col, tasks: updatedTasks.map((task, index) => ({ ...task, position: index })) }
            : col
        );

        await adminWorkspaceService.updateWorkspace(selectedWorkspaceId, {
          boardColumns: updatedColumns,
        });
      }

      // Reset form
      setNoteTitle('');
      setNoteContent('');
      setSelectedWorkspaceId('');
      setPriority('medium');
      setOpen(false);

      if (onNoteAdded) {
        onNoteAdded();
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Dringend';
      case 'high':
        return 'Hoch';
      case 'medium':
        return 'Normal';
      case 'low':
        return 'Niedrig';
      default:
        return priority;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 hover:bg-[#14ad9f]/10 hover:border-[#14ad9f] hover:text-[#14ad9f]"
        >
          <StickyNote className="h-4 w-4" />
          Schnell-Notiz
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-[#14ad9f]" />
            Schnell-Notiz hinzufügen
          </DialogTitle>
          <DialogDescription>
            Füge schnell eine Notiz zu einem deiner aktiven Projekte hinzu, ohne den Workspace zu
            öffnen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workspace Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Projekt auswählen</label>
            <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Projekt auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {activeWorkspaces.map(workspace => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    <div className="flex items-center gap-2">
                      <span>{workspace.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {workspace.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Notiz-Titel</label>
            <Input
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              placeholder="z.B. Kunde anrufen, Meeting vorbereiten..."
              required
            />
          </div>

          {/* Note Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Beschreibung (optional)</label>
            <Textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Zusätzliche Details zur Notiz..."
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Priorität</label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Niedrig
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Normal
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    Hoch
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Dringend
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {noteTitle && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-600 mb-2">Vorschau:</div>
              <div className="flex items-start gap-2">
                <div className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(priority)}`}>
                  {getPriorityLabel(priority)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{noteTitle}</div>
                  {noteContent && <div className="text-xs text-gray-600 mt-1">{noteContent}</div>}
                  <Badge variant="outline" className="text-xs mt-1">
                    schnell-notiz
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              disabled={!selectedWorkspaceId || !noteTitle.trim() || loading}
              className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {loading ? (
                <>Wird hinzugefügt...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Notiz hinzufügen
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

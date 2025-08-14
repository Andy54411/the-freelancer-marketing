'use client';

import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, Flag, User, Tag, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { AdminWorkspace, AdminWorkspaceTask } from '@/services/AdminWorkspaceService';

interface AdminAddTaskSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: AdminWorkspace | null;
  columnId?: string;
  onAddTask?: (task: Omit<AdminWorkspaceTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function AdminAddTaskSlideOver({
  isOpen,
  onClose,
  workspace,
  columnId = 'backlog',
  onAddTask,
}: AdminAddTaskSlideOverProps) {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assignedTo: [] as string[],
    dueDate: undefined as Date | undefined,
    tags: [] as string[],
    estimatedHours: undefined as number | undefined,
    systemTask: false,
    automatedTask: false,
    relatedCompanies: [] as string[],
  });

  const [newTag, setNewTag] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newCompany, setNewCompany] = useState('');

  if (!workspace) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskData.title.trim()) return;

    const newTask: Omit<AdminWorkspaceTask, 'id' | 'createdAt' | 'updatedAt'> = {
      title: taskData.title.trim(),
      description: taskData.description.trim() || undefined,
      status: columnId,
      priority: taskData.priority,
      assignee: taskData.assignedTo[0] || '',
      assignees: taskData.assignedTo,
      assignedTo: taskData.assignedTo, // Alias für Kompatibilität
      dueDate: taskData.dueDate,
      labels: taskData.tags, // tags werden zu labels
      tags: taskData.tags,
      checklist: [],
      workspaceId: workspace.id,
      estimatedHours: taskData.estimatedHours,
      actualHours: 0,
      completedAt: undefined,
      comments: [],
      attachments: [],
      // Board-spezifische Eigenschaften
      columnId: columnId,
      position: 0,
      archived: false,
      archivedAt: undefined,
      archivedBy: undefined,
      // Admin-spezifische Eigenschaften
      systemTask: taskData.systemTask,
      automatedTask: taskData.automatedTask,
      relatedTickets: [],
      relatedCompanies: taskData.relatedCompanies,
      content: undefined,
      coverImage: undefined,
      contentTitle: undefined,
      contentTitleLevel: undefined,
      createdBy: 'Admin',
    };

    onAddTask?.(newTask);
    handleClose();
  };

  const handleClose = () => {
    setTaskData({
      title: '',
      description: '',
      priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
      assignedTo: [],
      dueDate: undefined,
      tags: [],
      estimatedHours: undefined,
      systemTask: false,
      automatedTask: false,
      relatedCompanies: [],
    });
    setNewTag('');
    setNewAssignee('');
    setNewCompany('');
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !taskData.tags.includes(newTag.trim())) {
      setTaskData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTaskData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const addAssignee = () => {
    if (newAssignee.trim() && !taskData.assignedTo.includes(newAssignee.trim())) {
      setTaskData(prev => ({
        ...prev,
        assignedTo: [...prev.assignedTo, newAssignee.trim()],
      }));
      setNewAssignee('');
    }
  };

  const removeAssignee = (assigneeToRemove: string) => {
    setTaskData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(assignee => assignee !== assigneeToRemove),
    }));
  };

  const addCompany = () => {
    if (newCompany.trim() && !taskData.relatedCompanies.includes(newCompany.trim())) {
      setTaskData(prev => ({
        ...prev,
        relatedCompanies: [...prev.relatedCompanies, newCompany.trim()],
      }));
      setNewCompany('');
    }
  };

  const removeCompany = (companyToRemove: string) => {
    setTaskData(prev => ({
      ...prev,
      relatedCompanies: prev.relatedCompanies.filter(company => company !== companyToRemove),
    }));
  };

  const getColumnTitle = (colId: string) => {
    switch (colId) {
      case 'backlog':
        return 'Backlog';
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'review':
        return 'Review';
      case 'testing':
        return 'Testing';
      case 'done':
        return 'Abgeschlossen';
      default:
        return colId;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Neue Admin Task erstellen</SheetTitle>
          <SheetDescription>
            Erstelle eine neue Task für das Workspace &quot;{workspace.title}&quot; in der Spalte
            &quot;{getColumnTitle(columnId)}&quot;
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={taskData.title}
              onChange={e => setTaskData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Task-Titel eingeben..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={taskData.description}
              onChange={e => setTaskData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beschreibung der Task..."
              rows={4}
            />
          </div>

          {/* Priority and Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorität</Label>
              <Select
                value={taskData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                  setTaskData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-green-500" />
                      Niedrig
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-yellow-500" />
                      Mittel
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-orange-500" />
                      Hoch
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      Dringend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Geschätzte Stunden</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={taskData.estimatedHours || ''}
                onChange={e =>
                  setTaskData(prev => ({
                    ...prev,
                    estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
                placeholder="z.B. 4.5"
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Fälligkeitsdatum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {taskData.dueDate ? (
                    format(taskData.dueDate, 'PPP', { locale: de })
                  ) : (
                    <span>Datum auswählen</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={taskData.dueDate}
                  onSelect={date => setTaskData(prev => ({ ...prev, dueDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label>Zugewiesen an</Label>
            <div className="flex gap-2">
              <Input
                value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                placeholder="Name oder E-Mail eingeben..."
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAssignee())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addAssignee}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {taskData.assignedTo.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {taskData.assignedTo.map(assignee => (
                  <Badge key={assignee} variant="secondary" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {assignee}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeAssignee(assignee)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Tag hinzufügen..."
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {taskData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {taskData.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Related Companies */}
          <div className="space-y-2">
            <Label>Betroffene Unternehmen</Label>
            <div className="flex gap-2">
              <Input
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="Firmen-ID oder Name eingeben..."
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCompany())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCompany}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {taskData.relatedCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {taskData.relatedCompanies.map(company => (
                  <Badge key={company} variant="outline" className="flex items-center gap-1">
                    {company}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeCompany(company)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* System Options */}
          <div className="space-y-3">
            <Label>System-Optionen</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={taskData.systemTask}
                  onChange={e => setTaskData(prev => ({ ...prev, systemTask: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">System-Task (wird automatisch verwaltet)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={taskData.automatedTask}
                  onChange={e =>
                    setTaskData(prev => ({ ...prev, automatedTask: e.target.checked }))
                  }
                  className="rounded"
                />
                <span className="text-sm">
                  Automatisierte Task (läuft ohne Benutzerinteraktion)
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="bg-[#14ad9f] hover:bg-[#129488]"
              disabled={!taskData.title.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Task erstellen
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

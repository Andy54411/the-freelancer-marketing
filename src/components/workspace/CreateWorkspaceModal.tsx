'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  User,
  Tag,
  FileText,
  Folder,
  CheckSquare,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Workspace {
  id: string;
  title: string;
  description: string;
  type: 'project' | 'task' | 'document' | 'process';
  status: 'active' | 'completed' | 'paused' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  companyId: string;
  createdBy: string;
  progress: number;
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (workspace: Partial<Workspace>) => void;
  allTags: string[];
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSubmit,
  allTags,
}: CreateWorkspaceModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'project' as Workspace['type'],
    priority: 'medium' as Workspace['priority'],
    status: 'active' as Workspace['status'],
    dueDate: '',
    tags: [] as string[],
    assignedTo: [] as string[],
  });

  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const workspaceData: Partial<Workspace> = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    };

    onSubmit(workspaceData);
    handleReset();
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      type: 'project',
      priority: 'medium',
      status: 'active',
      dueDate: '',
      tags: [],
      assignedTo: [],
    });
    setNewTag('');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSelectExistingTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Folder className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'process':
        return <Settings className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'project':
        return 'Große Aufgaben mit mehreren Teilschritten';
      case 'task':
        return 'Einzelne Aufgaben oder To-Dos';
      case 'document':
        return 'Dokumentation und Wissensmanagement';
      case 'process':
        return 'Wiederkehrende Arbeitsabläufe';
      default:
        return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Workspace erstellen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel*</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Workspace-Titel eingeben..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beschreibung des Workspaces..."
              rows={3}
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-3">
            <Label>Typ*</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['project', 'task', 'document', 'process'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    formData.type === type
                      ? 'border-[#14ad9f] bg-[#14ad9f]/10'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(type)}
                    <span className="font-medium capitalize">{type}</span>
                  </div>
                  <p className="text-sm text-gray-600">{getTypeDescription(type)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priorität</Label>
              <Select
                value={formData.priority}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    priority: value as Workspace['priority'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Niedrig
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Mittel
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      Hoch
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Dringend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    status: value as Workspace['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="paused">Pausiert</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>

            {/* Add new tag */}
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Neuen Tag hinzufügen..."
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Existing tags */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Existierende Tags auswählen:</p>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {allTags.map(tag => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectExistingTag(tag)}
                      disabled={formData.tags.includes(tag)}
                      className="text-xs"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-red-50 hover:border-red-300"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              disabled={!formData.title.trim()}
            >
              Workspace erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

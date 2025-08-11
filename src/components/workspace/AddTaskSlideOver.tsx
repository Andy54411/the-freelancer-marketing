'use client';

import React, { useState } from 'react';
import { X, Tag, Flag, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkspaceTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  position: number;
  columnId?: string;
}

interface AddTaskSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Partial<WorkspaceTask>) => void;
  columnId: string;
  columnTitle: string;
}

const priorities = [
  { value: 'low', label: 'Niedrig', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Hoch', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Dringend', color: 'bg-red-100 text-red-800' },
];

export function AddTaskSlideOver({
  isOpen,
  onClose,
  onTaskCreated,
  columnId,
  columnTitle,
}: AddTaskSlideOverProps) {
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: '',
    tags: [] as string[],
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    handleInputChange(
      'tags',
      formData.tags.filter(t => t !== tag)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);

    try {
      const task: Partial<WorkspaceTask> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        tags: formData.tags,
        columnId: columnId,
        status: columnId,
        assignedTo: [],
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onTaskCreated(task);

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        tags: [],
      });

      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide Over Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-sm shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Neue Aufgabe</h2>
              <p className="text-sm text-gray-500">für Spalte: {columnTitle}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Titel */}
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  placeholder="Aufgaben-Titel eingeben..."
                  className="mt-1"
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
              </div>

              {/* Beschreibung */}
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder="Beschreibung der Aufgabe..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Priorität */}
              <div>
                <Label htmlFor="priority">Priorität</Label>
                <Select
                  value={formData.priority}
                  onValueChange={value => handleInputChange('priority', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          <span className={`px-2 py-1 rounded-full text-xs ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fälligkeitsdatum */}
              <div>
                <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                <Input
                  type="datetime-local"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={e => handleInputChange('dueDate', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    placeholder="Tag hinzufügen..."
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200/50 bg-gray-50/80 backdrop-blur-sm">
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.title.trim()}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Wird erstellt...' : 'Aufgabe erstellen'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tipp: Strg+Enter zum schnellen Speichern</p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

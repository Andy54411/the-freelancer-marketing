'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Calendar, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkspaceService } from '@/services/WorkspaceService';
import type { Workspace } from '@/services/WorkspaceService';
import { useAuth } from '@/contexts/AuthContext';

export default function EditWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const workspaceId = params.workspaceId as string;
  const companyId = params.uid as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'project' as 'project' | 'task' | 'document' | 'process',
    status: 'active' as 'active' | 'completed' | 'paused' | 'archived',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!workspaceId) return;

      try {
        setLoading(true);
        const workspaceData = await WorkspaceService.getWorkspaceById(workspaceId);

        if (!workspaceData) {
          router.push(`/dashboard/company/${companyId}/workspace`);
          return;
        }

        setWorkspace(workspaceData);
        setFormData({
          title: workspaceData.title,
          description: workspaceData.description,
          type: workspaceData.type,
          status: workspaceData.status,
          priority: workspaceData.priority,
          dueDate: workspaceData.dueDate
            ? new Date(workspaceData.dueDate).toISOString().split('T')[0]
            : '',
          tags: workspaceData.tags || [],
        });
      } catch (error) {

        router.push(`/dashboard/company/${companyId}/workspace`);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [workspaceId, companyId, router]);

  const handleSave = async () => {
    if (!workspace || !user?.uid) return;

    try {
      setSaving(true);

      // Create update data from form
      const updateData: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        tags: formData.tags,
        updatedAt: new Date(),
      };

      // Filter out undefined values
      const filteredUpdateData: Record<string, unknown> = {};
      Object.keys(updateData).forEach(key => {
        const value = updateData[key];
        if (value !== undefined) {
          filteredUpdateData[key] = value;
        }
      });

      await WorkspaceService.updateWorkspace(workspace.id, filteredUpdateData);

      // Navigate back to workspace overview
      router.push(`/dashboard/company/${companyId}/workspace`);
    } catch (error) {

      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !workspace ||
      !confirm(
        'Möchtest du dieses Workspace wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      )
    ) {
      return;
    }

    try {
      await WorkspaceService.deleteWorkspace(workspace.id);
      router.push(`/dashboard/company/${companyId}/workspace`);
    } catch (error) {

      // TODO: Show error toast
    }
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '🚀';
      case 'task':
        return '✅';
      case 'document':
        return '📄';
      case 'process':
        return '⚙️';
      default:
        return '📁';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projekt';
      case 'task':
        return 'Aufgabe';
      case 'document':
        return 'Dokument';
      case 'process':
        return 'Prozess';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'completed':
        return 'Abgeschlossen';
      case 'paused':
        return 'Pausiert';
      case 'archived':
        return 'Archiviert';
      default:
        return status;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Workspace nicht gefunden</h3>
          <p className="text-gray-500 mb-4">
            Das gewünschte Workspace konnte nicht geladen werden.
          </p>
          <Button onClick={() => router.push(`/dashboard/company/${companyId}/workspace`)}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/company/${companyId}/workspace`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(formData.type)}</span>
                Workspace bearbeiten
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Bearbeite die Details für &quot;{workspace.title}&quot;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.title.trim()}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Grundinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Workspace-Titel eingeben..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Beschreibung des Workspace..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type">Typ</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'project' | 'task' | 'document' | 'process') =>
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">🚀 {getTypeLabel('project')}</SelectItem>
                      <SelectItem value="task">✅ {getTypeLabel('task')}</SelectItem>
                      <SelectItem value="document">📄 {getTypeLabel('document')}</SelectItem>
                      <SelectItem value="process">⚙️ {getTypeLabel('process')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'completed' | 'paused' | 'archived') =>
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{getStatusLabel('active')}</SelectItem>
                      <SelectItem value="completed">{getStatusLabel('completed')}</SelectItem>
                      <SelectItem value="paused">{getStatusLabel('paused')}</SelectItem>
                      <SelectItem value="archived">{getStatusLabel('archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                      setFormData(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{getPriorityLabel('low')}</SelectItem>
                      <SelectItem value="medium">{getPriorityLabel('medium')}</SelectItem>
                      <SelectItem value="high">{getPriorityLabel('high')}</SelectItem>
                      <SelectItem value="urgent">{getPriorityLabel('urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date and Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Termine & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="mt-1">
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      placeholder="Neues Tag hinzufügen..."
                      onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadaten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Erstellt am</p>
                  <p className="font-medium">
                    {new Date(workspace.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Zuletzt aktualisiert</p>
                  <p className="font-medium">
                    {new Date(workspace.updatedAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Workspace-ID</p>
                  <p className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {workspace.id}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Fortschritt</p>
                  <p className="font-medium">{workspace.progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

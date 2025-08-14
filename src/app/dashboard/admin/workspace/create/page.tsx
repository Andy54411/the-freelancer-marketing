'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Calendar,
  User,
  Tag,
  FileText,
  Folder,
  CheckSquare,
  Settings,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import { toast } from 'sonner';

const workspaceTypes = [
  {
    id: 'project',
    title: 'Project',
    description: 'Große Aufgaben mit mehreren Teilschritten',
    icon: Folder,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'department',
    title: 'Department',
    description: 'Abteilungsweite Aufgaben und Projekte',
    icon: CheckSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    id: 'system',
    title: 'System',
    description: 'Systemverwaltung und IT-Aufgaben',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    description: 'Wartungsarbeiten und Support',
    icon: Settings,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Datenanalyse und Reporting',
    icon: Settings,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
];

const priorities = [
  { value: 'low', label: 'Niedrig', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Hoch', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Dringend', color: 'bg-red-100 text-red-800' },
];

const statuses = [
  { value: 'active', label: 'Aktiv', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inaktiv', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'planned', label: 'Geplant', color: 'bg-blue-100 text-blue-800' },
  { value: 'archived', label: 'Archiviert', color: 'bg-gray-100 text-gray-800' },
];

export default function CreateAdminWorkspacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '' as 'project' | 'department' | 'system' | 'maintenance' | 'analytics' | '',
    status: 'active' as 'active' | 'inactive' | 'archived' | 'planned',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assignedTo: [] as string[],
    dueDate: '',
    tags: [] as string[],
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    handleInputChange('type', typeId);
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

    console.log('=== WORKSPACE CREATION DEBUG ===');
    console.log('User object:', user);
    console.log('Form data:', formData);

    if (!user?.uid && !user?.email) {
      toast.error('Sie müssen angemeldet sein');
      console.error('No user found - authentication required');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }

    if (!formData.type) {
      toast.error('Bitte wählen Sie einen Workspace-Typ');
      return;
    }

    setLoading(true);

    try {
      // Use email as primary identifier since that's what works with Lambda
      const userId = user.email || user.uid || 'admin';

      const workspace = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type as 'project' | 'department' | 'system' | 'maintenance' | 'analytics',
        status: formData.status as 'active' | 'inactive' | 'archived' | 'planned',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        tags: formData.tags,
        adminId: userId, // Use email as primary ID
        createdBy: userId,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Creating workspace with final data:', workspace);

      const result = await adminWorkspaceService.createWorkspace(workspace);
      console.log('Workspace creation result:', result);

      toast.success('Admin Workspace erfolgreich erstellt');

      // Navigate to workspace detail page if we have the workspace ID
      if (result?.id) {
        console.log('Navigating to workspace:', result.id);
        router.push(`/dashboard/admin/workspace/${result.id}`);
      } else {
        console.log('No workspace ID returned, going to main page');
        router.push(`/dashboard/admin/workspace`);
      }
    } catch (error) {
      console.error('FULL Error creating workspace:', error);
      toast.error(`Fehler beim Erstellen des Workspace: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/admin/workspace`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Neuer Workspace erstellen</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grundinformationen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Grundinformationen
              </CardTitle>
              <CardDescription>
                Geben Sie die grundlegenden Informationen für Ihren Workspace ein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Workspace-Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  placeholder="Workspace-Titel eingeben..."
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder="Beschreibung des Workspaces..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Workspace-Typ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Workspace-Typ
              </CardTitle>
              <CardDescription>Wählen Sie den passenden Typ für Ihren Workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspaceTypes.map(type => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;

                  return (
                    <div
                      key={type.id}
                      onClick={() => handleTypeSelect(type.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? `${type.borderColor} ${type.bgColor} border-2`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-6 w-6 ${isSelected ? type.color : 'text-gray-400'}`} />
                        <div>
                          <h3
                            className={`font-medium ${isSelected ? type.color : 'text-gray-900'}`}
                          >
                            {type.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Einstellungen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Einstellungen
              </CardTitle>
              <CardDescription>Konfigurieren Sie die Details Ihres Workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <span className={`px-2 py-1 rounded-full text-xs ${priority.color}`}>
                              {priority.label}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={value => handleInputChange('status', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
                <Input
                  type="datetime-local"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={e => handleInputChange('dueDate', e.target.value)}
                  className="mt-1"
                  placeholder="tt.mm.jjjj, --:--"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    placeholder="Neuen Tag hinzufügen..."
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
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
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href={`/dashboard/admin/workspace`}>
              <Button type="button" variant="outline">
                Abbrechen
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.type}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Wird erstellt...' : 'Workspace erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

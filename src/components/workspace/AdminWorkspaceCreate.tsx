'use client';

import React, { useState } from 'react';
import { Plus, Shield, Database, Users, Activity, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import { useRouter } from 'next/navigation';
import { X, Calendar as CalendarIcon, Tag } from 'lucide-react';

export default function AdminWorkspaceCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workspaceData, setWorkspaceData] = useState({
    title: '',
    description: '',
    type: 'project' as 'project' | 'department' | 'system' | 'maintenance' | 'analytics',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assignedTo: [] as string[],
    dueDate: undefined as Date | undefined,
    tags: [] as string[],
    systemLevel: 'platform' as 'platform' | 'company' | 'user' | 'system',
    relatedCompanies: [] as string[],
  });

  const [newTag, setNewTag] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newCompany, setNewCompany] = useState('');

  const getSystemLevelIcon = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return Shield;
      case 'company':
        return Users;
      case 'user':
        return Activity;
      case 'system':
        return Database;
      default:
        return Activity;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceData.title.trim()) return;
    if (loading) return;

    setLoading(true);

    const newWorkspace: Partial<AdminWorkspace> = {
      title: workspaceData.title.trim(),
      description: workspaceData.description.trim(),
      type: workspaceData.type,
      status: 'active',
      priority: workspaceData.priority,
      assignedTo: workspaceData.assignedTo,
      dueDate: workspaceData.dueDate,
      tags: workspaceData.tags,
      adminId: 'current-admin', // This would be the actual admin ID from auth context
      createdBy: 'Admin',
      progress: 0,
      systemLevel: workspaceData.systemLevel,
      relatedCompanies: workspaceData.relatedCompanies,
      permissions: {
        viewLevel: 'admin',
        editLevel: 'admin',
        deleteLevel: 'admin',
      },
    };

    try {
      console.log('Creating workspace:', newWorkspace);
      const createdWorkspace = await adminWorkspaceService.createWorkspace(newWorkspace);
      console.log('Workspace created successfully:', createdWorkspace);
      router.push('/dashboard/admin/workspace');
    } catch (error) {
      console.error('Error creating workspace:', error);
      // TODO: Show error message to user
      alert('Fehler beim Erstellen des Workspaces. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !workspaceData.tags.includes(newTag.trim())) {
      setWorkspaceData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setWorkspaceData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const addAssignee = () => {
    if (newAssignee.trim() && !workspaceData.assignedTo.includes(newAssignee.trim())) {
      setWorkspaceData(prev => ({
        ...prev,
        assignedTo: [...prev.assignedTo, newAssignee.trim()],
      }));
      setNewAssignee('');
    }
  };

  const removeAssignee = (assigneeToRemove: string) => {
    setWorkspaceData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(assignee => assignee !== assigneeToRemove),
    }));
  };

  const addCompany = () => {
    if (newCompany.trim() && !workspaceData.relatedCompanies.includes(newCompany.trim())) {
      setWorkspaceData(prev => ({
        ...prev,
        relatedCompanies: [...prev.relatedCompanies, newCompany.trim()],
      }));
      setNewCompany('');
    }
  };

  const removeCompany = (companyToRemove: string) => {
    setWorkspaceData(prev => ({
      ...prev,
      relatedCompanies: prev.relatedCompanies.filter(company => company !== companyToRemove),
    }));
  };

  const IconComponent = getSystemLevelIcon(workspaceData.systemLevel);

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <IconComponent className="h-6 w-6 text-[#14ad9f]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Neues Admin Workspace erstellen
              </h1>
              <p className="text-sm text-gray-600">
                Erstelle ein neues Workspace für Admin-Aufgaben und -Projekte
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grundlegende Informationen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Workspace Titel *</Label>
                    <Input
                      id="title"
                      value={workspaceData.title}
                      onChange={e => setWorkspaceData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="z.B. System Migration, User Support, Platform Monitoring..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      value={workspaceData.description}
                      onChange={e =>
                        setWorkspaceData(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Beschreibe das Ziel und den Umfang dieses Workspaces..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Workspace Typ</Label>
                      <Select
                        value={workspaceData.type}
                        onValueChange={(
                          value: 'project' | 'department' | 'system' | 'maintenance' | 'analytics'
                        ) => setWorkspaceData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project">Projekt</SelectItem>
                          <SelectItem value="department">Abteilung</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="maintenance">Wartung</SelectItem>
                          <SelectItem value="analytics">Analyse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priorität</Label>
                      <Select
                        value={workspaceData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                          setWorkspaceData(prev => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Niedrig</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="high">Hoch</SelectItem>
                          <SelectItem value="urgent">Dringend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Level & Berechtigungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="systemLevel">System Level</Label>
                    <Select
                      value={workspaceData.systemLevel}
                      onValueChange={(value: 'platform' | 'company' | 'user' | 'system') =>
                        setWorkspaceData(prev => ({ ...prev, systemLevel: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-500" />
                            Platform Level
                          </div>
                        </SelectItem>
                        <SelectItem value="company">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            Company Level
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            User Level
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-red-500" />
                            System Level
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Bestimmt die Zugriffsebene und Sichtbarkeit des Workspaces
                    </p>
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
                    {workspaceData.relatedCompanies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {workspaceData.relatedCompanies.map(company => (
                          <Badge
                            key={company}
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            {company}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeCompany(company)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Zeitplanung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fälligkeitsdatum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {workspaceData.dueDate ? (
                            format(workspaceData.dueDate, 'PPP', { locale: de })
                          ) : (
                            <span>Datum auswählen</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={workspaceData.dueDate}
                          onSelect={date => setWorkspaceData(prev => ({ ...prev, dueDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team & Zuweisungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zugewiesen an</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newAssignee}
                        onChange={e => setNewAssignee(e.target.value)}
                        placeholder="Name oder E-Mail..."
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAssignee())}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addAssignee}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {workspaceData.assignedTo.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {workspaceData.assignedTo.map(assignee => (
                          <Badge
                            key={assignee}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tags & Organisation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    {workspaceData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {workspaceData.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {tag}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-[#14ad9f] hover:bg-[#129488]"
                      disabled={!workspaceData.title.trim() || loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Erstelle...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Workspace erstellen
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.back()}
                      disabled={loading}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

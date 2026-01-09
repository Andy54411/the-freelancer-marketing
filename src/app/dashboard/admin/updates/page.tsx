'use client';

import React, { useState, useEffect } from 'react';
import { UpdateNotification, CreateUpdateRequest } from '@/types/updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

// Update Text Editor - Dynamic Import für Client-Side Only
const UpdateTextEditor = dynamic(() => import('@/components/ui/UpdateTextEditor'), {
  ssr: false,
  loading: () => <div className="min-h-[200px] border rounded-md bg-gray-50 animate-pulse" />,
});
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Save,
  Edit,
  Trash2,
  Eye,
  Settings,
  Sparkles,
  Wrench,
  Bug,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UpdateAdminPanel() {
  const [updates, setUpdates] = useState<UpdateNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateUpdateRequest>({
    version: '',
    title: '',
    description: '',
    category: 'feature',
    isBreaking: false,
    tags: [],
    screenshots: [],
    videoUrl: '',
    documentationUrl: '',
  });
  const [newTag, setNewTag] = useState('');
  const [newScreenshot, setNewScreenshot] = useState('');

  useEffect(() => {
    checkAuthAndLoadUpdates();
  }, []);

  // AWS Admin Authentication Check & Load Updates
  const checkAuthAndLoadUpdates = async () => {
    setLoading(true);
    try {
      // Überprüfe AWS Admin Authentication
      const authResponse = await fetch('/api/admin/auth/verify');
      if (!authResponse.ok) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      // Lade Updates über Admin API
      await loadUpdates();
    } catch (error) {
      console.error('Auth/Load error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUpdates = async () => {
    try {
      const response = await fetch('/api/admin/updates');
      if (!response.ok) {
        throw new Error('Failed to load updates');
      }

      const data = await response.json();
      setUpdates(data.updates || []);
    } catch (error) {
      console.error('Fehler beim Laden der Updates:', error);
      toast.error('Fehler beim Laden der Updates');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const response = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create update');
      }

      toast.success('Update erfolgreich erstellt!');

      // Reset form
      setFormData({
        version: '',
        title: '',
        description: '',
        category: 'feature',
        isBreaking: false,
        tags: [],
        screenshots: [],
        videoUrl: '',
        documentationUrl: '',
      });

      // Reload updates
      await loadUpdates();
    } catch (error) {
      console.error('Fehler beim Erstellen des Updates:', error);
      toast.error('Fehler beim Erstellen des Updates');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const addScreenshot = () => {
    if (newScreenshot.trim() && !(formData.screenshots || []).includes(newScreenshot.trim())) {
      setFormData(prev => ({
        ...prev,
        screenshots: [...(prev.screenshots || []), newScreenshot.trim()],
      }));
      setNewScreenshot('');
    }
  };

  const removeScreenshot = (screenshotToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      screenshots: (prev.screenshots || []).filter(screenshot => screenshot !== screenshotToRemove),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Zugriff verweigert</h2>
            <p className="text-gray-600 mb-4">Sie sind nicht als Administrator angemeldet.</p>
            <Button onClick={() => (window.location.href = '/admin/login')} variant="outline">
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8 text-[#14ad9f]" />
            Update Administration
          </h1>
          <p className="text-gray-600">
            Erstellen und verwalten Sie Taskilo Updates und Release Notes
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Neues Update
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Updates verwalten
            </TabsTrigger>
          </TabsList>

          {/* Create Update Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Neues Update erstellen</CardTitle>
                <CardDescription>
                  Erstellen Sie ein neues Update mit allen relevanten Informationen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="version">Version *</Label>
                      <Input
                        id="version"
                        placeholder="z.B. 1.2.3"
                        value={formData.version}
                        onChange={e => setFormData(prev => ({ ...prev, version: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Kategorie *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: any) =>
                          setFormData(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feature">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              Neue Funktion
                            </div>
                          </SelectItem>
                          <SelectItem value="improvement">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Verbesserung
                            </div>
                          </SelectItem>
                          <SelectItem value="bugfix">
                            <div className="flex items-center gap-2">
                              <Bug className="h-4 w-4" />
                              Bugfix
                            </div>
                          </SelectItem>
                          <SelectItem value="security">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Sicherheit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Titel *</Label>
                    <Input
                      id="title"
                      placeholder="Kurzer, prägnanter Titel des Updates"
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Beschreibung *</Label>
                    <div className="mt-2">
                      <UpdateTextEditor
                        value={formData.description}
                        onChange={html => setFormData(prev => ({ ...prev, description: html }))}
                        placeholder="Detaillierte Beschreibung des Updates...

🎉 **Nutzen Sie die Toolbar für Formatierung:**
- Fett, Kursiv, Unterstrichen
- Überschriften (H1, H2, H3)
- Aufzählungen und nummerierte Listen
- Textausrichtung und Links
- Farben für wichtige Textstellen

Beschreiben Sie die Verbesserungen kundenfreundlich!"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Breaking Change Toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="breaking"
                      checked={formData.isBreaking}
                      onCheckedChange={checked =>
                        setFormData(prev => ({ ...prev, isBreaking: checked }))
                      }
                    />
                    <Label htmlFor="breaking" className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Breaking Change (kann bestehende Funktionalität beeinträchtigen)
                    </Label>
                  </div>

                  {/* Tags */}
                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Tag hinzufügen..."
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} variant="outline">
                        Hinzufügen
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-2">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="videoUrl">Video URL (optional)</Label>
                      <Input
                        id="videoUrl"
                        placeholder="https://..."
                        value={formData.videoUrl}
                        onChange={e => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="documentationUrl">Dokumentation URL (optional)</Label>
                      <Input
                        id="documentationUrl"
                        placeholder="https://..."
                        value={formData.documentationUrl}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, documentationUrl: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Screenshots */}
                  <div>
                    <Label>Screenshots (optional)</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Screenshot URL hinzufügen..."
                        value={newScreenshot}
                        onChange={e => setNewScreenshot(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addScreenshot())}
                      />
                      <Button type="button" onClick={addScreenshot} variant="outline">
                        Hinzufügen
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(formData.screenshots || []).map((screenshot, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={screenshot}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(screenshot)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="flex items-center gap-2">
                      {saving ? (
                        <>Wird gespeichert...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Update erstellen
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Updates Tab */}
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>Updates verwalten</CardTitle>
                <CardDescription>Übersicht aller erstellten Updates</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
                    <p className="text-gray-600 mt-2">Updates werden geladen...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {updates.map(update => (
                      <div key={update.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              {update.title}
                              <Badge variant="outline">v{update.version}</Badge>
                              {update.isBreaking && (
                                <Badge variant="destructive" className="text-xs">
                                  Breaking
                                </Badge>
                              )}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">{update.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary">{update.category}</Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(update.releaseDate).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

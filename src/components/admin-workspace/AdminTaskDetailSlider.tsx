'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  Plus,
  Calendar,
  User,
  Clock,
  Paperclip,
  MessageSquare,
  Trash2,
  Upload,
  Send,
  FileText,
  Edit3,
  CheckCircle2,
  Activity,
  MoreHorizontal,
  Download,
  BarChart3,
  Eye,
  Archive,
  Copy,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// AWS S3 import
import { AWSS3Service } from '@/lib/aws-s3-service';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import type {
  AdminWorkspace,
  AdminWorkspaceTask,
  AdminWorkspaceMember,
} from '@/services/AdminWorkspaceService';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () =>
    import('@/components/workspace/RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500">
        Laden...
      </div>
    ),
  }
);

interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date;
  isEdited?: boolean;
}

interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  s3Key?: string; // AWS S3 key path
  size: number;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
}

interface TaskActivity {
  id: string;
  type:
    | 'created'
    | 'updated'
    | 'comment'
    | 'attachment'
    | 'status_change'
    | 'assigned'
    | 'due_date_changed';
  authorId: string;
  authorName: string;
  description: string;
  timestamp: Date;
  oldValue?: string;
  newValue?: string;
}

interface AdminTaskDetailSliderProps {
  isOpen: boolean;
  onClose: () => void;
  task: AdminWorkspaceTask | null;
  workspace: AdminWorkspace | null;
  onTaskUpdated: (taskId: string, updates: Partial<AdminWorkspaceTask>) => void;
  onTaskDeleted?: (taskId: string) => void;
  currentUserId?: string;
}

// Hilfsfunktion zum Formatieren von Dateigrößen
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function AdminTaskDetailSlider({
  isOpen,
  onClose,
  task,
  workspace,
  onTaskUpdated,
  onTaskDeleted,
  currentUserId = 'current-user',
}: AdminTaskDetailSliderProps) {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assignedTo: [] as string[],
    dueDate: '',
    tags: [] as string[],
    estimatedHours: '',
    progress: 0,
    content: '',
    coverImage: '',
    contentTitle: '',
    contentTitleLevel: 1 as 1 | 2 | 3 | 4,
  });

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [contentValue, setContentValue] = useState('');

  // Mock data (in real app, fetch from Firebase)
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Priority options
  const priorities = [
    { value: 'low', label: 'Niedrig', color: 'bg-green-100 text-green-800', icon: '↓' },
    { value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-800', icon: '→' },
    { value: 'high', label: 'Hoch', color: 'bg-orange-100 text-orange-800', icon: '↑' },
    { value: 'urgent', label: 'Dringend', color: 'bg-red-100 text-red-800', icon: '⚡' },
  ];

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || '',
        priority: task.priority || 'medium',
        assignedTo: task.assignedTo || [],
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
        tags: task.tags || [],
        estimatedHours: (task as any).estimatedHours?.toString() || '',
        progress: (task as any).progress || 0,
        content: (task as any).content || '',
        coverImage: (task as any).coverImage || '',
        contentTitle: (task as any).contentTitle || '',
        contentTitleLevel: (task as any).contentTitleLevel || 1,
      });
      setContentValue((task as any).content || '');
      setErrors({});
      setIsEditing(false);
    }
  }, [task]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContentChange = (content: string) => {
    setContentValue(content);
    setFormData(prev => ({ ...prev, content }));
  };

  const handleCoverChange = (url: string) => {
    setFormData(prev => ({ ...prev, coverImage: url }));
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({ ...prev, contentTitle: title }));
  };

  const handleTitleLevelChange = (level: 1 | 2 | 3 | 4) => {
    setFormData(prev => ({ ...prev, contentTitleLevel: level }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!formData.status) {
      newErrors.status = 'Status ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !task) return;

    setLoading(true);
    try {
      const updates: Partial<AdminWorkspaceTask> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        tags: formData.tags,
        updatedAt: new Date(),
        ...(formData.estimatedHours && { estimatedHours: parseInt(formData.estimatedHours) }),
        ...(formData.progress && { progress: formData.progress }),
        ...(formData.content && { content: formData.content }),
        ...(formData.coverImage && { coverImage: formData.coverImage }),
        ...(formData.contentTitle && { contentTitle: formData.contentTitle }),
        ...(formData.contentTitleLevel && { contentTitleLevel: formData.contentTitleLevel }),
      };

      await onTaskUpdated(task.id, updates);
      setIsEditing(false);
    } catch (error) {
      setErrors({ general: 'Fehler beim Speichern der Aufgabe' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    const comment: TaskComment = {
      id: Date.now().toString(),
      authorId: currentUserId,
      authorName: 'Aktueller Benutzer',
      content: newComment.trim(),
      createdAt: new Date(),
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');

    // Add activity
    const activity: TaskActivity = {
      id: Date.now().toString(),
      type: 'comment',
      authorId: currentUserId,
      authorName: 'Aktueller Benutzer',
      description: 'hat einen Kommentar hinzugefügt',
      timestamp: new Date(),
    };
    setActivities(prev => [activity, ...prev]);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !task || !workspace) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in Bytes

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = Date.now().toString() + i;

      try {
        // Prüfe Dateigröße
        if (file.size > MAX_FILE_SIZE) {
          setErrors(prev => ({
            ...prev,
            upload: `Datei &quot;${file.name}&quot; ist zu groß. Maximum: 50MB (Aktuelle Größe: ${formatFileSize(file.size)})`,
          }));
          continue;
        }

        // Setze Upload-Progress
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Erstelle AWS S3 Pfad
        const s3Key = AWSS3Service.generateWorkspacePath(workspace.id, task.id, fileId, file.name);

        // Upload Datei zu AWS S3
        setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
        const uploadResult = await AWSS3Service.uploadFile(file, s3Key, {
          contentType: file.type,
          workspaceId: workspace.id,
          taskId: task.id,
        });

        // Upload erfolgreich
        setUploadProgress(prev => ({ ...prev, [fileId]: 75 }));

        // Erstelle Attachment Object
        const attachment: TaskAttachment = {
          id: fileId,
          name: file.name,
          url: uploadResult.url,
          s3Key: uploadResult.key,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          uploadedBy: currentUserId,
          uploadedByName: 'Aktueller Benutzer',
        };

        // Füge Attachment zur Liste hinzu
        setAttachments(prev => [...prev, attachment]);

        // Update Task in Workspace via adminWorkspaceService
        if (onTaskUpdated && task) {
          onTaskUpdated(task.id, {
            // Attachments werden über task properties verwaltet
            updatedAt: new Date(),
          });
        }

        // Upload erfolgreich
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        // Entferne Progress nach kurzer Zeit
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 2000);

        // Add activity
        const activity: TaskActivity = {
          id: fileId + '-activity',
          type: 'attachment',
          authorId: currentUserId,
          authorName: 'Aktueller Benutzer',
          description: `hat Datei &quot;${file.name}&quot; hinzugefügt`,
          timestamp: new Date(),
        };
        setActivities(prev => [activity, ...prev]);
      } catch (error) {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        setErrors(prev => ({ ...prev, upload: `Fehler beim Upload von ${file.name}` }));
      }
    }
  };

  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    if (!task || !workspace) return;

    try {
      // Lösche Datei aus AWS S3
      if (attachment.s3Key) {
        await AWSS3Service.deleteFile(attachment.s3Key);
      }

      // Entferne Attachment aus lokaler Liste
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));

      // Update Task in Workspace via adminWorkspaceService
      if (onTaskUpdated && task) {
        onTaskUpdated(task.id, {
          // Attachments werden über task properties verwaltet
          updatedAt: new Date(),
        });
      }

      // Add activity
      const activity: TaskActivity = {
        id: Date.now().toString(),
        type: 'attachment',
        authorId: currentUserId,
        authorName: 'Aktueller Benutzer',
        description: `hat Datei &quot;${attachment.name}&quot; entfernt`,
        timestamp: new Date(),
      };
      setActivities(prev => [activity, ...prev]);
    } catch (error) {
      setErrors(prev => ({ ...prev, delete: `Fehler beim Löschen von ${attachment.name}` }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !(formData.tags || []).includes(newTag.trim())) {
      handleInputChange('tags', [...(formData.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange(
      'tags',
      (formData.tags || []).filter(tag => tag !== tagToRemove)
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    return `vor ${days} Tag(en)`;
  };

  const availableStatuses = workspace?.boardColumns?.map(col => ({
    value: col.id,
    label: col.title,
  })) || [
    { value: 'todo', label: 'Zu erledigen' },
    { value: 'in-progress', label: 'In Bearbeitung' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Erledigt' },
  ];

  const workspaceMembers = workspace?.members || [
    { id: 'user1', name: 'Max Mustermann', avatar: '/avatars/max.jpg', email: 'max@example.com' },
    { id: 'user2', name: 'Anna Schmidt', avatar: '/avatars/anna.jpg', email: 'anna@example.com' },
    { id: 'user3', name: 'Tom Weber', avatar: '/avatars/tom.jpg', email: 'tom@example.com' },
  ];

  if (!isOpen || !task || !workspace) return null;

  return (
    <>
      {/* Slide Over Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[900px] bg-white/95 backdrop-blur-sm shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Edit3 className="h-5 w-5 text-[#14ad9f]" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-600" />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isEditing ? 'Aufgabe bearbeiten' : task.title}
                  </h2>
                  <p className="text-sm text-gray-500">{workspace.title}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`ml-2 ${
                  priorities.find(p => p.value === task.priority)?.color ||
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {priorities.find(p => p.value === task.priority)?.icon}{' '}
                {priorities.find(p => p.value === task.priority)?.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    {isEditing ? 'Ansicht wechseln' : 'Bearbeiten'}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Teilen
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archivieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onTaskDeleted?.(task.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
                <TabsTrigger value="overview">Übersicht</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="comments">Kommentare</TabsTrigger>
                <TabsTrigger value="activity">Aktivität</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                {/* Overview Tab */}
                <TabsContent value="overview" className="h-full mt-0">
                  <div className="h-full p-4 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      {isEditing && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Schnellbearbeitung</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Status</Label>
                                <Select
                                  value={formData.status}
                                  onValueChange={value => handleInputChange('status', value)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableStatuses.map(status => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Priorität</Label>
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
                                          <span>{priority.icon}</span>
                                          {priority.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {loading ? 'Speichern...' : 'Speichern'}
                              </Button>
                              <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Abbrechen
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Task Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Aufgabeninformationen
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {isEditing ? (
                            <>
                              <div>
                                <Label>Titel</Label>
                                <Input
                                  value={formData.title}
                                  onChange={e => handleInputChange('title', e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Beschreibung</Label>
                                <Textarea
                                  value={formData.description}
                                  onChange={e => handleInputChange('description', e.target.value)}
                                  className="mt-1"
                                  rows={4}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <h3 className="font-medium">{task.title}</h3>
                                {task.description && (
                                  <p className="text-gray-600 mt-2">{task.description}</p>
                                )}
                              </div>
                            </>
                          )}

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Erstellt</p>
                                <p className="text-sm text-gray-600">
                                  {task.createdAt
                                    ? new Date(task.createdAt).toLocaleDateString('de-DE')
                                    : 'Unbekannt'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">Aktualisiert</p>
                                <p className="text-sm text-gray-600">
                                  {task.updatedAt
                                    ? formatRelativeTime(new Date(task.updatedAt))
                                    : 'Nie'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Progress */}
                      {formData.progress > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3 className="h-5 w-5" />
                              Fortschritt
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Abgeschlossen</span>
                                <span>{formData.progress}%</span>
                              </div>
                              <Progress value={formData.progress} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Attachments Preview */}
                      {(attachments || []).length > 0 && (
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <Paperclip className="h-5 w-5" />
                              Anhänge ({(attachments || []).length})
                            </CardTitle>
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              size="sm"
                              variant="outline"
                              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Hochladen
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {/* Upload Progress */}
                            {Object.keys(uploadProgress).length > 0 && (
                              <div className="space-y-2 mb-4">
                                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                  <div key={fileId} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span>Uploading...</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Upload Error */}
                            {errors.upload && (
                              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                {errors.upload}
                              </div>
                            )}

                            <div className="space-y-2">
                              {(attachments || []).slice(0, 3).map(attachment => (
                                <div
                                  key={attachment.id}
                                  className="flex items-center gap-3 p-2 bg-gray-50 rounded group"
                                >
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {attachment.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(attachment.size)}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => window.open(attachment.url, '_blank')}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteAttachment(attachment)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {(attachments || []).length > 3 && (
                                <p className="text-sm text-gray-500 text-center py-2">
                                  +{(attachments || []).length - 3} weitere Dateien
                                </p>
                              )}
                              {(attachments || []).length === 0 && (
                                <div className="text-center py-4 text-gray-500">
                                  <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                  <p className="text-sm">Keine Anhänge</p>
                                  <p className="text-xs">
                                    Klicke auf &quot;Hochladen&quot; um Dateien hinzuzufügen
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Recent Comments */}
                      {(comments || []).length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              Letzte Kommentare
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(comments || []).slice(-2).map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.authorAvatar} />
                                    <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {comment.authorName}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatRelativeTime(comment.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Content Tab - Rich Text Editor */}
                <TabsContent value="content" className="h-full mt-0">
                  <div className="h-full p-4 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Content Creator</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Blog Post
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Social Media
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Marketing
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mb-4">
                        Erstelle professionellen Content mit unserem Rich-Text-Editor. Perfekt für
                        Blog-Posts, Social Media Content, Dokumentation und mehr.
                      </div>

                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-1">
                        <RichTextEditor
                          content={contentValue || ''}
                          onChange={handleContentChange}
                          placeholder="Beginne mit dem Erstellen deines Contents... Nutze die Toolbar für Formatierungen, Überschriften, Listen und mehr."
                          className="border-0"
                          coverImage={formData.coverImage}
                          onCoverChange={handleCoverChange}
                          title={formData.contentTitle}
                          onTitleChange={handleTitleChange}
                          titleLevel={formData.contentTitleLevel}
                          onTitleLevelChange={handleTitleLevelChange}
                          author={task?.createdBy || 'Unbekannt'}
                          createdAt={task?.createdAt}
                          updatedAt={task?.updatedAt}
                        />
                      </div>

                      {/* Content Templates */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Content-Vorlagen</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const blogTemplate = `<h1>Blog Post Titel</h1>
<p>Einleitung und Hook für deine Leser...</p>

<h2>Hauptteil</h2>
<p>Dein Hauptinhalt hier...</p>

<ul>
<li>Wichtiger Punkt 1</li>
<li>Wichtiger Punkt 2</li>
<li>Wichtiger Punkt 3</li>
</ul>

<h2>Fazit</h2>
<p>Zusammenfassung und Call-to-Action...</p>`;
                              handleContentChange(blogTemplate);
                            }}
                            className="text-left justify-start h-auto p-3"
                          >
                            <div>
                              <div className="font-medium">Blog Post</div>
                              <div className="text-xs text-gray-500">Strukturierter Artikel</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const socialTemplate = `<h1>Social Media Post</h1>
<p><strong>📱 Hook:</strong> Aufmerksamkeit erregende Überschrift</p>

<p><strong>🎯 Hauptmessage:</strong><br>
Deine Kernbotschaft in 1-2 Sätzen...</p>

<p><strong>💡 Value:</strong><br>
Was lernt deine Audience?</p>

<p><strong>📞 Call-to-Action:</strong><br>
Was sollen deine Follower tun?</p>

<p><strong>Hashtags:</strong> #taskilo #productivity #socialmedia</p>`;
                              handleContentChange(socialTemplate);
                            }}
                            className="text-left justify-start h-auto p-3"
                          >
                            <div>
                              <div className="font-medium">Social Media</div>
                              <div className="text-xs text-gray-500">Post-Vorlage</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const marketingTemplate = `<h1>Marketing Campaign</h1>
<blockquote>
<p><strong>Kampagnen-Ziel:</strong> Was möchtest du erreichen?</p>
</blockquote>

<h2>Zielgruppe</h2>
<ul>
<li>Demografische Daten</li>
<li>Interessen & Bedürfnisse</li>
<li>Pain Points</li>
</ul>

<h2>Key Messages</h2>
<ol>
<li>Hauptbotschaft 1</li>
<li>Hauptbotschaft 2</li>
<li>Hauptbotschaft 3</li>
</ol>

<h2>Call-to-Action</h2>
<p><strong>Primär:</strong> Hauptaktion<br>
<strong>Sekundär:</strong> Alternative Aktion</p>`;
                              handleContentChange(marketingTemplate);
                            }}
                            className="text-left justify-start h-auto p-3"
                          >
                            <div>
                              <div className="font-medium">Marketing</div>
                              <div className="text-xs text-gray-500">Kampagnen-Plan</div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const docsTemplate = `<h1>Dokumentation</h1>
<p><em>Beschreibung des Themas oder Prozesses...</em></p>

<h2>Übersicht</h2>
<p>Kurze Einführung und Zielsetzung...</p>

<h2>Schritt-für-Schritt Anleitung</h2>
<ol>
<li><strong>Schritt 1:</strong> Beschreibung...</li>
<li><strong>Schritt 2:</strong> Beschreibung...</li>
<li><strong>Schritt 3:</strong> Beschreibung...</li>
</ol>

<h2>Wichtige Hinweise</h2>
<blockquote>
<p>⚠️ Warnung oder wichtiger Hinweis</p>
</blockquote>

<h2>Zusätzliche Ressourcen</h2>
<ul>
<li>Link 1</li>
<li>Link 2</li>
<li>Link 3</li>
</ul>`;
                              handleContentChange(docsTemplate);
                            }}
                            className="text-left justify-start h-auto p-3"
                          >
                            <div>
                              <div className="font-medium">Dokumentation</div>
                              <div className="text-xs text-gray-500">Technische Docs</div>
                            </div>
                          </Button>
                        </div>
                      </div>

                      {/* Content Stats */}
                      {contentValue && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Content-Statistiken
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Zeichen:</span>
                              <span className="ml-1 font-medium">
                                {contentValue.replace(/<[^>]*>/g, '').length}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Wörter:</span>
                              <span className="ml-1 font-medium">
                                {
                                  contentValue
                                    .replace(/<[^>]*>/g, '')
                                    .split(/\s+/)
                                    .filter(word => word.length > 0).length
                                }
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Lesezeit:</span>
                              <span className="ml-1 font-medium">
                                {Math.ceil(
                                  contentValue
                                    .replace(/<[^>]*>/g, '')
                                    .split(/\s+/)
                                    .filter(word => word.length > 0).length / 200
                                )}{' '}
                                Min
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="h-full mt-0">
                  <div className="h-full p-4 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {errors.general && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          {errors.general}
                        </div>
                      )}

                      <Card>
                        <CardHeader>
                          <CardTitle>Grundinformationen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="title">Titel *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={e => handleInputChange('title', e.target.value)}
                              className={`mt-1 ${errors.title ? 'border-red-500' : ''}`}
                            />
                            {errors.title && (
                              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="description">Beschreibung</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={e => handleInputChange('description', e.target.value)}
                              className="mt-1"
                              rows={4}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Status & Priorität</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Status *</Label>
                              <Select
                                value={formData.status}
                                onValueChange={value => handleInputChange('status', value)}
                              >
                                <SelectTrigger
                                  className={`mt-1 ${errors.status ? 'border-red-500' : ''}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableStatuses.map(status => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors.status && (
                                <p className="text-sm text-red-600 mt-1">{errors.status}</p>
                              )}
                            </div>

                            <div>
                              <Label>Priorität</Label>
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
                                        <span>{priority.icon}</span>
                                        {priority.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label>Fortschritt</Label>
                            <div className="mt-2 space-y-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={formData.progress}
                                onChange={e =>
                                  handleInputChange('progress', parseInt(e.target.value))
                                }
                                className="w-full"
                              />
                              <div className="flex justify-between text-sm text-gray-500">
                                <span>0%</span>
                                <span className="font-medium">{formData.progress}%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Zeitplanung</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Fälligkeitsdatum</Label>
                              <Input
                                type="datetime-local"
                                value={formData.dueDate}
                                onChange={e => handleInputChange('dueDate', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Geschätzte Stunden</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={formData.estimatedHours}
                                onChange={e => handleInputChange('estimatedHours', e.target.value)}
                                className="mt-1"
                                placeholder="z.B. 8"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Zuweisungen</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <Label>Zugewiesen an</Label>
                            <Select
                              value=""
                              onValueChange={value => {
                                if (value && !(formData.assignedTo || []).includes(value)) {
                                  handleInputChange('assignedTo', [
                                    ...(formData.assignedTo || []),
                                    value,
                                  ]);
                                }
                              }}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Mitglied hinzufügen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {workspaceMembers.map(member => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {member.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {(formData.assignedTo || []).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(formData.assignedTo || []).map(userId => {
                                  const member = workspaceMembers.find(m => m.id === userId);
                                  return member ? (
                                    <Badge
                                      key={userId}
                                      variant="outline"
                                      className="flex items-center gap-1"
                                    >
                                      <Avatar className="h-4 w-4">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {member.name}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleInputChange(
                                            'assignedTo',
                                            (formData.assignedTo || []).filter(id => id !== userId)
                                          )
                                        }
                                        className="ml-1 text-red-500 hover:text-red-700"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Tags</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(formData.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(formData.tags || []).map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="ml-1 text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
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
                              className="flex-1"
                            />
                            <Button type="button" onClick={addTag} variant="outline" size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5" />
                            Dateien & Anhänge
                          </CardTitle>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              variant="outline"
                              size="sm"
                              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Dateien hochladen
                            </Button>
                            <p className="text-xs text-gray-500">
                              Max. Dateigröße: 50MB • Unterstützte Formate: Bilder, PDF,
                              Office-Dokumente
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Upload Progress */}
                          {Object.keys(uploadProgress).length > 0 && (
                            <div className="space-y-2 mb-4">
                              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                <div key={fileId} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Uploading...</span>
                                    <span>{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload/Delete Errors */}
                          {(errors.upload || errors.delete) && (
                            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                              {errors.upload || errors.delete}
                            </div>
                          )}

                          <div className="space-y-2">
                            {(attachments || []).map(attachment => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                              >
                                <FileText className="h-5 w-5 text-gray-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(attachment.size)} •{' '}
                                    {new Date(attachment.uploadedAt).toLocaleDateString('de-DE')}
                                  </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(attachment.url, '_blank')}
                                    className="hover:bg-[#14ad9f] hover:text-white"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteAttachment(attachment)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {(attachments || []).length === 0 && (
                              <div className="text-center py-6 text-gray-500">
                                <Paperclip className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">Keine Anhänge vorhanden</p>
                                <p className="text-xs">
                                  Klicke auf &quot;Dateien hochladen&quot; um Anhänge hinzuzufügen
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                          Abbrechen
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading || !formData.title.trim()}
                          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {loading ? 'Speichern...' : 'Speichern'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="h-full mt-0">
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b">
                      <h3 className="font-medium">Kommentare ({(comments || []).length})</h3>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {(comments || []).map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.authorAvatar} />
                              <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.authorName}</span>
                                <span className="text-xs text-gray-500">
                                  {formatRelativeTime(comment.createdAt)}
                                </span>
                                {comment.isEdited && (
                                  <span className="text-xs text-gray-500">(bearbeitet)</span>
                                )}
                              </div>
                              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {(comments || []).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Noch keine Kommentare</p>
                            <p className="text-sm">Sei der Erste, der einen Kommentar hinzufügt!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>Du</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Kommentar hinzufügen..."
                            rows={2}
                            className="resize-none"
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={handleAddComment}
                              disabled={!newComment.trim()}
                              size="sm"
                              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Senden
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="h-full mt-0">
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b">
                      <h3 className="font-medium">Aktivitätsverlauf</h3>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {(activities || []).map((activity, index) => (
                          <div key={activity.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {activity.type === 'created' && (
                                  <Plus className="h-4 w-4 text-green-600" />
                                )}
                                {activity.type === 'updated' && (
                                  <Edit3 className="h-4 w-4 text-blue-600" />
                                )}
                                {activity.type === 'comment' && (
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                )}
                                {activity.type === 'attachment' && (
                                  <Paperclip className="h-4 w-4 text-purple-600" />
                                )}
                                {activity.type === 'status_change' && (
                                  <CheckCircle2 className="h-4 w-4 text-orange-600" />
                                )}
                                {activity.type === 'assigned' && (
                                  <User className="h-4 w-4 text-indigo-600" />
                                )}
                                {activity.type === 'due_date_changed' && (
                                  <Calendar className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              {index < (activities || []).length - 1 && (
                                <div className="w-0.5 h-6 bg-gray-200 mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{activity.authorName}</span>
                                <span className="text-sm text-gray-600">
                                  {activity.description}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatRelativeTime(activity.timestamp)}
                              </p>
                              {activity.oldValue && activity.newValue && (
                                <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                                  <span className="text-red-600 line-through">
                                    {activity.oldValue}
                                  </span>
                                  {' → '}
                                  <span className="text-green-600">{activity.newValue}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {(activities || []).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Keine Aktivitäten</p>
                            <p className="text-sm">Aktivitäten werden hier angezeigt</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* File Upload Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            className="hidden"
            onChange={e => handleFileUpload(e.target.files)}
          />
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  Database,
  Users,
  Activity,
  Calendar,
  Clock,
  Flag,
  Tag,
  MessageSquare,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminWorkspace, AdminWorkspaceTask } from '@/services/AdminWorkspaceService';

interface AdminTaskDetailSliderProps {
  isOpen: boolean;
  onClose: () => void;
  task: AdminWorkspaceTask | null;
  workspace: AdminWorkspace | null;
  onUpdateTask?: (taskId: string, updates: Partial<AdminWorkspaceTask>) => void;
  onDeleteTask?: (taskId: string) => void;
}

export function AdminTaskDetailSlider({
  isOpen,
  onClose,
  task,
  workspace,
  onUpdateTask,
  onDeleteTask,
}: AdminTaskDetailSliderProps) {
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  if (!task || !workspace) return null;

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

  const getSystemLevelColor = (systemLevel: string) => {
    switch (systemLevel) {
      case 'platform':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'company':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'system':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backlog':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'todo':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'review':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'testing':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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

  const handleStatusChange = (newStatus: string) => {
    onUpdateTask?.(task.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority: string) => {
    onUpdateTask?.(task.id, { priority: newPriority as 'low' | 'medium' | 'high' | 'urgent' });
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now().toString(),
        content: newComment,
        author: 'Admin',
        createdAt: new Date(),
      };

      const updatedComments = [...(task.comments || []), comment];
      onUpdateTask?.(task.id, { comments: updatedComments });
      setNewComment('');
    }
  };

  const IconComponent = getSystemLevelIcon(workspace.systemLevel || 'platform');

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <IconComponent className="h-5 w-5 text-[#14ad9f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-left text-lg font-medium text-gray-900 mb-2">
                    {task.title}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getSystemLevelColor(workspace.systemLevel || 'platform')}>
                      {workspace.systemLevel || 'platform'}
                    </Badge>
                    <span className="text-sm text-gray-500">{workspace.title}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="done">Abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Priorität</label>
                  <Select value={task.priority} onValueChange={handlePriorityChange}>
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

              {/* Task Info */}
              <div className="space-y-4">
                {task.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Beschreibung
                    </label>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {task.description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {task.dueDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Fälligkeitsdatum
                      </label>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {task.dueDate.toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  )}

                  {task.estimatedHours && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Geschätzte Stunden
                      </label>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {task.estimatedHours}h
                      </div>
                    </div>
                  )}
                </div>

                {task.assignedTo && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Zugewiesen an
                    </label>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#14ad9f] text-white text-xs">
                          {task.assignedTo[0]?.slice(0, 2).toUpperCase() || 'UN'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-900">
                        {task.assignedTo[0] || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                )}

                {task.tags && task.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Activity */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Aktivität</h3>

                {/* Add Comment */}
                <div className="mb-4">
                  <Textarea
                    placeholder="Kommentar hinzufügen..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="mb-2"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Kommentar hinzufügen
                  </Button>
                </div>

                {/* Comments */}
                <div className="space-y-4">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#14ad9f] text-white text-xs">
                            {comment.author.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author}
                            </span>
                            <span className="text-xs text-gray-500">
                              {comment.createdAt.toLocaleDateString('de-DE')} um{' '}
                              {comment.createdAt.toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Noch keine Kommentare</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Metadata */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  Erstellt: {task.createdAt.toLocaleDateString('de-DE')} um{' '}
                  {task.createdAt.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div>
                  Aktualisiert: {task.updatedAt.toLocaleDateString('de-DE')} um{' '}
                  {task.updatedAt.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div>Task ID: {task.id}</div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link kopieren
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteTask?.(task.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Löschen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

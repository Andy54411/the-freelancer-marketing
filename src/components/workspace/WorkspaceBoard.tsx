'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TaskDetailSlider from './TaskDetailSlider';
import { AddTaskSlideOver } from './AddTaskSlideOver';
import { WorkspaceService } from '@/services/WorkspaceService';
import type { Workspace, WorkspaceBoardColumn, WorkspaceTask } from '@/services/WorkspaceService';

interface WorkspaceBoardProps {
  workspaces: Workspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onWorkspaceClick?: (workspace: Workspace) => void;
  companyId?: string;
  currentUserId?: string;
}

export function WorkspaceBoard({
  workspaces,
  onUpdateWorkspace,
  onWorkspaceClick,
  companyId,
  currentUserId = 'current-user',
}: WorkspaceBoardProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    workspaces.length > 0 ? workspaces[0] : null
  );
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [selectedColumnTitle, setSelectedColumnTitle] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  // Task detail slider states
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  // Konvertiert Dates zu JavaScript Dates für Kompatibilität
  const normalizeTaskDates = (task: WorkspaceTask): WorkspaceTask => {
    const convertDate = (date: any): Date => {
      if (!date) return new Date();
      if (typeof date.toDate === 'function') return date.toDate();
      if (typeof date.seconds === 'number') return new Date(date.seconds * 1000);
      if (date instanceof Date) return date;
      return new Date(date);
    };

    return {
      ...task,
      createdAt: convertDate(task.createdAt),
      updatedAt: convertDate(task.updatedAt),
      dueDate: task.dueDate ? convertDate(task.dueDate) : undefined,
    };
  };

  const defaultColumns: WorkspaceBoardColumn[] = [
    {
      id: 'todo',
      title: 'Zu erledigen',
      color: '#f3f4f6',
      position: 0,
      tasks: [],
    },
    {
      id: 'in-progress',
      title: 'In Bearbeitung',
      color: '#dbeafe',
      position: 1,
      tasks: [],
    },
    {
      id: 'review',
      title: 'Review',
      color: '#fef3c7',
      position: 2,
      tasks: [],
    },
    {
      id: 'done',
      title: 'Erledigt',
      color: '#d1fae5',
      position: 3,
      tasks: [],
    },
  ];

  // Initialize columns with tasks properly distributed
  const getColumnsWithTasks = () => {
    if (selectedWorkspace?.boardColumns && selectedWorkspace.boardColumns.length > 0) {
      return selectedWorkspace.boardColumns.map(column => ({
        ...column,
        tasks: (column.tasks || []).filter(task => !task.archived), // Filtere archivierte Aufgaben aus
      }));
    }

    // If using default columns, distribute workspace tasks into columns
    const workspaceTasks = (selectedWorkspace?.tasks || []).filter(task => !task.archived); // Filtere archivierte Aufgaben aus

    return defaultColumns.map(column => ({
      ...column,
      tasks: workspaceTasks
        .filter(task => {
          // Match by status or columnId, with fallback logic
          const taskStatus = task.status || task.columnId;
          const isMatch =
            taskStatus === column.id ||
            (column.id === 'todo' && (!taskStatus || taskStatus === 'pending')) ||
            (column.id === 'in-progress' &&
              (taskStatus === 'in-progress' || taskStatus === 'active')) ||
            (column.id === 'review' && taskStatus === 'review') ||
            (column.id === 'done' && (taskStatus === 'done' || taskStatus === 'completed'));

          return isMatch;
        })
        .sort((a, b) => a.position - b.position),
    }));
  };

  const columns = getColumnsWithTasks();

  // Optimistic update for better UX - update local state immediately
  const updateLocalWorkspace = async (updates: Partial<Workspace>) => {
    if (!selectedWorkspace) return;

    try {
      // Update local state immediately for responsive UI
      const updatedWorkspace = { ...selectedWorkspace, ...updates };
      setSelectedWorkspace(updatedWorkspace);

      // Call parent update function for Realtime Database sync
      // This will trigger real-time updates for all connected users
      await onUpdateWorkspace(selectedWorkspace.id, updates);
    } catch {
      // Revert local state on error
      setSelectedWorkspace(selectedWorkspace);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedWorkspace) {
      return;
    }

    const { source, destination } = result;

    // Handle column reordering
    if (result.type === 'column') {
      const newColumns = Array.from(columns);
      const [reorderedColumn] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, reorderedColumn);

      const updatedColumns = newColumns.map((col, index) => ({
        ...col,
        position: index,
      }));

      await updateLocalWorkspace({
        boardColumns: updatedColumns,
      });
      return;
    }

    // Handle task movement
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    if (source.droppableId === destination.droppableId) {
      // Moving within the same column
      const newTasks = Array.from(sourceColumn.tasks || []);
      const [reorderedTask] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, reorderedTask);

      const updatedTasks = newTasks.map((task, index) => ({
        ...task,
        position: index,
        updatedAt: new Date(),
      }));

      const updatedColumns = columns.map(col =>
        col.id === source.droppableId ? { ...col, tasks: updatedTasks } : col
      );

      await updateLocalWorkspace({
        boardColumns: updatedColumns,
      });
    } else {
      // Moving between columns - REALTIME CARD MOVEMENT
      const sourceTasks = Array.from(sourceColumn.tasks || []);
      const destTasks = Array.from(destColumn.tasks || []);
      const [movedTask] = sourceTasks.splice(source.index, 1);

      // Update task with new column/status and timestamp
      const updatedMovedTask = {
        ...movedTask,
        columnId: destination.droppableId,
        status: destination.droppableId,
        updatedAt: new Date(),
        position: destination.index,
      };

      destTasks.splice(destination.index, 0, updatedMovedTask);

      // Reposition all tasks in both columns
      const updatedSourceTasks = sourceTasks.map((task, index) => ({
        ...task,
        position: index,
        updatedAt: new Date(),
      }));

      const updatedDestTasks = destTasks.map((task, index) => ({
        ...task,
        position: index,
        updatedAt: new Date(),
      }));

      const updatedColumns = columns.map(col => {
        if (col.id === source.droppableId) {
          return { ...col, tasks: updatedSourceTasks };
        }
        if (col.id === destination.droppableId) {
          return { ...col, tasks: updatedDestTasks };
        }
        return col;
      });

      // Save to Realtime Database - this will sync to all connected users
      await updateLocalWorkspace({
        boardColumns: updatedColumns,
        updatedAt: new Date(),
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleAddTask = (columnId: string, columnTitle: string) => {
    setSelectedColumnId(columnId);
    setSelectedColumnTitle(columnTitle);
    setIsAddTaskOpen(true);
  };

  const handleTaskCreated = async (taskData: Partial<WorkspaceTask>) => {
    if (!selectedWorkspace || !selectedColumnId) return;

    try {
      const newTask: WorkspaceTask = {
        id: `task_${Date.now()}`,
        title: taskData.title || '',
        description: taskData.description,
        status: selectedColumnId,
        priority: taskData.priority || 'medium',
        assignedTo: taskData.assignedTo || [],
        dueDate: taskData.dueDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: taskData.tags || [],
        position: columns.find(col => col.id === selectedColumnId)?.tasks?.length || 0,
        columnId: selectedColumnId,
      };

      const updatedColumns = columns.map(col => {
        if (col.id === selectedColumnId) {
          return {
            ...col,
            tasks: [...(col.tasks || []), newTask],
          };
        }
        return col;
      });

      // Use realtime updateLocalWorkspace for immediate sync
      await updateLocalWorkspace({
        boardColumns: updatedColumns,
        updatedAt: new Date(),
      });
    } catch {}
  };

  const handleEditTask = (task: WorkspaceTask) => {
    if (!selectedWorkspace) return;

    // Normalize dates before setting task
    const normalizedTask = normalizeTaskDates(task);

    // Open task detail slider
    setSelectedTask(normalizedTask);
    setIsTaskDetailOpen(true);
  };

  const handleTaskUpdated = (taskId: string, updates: Partial<WorkspaceTask>) => {
    if (!selectedWorkspace) return;

    const updatedColumns = columns.map(col => ({
      id: col.id,
      title: col.title,
      color: col.color,
      position: col.position,
      tasks: (col.tasks || []).map(task => {
        if (task.id === taskId) {
          // Clean the updates to ensure no undefined values
          const cleanUpdates: any = {};
          Object.keys(updates).forEach(key => {
            const value = (updates as any)[key];
            if (value !== undefined) {
              cleanUpdates[key] = value;
            }
          });

          return {
            id: task.id,
            title: cleanUpdates.title !== undefined ? cleanUpdates.title : task.title,
            description:
              cleanUpdates.description !== undefined
                ? cleanUpdates.description
                : task.description || '',
            status: cleanUpdates.status !== undefined ? cleanUpdates.status : task.status,
            priority: cleanUpdates.priority !== undefined ? cleanUpdates.priority : task.priority,
            assignedTo:
              cleanUpdates.assignedTo !== undefined
                ? cleanUpdates.assignedTo
                : task.assignedTo || [],
            dueDate: cleanUpdates.dueDate !== undefined ? cleanUpdates.dueDate : task.dueDate,
            createdAt: task.createdAt,
            updatedAt: cleanUpdates.updatedAt !== undefined ? cleanUpdates.updatedAt : new Date(),
            tags: cleanUpdates.tags !== undefined ? cleanUpdates.tags : task.tags || [],
            position: cleanUpdates.position !== undefined ? cleanUpdates.position : task.position,
            columnId: cleanUpdates.columnId !== undefined ? cleanUpdates.columnId : task.columnId,
          };
        }
        return task;
      }),
    }));

    updateLocalWorkspace({
      boardColumns: updatedColumns,
    });

    // Update selected task if it's the one being edited - normalize dates
    if (selectedTask?.id === taskId) {
      const updatedTask = { ...selectedTask, ...updates };
      setSelectedTask(normalizeTaskDates(updatedTask));
    }
  };

  const handleCloseTaskSliders = () => {
    setIsTaskDetailOpen(false);
    setSelectedTask(null);
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!selectedWorkspace) return;

    if (
      !confirm(
        'Möchtest du diese Aufgabe ins Archiv verschieben? Sie wird vom Board entfernt, aber bleibt gespeichert.'
      )
    )
      return;

    try {
      // Finde die Aufgabe in den Spalten
      let taskToArchive: WorkspaceTask | null = null;
      let sourceColumnId: string | null = null;

      for (const column of columns) {
        const task = (column.tasks || []).find(t => t.id === taskId);
        if (task) {
          taskToArchive = task;
          sourceColumnId = column.id;
          break;
        }
      }

      if (!taskToArchive || !sourceColumnId) return;

      // Bereinige Task von undefined-Werten und markiere als archiviert
      const cleanTask = (task: WorkspaceTask, isArchived: boolean = false): WorkspaceTask => {
        const cleaned: any = {};
        Object.keys(task).forEach(key => {
          const value = (task as any)[key];
          if (value !== undefined) {
            cleaned[key] = value;
          }
        });

        if (isArchived) {
          cleaned.archived = true;
          cleaned.archivedAt = new Date();
          cleaned.archivedBy = currentUserId;
        }

        cleaned.updatedAt = new Date();
        return cleaned as WorkspaceTask;
      };

      const archivedTask = cleanTask(taskToArchive, true);

      // Entferne Aufgabe aus den Board-Spalten und bereinige alle Tasks
      const updatedColumns = columns.map(col => ({
        id: col.id,
        title: col.title,
        color: col.color,
        position: col.position,
        tasks: (col.tasks || []).filter(task => task.id !== taskId).map(task => cleanTask(task)),
      }));

      // Aktuelles Archiv aus dem Workspace oder leeres Array
      const currentArchivedTasks = (selectedWorkspace.archivedTasks || []).map(task =>
        cleanTask(task)
      );

      // Update Workspace using WorkspaceService
      await WorkspaceService.updateWorkspace(selectedWorkspace.id, {
        boardColumns: updatedColumns,
        archivedTasks: [...currentArchivedTasks, archivedTask],
        updatedAt: new Date(),
      });

      // Lokales State Update
      updateLocalWorkspace({
        boardColumns: updatedColumns,
        archivedTasks: [...currentArchivedTasks, archivedTask],
      });

      // Schließe Task Detail Slider falls die archivierte Aufgabe geöffnet war
      if (selectedTask?.id === taskId) {
        setIsTaskDetailOpen(false);
        setSelectedTask(null);
      }
    } catch {
      alert('Fehler beim Archivieren der Aufgabe. Bitte versuche es erneut.');
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    if (!selectedWorkspace) return;

    try {
      // Finde archivierte Aufgabe
      const archivedTasks = selectedWorkspace.archivedTasks || [];
      const taskToRestore = archivedTasks.find(task => task.id === taskId);

      if (!taskToRestore) return;

      // Bereinige Task von undefined-Werten und entferne Archivierungs-Markierungen
      const cleanTask = (task: WorkspaceTask): WorkspaceTask => {
        const cleaned: any = {};
        Object.keys(task).forEach(key => {
          const value = (task as any)[key];
          if (
            value !== undefined &&
            key !== 'archived' &&
            key !== 'archivedAt' &&
            key !== 'archivedBy'
          ) {
            cleaned[key] = value;
          }
        });
        return {
          ...cleaned,
          archived: false,
          updatedAt: new Date(),
        } as WorkspaceTask;
      };

      const restoredTask = cleanTask(taskToRestore);

      // Finde Ziel-Spalte (ursprüngliche Spalte oder 'todo' als Fallback)
      const targetColumnId = taskToRestore.columnId || taskToRestore.status || 'todo';

      // Bereinige die Spalten von undefined-Werten
      const cleanColumns = (columns: WorkspaceBoardColumn[]): WorkspaceBoardColumn[] => {
        return columns.map(col => {
          if (col.id === targetColumnId) {
            return {
              id: col.id,
              title: col.title,
              color: col.color,
              position: col.position,
              tasks: [...(col.tasks || []).map(cleanTask), restoredTask],
            };
          }
          return {
            id: col.id,
            title: col.title,
            color: col.color,
            position: col.position,
            tasks: (col.tasks || []).map(cleanTask),
          };
        });
      };

      const updatedColumns = cleanColumns(columns);

      // Entferne Aufgabe aus dem Archiv und bereinige
      const updatedArchivedTasks = archivedTasks.filter(task => task.id !== taskId).map(cleanTask);

      // Update using WorkspaceService
      await WorkspaceService.updateWorkspace(selectedWorkspace.id, {
        boardColumns: updatedColumns,
        archivedTasks: updatedArchivedTasks,
        updatedAt: new Date(),
      });

      // Lokales State Update
      updateLocalWorkspace({
        boardColumns: updatedColumns,
        archivedTasks: updatedArchivedTasks,
      });
    } catch {
      alert('Fehler beim Wiederherstellen der Aufgabe. Bitte versuche es erneut.');
    }
  };

  const handlePermanentDeleteTask = async (taskId: string) => {
    if (!selectedWorkspace) return;

    if (
      !confirm(
        'ACHTUNG: Diese Aufgabe wird endgültig gelöscht und kann nicht wiederhergestellt werden. Fortfahren?'
      )
    )
      return;

    try {
      // Finde archivierte Aufgabe
      const archivedTasks = selectedWorkspace.archivedTasks || [];
      const taskToDelete = archivedTasks.find(task => task.id === taskId);

      if (!taskToDelete) return;

      // Bereinige verbleibende archivierte Aufgaben von undefined-Werten
      const cleanTask = (task: WorkspaceTask): WorkspaceTask => {
        const cleaned: any = {};
        Object.keys(task).forEach(key => {
          const value = (task as any)[key];
          if (value !== undefined) {
            cleaned[key] = value;
          }
        });
        return cleaned as WorkspaceTask;
      };

      // Entferne Aufgabe permanent aus dem Archiv
      const updatedArchivedTasks = archivedTasks.filter(task => task.id !== taskId).map(cleanTask);

      // Update using WorkspaceService
      await WorkspaceService.updateWorkspace(selectedWorkspace.id, {
        archivedTasks: updatedArchivedTasks,
        updatedAt: new Date(),
      });

      // Lokales State Update
      updateLocalWorkspace({
        archivedTasks: updatedArchivedTasks,
      });

      // Schließe Task Detail Slider falls die gelöschte Aufgabe geöffnet war
      if (selectedTask?.id === taskId) {
        setIsTaskDetailOpen(false);
        setSelectedTask(null);
      }
    } catch {
      alert('Fehler beim Löschen der Aufgabe. Bitte versuche es erneut.');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(date);
  };

  if (workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Workspaces gefunden</h3>
          <p className="text-gray-500">Erstelle deinen ersten Workspace um zu beginnen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedWorkspace?.id || ''}
            onChange={e => {
              const workspace = workspaces.find(w => w.id === e.target.value);
              setSelectedWorkspace(workspace || null);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
          >
            {workspaces.map(workspace => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.title}
              </option>
            ))}
          </select>

          {selectedWorkspace && (
            <>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${getPriorityColor(selectedWorkspace.priority)}`}
                >
                  {selectedWorkspace.priority}
                </Badge>
                <Badge variant="outline">{selectedWorkspace.status}</Badge>
                <span className="text-sm text-gray-500">
                  Progress: {selectedWorkspace.progress}%
                </span>
                {selectedWorkspace.archivedTasks && selectedWorkspace.archivedTasks.length > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-600">
                    {selectedWorkspace.archivedTasks.length} archiviert
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 ml-auto">
                <Button
                  variant={showArchive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowArchive(!showArchive)}
                  className={
                    showArchive
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'border-orange-500 text-orange-600 hover:bg-orange-50'
                  }
                >
                  {showArchive ? 'Board anzeigen' : 'Archiv anzeigen'}
                  {selectedWorkspace.archivedTasks &&
                    selectedWorkspace.archivedTasks.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedWorkspace.archivedTasks.length}
                      </Badge>
                    )}
                </Button>

                {onWorkspaceClick && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onWorkspaceClick(selectedWorkspace)}
                  >
                    Details anzeigen
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Board oder Archiv */}
      <div className="flex-1 overflow-x-auto p-6">
        {showArchive ? (
          // Archiv-Ansicht
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Archivierte Aufgaben</h2>
              <p className="text-gray-600">
                Hier findest du alle archivierten Aufgaben. Du kannst sie wiederherstellen oder
                endgültig löschen.
              </p>
            </div>

            {selectedWorkspace?.archivedTasks && selectedWorkspace.archivedTasks.length > 0 ? (
              <div className="space-y-4">
                {selectedWorkspace.archivedTasks.map(task => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}
                            />

                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            <Badge variant="outline">{task.priority}</Badge>
                            <Badge variant="outline" className="bg-orange-50 text-orange-600">
                              Archiviert
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Erstellt: {formatDate(task.createdAt)}</span>
                            {task.archivedAt && (
                              <span>Archiviert: {formatDate(task.archivedAt)}</span>
                            )}
                            {task.dueDate && <span>Fällig: {formatDate(task.dueDate)}</span>}
                          </div>

                          {(task.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(task.tags || []).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Anzeigen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreTask(task.id)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            Wiederherstellen
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => handlePermanentDeleteTask(task.id)}
                                className="text-red-600"
                              >
                                Endgültig löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    📁
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Kein Archiv vorhanden</h3>
                  <p className="text-sm">Archivierte Aufgaben werden hier angezeigt.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Board-Ansicht
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="column">
              {provided => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-6 h-full min-w-max"
                >
                  {columns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex flex-col w-64 bg-white rounded-lg shadow-sm border border-gray-200 ${
                            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                          }`}
                        >
                          {/* Column Header */}
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-3 border-b border-gray-200 cursor-grab"
                            style={{ backgroundColor: column.color }}
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{column.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {(column.tasks || []).length}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>Spalte bearbeiten</DropdownMenuItem>
                                <DropdownMenuItem>Spalte löschen</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Tasks */}
                          <Droppable droppableId={column.id} type="task">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`flex-1 p-3 space-y-2 min-h-24 ${
                                  snapshot.isDraggingOver ? 'bg-gray-50' : ''
                                }`}
                              >
                                {(column.tasks || []).map((task, taskIndex) => (
                                  <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                    {(provided, snapshot) => (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`${
                                          snapshot.isDragging
                                            ? 'shadow-lg rotate-1'
                                            : 'hover:shadow-md'
                                        } transition-all duration-200`}
                                      >
                                        <CardContent className="p-2">
                                          {/* Drag Handle - separate from clickable content */}
                                          <div
                                            {...provided.dragHandleProps}
                                            className="cursor-grab mb-2 flex items-center justify-between"
                                          >
                                            <div
                                              className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                                            />

                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={e => e.stopPropagation()}
                                                >
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent>
                                                <DropdownMenuItem
                                                  onClick={() => handleEditTask(task)}
                                                >
                                                  Bearbeiten
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                  onClick={() => handleArchiveTask(task.id)}
                                                  className="text-orange-600"
                                                >
                                                  Archivieren
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>

                                          {/* Clickable Task Content */}
                                          <div
                                            className="cursor-pointer space-y-1.5"
                                            onClick={() => handleEditTask(task)}
                                          >
                                            {/* Task Title */}
                                            <h4 className="font-medium text-gray-900 text-xs leading-tight">
                                              {task.title}
                                            </h4>

                                            {/* Task Description */}
                                            {task.description && (
                                              <p className="text-xs text-gray-500 line-clamp-2">
                                                {task.description}
                                              </p>
                                            )}

                                            {/* Tags */}
                                            {(task.tags || []).length > 0 && (
                                              <div className="flex flex-wrap gap-1">
                                                {(task.tags || []).slice(0, 3).map(tag => (
                                                  <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    className="text-[10px] px-1.5 py-0.5"
                                                  >
                                                    {tag}
                                                  </Badge>
                                                ))}
                                                {(task.tags || []).length > 3 && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-[10px] px-1.5 py-0.5"
                                                  >
                                                    +{(task.tags || []).length - 3}
                                                  </Badge>
                                                )}
                                              </div>
                                            )}

                                            {/* Task Footer */}
                                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                                              {/* Due Date */}
                                              {task.dueDate && (
                                                <div className="flex items-center gap-1">
                                                  <Calendar className="h-2.5 w-2.5" />
                                                  <span>{formatDate(task.dueDate)}</span>
                                                </div>
                                              )}

                                              {/* Assigned Users */}
                                              {(task.assignedTo || []).length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <User className="h-2.5 w-2.5" />
                                                  <span>{(task.assignedTo || []).length}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}

                                {/* Add Task Button */}
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-gray-500 hover:text-gray-700 border-2 border-dashed border-gray-300 hover:border-gray-400"
                                  onClick={() => handleAddTask(column.id, column.title)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Aufgabe hinzufügen
                                </Button>
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Add Column Button */}
                  <div className="flex flex-col w-64">
                    <Button
                      variant="ghost"
                      className="h-full justify-start text-gray-500 hover:text-gray-700 border-2 border-dashed border-gray-300 hover:border-gray-400"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Spalte hinzufügen
                    </Button>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Add Task Slide Over */}
      <AddTaskSlideOver
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
        columnId={selectedColumnId}
        columnTitle={selectedColumnTitle}
      />

      {/* Task Detail Slider */}
      <TaskDetailSlider
        task={selectedTask}
        workspace={selectedWorkspace}
        isOpen={isTaskDetailOpen}
        onClose={handleCloseTaskSliders}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleArchiveTask}
        currentUserId={currentUserId}
      />
    </div>
  );
}

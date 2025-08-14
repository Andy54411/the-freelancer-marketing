'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  Shield,
  Database,
  Users,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminTaskDetailSlider } from './AdminTaskDetailSlider';
import { AdminAddTaskSlideOver } from './AdminAddTaskSlideOver';
import { adminWorkspaceService } from '@/services/AdminWorkspaceService';
import type {
  AdminWorkspace,
  AdminWorkspaceBoardColumn,
  AdminWorkspaceTask,
} from '@/services/AdminWorkspaceService';

interface AdminWorkspaceBoardProps {
  workspaces: AdminWorkspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<AdminWorkspace>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onWorkspaceClick?: (workspace: AdminWorkspace) => void;
  adminId?: string;
}

export function AdminWorkspaceBoard({
  workspaces,
  onUpdateWorkspace,
  onWorkspaceClick,
  adminId = 'admin-user-1',
}: AdminWorkspaceBoardProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspace | null>(
    workspaces.length > 0 ? workspaces[0] : null
  );
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [selectedColumnTitle, setSelectedColumnTitle] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  // Task detail slider states
  const [selectedTask, setSelectedTask] = useState<AdminWorkspaceTask | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const normalizeTaskDates = (task: AdminWorkspaceTask): AdminWorkspaceTask => {
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

  const defaultColumns: AdminWorkspaceBoardColumn[] = [
    {
      id: 'backlog',
      title: 'Backlog',
      color: '#f3f4f6',
      position: 0,
      tasks: [],
    },
    {
      id: 'todo',
      title: 'Zu erledigen',
      color: '#fef3c7',
      position: 1,
      tasks: [],
    },
    {
      id: 'in-progress',
      title: 'In Bearbeitung',
      color: '#dbeafe',
      position: 2,
      tasks: [],
    },
    {
      id: 'review',
      title: 'Review',
      color: '#fed7d7',
      position: 3,
      tasks: [],
    },
    {
      id: 'testing',
      title: 'Testing',
      color: '#e6fffa',
      position: 4,
      tasks: [],
    },
    {
      id: 'done',
      title: 'Erledigt',
      color: '#d1fae5',
      position: 5,
      tasks: [],
    },
  ];

  // Initialize columns with tasks properly distributed
  const getColumnsWithTasks = () => {
    if (selectedWorkspace?.boardColumns && selectedWorkspace.boardColumns.length > 0) {
      return selectedWorkspace.boardColumns.map(column => ({
        ...column,
        tasks: (selectedWorkspace.tasks || [])
          .filter(task => task.columnId === column.id && !task.archived)
          .map(normalizeTaskDates)
          .sort((a, b) => a.position - b.position),
      }));
    }

    // Use default columns and distribute existing tasks
    const columns = [...defaultColumns];
    const tasks = selectedWorkspace?.tasks || [];

    tasks.forEach(task => {
      if (!task.archived) {
        const normalizedTask = normalizeTaskDates(task);
        const columnId = task.columnId || 'backlog';
        const column = columns.find(col => col.id === columnId);
        if (column) {
          column.tasks.push(normalizedTask);
        }
      }
    });

    return columns.map(column => ({
      ...column,
      tasks: column.tasks.sort((a, b) => a.position - b.position),
    }));
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination || !selectedWorkspace) {
      return;
    }

    if (type === 'workspace') {
      // Handle workspace reordering
      const newWorkspaces = Array.from(workspaces);
      const [removed] = newWorkspaces.splice(source.index, 1);
      newWorkspaces.splice(destination.index, 0, removed);
      // Note: You might want to save this order to the backend
      return;
    }

    if (type === 'task') {
      const sourceColumnId = source.droppableId;
      const destColumnId = destination.droppableId;

      const columns = getColumnsWithTasks();
      const sourceColumn = columns.find(col => col.id === sourceColumnId);
      const destColumn = columns.find(col => col.id === destColumnId);

      if (!sourceColumn || !destColumn) return;

      const taskToMove = sourceColumn.tasks.find(task => task.id === draggableId);
      if (!taskToMove) return;

      try {
        // Update task with new column and position
        await adminWorkspaceService.updateTaskInWorkspace(selectedWorkspace.id, taskToMove.id, {
          columnId: destColumnId,
          position: destination.index,
          status: destColumnId,
        });

        // Update local state optimistically
        const updatedTasks = (selectedWorkspace.tasks || []).map(task => {
          if (task.id === draggableId) {
            return {
              ...task,
              columnId: destColumnId,
              position: destination.index,
              status: destColumnId,
            };
          }
          return task;
        });

        onUpdateWorkspace(selectedWorkspace.id, { tasks: updatedTasks });
      } catch (error) {
        console.error('Error moving task:', error);
      }
    }
  };

  const handleAddTask = (columnId: string, columnTitle: string) => {
    setSelectedColumnId(columnId);
    setSelectedColumnTitle(columnTitle);
    setIsAddTaskOpen(true);
  };

  const handleTaskClick = (task: AdminWorkspaceTask) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleTaskCreated = async () => {
    setIsAddTaskOpen(false);
    // Refresh workspace data
    if (selectedWorkspace) {
      const refreshedWorkspace = await adminWorkspaceService.getAdminWorkspace(
        selectedWorkspace.id
      );
      if (refreshedWorkspace) {
        setSelectedWorkspace(refreshedWorkspace);
      }
    }
  };

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

  const columns = getColumnsWithTasks();

  if (!selectedWorkspace && workspaces.length > 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Wähle einen Admin Workspace</h3>
          <p className="text-gray-500 mb-4">
            Wähle einen Workspace aus der Liste, um mit der Arbeit zu beginnen.
          </p>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Admin Workspaces</h3>
          <p className="text-gray-500 mb-4">
            Erstelle deinen ersten Admin Workspace, um zu beginnen.
          </p>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Ersten Admin Workspace erstellen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Selector */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    {selectedWorkspace ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = getSystemLevelIcon(
                            selectedWorkspace.systemLevel || 'platform'
                          );
                          return <IconComponent className="h-4 w-4" />;
                        })()}
                        <span className="font-medium">{selectedWorkspace.title}</span>
                      </div>
                    ) : (
                      'Workspace wählen'
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  {workspaces.map(workspace => {
                    const IconComponent = getSystemLevelIcon(workspace.systemLevel || 'platform');
                    return (
                      <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => setSelectedWorkspace(workspace)}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{workspace.title}</div>
                          <div className="text-xs text-gray-500">{workspace.systemLevel}</div>
                        </div>
                        <Badge className={getSystemLevelColor(workspace.systemLevel || 'platform')}>
                          {workspace.systemLevel}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedWorkspace && (
              <div className="flex items-center gap-2">
                <Badge className={getSystemLevelColor(selectedWorkspace.systemLevel || 'platform')}>
                  {selectedWorkspace.systemLevel || 'platform'}
                </Badge>
                <Badge className={getPriorityColor(selectedWorkspace.priority)}>
                  {selectedWorkspace.priority}
                </Badge>
                <Badge variant="outline">
                  {selectedWorkspace.tasks?.filter(t => !t.archived).length || 0} Tasks
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchive(!showArchive)}
              className="text-gray-600"
            >
              {showArchive ? 'Board anzeigen' : 'Archiv anzeigen'}
            </Button>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="h-full p-6">
            <div className="flex gap-6 h-full min-w-max">
              {columns.map(column => (
                <div key={column.id} className="flex-shrink-0 w-80">
                  <Droppable droppableId={column.id} type="task">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-full flex flex-col bg-gray-50 rounded-lg ${
                          snapshot.isDraggingOver ? 'bg-gray-100' : ''
                        }`}
                      >
                        {/* Column Header */}
                        <div className="flex-shrink-0 p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: column.color }}
                              />
                              <h3 className="font-medium text-gray-900">{column.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {column.tasks.length}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddTask(column.id, column.title)}
                              className="text-[#14ad9f] hover:text-[#129488]"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Tasks */}
                        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                          {column.tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                                  onClick={() => handleTaskClick(task)}
                                >
                                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-gray-900 text-sm leading-5">
                                          {task.title}
                                        </h4>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger
                                            asChild
                                            onClick={e => e.stopPropagation()}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                                            <DropdownMenuItem>Duplizieren</DropdownMenuItem>
                                            <DropdownMenuItem>Archivieren</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">
                                              Löschen
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>

                                      {task.description && (
                                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}

                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <Badge
                                          className={getPriorityColor(task.priority)}
                                          variant="outline"
                                        >
                                          {task.priority}
                                        </Badge>
                                        {task.systemTask && (
                                          <Badge
                                            variant="outline"
                                            className="bg-blue-50 text-blue-700"
                                          >
                                            System
                                          </Badge>
                                        )}
                                        {task.automatedTask && (
                                          <Badge
                                            variant="outline"
                                            className="bg-green-50 text-green-700"
                                          >
                                            Auto
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                          {task.dueDate && (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>
                                                {task.dueDate.toLocaleDateString('de-DE')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span>{task.assignedTo.length || 0}</span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Add Task Slide Over */}
      <AdminAddTaskSlideOver
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        workspace={selectedWorkspace}
        columnId={selectedColumnId}
        onAddTask={taskData => {
          // Handle task creation here
          handleTaskCreated();
        }}
      />

      {/* Task Detail Slider */}
      <AdminTaskDetailSlider
        task={selectedTask}
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        workspace={selectedWorkspace}
        onUpdateTask={(taskId, updates) => {
          // Handle task update here
          if (selectedWorkspace) {
            adminWorkspaceService.getWorkspace(selectedWorkspace.id).then(refreshedWorkspace => {
              if (refreshedWorkspace) {
                setSelectedWorkspace(refreshedWorkspace);
              }
            });
          }
        }}
        onDeleteTask={taskId => {
          // Handle task deletion here
          if (selectedWorkspace) {
            adminWorkspaceService.deleteTask(selectedWorkspace.id, taskId).then(() => {
              setIsTaskDetailOpen(false);
              setSelectedTask(null);
            });
          }
        }}
      />
    </div>
  );
}

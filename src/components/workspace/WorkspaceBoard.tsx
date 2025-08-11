'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Calendar, User, Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddTaskSlideOver } from './AddTaskSlideOver';

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

interface WorkspaceBoardColumn {
  id: string;
  title: string;
  color: string;
  position: number;
  tasks: WorkspaceTask[];
}

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
  boardColumns?: WorkspaceBoardColumn[];
  tasks?: WorkspaceTask[];
}

interface WorkspaceBoardProps {
  workspaces: Workspace[];
  onUpdateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
}

export function WorkspaceBoard({
  workspaces,
  onUpdateWorkspace,
  onDeleteWorkspace,
}: WorkspaceBoardProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    workspaces.length > 0 ? workspaces[0] : null
  );
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [selectedColumnTitle, setSelectedColumnTitle] = useState('');

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

  const columns = selectedWorkspace?.boardColumns || defaultColumns;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !selectedWorkspace) return;

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

      onUpdateWorkspace(selectedWorkspace.id, {
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
      const newTasks = Array.from(sourceColumn.tasks);
      const [reorderedTask] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, reorderedTask);

      const updatedTasks = newTasks.map((task, index) => ({
        ...task,
        position: index,
      }));

      const updatedColumns = columns.map(col =>
        col.id === source.droppableId ? { ...col, tasks: updatedTasks } : col
      );

      onUpdateWorkspace(selectedWorkspace.id, {
        boardColumns: updatedColumns,
      });
    } else {
      // Moving between columns
      const sourceTasks = Array.from(sourceColumn.tasks);
      const destTasks = Array.from(destColumn.tasks);
      const [movedTask] = sourceTasks.splice(source.index, 1);

      movedTask.columnId = destination.droppableId;
      movedTask.status = destination.droppableId;

      destTasks.splice(destination.index, 0, movedTask);

      const updatedSourceTasks = sourceTasks.map((task, index) => ({
        ...task,
        position: index,
      }));

      const updatedDestTasks = destTasks.map((task, index) => ({
        ...task,
        position: index,
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

      onUpdateWorkspace(selectedWorkspace.id, {
        boardColumns: updatedColumns,
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

  const handleTaskCreated = (taskData: Partial<WorkspaceTask>) => {
    if (!selectedWorkspace || !selectedColumnId) return;

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
      position: taskData.position || 0,
      columnId: selectedColumnId,
    };

    const updatedColumns = columns.map(col => {
      if (col.id === selectedColumnId) {
        return {
          ...col,
          tasks: [...col.tasks, newTask]
        };
      }
      return col;
    });

    onUpdateWorkspace(selectedWorkspace.id, {
      boardColumns: updatedColumns,
    });
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
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${getPriorityColor(selectedWorkspace.priority)}`}
              >
                {selectedWorkspace.priority}
              </Badge>
              <Badge variant="outline">{selectedWorkspace.status}</Badge>
              <span className="text-sm text-gray-500">Progress: {selectedWorkspace.progress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
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
                        className={`flex flex-col w-80 bg-white rounded-lg shadow-sm border border-gray-200 ${
                          snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                        }`}
                      >
                        {/* Column Header */}
                        <div
                          {...provided.dragHandleProps}
                          className="flex items-center justify-between p-4 border-b border-gray-200 cursor-grab"
                          style={{ backgroundColor: column.color }}
                        >
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{column.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {column.tasks.length}
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
                              className={`flex-1 p-4 space-y-3 min-h-32 ${
                                snapshot.isDraggingOver ? 'bg-gray-50' : ''
                              }`}
                            >
                              {column.tasks.map((task, taskIndex) => (
                                <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`cursor-grab ${
                                        snapshot.isDragging
                                          ? 'shadow-lg rotate-1'
                                          : 'hover:shadow-md'
                                      } transition-all duration-200`}
                                    >
                                      <CardContent className="p-4">
                                        <div className="space-y-3">
                                          {/* Priority Indicator */}
                                          <div className="flex items-center justify-between">
                                            <div
                                              className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                                            />
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent>
                                                <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                                                <DropdownMenuItem>Löschen</DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>

                                          {/* Task Title */}
                                          <h4 className="font-medium text-gray-900 text-sm leading-tight">
                                            {task.title}
                                          </h4>

                                          {/* Task Description */}
                                          {task.description && (
                                            <p className="text-xs text-gray-500 line-clamp-2">
                                              {task.description}
                                            </p>
                                          )}

                                          {/* Tags */}
                                          {task.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {task.tags.slice(0, 3).map(tag => (
                                                <Badge
                                                  key={tag}
                                                  variant="outline"
                                                  className="text-xs px-2 py-1"
                                                >
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {task.tags.length > 3 && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs px-2 py-1"
                                                >
                                                  +{task.tags.length - 3}
                                                </Badge>
                                              )}
                                            </div>
                                          )}

                                          {/* Task Footer */}
                                          <div className="flex items-center justify-between text-xs text-gray-500">
                                            {/* Due Date */}
                                            {task.dueDate && (
                                              <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(task.dueDate)}</span>
                                              </div>
                                            )}

                                            {/* Assigned Users */}
                                            {task.assignedTo.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span>{task.assignedTo.length}</span>
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
                <div className="flex flex-col w-80">
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
      </div>

      {/* Add Task Slide Over */}
      <AddTaskSlideOver
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
        columnId={selectedColumnId}
        columnTitle={selectedColumnTitle}
      />
    </div>
  );
}

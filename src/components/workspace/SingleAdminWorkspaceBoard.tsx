'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Calendar, User, Flag } from 'lucide-react';
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

interface SingleAdminWorkspaceBoardProps {
  workspace: AdminWorkspace;
  onWorkspaceUpdate: (updatedWorkspace: AdminWorkspace) => void;
}

export function SingleAdminWorkspaceBoard({
  workspace,
  onWorkspaceUpdate,
}: SingleAdminWorkspaceBoardProps) {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState('');
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
    console.log('DEBUG: getColumnsWithTasks called, workspace.tasks:', workspace?.tasks?.length);

    if (workspace?.boardColumns && workspace.boardColumns.length > 0) {
      const columns = workspace.boardColumns.map(column => ({
        ...column,
        tasks: (workspace.tasks || [])
          .filter(task => task.columnId === column.id && !task.archived)
          .map(normalizeTaskDates)
          .sort((a, b) => a.position - b.position),
      }));
      console.log(
        'DEBUG: Using boardColumns, result:',
        columns.map(c => ({ id: c.id, taskCount: c.tasks.length }))
      );
      return columns;
    }

    // Use default columns and distribute existing tasks
    const columns = [...defaultColumns];
    const tasks = workspace?.tasks || [];
    console.log('DEBUG: Using default columns, tasks to distribute:', tasks.length);

    tasks.forEach(task => {
      if (!task.archived) {
        const normalizedTask = normalizeTaskDates(task);
        const columnId = task.columnId || task.status || 'backlog';
        console.log('DEBUG: Task', task.title, 'goes to column', columnId);
        const column = columns.find(col => col.id === columnId);
        if (column) {
          column.tasks.push(normalizedTask);
        } else {
          console.log('DEBUG: Column not found for', columnId, 'putting in backlog');
          const backlogColumn = columns.find(col => col.id === 'backlog');
          if (backlogColumn) {
            backlogColumn.tasks.push(normalizedTask);
          }
        }
      }
    });

    const result = columns.map(column => ({
      ...column,
      tasks: column.tasks.sort((a, b) => a.position - b.position),
    }));

    console.log(
      'DEBUG: Final column distribution:',
      result.map(c => ({ id: c.id, title: c.title, taskCount: c.tasks.length }))
    );
    return result;
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination || !workspace) {
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
        await adminWorkspaceService.updateTask(workspace.id, taskToMove.id, {
          columnId: destColumnId,
          position: destination.index,
          status: destColumnId,
        });

        // Reload workspace to get updated data
        const refreshedWorkspace = await adminWorkspaceService.getAdminWorkspace(workspace.id);
        if (refreshedWorkspace) {
          onWorkspaceUpdate(refreshedWorkspace);
        }
      } catch (error) {
        console.error('Error moving task:', error);
      }
    }
  };

  const handleAddTask = (columnId: string) => {
    setSelectedColumnId(columnId);
    setIsAddTaskOpen(true);
  };

  const handleTaskClick = (task: AdminWorkspaceTask) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleTaskCreated = async () => {
    setIsAddTaskOpen(false);
    // Reload workspace to show new task
    const refreshedWorkspace = await adminWorkspaceService.getAdminWorkspace(workspace.id);
    if (refreshedWorkspace) {
      onWorkspaceUpdate(refreshedWorkspace);
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

  return (
    <div className="h-full flex flex-col">
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
                              onClick={() => handleAddTask(column.id)}
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
        workspace={workspace}
        columnId={selectedColumnId}
        onAddTask={async taskData => {
          if (workspace) {
            try {
              await adminWorkspaceService.createTask(workspace.id, taskData);
              handleTaskCreated();
            } catch (error) {
              console.error('Error creating task:', error);
            }
          }
        }}
      />

      {/* Task Detail Slider */}
      <AdminTaskDetailSlider
        task={selectedTask}
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        workspace={workspace}
        onUpdateTask={async (taskId, updates) => {
          if (workspace) {
            try {
              await adminWorkspaceService.updateTask(workspace.id, taskId, updates);
              const refreshedWorkspace = await adminWorkspaceService.getAdminWorkspace(
                workspace.id
              );
              if (refreshedWorkspace) {
                onWorkspaceUpdate(refreshedWorkspace);
              }
            } catch (error) {
              console.error('Error updating task:', error);
            }
          }
        }}
        onDeleteTask={async taskId => {
          if (workspace) {
            try {
              await adminWorkspaceService.deleteTask(workspace.id, taskId);
              setIsTaskDetailOpen(false);
              setSelectedTask(null);
              const refreshedWorkspace = await adminWorkspaceService.getAdminWorkspace(
                workspace.id
              );
              if (refreshedWorkspace) {
                onWorkspaceUpdate(refreshedWorkspace);
              }
            } catch (error) {
              console.error('Error deleting task:', error);
            }
          }
        }}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Play,
  Pause,
  Trash2,
} from 'lucide-react';
import {
  useFinApiTasks,
  useFinApiTask,
  useCreateFinApiTask,
  useFinApiTasksStats,
} from '@/hooks/useFinApiTasks';

interface TaskManagerProps {
  credentialType?: 'sandbox' | 'admin';
  showCreateActions?: boolean;
  showStats?: boolean;
}

export function FinApiTaskManager({
  credentialType = 'sandbox',
  showCreateActions = true,
  showStats = true,
}: TaskManagerProps) {
  const { tasks, loading, error, pagination, refetch, activeTasks, completedTasks, pendingTasks } =
    useFinApiTasks({ credentialType });

  const { createTask, creating } = useCreateFinApiTask(credentialType);
  const { stats } = useFinApiTasksStats(credentialType);

  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'NOT_YET_STARTED':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'IN_PROGRESS':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'WEB_FORM_REQUIRED':
        return <ExternalLink className="h-4 w-4 text-purple-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'COMPLETED_WITH_ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      NOT_YET_STARTED: 'secondary',
      IN_PROGRESS: 'default',
      WEB_FORM_REQUIRED: 'outline',
      COMPLETED: 'default',
      COMPLETED_WITH_ERROR: 'destructive',
    } as const;

    const colors = {
      NOT_YET_STARTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-[#14ad9f] text-white',
      WEB_FORM_REQUIRED: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      COMPLETED_WITH_ERROR: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[status]}>
        {getStatusIcon(status)}
        <span className="ml-1">{status.replace(/_/g, ' ').toLowerCase()}</span>
      </Badge>
    );
  };

  const handleCreateUpdateTask = async () => {
    // This would typically open a modal to select bank connections
    // For now, we'll create a general update task
    const task = await createTask({
      type: 'UPDATE_BANK_CONNECTIONS',
    });

    if (task) {
      refetch(); // Refresh the tasks list
    }
  };

  const handleCreateImportTask = async () => {
    // This would typically open a modal to select accounts
    const task = await createTask({
      type: 'IMPORT_TRANSACTIONS',
      maxDaysBack: 30,
    });

    if (task) {
      refetch();
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-[#14ad9f] mr-2" />
          <span>Tasks werden geladen...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#14ad9f]">{stats.total}</div>
              <div className="text-sm text-gray-600">Gesamt</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Aktiv</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Fertig</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Fehler</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.needsAction}</div>
              <div className="text-sm text-gray-600">Benötigt Aktion</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Task Actions */}
      {showCreateActions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-[#14ad9f]" />
              Neue Task erstellen
            </CardTitle>
            <CardDescription>Starte Banking-Operationen über finAPI Tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCreateUpdateTask}
                disabled={creating}
                className="bg-[#14ad9f] hover:bg-taskilo-hover"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Bank-Verbindungen aktualisieren
              </Button>

              <Button
                onClick={handleCreateImportTask}
                disabled={creating}
                variant="outline"
                className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Transaktionen importieren
              </Button>

              <Button
                onClick={refetch}
                variant="ghost"
                className="text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Aktualisieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-yellow-500" />
              Aktive Tasks ({activeTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  credentialType={credentialType}
                  onSelect={() => setSelectedTask(task.id)}
                  isSelected={selectedTask === task.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Tasks */}
      {completedTasks.slice(0, 5).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Letzte abgeschlossene Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(task.status)}
                    <span className="text-sm font-medium">{task.type}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(task.completedAt || task.createdAt).toLocaleString('de-DE')}
                    </span>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {tasks.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Tasks vorhanden</h3>
            <p className="text-gray-600 mb-4">Erstelle deine erste Banking-Task um zu beginnen.</p>
            {showCreateActions && (
              <Button onClick={handleCreateUpdateTask} className="bg-[#14ad9f] hover:bg-taskilo-hover">
                Erste Task erstellen
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: any;
  credentialType: 'sandbox' | 'admin';
  onSelect: () => void;
  isSelected: boolean;
}

function TaskCard({ task, credentialType, onSelect, isSelected }: TaskCardProps) {
  const {
    task: detailedTask,
    loading: taskLoading,
    cancelTask,
    isActive,
    progressPercent,
  } = useFinApiTask(task.id, { credentialType });

  const handleCancel = async () => {
    const success = await cancelTask();
    if (success) {
      // Task was cancelled successfully
    }
  };

  const currentTask = detailedTask || task;

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-[#14ad9f] bg-[#14ad9f]/5' : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium">{currentTask.type}</span>
              {currentTask.taskilo?.statusInfo && (
                <Badge
                  className={`${
                    currentTask.taskilo.statusInfo.color === 'green'
                      ? 'bg-green-100 text-green-800'
                      : currentTask.taskilo.statusInfo.color === 'yellow'
                        ? 'bg-[#14ad9f] text-white'
                        : currentTask.taskilo.statusInfo.color === 'red'
                          ? 'bg-red-100 text-red-800'
                          : currentTask.taskilo.statusInfo.color === 'purple'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {currentTask.taskilo.statusInfo.message}
                </Badge>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <div>ID: {currentTask.id}</div>
              <div>Erstellt: {new Date(currentTask.createdAt).toLocaleString('de-DE')}</div>
              {currentTask.completedAt && (
                <div>
                  Abgeschlossen: {new Date(currentTask.completedAt).toLocaleString('de-DE')}
                </div>
              )}
              {currentTask.taskilo?.estimatedCompletion && (
                <div>Geschätzte Fertigstellung: {currentTask.taskilo.estimatedCompletion}</div>
              )}
            </div>

            {/* Progress Bar */}
            {isActive && progressPercent > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Fortschritt</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Web Form Link */}
            {currentTask.webFormUrl && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                onClick={e => {
                  e.stopPropagation();
                  window.open(currentTask.webFormUrl, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Web Form öffnen
              </Button>
            )}

            {/* Error Message */}
            {currentTask.errorMessage && (
              <Alert className="mt-2" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{currentTask.errorMessage}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col items-end space-y-2">
            {/* Cancel Button for active tasks */}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* Loading indicator */}
            {taskLoading && <RefreshCw className="h-4 w-4 animate-spin text-[#14ad9f]" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

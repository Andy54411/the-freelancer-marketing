import { NextRequest, NextResponse } from 'next/server';
import { getFinApiCredentials, getFinApiBaseUrl } from '@/lib/finapi-config';

/**
 * finAPI Tasks API - Get Specific Task Details
 *
 * Retrieves details for a specific task by ID.
 * API Reference: https://docs.finapi.io/#get-/api/tasks/{id}
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Step 1: Get client credentials token
    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();

      return NextResponse.json(
        { error: 'Authentication failed', details: errorText },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Step 2: Get specific task details
    const tasksBaseUrl =
      credentialType === 'sandbox'
        ? 'https://webform-sandbox.finapi.io'
        : 'https://webform.finapi.io';

    const taskResponse = await fetch(`${tasksBaseUrl}/api/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-task-${taskId}-${Date.now()}`,
      },
    });

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();

      if (taskResponse.status === 404) {
        return NextResponse.json(
          {
            error: 'Task not found',
            taskId: taskId,
            details: 'The specified task ID does not exist or is not accessible',
          },
          { status: 404 }
        );
      }

      if (taskResponse.status === 403) {
        return NextResponse.json(
          {
            error: 'Task access forbidden',
            taskId: taskId,
            details: 'Task may belong to different user or require special permissions',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Task details request failed',
          taskId: taskId,
          status: taskResponse.status,
          details: errorText,
        },
        { status: taskResponse.status }
      );
    }

    const taskData = await taskResponse.json();

    // Add Taskilo-specific enhancements to task data
    const enhancedTask = {
      ...taskData,
      taskilo: {
        retrievedAt: new Date().toISOString(),
        environment: credentialType,
        server: tasksBaseUrl,
        // Add status interpretation for Taskilo UI
        statusInfo: getTaskStatusInfo(taskData.status),
        // Add progress calculation if available
        progressPercent: calculateTaskProgress(taskData),
        // Add estimated completion time
        estimatedCompletion: estimateCompletionTime(taskData),
      },
    };

    return NextResponse.json({
      success: true,
      task: enhancedTask,
      meta: {
        taskId: taskId,
        environment: credentialType,
        server: tasksBaseUrl,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {

    const resolvedParams = await params;
    return NextResponse.json(
      {
        error: 'Internal server error',
        taskId: resolvedParams.id,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Cancel a specific task (DELETE)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Get client token
    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: 'Authentication failed', details: errorText },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Cancel the task
    const tasksBaseUrl =
      credentialType === 'sandbox'
        ? 'https://webform-sandbox.finapi.io'
        : 'https://webform.finapi.io';

    const cancelResponse = await fetch(`${tasksBaseUrl}/api/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-cancel-${taskId}-${Date.now()}`,
      },
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      return NextResponse.json(
        {
          error: 'Task cancellation failed',
          taskId: taskId,
          status: cancelResponse.status,
          details: errorText,
        },
        { status: cancelResponse.status }
      );
    }

    const cancelData = await cancelResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
      task: cancelData,
      meta: {
        taskId: taskId,
        environment: credentialType,
        server: tasksBaseUrl,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {

    const resolvedParams = await params;
    return NextResponse.json(
      {
        error: 'Internal server error',
        taskId: resolvedParams.id,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get user-friendly status information
 */
function getTaskStatusInfo(status: string) {
  const statusMap = {
    NOT_YET_STARTED: {
      message: 'Task ist in der Warteschlange',
      color: 'blue',
      icon: 'clock',
    },
    IN_PROGRESS: {
      message: 'Task wird gerade ausgeführt',
      color: 'yellow',
      icon: 'spinner',
    },
    WEB_FORM_REQUIRED: {
      message: 'Benutzeraktion über Web Form erforderlich',
      color: 'purple',
      icon: 'form',
    },
    COMPLETED: {
      message: 'Task erfolgreich abgeschlossen',
      color: 'green',
      icon: 'check',
    },
    COMPLETED_WITH_ERROR: {
      message: 'Task mit Fehlern abgeschlossen',
      color: 'red',
      icon: 'warning',
    },
  };

  return (
    statusMap[status] || {
      message: 'Unbekannter Status',
      color: 'gray',
      icon: 'question',
    }
  );
}

/**
 * Helper function to calculate task progress percentage
 */
function calculateTaskProgress(task: { status?: string }): number {
  switch (task.status) {
    case 'NOT_YET_STARTED':
      return 0;
    case 'IN_PROGRESS':
      return 50; // Could be enhanced with more detailed progress info
    case 'WEB_FORM_REQUIRED':
      return 75; // Waiting for user action
    case 'COMPLETED':
    case 'COMPLETED_WITH_ERROR':
      return 100;
    default:
      return 0;
  }
}

/**
 * Helper function to estimate completion time
 */
function estimateCompletionTime(task: { status?: string; createdAt?: string }): string | null {
  if (task.status === 'COMPLETED' || task.status === 'COMPLETED_WITH_ERROR') {
    return null; // Already completed
  }

  if (task.status === 'WEB_FORM_REQUIRED') {
    return 'Wartet auf Benutzeraktion';
  }

  // For running tasks, estimate based on creation time
  if (task.createdAt && task.status === 'IN_PROGRESS') {
    const created = new Date(task.createdAt);
    const now = new Date();
    const elapsed = now.getTime() - created.getTime();

    // Typical finAPI tasks take 1-5 minutes
    const estimatedTotal = 5 * 60 * 1000; // 5 minutes
    const remaining = Math.max(0, estimatedTotal - elapsed);

    if (remaining > 0) {
      const minutes = Math.ceil(remaining / (60 * 1000));
      return `ca. ${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
    }
  }

  return 'Unbekannt';
}

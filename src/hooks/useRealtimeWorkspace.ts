// Client-side WebSocket Hook für Admin Workspace Realtime Updates
'use client';

import { useEffect, useRef, useState } from 'react';

interface WorkspaceUpdate {
  type: 'workspace_update';
  workspaceId: string;
  updateType: string;
  data: any;
  timestamp: string;
}

interface UseRealtimeWorkspaceProps {
  adminId: string;
  workspaceIds: string[];
  onUpdate: (update: WorkspaceUpdate) => void;
}

export function useRealtimeWorkspace({
  adminId,
  workspaceIds,
  onUpdate,
}: UseRealtimeWorkspaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    const wsUrl = process.env.NEXT_PUBLIC_AWS_WEBSOCKET_URL;

    if (!wsUrl) {
      setConnectionError('WebSocket URL not configured');
      return;
    }

    try {
      // WebSocket mit Admin-ID als Query Parameter
      const fullUrl = `${wsUrl}?adminId=${encodeURIComponent(adminId)}`;
      wsRef.current = new WebSocket(fullUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected to AWS');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;

        // Subscribe zu allen Workspace-IDs
        workspaceIds.forEach(workspaceId => {
          subscribeToWorkspace(workspaceId);
        });
      };

      wsRef.current.onmessage = event => {
        try {
          const update: WorkspaceUpdate = JSON.parse(event.data);
          console.log('Realtime update received:', update);
          onUpdate(update);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = event => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Auto-reconnect mit exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = error => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  const subscribeToWorkspace = (workspaceId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        action: 'subscribe',
        workspaceId,
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Subscribed to workspace: ${workspaceId}`);
    }
  };

  const unsubscribeFromWorkspace = (workspaceId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        action: 'unsubscribe',
        workspaceId,
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Unsubscribed from workspace: ${workspaceId}`);
    }
  };

  // Initial connection
  useEffect(() => {
    if (adminId && workspaceIds.length > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [adminId, workspaceIds.length]);

  // Subscribe/unsubscribe bei Workspace-Änderungen
  useEffect(() => {
    if (isConnected && wsRef.current) {
      workspaceIds.forEach(workspaceId => {
        subscribeToWorkspace(workspaceId);
      });
    }
  }, [workspaceIds, isConnected]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    subscribeToWorkspace,
    unsubscribeFromWorkspace,
  };
}

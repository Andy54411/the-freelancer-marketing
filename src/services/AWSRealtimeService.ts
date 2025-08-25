// AWS Realtime Service für Admin Workspace Updates
// Client-Side Service - verwendet API Routes statt direkter AWS Calls

interface WebSocketConnection {
  connectionId: string;
  adminId: string;
  subscriptions: string[];
}

class AWSRealtimeService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private websocketEndpoint: string;
  private websocket: WebSocket | null = null;

  constructor() {
    this.websocketEndpoint = process.env.NEXT_PUBLIC_AWS_WEBSOCKET_URL || '';
  }

  // EventBridge Event senden über API Route (sicher für Browser)
  async publishWorkspaceUpdate(
    workspaceId: string,
    adminId: string,
    updateType: string,
    data: any
  ) {
    try {
      // Verwende API Route statt direkten EventBridge Call
      const response = await fetch('/api/admin/realtime/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          adminId,
          updateType,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();

    } catch (error) {

    }
  }

  // WebSocket Connection Management (Client-Side)
  addConnection(connectionId: string, adminId: string, subscriptions: string[] = []) {
    this.connections.set(connectionId, {
      connectionId,
      adminId,
      subscriptions,
    });
  }

  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
  }

  // Health Check
  isConfigured(): boolean {
    return !!this.websocketEndpoint;
  }

  // Connection Status
  getConnectionCount(): number {
    return this.connections.size;
  }

  getAdminConnections(adminId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.adminId === adminId);
  }

  // Client-side WebSocket Event Subscription
  async subscribeToWorkspaceEvents(
    adminId: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    if (typeof window === 'undefined') {
      // Server-side - return no-op
      return () => {};
    }

    const wsUrl = process.env.NEXT_PUBLIC_AWS_WEBSOCKET_URL;
    if (!wsUrl) {

      return () => {};
    }

    try {
      const fullUrl = `${wsUrl}?adminId=${encodeURIComponent(adminId)}`;
      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {

      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {

        }
      };

      ws.onerror = error => {

      };

      ws.onclose = () => {

      };

      // Return unsubscribe function
      return () => {
        ws.close();
      };
    } catch (error) {

      return () => {};
    }
  }

  // Broadcast Workspace Update (for compatibility)
  async broadcastWorkspaceUpdate(
    eventType: string,
    workspaceId: string,
    adminId: string,
    data: any
  ): Promise<void> {
    try {
      await this.publishWorkspaceUpdate(workspaceId, adminId, eventType, data);
    } catch (error) {

    }
  }

  // Initialize WebSocket (for compatibility)
  async initializeWebSocket(): Promise<void> {
    // WebSocket initialization is handled in subscribeToWorkspaceEvents

  }
}

// Singleton Instance
export const awsRealtimeService = new AWSRealtimeService();
export default awsRealtimeService;

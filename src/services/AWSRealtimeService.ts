// AWS Realtime Service für Admin Workspace Updates
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

interface WebSocketConnection {
  connectionId: string;
  adminId: string;
  subscriptions: string[];
}

class AWSRealtimeService {
  private eventBridge: EventBridgeClient;
  private apiGateway: ApiGatewayManagementApiClient | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private websocketEndpoint: string;

  constructor() {
    this.eventBridge = new EventBridgeClient({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.websocketEndpoint = process.env.NEXT_PUBLIC_AWS_WEBSOCKET_URL || '';

    if (this.websocketEndpoint) {
      this.apiGateway = new ApiGatewayManagementApiClient({
        region: process.env.AWS_REGION || 'eu-central-1',
        endpoint: this.websocketEndpoint.replace('wss://', 'https://'),
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  // EventBridge Event senden für Workspace Updates
  async publishWorkspaceUpdate(
    workspaceId: string,
    adminId: string,
    updateType: string,
    data: any
  ) {
    try {
      const params = {
        Entries: [
          {
            Source: 'taskilo.admin.workspace',
            DetailType: 'Workspace Update',
            Detail: JSON.stringify({
              workspaceId,
              adminId,
              updateType,
              data,
              timestamp: new Date().toISOString(),
            }),
            EventBusName: process.env.AWS_EVENTBRIDGE_BUS || 'taskilo-events-production',
          },
        ],
      };

      const command = new PutEventsCommand(params);
      await this.eventBridge.send(command);

      console.log(`EventBridge event published for workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error publishing EventBridge event:', error);
    }
  }

  // WebSocket Connection Management
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

  // WebSocket Message senden
  async sendToConnection(connectionId: string, message: any) {
    if (!this.apiGateway) {
      console.warn('WebSocket API Gateway not configured');
      return;
    }

    try {
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(message),
      });

      await this.apiGateway.send(command);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      // Remove stale connection
      this.removeConnection(connectionId);
    }
  }

  // Broadcast zu allen Connections eines Admins
  async broadcastToAdmin(adminId: string, message: any) {
    const adminConnections = Array.from(this.connections.values()).filter(
      conn => conn.adminId === adminId
    );

    const promises = adminConnections.map(conn =>
      this.sendToConnection(conn.connectionId, message)
    );

    await Promise.all(promises);
  }

  // Workspace Update zu allen subscribern senden
  async notifyWorkspaceUpdate(workspaceId: string, updateType: string, data: any) {
    const subscribedConnections = Array.from(this.connections.values()).filter(conn =>
      conn.subscriptions.includes(workspaceId)
    );

    const message = {
      type: 'workspace_update',
      workspaceId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    };

    const promises = subscribedConnections.map(conn =>
      this.sendToConnection(conn.connectionId, message)
    );

    await Promise.all(promises);
  }

  // Health Check
  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    );
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
      console.warn('WebSocket URL not configured');
      return () => {};
    }

    try {
      const fullUrl = `${wsUrl}?adminId=${encodeURIComponent(adminId)}`;
      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        console.log('AWS WebSocket connected for admin:', adminId);
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = error => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('AWS WebSocket disconnected');
      };

      // Return unsubscribe function
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
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
      console.error('Error broadcasting workspace update:', error);
    }
  }

  // Initialize WebSocket (for compatibility)
  async initializeWebSocket(): Promise<void> {
    // WebSocket initialization is handled in subscribeToWorkspaceEvents
    console.log('WebSocket initialization called');
  }
}

// Singleton Instance
export const awsRealtimeService = new AWSRealtimeService();
export default awsRealtimeService;

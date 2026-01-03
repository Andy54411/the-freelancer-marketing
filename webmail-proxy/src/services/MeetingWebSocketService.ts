/**
 * Taskilo Meeting WebSocket Service
 * WebSocket-basierte Signalisierung für Video-Meetings
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server, IncomingMessage } from 'http';
import crypto from 'crypto';
import { meetingRoomService } from './MeetingRoomService';

interface MeetingClient {
  ws: WebSocket;
  participantId: string;
  roomCode: string | null;
  userId: string;
  userName: string;
  lastPing: number;
}

interface MeetingWSMessage {
  type: 
    | 'join' 
    | 'leave' 
    | 'offer' 
    | 'answer' 
    | 'ice-candidate' 
    | 'mute' 
    | 'unmute' 
    | 'video-on' 
    | 'video-off'
    | 'screen-share-start'
    | 'screen-share-stop'
    | 'chat'
    | 'reaction'
    | 'raise-hand'
    | 'lower-hand'
    | 'ping'
    | 'pong'
    // Lobby/Wartezimmer Messages
    | 'request-join'
    | 'approve-join'
    | 'deny-join'
    // Screen Share Permission Messages
    | 'screen-share-request'
    | 'approve-screen-share'
    | 'deny-screen-share'
    // Host Control Messages
    | 'host-mute-participant'
    | 'host-unmute-participant'
    | 'host-remove-participant'
    | 'host-spotlight-participant'
    | 'host-clear-spotlight'
    // Meeting-Ende
    | 'end-meeting';
  payload?: {
    roomCode?: string;
    userId?: string;
    userName?: string;
    targetParticipantId?: string;
    sdp?: object;        // RTCSessionDescriptionInit equivalent
    candidate?: object;  // RTCIceCandidate equivalent
    message?: string;
    reaction?: string;
    mediaState?: {
      audio: boolean;
      video: boolean;
      screenShare: boolean;
    };
    // Lobby-spezifische Felder
    requestingParticipantId?: string;
  };
}

interface MeetingWSResponse {
  type: string;
  payload: object;
  timestamp: string;
}

class MeetingWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, MeetingClient> = new Map();
  private roomClients: Map<string, Set<string>> = new Map(); // roomCode -> participantIds
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private stats = {
    totalConnections: 0,
    currentConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    activeMeetings: 0,
  };

  initialize(_server: Server): void {
    this.wss = new WebSocketServer({
      // WICHTIG: noServer für manuelles Upgrade-Routing bei mehreren WS-Servern
      noServer: true,
      // WICHTIG: Compression deaktivieren um RSV1 Fehler zu vermeiden
      perMessageDeflate: false,
    });

    this.wss.on('error', (error) => {
      console.error('[Meeting WS] Server error:', error);
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[Meeting WS] New connection established');
      this.handleConnection(ws, req);
    });

    // Ping alle 20 Sekunden
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 20000);

    // Cleanup alle 30 Sekunden
    this.cleanupInterval = setInterval(() => {
      this.cleanupDisconnectedClients();
    }, 30000);

    console.log('[Meeting WS] WebSocket server initialized (noServer mode) for /ws/meeting');
  }

  // Manuelles Upgrade-Handling für korrektes Routing
  handleUpgrade(request: IncomingMessage, socket: import('stream').Duplex, head: Buffer): void {
    const origin = request.headers.origin as string | undefined;
    console.log('[Meeting WS] handleUpgrade called with origin:', origin);
    
    const allowedOrigins = [
      'https://taskilo.de',
      'https://www.taskilo.de',
      'https://mail.taskilo.de',
      'https://taskilo.vercel.app',
      'http://localhost:3000',
      'http://localhost:3100',
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`[Meeting WS] Rejected upgrade from origin: ${origin}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log('[Meeting WS] Upgrade accepted');
    this.wss?.handleUpgrade(request, socket, head, (ws) => {
      this.wss?.emit('connection', ws, request);
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const participantId = crypto.randomUUID();
    const ip = req.socket.remoteAddress || 'unknown';

    const client: MeetingClient = {
      ws,
      participantId,
      roomCode: null,
      userId: '',
      userName: 'Unbekannt',
      lastPing: Date.now(),
    };

    this.clients.set(participantId, client);
    this.stats.totalConnections++;
    this.stats.currentConnections++;

    console.log(`[Meeting WS] New connection: ${participantId} from ${ip}`);

    // Sende dem Client seine Participant-ID
    this.sendToClient(participantId, {
      type: 'connected',
      payload: { participantId },
      timestamp: new Date().toISOString(),
    });

    ws.on('message', (data: RawData) => {
      console.log(`[Meeting WS] Message from ${participantId}:`, data.toString().substring(0, 200));
      this.handleMessage(participantId, data.toString());
    });

    // WICHTIG: Auf pong-Frames lauschen um lastPing zu aktualisieren
    ws.on('pong', () => {
      const client = this.clients.get(participantId);
      if (client) {
        client.lastPing = Date.now();
        console.log(`[Meeting WS] Pong received from ${participantId}`);
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[Meeting WS] Client disconnected: ${participantId}, code: ${code}, reason: ${reason.toString()}`);
      this.handleDisconnect(participantId);
    });

    ws.on('error', (error: Error) => {
      console.error(`[Meeting WS] Error for client ${participantId}:`, error.message);
      this.handleDisconnect(participantId);
    });
  }

  private async handleMessage(participantId: string, data: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client) return;

    this.stats.messagesReceived++;
    client.lastPing = Date.now();

    try {
      const message: MeetingWSMessage = JSON.parse(data);

      switch (message.type) {
        case 'join':
          await this.handleJoin(participantId, message.payload);
          break;
        case 'leave':
          await this.handleLeave(participantId);
          break;
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          await this.handleSignaling(participantId, message);
          break;
        case 'mute':
        case 'unmute':
        case 'video-on':
        case 'video-off':
        case 'screen-share-start':
        case 'screen-share-stop':
          await this.handleMediaStateChange(participantId, message);
          break;
        case 'chat':
          await this.handleChatMessage(participantId, message.payload?.message);
          break;
        case 'reaction':
          await this.handleReaction(participantId, message.payload?.reaction);
          break;
        case 'raise-hand':
        case 'lower-hand':
          await this.handleHandRaise(participantId, message.type === 'raise-hand');
          break;
        case 'ping':
          this.sendToClient(participantId, {
            type: 'pong',
            payload: {},
            timestamp: new Date().toISOString(),
          });
          break;
        case 'pong':
          // Application-Level Pong - aktualisiere lastPing
          console.log(`[Meeting WS] Application-level pong received from ${participantId}`);
          // lastPing wird bereits oben in handleMessage aktualisiert
          break;
        // Lobby/Wartezimmer Messages
        case 'request-join':
          await this.handleRequestJoin(participantId, message.payload);
          break;
        case 'approve-join':
          await this.handleApproveJoin(participantId, message.payload);
          break;
        case 'deny-join':
          await this.handleDenyJoin(participantId, message.payload);
          break;
        // Screen Share Permission Messages
        case 'screen-share-request':
          await this.handleScreenShareRequest(participantId);
          break;
        case 'approve-screen-share':
          await this.handleApproveScreenShare(participantId, message.payload);
          break;
        case 'deny-screen-share':
          await this.handleDenyScreenShare(participantId, message.payload);
          break;
        // Host Control Messages
        case 'host-mute-participant':
          await this.handleHostMuteParticipant(participantId, message.payload);
          break;
        case 'host-unmute-participant':
          await this.handleHostUnmuteParticipant(participantId, message.payload);
          break;
        case 'host-remove-participant':
          await this.handleHostRemoveParticipant(participantId, message.payload);
          break;
        case 'host-spotlight-participant':
          await this.handleHostSpotlight(participantId, message.payload);
          break;
        case 'host-clear-spotlight':
          await this.handleHostClearSpotlight(participantId);
          break;
        case 'end-meeting':
          await this.handleEndMeeting(participantId);
          break;
        default:
          console.warn(`[Meeting WS] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[Meeting WS] Invalid message from ${participantId}:`, error);
      this.sendToClient(participantId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleJoin(
    participantId: string,
    payload?: { roomCode?: string; userId?: string; userName?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client || !payload?.roomCode) {
      this.sendToClient(participantId, {
        type: 'error',
        payload: { message: 'Room code required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      // Prüfe ob Raum existiert und beitreten
      const result = meetingRoomService.joinRoom(
        payload.roomCode,
        participantId,
        payload.userName || 'Gast',
        payload.userId
      );

      if (!result.success) {
        this.sendToClient(participantId, {
          type: 'error',
          payload: { message: result.error || 'Failed to join room' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Client-Daten aktualisieren
      client.roomCode = payload.roomCode;
      client.userId = payload.userId || '';
      client.userName = payload.userName || 'Gast';

      // Zu Room-Clients hinzufügen
      if (!this.roomClients.has(payload.roomCode)) {
        this.roomClients.set(payload.roomCode, new Set());
      }
      this.roomClients.get(payload.roomCode)?.add(participantId);

      // Raum-Info senden
      const roomInfo = meetingRoomService.getRoomByCode(payload.roomCode);
      const participantsList = roomInfo ? meetingRoomService.getRoomParticipants(roomInfo.id) : [];
      
      this.sendToClient(participantId, {
        type: 'joined',
        payload: {
          roomCode: payload.roomCode,
          participantId,
          participants: participantsList.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.role === 'host',
            isMuted: !p.audioEnabled,
            isVideoOff: !p.videoEnabled,
            isSharingScreen: p.screenSharing,
            handRaised: p.handRaised || false,
          })),
          iceServers: this.getICEServers(),
        },
        timestamp: new Date().toISOString(),
      });

      // Anderen Teilnehmern mitteilen
      this.broadcastToRoom(payload.roomCode, {
        type: 'participant-joined',
        payload: {
          participantId,
          userId: payload.userId,
          userName: payload.userName,
        },
        timestamp: new Date().toISOString(),
      }, participantId);

      console.log(`[Meeting WS] ${payload.userName} (${participantId}) joined room ${payload.roomCode}`);
    } catch (error) {
      console.error(`[Meeting WS] Join error:`, error);
      this.sendToClient(participantId, {
        type: 'error',
        payload: { message: 'Failed to join room' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleLeave(participantId: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) return;

    const roomCode = client.roomCode;

    // Aus MeetingRoomService entfernen
    meetingRoomService.leaveRoom(roomCode, participantId);

    // Aus lokaler Room-Liste entfernen
    this.roomClients.get(roomCode)?.delete(participantId);
    if (this.roomClients.get(roomCode)?.size === 0) {
      this.roomClients.delete(roomCode);
    }

    // Anderen Teilnehmern mitteilen
    this.broadcastToRoom(roomCode, {
      type: 'participant-left',
      payload: {
        participantId,
        userName: client.userName,
      },
      timestamp: new Date().toISOString(),
    });

    client.roomCode = null;

    console.log(`[Meeting WS] ${client.userName} (${participantId}) left room ${roomCode}`);
  }

  private async handleSignaling(participantId: string, message: MeetingWSMessage): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) return;

    const targetId = message.payload?.targetParticipantId;
    if (!targetId) {
      // Broadcast an alle im Raum (für ICE candidates)
      this.broadcastToRoom(client.roomCode, {
        type: message.type,
        payload: {
          fromParticipantId: participantId,
          fromUserName: client.userName,
          ...(message.payload || {}),
        },
        timestamp: new Date().toISOString(),
      }, participantId);
    } else {
      // An spezifischen Teilnehmer senden
      this.sendToClient(targetId, {
        type: message.type,
        payload: {
          fromParticipantId: participantId,
          fromUserName: client.userName,
          ...(message.payload || {}),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleMediaStateChange(participantId: string, message: MeetingWSMessage): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) return;

    // In MeetingRoomService aktualisieren
    let updatePayload: object = {};
    
    switch (message.type) {
      case 'mute':
        meetingRoomService.updateParticipant(client.roomCode, participantId, { isMuted: true });
        updatePayload = { isMuted: true };
        break;
      case 'unmute':
        meetingRoomService.updateParticipant(client.roomCode, participantId, { isMuted: false });
        updatePayload = { isMuted: false };
        break;
      case 'video-on':
        meetingRoomService.updateParticipant(client.roomCode, participantId, { isVideoOff: false });
        updatePayload = { isVideoOff: false };
        break;
      case 'video-off':
        meetingRoomService.updateParticipant(client.roomCode, participantId, { isVideoOff: true });
        updatePayload = { isVideoOff: true };
        break;
      case 'screen-share-start':
        meetingRoomService.updateParticipant(client.roomCode, participantId, { isSharingScreen: true });
        updatePayload = { isSharingScreen: true };
        break;
      case 'screen-share-stop':
        meetingRoomService.updateParticipant(client.roomCode, participantId, { isSharingScreen: false });
        updatePayload = { isSharingScreen: false };
        break;
    }

    // Allen im Raum mitteilen
    this.broadcastToRoom(client.roomCode, {
      type: 'participant-media-update',
      payload: {
        participantId,
        ...updatePayload,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleChatMessage(participantId: string, message?: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !message) return;

    this.broadcastToRoom(client.roomCode, {
      type: 'chat-message',
      payload: {
        participantId,
        userName: client.userName,
        message,
        messageId: crypto.randomUUID(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleReaction(participantId: string, reaction?: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !reaction) return;

    this.broadcastToRoom(client.roomCode, {
      type: 'reaction',
      payload: {
        participantId,
        userName: client.userName,
        reaction,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleHandRaise(participantId: string, raised: boolean): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) return;

    meetingRoomService.updateParticipant(client.roomCode, participantId, { handRaised: raised });

    this.broadcastToRoom(client.roomCode, {
      type: raised ? 'hand-raised' : 'hand-lowered',
      payload: {
        participantId,
        userName: client.userName,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Lobby/Wartezimmer Handlers ====================

  /**
   * Gast möchte einem Meeting beitreten - benachrichtigt den Host
   */
  private async handleRequestJoin(
    participantId: string,
    payload?: { roomCode?: string; userId?: string; userName?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client || !payload?.roomCode) {
      this.sendToClient(participantId, {
        type: 'error',
        payload: { message: 'Room code required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Client-Daten speichern (noch nicht im Raum)
    client.userName = payload.userName || 'Gast';
    client.userId = payload.userId || '';

    // Finde den Host des Raums
    const roomInfo = meetingRoomService.getRoomByCode(payload.roomCode);
    if (!roomInfo) {
      this.sendToClient(participantId, {
        type: 'join-denied',
        payload: { message: 'Meeting nicht gefunden' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Finde den Host (erstes Participant mit role=host oder creator)
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const hostParticipant = participants.find(p => p.role === 'host');
    
    if (!hostParticipant) {
      // Kein Host im Raum - automatisch beitreten lassen
      console.log(`[Meeting WS] No host in room ${payload.roomCode}, auto-approving ${payload.userName}`);
      this.sendToClient(participantId, {
        type: 'join-approved',
        payload: { roomCode: payload.roomCode },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Finde die WebSocket-Verbindung des Hosts
    const hostClient = this.findClientByParticipantId(hostParticipant.id);
    if (!hostClient) {
      console.log(`[Meeting WS] Host ${hostParticipant.id} not connected, auto-approving ${payload.userName}`);
      this.sendToClient(participantId, {
        type: 'join-approved',
        payload: { roomCode: payload.roomCode },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Benachrichtige den Host über die Beitrittsanfrage
    this.sendToClient(hostParticipant.id, {
      type: 'join-request',
      payload: {
        participantId,
        userName: payload.userName,
        userId: payload.userId,
        roomCode: payload.roomCode,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Join request from ${payload.userName} (${participantId}) for room ${payload.roomCode}, notified host ${hostParticipant.id}`);
  }

  /**
   * Host genehmigt einen Beitritt
   */
  private async handleApproveJoin(
    participantId: string,
    payload?: { roomCode?: string; requestingParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.requestingParticipantId) {
      console.log(`[Meeting WS] handleApproveJoin: Invalid request - no roomCode or requestingParticipantId`);
      return;
    }

    // Prüfe ob der Sender der Host ist
    const roomInfo = meetingRoomService.getRoomByCode(client.roomCode);
    if (!roomInfo) return;
    
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const senderParticipant = participants.find(p => p.id === participantId);
    
    if (senderParticipant?.role !== 'host') {
      console.log(`[Meeting WS] handleApproveJoin: ${participantId} is not the host`);
      return;
    }

    // Sende Genehmigung an den wartenden Teilnehmer
    this.sendToClient(payload.requestingParticipantId, {
      type: 'join-approved',
      payload: { roomCode: client.roomCode },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} approved join request from ${payload.requestingParticipantId}`);
  }

  /**
   * Host lehnt einen Beitritt ab
   */
  private async handleDenyJoin(
    participantId: string,
    payload?: { roomCode?: string; requestingParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.requestingParticipantId) {
      console.log(`[Meeting WS] handleDenyJoin: Invalid request - no roomCode or requestingParticipantId`);
      return;
    }

    // Prüfe ob der Sender der Host ist
    const roomInfo = meetingRoomService.getRoomByCode(client.roomCode);
    if (!roomInfo) return;
    
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const senderParticipant = participants.find(p => p.id === participantId);
    
    if (senderParticipant?.role !== 'host') {
      console.log(`[Meeting WS] handleDenyJoin: ${participantId} is not the host`);
      return;
    }

    // Sende Ablehnung an den wartenden Teilnehmer
    this.sendToClient(payload.requestingParticipantId, {
      type: 'join-denied',
      payload: { 
        roomCode: client.roomCode,
        message: 'Der Host hat deinen Beitritt abgelehnt.',
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} denied join request from ${payload.requestingParticipantId}`);
  }

  /**
   * Host beendet das Meeting - alle Teilnehmer werden benachrichtigt
   */
  private async handleEndMeeting(participantId: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) {
      console.log(`[Meeting WS] handleEndMeeting: No room for ${participantId}`);
      return;
    }

    const roomCode = client.roomCode;
    
    // Prüfe ob der Sender der Host ist
    const roomInfo = meetingRoomService.getRoomByCode(roomCode);
    if (!roomInfo) {
      console.log(`[Meeting WS] handleEndMeeting: Room ${roomCode} not found`);
      return;
    }
    
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const senderParticipant = participants.find(p => p.id === participantId);
    
    if (senderParticipant?.role !== 'host') {
      console.log(`[Meeting WS] handleEndMeeting: ${participantId} is not the host`);
      this.sendToClient(participantId, {
        type: 'error',
        payload: { message: 'Nur der Host kann das Meeting beenden' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Benachrichtige alle Teilnehmer dass das Meeting beendet wurde
    const clientsInRoom = this.roomClients.get(roomCode);
    if (clientsInRoom) {
      clientsInRoom.forEach((clientId) => {
        if (clientId !== participantId) {
          // Alle außer dem Host bekommen meeting-ended
          this.sendToClient(clientId, {
            type: 'meeting-ended',
            payload: { 
              roomCode,
              endedBy: client.userName,
              message: 'Der Host hat das Meeting beendet',
            },
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    // Raum beenden
    meetingRoomService.endRoom(roomInfo.id, participantId);

    // Alle Clients aus dem Raum entfernen
    this.roomClients.delete(roomCode);

    console.log(`[Meeting WS] Meeting ${roomCode} ended by host ${participantId} (${client.userName})`);
  }

  // ==================== Screen Share Permission Handlers ====================

  /**
   * Teilnehmer möchte Bildschirm teilen - benachrichtigt den Host
   */
  private async handleScreenShareRequest(participantId: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) {
      console.log(`[Meeting WS] handleScreenShareRequest: No room for ${participantId}`);
      return;
    }

    // Finde den Host des Raums
    const roomInfo = meetingRoomService.getRoomByCode(client.roomCode);
    if (!roomInfo) {
      return;
    }

    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const hostParticipant = participants.find(p => p.role === 'host');
    
    if (!hostParticipant) {
      // Kein Host - automatisch genehmigen
      this.sendToClient(participantId, {
        type: 'screen-share-approved',
        payload: {},
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Benachrichtige den Host
    this.sendToClient(hostParticipant.id, {
      type: 'screen-share-request',
      payload: {
        participantId,
        userName: client.userName,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Screen share request from ${client.userName} (${participantId}), notified host ${hostParticipant.id}`);
  }

  /**
   * Host genehmigt Bildschirmfreigabe
   */
  private async handleApproveScreenShare(
    participantId: string,
    payload?: { requestingParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.requestingParticipantId) {
      return;
    }

    // Prüfe ob der Sender der Host ist
    const roomInfo = meetingRoomService.getRoomByCode(client.roomCode);
    if (!roomInfo) return;
    
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const senderParticipant = participants.find(p => p.id === participantId);
    
    if (senderParticipant?.role !== 'host') {
      console.log(`[Meeting WS] handleApproveScreenShare: ${participantId} is not the host`);
      return;
    }

    // Sende Genehmigung
    this.sendToClient(payload.requestingParticipantId, {
      type: 'screen-share-approved',
      payload: {},
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} approved screen share from ${payload.requestingParticipantId}`);
  }

  /**
   * Host lehnt Bildschirmfreigabe ab
   */
  private async handleDenyScreenShare(
    participantId: string,
    payload?: { requestingParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.requestingParticipantId) {
      return;
    }

    // Prüfe ob der Sender der Host ist
    const roomInfo = meetingRoomService.getRoomByCode(client.roomCode);
    if (!roomInfo) return;
    
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const senderParticipant = participants.find(p => p.id === participantId);
    
    if (senderParticipant?.role !== 'host') {
      console.log(`[Meeting WS] handleDenyScreenShare: ${participantId} is not the host`);
      return;
    }

    // Sende Ablehnung
    this.sendToClient(payload.requestingParticipantId, {
      type: 'screen-share-denied',
      payload: {
        message: 'Der Host hat deine Bildschirmfreigabe-Anfrage abgelehnt.',
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} denied screen share from ${payload.requestingParticipantId}`);
  }

  // ==================== Host Control Handlers ====================

  /**
   * Hilfsfunktion: Prüft ob der Sender der Host ist
   */
  private isHostParticipant(participantId: string): boolean {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) return false;
    
    const roomInfo = meetingRoomService.getRoomByCode(client.roomCode);
    if (!roomInfo) return false;
    
    const participants = meetingRoomService.getRoomParticipants(roomInfo.id);
    const senderParticipant = participants.find(p => p.id === participantId);
    
    return senderParticipant?.role === 'host';
  }

  /**
   * Host schaltet einen Teilnehmer stumm
   */
  private async handleHostMuteParticipant(
    participantId: string,
    payload?: { targetParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.targetParticipantId) {
      return;
    }

    if (!this.isHostParticipant(participantId)) {
      console.log(`[Meeting WS] handleHostMuteParticipant: ${participantId} is not the host`);
      return;
    }

    // Benachrichtige den Ziel-Teilnehmer
    this.sendToClient(payload.targetParticipantId, {
      type: 'host-muted-you',
      payload: { message: 'Der Host hat dich stummgeschaltet.' },
      timestamp: new Date().toISOString(),
    });

    // Benachrichtige alle im Raum über die Statusänderung
    this.broadcastToRoom(client.roomCode, {
      type: 'participant-media-update',
      payload: {
        participantId: payload.targetParticipantId,
        isMuted: true,
        mutedByHost: true,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} muted ${payload.targetParticipantId}`);
  }

  /**
   * Host hebt Stummschaltung eines Teilnehmers auf
   */
  private async handleHostUnmuteParticipant(
    participantId: string,
    payload?: { targetParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.targetParticipantId) {
      return;
    }

    if (!this.isHostParticipant(participantId)) {
      console.log(`[Meeting WS] handleHostUnmuteParticipant: ${participantId} is not the host`);
      return;
    }

    // Benachrichtige den Ziel-Teilnehmer (er muss selbst unmuten)
    this.sendToClient(payload.targetParticipantId, {
      type: 'host-unmute-request',
      payload: { message: 'Der Host hat deine Stummschaltung aufgehoben. Du kannst jetzt sprechen.' },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} requested unmute for ${payload.targetParticipantId}`);
  }

  /**
   * Host entfernt einen Teilnehmer aus dem Meeting
   */
  private async handleHostRemoveParticipant(
    participantId: string,
    payload?: { targetParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.targetParticipantId) {
      return;
    }

    if (!this.isHostParticipant(participantId)) {
      console.log(`[Meeting WS] handleHostRemoveParticipant: ${participantId} is not the host`);
      return;
    }

    const roomCode = client.roomCode;

    // Benachrichtige den zu entfernenden Teilnehmer
    this.sendToClient(payload.targetParticipantId, {
      type: 'removed-by-host',
      payload: { 
        message: 'Du wurdest vom Host aus dem Meeting entfernt.',
        redirectUrl: 'https://taskilo.de',
      },
      timestamp: new Date().toISOString(),
    });

    // Schließe die WebSocket-Verbindung des Teilnehmers
    const targetClient = this.clients.get(payload.targetParticipantId);
    if (targetClient) {
      // Entferne aus Room
      this.roomClients.get(roomCode)?.delete(payload.targetParticipantId);
      
      // Schließe WebSocket nach kurzer Verzögerung (damit die Nachricht noch ankommt)
      setTimeout(() => {
        targetClient.ws.close();
      }, 500);
    }

    // Benachrichtige alle anderen im Raum
    this.broadcastToRoom(roomCode, {
      type: 'participant-left',
      payload: {
        participantId: payload.targetParticipantId,
        removedByHost: true,
      },
      timestamp: new Date().toISOString(),
    }, payload.targetParticipantId);

    console.log(`[Meeting WS] Host ${participantId} removed ${payload.targetParticipantId} from room ${roomCode}`);
  }

  /**
   * Host setzt Spotlight auf einen Teilnehmer (nur dieser wird gehört)
   */
  private async handleHostSpotlight(
    participantId: string,
    payload?: { targetParticipantId?: string }
  ): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode || !payload?.targetParticipantId) {
      return;
    }

    if (!this.isHostParticipant(participantId)) {
      console.log(`[Meeting WS] handleHostSpotlight: ${participantId} is not the host`);
      return;
    }

    // Benachrichtige alle im Raum über Spotlight
    this.broadcastToRoom(client.roomCode, {
      type: 'spotlight-changed',
      payload: {
        spotlightParticipantId: payload.targetParticipantId,
        message: 'Nur dieser Teilnehmer wird jetzt gehört.',
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} set spotlight on ${payload.targetParticipantId}`);
  }

  /**
   * Host entfernt Spotlight (alle können wieder gehört werden)
   */
  private async handleHostClearSpotlight(participantId: string): Promise<void> {
    const client = this.clients.get(participantId);
    if (!client?.roomCode) {
      return;
    }

    if (!this.isHostParticipant(participantId)) {
      console.log(`[Meeting WS] handleHostClearSpotlight: ${participantId} is not the host`);
      return;
    }

    // Benachrichtige alle im Raum
    this.broadcastToRoom(client.roomCode, {
      type: 'spotlight-changed',
      payload: {
        spotlightParticipantId: null,
        message: 'Spotlight wurde entfernt. Alle können wieder gehört werden.',
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`[Meeting WS] Host ${participantId} cleared spotlight`);
  }

  // ==================== End Host Control Handlers ====================

  /**
   * Hilfsfunktion um Client anhand participantId zu finden
   */
  private findClientByParticipantId(participantId: string): MeetingClient | undefined {
    return this.clients.get(participantId);
  }

  // ==================== End Lobby/Wartezimmer Handlers ====================

  private handleDisconnect(participantId: string): void {
    const client = this.clients.get(participantId);
    if (client?.roomCode) {
      this.handleLeave(participantId);
    }

    this.clients.delete(participantId);
    this.stats.currentConnections--;

    console.log(`[Meeting WS] Client disconnected: ${participantId}`);
  }

  private sendToClient(participantId: string, response: MeetingWSResponse): void {
    const client = this.clients.get(participantId);
    console.log(`[Meeting WS] sendToClient ${participantId}: client exists=${!!client}, readyState=${client?.ws?.readyState}, OPEN=${WebSocket.OPEN}`);
    
    if (!client) {
      console.log(`[Meeting WS] sendToClient: No client found for ${participantId}`);
      return;
    }
    
    if (client.ws.readyState !== WebSocket.OPEN) {
      console.log(`[Meeting WS] sendToClient: WebSocket not OPEN for ${participantId}, state=${client.ws.readyState}`);
      return;
    }

    try {
      const message = JSON.stringify(response);
      console.log(`[Meeting WS] Sending to ${participantId}:`, message.substring(0, 100));
      client.ws.send(message);
      this.stats.messagesSent++;
    } catch (error) {
      console.error(`[Meeting WS] Failed to send to ${participantId}:`, error);
    }
  }

  private broadcastToRoom(roomCode: string, response: MeetingWSResponse, excludeId?: string): void {
    const clientIds = this.roomClients.get(roomCode);
    if (!clientIds) return;

    for (const clientId of clientIds) {
      if (excludeId && clientId === excludeId) continue;
      this.sendToClient(clientId, response);
    }
  }

  private getICEServers(): object[] {
    // WICHTIG: STUN/TURN Server laufen auf mail.taskilo.de
    // Die DNS-Einträge stun.taskilo.de und turn.taskilo.de existieren nicht korrekt
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:mail.taskilo.de:3478' },
      {
        urls: 'turn:mail.taskilo.de:3478',
        username: 'taskilo',
        credential: process.env.TURN_SECRET || 'taskilo-turn-secret',
      },
      {
        urls: 'turn:mail.taskilo.de:3478?transport=tcp',
        username: 'taskilo',
        credential: process.env.TURN_SECRET || 'taskilo-turn-secret',
      },
      {
        urls: 'turns:mail.taskilo.de:5349',
        username: 'taskilo',
        credential: process.env.TURN_SECRET || 'taskilo-turn-secret',
      },
    ];
  }

  private pingClients(): void {
    console.log(`[Meeting WS] Pinging ${this.clients.size} clients...`);
    for (const [participantId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        console.log(`[Meeting WS] Sending application-level ping to ${participantId}`);
        // Sende Application-Level Ping (JSON) statt WebSocket Protocol Ping
        // Das wird durch Nginx zuverlässig weitergeleitet
        this.sendToClient(participantId, {
          type: 'ping',
          payload: {},
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(`[Meeting WS] Skipping ping for ${participantId}, readyState: ${client.ws.readyState}`);
      }
    }
  }

  private cleanupDisconnectedClients(): void {
    const now = Date.now();
    const timeout = 60 * 1000; // 1 Minute

    console.log(`[Meeting WS] Cleanup running, checking ${this.clients.size} clients...`);

    for (const [participantId, client] of this.clients.entries()) {
      const timeSinceLastPing = now - client.lastPing;
      console.log(`[Meeting WS] Client ${participantId}: lastPing ${timeSinceLastPing}ms ago, timeout: ${timeout}ms`);
      if (timeSinceLastPing > timeout) {
        console.log(`[Meeting WS] Removing inactive client: ${participantId}, lastPing: ${timeSinceLastPing}ms ago`);
        if (client.roomCode) {
          this.handleLeave(participantId);
        }
        client.ws.close();
        this.clients.delete(participantId);
        this.stats.currentConnections--;
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeRooms: this.roomClients.size,
      roomDetails: Array.from(this.roomClients.entries()).map(([code, clients]) => ({
        code,
        participantCount: clients.size,
      })),
    };
  }

  // Öffentliche Methode zum Senden von Server-Events
  notifyRoom(roomCode: string, type: string, payload: object): void {
    this.broadcastToRoom(roomCode, {
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  shutdown(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    for (const client of this.clients.values()) {
      client.ws.close();
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log('[Meeting WS] WebSocket server shut down');
  }
}

// Singleton
export const meetingWsService = new MeetingWebSocketService();

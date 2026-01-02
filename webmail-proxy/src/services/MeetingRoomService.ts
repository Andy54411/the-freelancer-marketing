/**
 * Taskilo Meeting Room Service - Google Meet Style
 * 
 * Meeting-Räume erstellen und verwalten wie Google Meet
 * Läuft auf Hetzner Server (webmail-proxy)
 */

import crypto from 'crypto';
import { WebSocket } from 'ws';

// ============== INTERFACES ==============

export interface MeetingRoom {
  id: string;                    // Eindeutige Room-ID
  code: string;                  // Menschenlesbarer Code (abc-defg-hij)
  name?: string;                 // Optionaler Raumname
  createdBy: string;             // User ID des Erstellers
  createdAt: Date;
  expiresAt?: Date;              // Ablaufdatum (optional)
  status: 'waiting' | 'active' | 'ended';
  type: 'instant' | 'scheduled' | 'permanent';
  
  // Teilnehmer
  participants: Map<string, MeetingParticipant>;
  maxParticipants: number;
  
  // Einstellungen
  settings: MeetingSettings;
  
  // Metadaten
  metadata?: {
    orderId?: string;            // Verknüpfter Auftrag
    companyId?: string;          // Firma
    source?: 'dashboard' | 'webmail' | 'app';
  };
}

export interface MeetingParticipant {
  id: string;
  oderId?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: 'host' | 'co-host' | 'participant';
  isHost?: boolean;
  joinedAt: Date;
  leftAt?: Date;
  status: 'connecting' | 'connected' | 'disconnected';
  
  // Media State
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  
  // WebSocket-kompatible Felder
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSharingScreen?: boolean;
  handRaised?: boolean;
  
  // WebSocket Connection (nur server-seitig)
  ws?: WebSocket;
}

export interface MeetingSettings {
  allowGuests: boolean;
  waitingRoom: boolean;
  muteOnEntry: boolean;
  videoOffOnEntry: boolean;
  allowScreenShare: boolean;
  allowRecording: boolean;
  allowChat: boolean;
  maxDurationMinutes: number;
}

export interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate' | 
        'mute' | 'unmute' | 'video-on' | 'video-off' | 
        'screen-share-start' | 'screen-share-stop' |
        'chat' | 'participant-update' | 'room-update' | 'error' | 'ping' | 'pong';
  roomId: string;
  senderId: string;
  targetId?: string;            // Für gezielte Nachrichten (offer/answer/ice)
  payload?: any;
  timestamp: number;
}

export interface CreateRoomOptions {
  name?: string;
  type?: 'instant' | 'scheduled' | 'permanent';
  maxParticipants?: number;
  expiresAt?: Date;
  settings?: Partial<MeetingSettings>;
  metadata?: MeetingRoom['metadata'];
}

// ============== DEFAULT SETTINGS ==============

const DEFAULT_SETTINGS: MeetingSettings = {
  allowGuests: false,
  waitingRoom: true,
  muteOnEntry: true,
  videoOffOnEntry: false,
  allowScreenShare: true,
  allowRecording: true,
  allowChat: true,
  maxDurationMinutes: 180, // 3 Stunden
};

// ============== MEETING ROOM SERVICE ==============

class MeetingRoomService {
  private rooms: Map<string, MeetingRoom> = new Map();
  private roomsByCode: Map<string, string> = new Map(); // code -> roomId
  private participantRooms: Map<string, string> = new Map(); // oderId -> roomId
  
  private stats = {
    totalRoomsCreated: 0,
    activeRooms: 0,
    totalParticipants: 0,
    peakConcurrentParticipants: 0,
  };

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired rooms every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRooms();
    }, 5 * 60 * 1000);
  }

  // ============== ROOM MANAGEMENT ==============

  /**
   * Neuen Meeting-Raum erstellen (wie Google Meet "Neue Besprechung")
   */
  createRoom(creatorId: string, options: CreateRoomOptions = {}): MeetingRoom {
    const roomId = this.generateRoomId();
    const roomCode = this.generateRoomCode();

    const room: MeetingRoom = {
      id: roomId,
      code: roomCode,
      name: options.name,
      createdBy: creatorId,
      createdAt: new Date(),
      expiresAt: options.expiresAt || this.getDefaultExpiry(options.type || 'instant'),
      status: 'waiting',
      type: options.type || 'instant',
      participants: new Map(),
      maxParticipants: options.maxParticipants || 10,
      settings: { ...DEFAULT_SETTINGS, ...options.settings },
      metadata: options.metadata,
    };

    this.rooms.set(roomId, room);
    this.roomsByCode.set(roomCode, roomId);
    
    this.stats.totalRoomsCreated++;
    this.stats.activeRooms++;

    console.log(`[MEETING] Room created: ${roomCode} (${roomId}) by ${creatorId}`);

    return room;
  }

  /**
   * Meeting-Raum per Code abrufen
   */
  getRoomByCode(code: string): MeetingRoom | null {
    const normalizedCode = code.toLowerCase().replace(/\s/g, '');
    const roomId = this.roomsByCode.get(normalizedCode);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  /**
   * Meeting-Raum per ID abrufen
   */
  getRoom(roomId: string): MeetingRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Meeting-URL generieren
   */
  getMeetingUrl(room: MeetingRoom): string {
    const baseUrl = process.env.MEETING_BASE_URL || 'https://meet.taskilo.de';
    return `${baseUrl}/${room.code}`;
  }

  /**
   * Raum beenden
   */
  endRoom(roomId: string, endedBy: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Alle Teilnehmer benachrichtigen
    room.participants.forEach((participant) => {
      if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
        this.sendToParticipant(participant, {
          type: 'room-update',
          roomId,
          senderId: 'system',
          payload: { action: 'ended', endedBy },
          timestamp: Date.now(),
        });
        participant.ws.close();
      }
    });

    room.status = 'ended';
    room.participants.clear();
    
    this.stats.activeRooms--;

    console.log(`[MEETING] Room ended: ${room.code} by ${endedBy}`);

    return true;
  }

  // ============== PARTICIPANT MANAGEMENT ==============

  /**
   * Teilnehmer dem Raum hinzufügen
   */
  joinRoom(
    roomCode: string, 
    participantId: string, 
    name: string, 
    userId?: string,
    options: { email?: string; avatarUrl?: string } = {}
  ): { success: boolean; error?: string; participant?: MeetingParticipant } {
    const roomId = this.roomsByCode.get(roomCode.toLowerCase()) || roomCode;
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status === 'ended') {
      return { success: false, error: 'Room has ended' };
    }

    if (room.participants.size >= room.maxParticipants) {
      return { success: false, error: 'Room is full' };
    }

    // Prüfen ob User bereits im Raum ist
    if (room.participants.has(participantId)) {
      const existing = room.participants.get(participantId)!;
      existing.status = 'connected';
      return { success: true, participant: existing };
    }

    const isHost = room.createdBy === userId;
    
    const participant: MeetingParticipant = {
      id: participantId,
      oderId: userId,
      name,
      email: options.email,
      avatarUrl: options.avatarUrl,
      role: isHost ? 'host' : 'participant',
      joinedAt: new Date(),
      status: 'connected',
      audioEnabled: !room.settings.muteOnEntry,
      videoEnabled: !room.settings.videoOffOnEntry,
      screenSharing: false,
    };

    room.participants.set(participantId, participant);
    this.participantRooms.set(participantId, roomId);

    // Raum aktivieren wenn erster Teilnehmer
    if (room.status === 'waiting') {
      room.status = 'active';
    }

    // Stats aktualisieren
    this.stats.totalParticipants++;
    const currentParticipants = this.getTotalActiveParticipants();
    if (currentParticipants > this.stats.peakConcurrentParticipants) {
      this.stats.peakConcurrentParticipants = currentParticipants;
    }

    console.log(`[MEETING] ${name} joined room ${room.code} (${room.participants.size} participants)`);

    return { success: true, participant };
  }

  /**
   * Teilnehmer aus Raum entfernen
   */
  leaveRoom(roomCode: string, participantId: string): boolean {
    const roomId = this.roomsByCode.get(roomCode.toLowerCase()) || roomCode;
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const participant = room.participants.get(participantId);
    if (!participant) return false;

    participant.leftAt = new Date();
    participant.status = 'disconnected';
    room.participants.delete(participantId);
    this.participantRooms.delete(participantId);

    console.log(`[MEETING] ${participant.name} left room ${room.code}`);

    // Raum beenden wenn leer
    if (room.participants.size === 0 && room.type === 'instant') {
      this.endRoom(roomId, 'system');
    }

    return true;
  }

  /**
   * Alle Teilnehmer eines Raums abrufen
   */
  getRoomParticipants(roomId: string): MeetingParticipant[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    return Array.from(room.participants.values())
      .map(p => this.sanitizeParticipant(p));
  }

  /**
   * Teilnehmer-Status aktualisieren
   */
  updateParticipant(
    roomCode: string, 
    participantId: string, 
    updates: Partial<Pick<MeetingParticipant, 'isMuted' | 'isVideoOff' | 'isSharingScreen' | 'handRaised' | 'audioEnabled' | 'videoEnabled' | 'screenSharing'>>
  ): boolean {
    const roomId = this.roomsByCode.get(roomCode.toLowerCase()) || roomCode;
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const participant = room.participants.get(participantId);
    if (!participant) return false;

    // Mapping der WebSocket-Felder auf interne Felder
    if ('isMuted' in updates) {
      participant.audioEnabled = !updates.isMuted;
    }
    if ('isVideoOff' in updates) {
      participant.videoEnabled = !updates.isVideoOff;
    }
    if ('isSharingScreen' in updates) {
      participant.screenSharing = updates.isSharingScreen ?? false;
    }
    if ('audioEnabled' in updates) {
      participant.audioEnabled = updates.audioEnabled ?? true;
    }
    if ('videoEnabled' in updates) {
      participant.videoEnabled = updates.videoEnabled ?? true;
    }
    if ('screenSharing' in updates) {
      participant.screenSharing = updates.screenSharing ?? false;
    }

    return true;
  }

  // ============== SIGNALING ==============

  /**
   * Signaling-Nachricht verarbeiten
   */
  handleSignalingMessage(oderId: string, message: SignalingMessage): void {
    const roomId = this.participantRooms.get(oderId);
    if (!roomId) {
      console.warn(`[MEETING] Signaling from unknown user: ${oderId}`);
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) return;

    const sender = room.participants.get(oderId);
    if (!sender) return;

    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // WebRTC Signaling - an Ziel-Teilnehmer weiterleiten
        if (message.targetId) {
          const target = room.participants.get(message.targetId);
          if (target) {
            this.sendToParticipant(target, {
              ...message,
              senderId: oderId,
              timestamp: Date.now(),
            });
          }
        }
        break;

      case 'mute':
      case 'unmute':
        sender.audioEnabled = message.type === 'unmute';
        this.broadcastParticipantUpdate(room, sender);
        break;

      case 'video-on':
      case 'video-off':
        sender.videoEnabled = message.type === 'video-on';
        this.broadcastParticipantUpdate(room, sender);
        break;

      case 'screen-share-start':
      case 'screen-share-stop':
        sender.screenSharing = message.type === 'screen-share-start';
        this.broadcastParticipantUpdate(room, sender);
        break;

      case 'chat':
        // Chat-Nachricht an alle broadcasten
        this.broadcastToRoom(room, {
          type: 'chat',
          roomId,
          senderId: oderId,
          payload: {
            senderName: sender.name,
            message: message.payload?.message,
          },
          timestamp: Date.now(),
        });
        break;

      case 'ping':
        if (sender.ws && sender.ws.readyState === WebSocket.OPEN) {
          this.sendToParticipant(sender, {
            type: 'pong',
            roomId,
            senderId: 'system',
            timestamp: Date.now(),
          });
        }
        break;
    }
  }

  // ============== BROADCASTING ==============

  private broadcastToRoom(
    room: MeetingRoom, 
    message: SignalingMessage, 
    excludeUserId?: string
  ): void {
    room.participants.forEach((participant, oderId) => {
      if (oderId !== excludeUserId && participant.ws && participant.ws.readyState === WebSocket.OPEN) {
        this.sendToParticipant(participant, message);
      }
    });
  }

  private broadcastParticipantUpdate(room: MeetingRoom, participant: MeetingParticipant): void {
    this.broadcastToRoom(room, {
      type: 'participant-update',
      roomId: room.id,
      senderId: 'system',
      payload: {
        action: 'updated',
        participant: this.sanitizeParticipant(participant),
      },
      timestamp: Date.now(),
    });
  }

  private sendToParticipant(participant: MeetingParticipant, message: SignalingMessage): void {
    if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
      try {
        participant.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[MEETING] Failed to send to ${participant.name}:`, error);
      }
    }
  }

  // ============== HELPERS ==============

  private generateRoomId(): string {
    return crypto.randomUUID();
  }

  /**
   * Google Meet-Style Code generieren (abc-defg-hij)
   */
  private generateRoomCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const part = (len: number) => 
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    
    let code: string;
    do {
      code = `${part(3)}-${part(4)}-${part(3)}`;
    } while (this.roomsByCode.has(code));
    
    return code;
  }

  private getDefaultExpiry(type: 'instant' | 'scheduled' | 'permanent'): Date | undefined {
    const now = new Date();
    switch (type) {
      case 'instant':
        // 24 Stunden
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'scheduled':
        // 7 Tage
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'permanent':
        return undefined; // Kein Ablauf
    }
  }

  private sanitizeParticipant(participant: MeetingParticipant): Omit<MeetingParticipant, 'ws'> {
    const { ws, ...safe } = participant;
    return safe;
  }

  private getTotalActiveParticipants(): number {
    let count = 0;
    this.rooms.forEach(room => {
      count += room.participants.size;
    });
    return count;
  }

  private cleanupExpiredRooms(): void {
    const now = new Date();
    
    this.rooms.forEach((room, roomId) => {
      if (room.expiresAt && room.expiresAt < now) {
        this.endRoom(roomId, 'system');
        this.rooms.delete(roomId);
        this.roomsByCode.delete(room.code);
        console.log(`[MEETING] Expired room cleaned up: ${room.code}`);
      }
    });
  }

  // ============== STATS ==============

  getStats() {
    return {
      ...this.stats,
      currentActiveParticipants: this.getTotalActiveParticipants(),
      roomsBreakdown: {
        waiting: Array.from(this.rooms.values()).filter(r => r.status === 'waiting').length,
        active: Array.from(this.rooms.values()).filter(r => r.status === 'active').length,
      },
    };
  }

  // ============== CLEANUP ==============

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Alle Räume beenden
    this.rooms.forEach((room, roomId) => {
      this.endRoom(roomId, 'system');
    });

    this.rooms.clear();
    this.roomsByCode.clear();
    this.participantRooms.clear();
  }
}

// Singleton Export
export const meetingRoomService = new MeetingRoomService();
export default MeetingRoomService;

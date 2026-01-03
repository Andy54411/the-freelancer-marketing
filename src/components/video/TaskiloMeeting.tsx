'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  MessageSquare,
  Monitor,
  MonitorOff,
  Settings,
  Copy,
  Check,
  Loader2,
  X,
  Send,
  Mail,
  CheckCircle,
  XCircle,
  UserX,
  Volume2,
  VolumeX,
  Star,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// ============== CHAT INTERFACE ==============

export interface ChatMessage {
  id: string;
  participantId: string;
  userName: string;
  message: string;
  timestamp: string;
  isOwn?: boolean;
}

// ============== SCREEN SHARE REQUEST ==============

export interface ScreenShareRequest {
  participantId: string;
  userName: string;
  timestamp: number;
}

// ============== INTERFACES ==============

export interface MeetingParticipant {
  id: string;
  oderId: string;
  name: string;
  avatarUrl?: string;
  role: 'host' | 'co-host' | 'participant';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  status: 'connecting' | 'connected' | 'disconnected';
}

export interface MeetingRoom {
  id: string;
  code: string;
  name?: string;
  url: string;
  status: 'waiting' | 'active' | 'ended';
  participants: MeetingParticipant[];
  participantCount: number;
  createdBy?: string;
}

export interface JoinRequest {
  participantId: string;
  userName: string;
  userId?: string;
  timestamp: number;
}

export interface TaskiloMeetingProps {
  // Meeting-Daten
  roomCode?: string;              // Für Beitritt
  orderId?: string;               // Optional: Verknüpfter Auftrag
  companyId?: string;             // Optional: Firma
  source?: 'dashboard' | 'webmail' | 'app';
  
  // User-Daten
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatarUrl?: string;
  
  // Host/Lobby-bezogen
  isHost?: boolean;               // Ist dieser User der Host des Meetings?
  
  // Callbacks
  onMeetingCreated?: (room: MeetingRoom) => void;
  onMeetingJoined?: (room: MeetingRoom) => void;
  onMeetingEnded?: () => void;
  onError?: (error: string) => void;
  onJoinRequest?: (request: JoinRequest) => void;  // Callback wenn jemand beitreten möchte
  
  // Ref für externe Steuerung (Approve/Deny)
  meetingRef?: React.MutableRefObject<TaskiloMeetingHandle | null>;
  
  // UI-Optionen
  showParticipants?: boolean;
  showChat?: boolean;
  allowScreenShare?: boolean;
  autoJoin?: boolean;
  className?: string;
}

// Handle für imperative Kontrolle von außen
export interface TaskiloMeetingHandle {
  approveJoinRequest: (participantId: string) => void;
  denyJoinRequest: (participantId: string) => void;
}

type MeetingState = 'idle' | 'creating' | 'joining' | 'in-meeting' | 'ended' | 'error';

// ============== COMPONENT ==============

export const TaskiloMeeting: React.FC<TaskiloMeetingProps> = ({
  roomCode,
  orderId,
  companyId,
  source = 'dashboard',
  userId,
  userName,
  userEmail,
  userAvatarUrl,
  isHost = false,
  onMeetingCreated,
  onMeetingJoined,
  onMeetingEnded,
  onError,
  onJoinRequest,
  meetingRef,
  showParticipants = true,
  showChat = true,
  allowScreenShare = true,
  autoJoin = false,
  className,
}) => {
  // ============== STATE ==============
  
  const [meetingState, setMeetingState] = useState<MeetingState>('idle');
  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Media State
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  
  // UI State
  const [showParticipantPanel, setShowParticipantPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Screen Share Request State (nur für Host)
  const [screenShareRequests, setScreenShareRequests] = useState<ScreenShareRequest[]>([]);
  const [isScreenShareApproved, setIsScreenShareApproved] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Host Control State
  const [spotlightParticipantId, setSpotlightParticipantId] = useState<string | null>(null);
  const [mutedByHost, setMutedByHost] = useState(false);
  
  // Mail Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  
  // WebRTC State
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Strict Mode / Double-mount protection refs
  const isMountedRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRef = useRef(false);
  const myParticipantIdRef = useRef<string | null>(null);
  
  // API Base URL
  const API_BASE = process.env.NEXT_PUBLIC_MEETING_API_URL || 'https://mail.taskilo.de/api/meeting';
  const API_KEY = process.env.NEXT_PUBLIC_WEBMAIL_API_KEY || '';

  // ============== SIGNALING HANDLER (must be defined first) ==============

  const handleSignalingMessage = useCallback(async (message: { type: string; payload: Record<string, unknown> }) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    switch (message.type) {
      case 'connected':
        myParticipantIdRef.current = message.payload.participantId as string;
        break;

      case 'joined': {
        // Speichere eigene participantId falls noch nicht gesetzt
        const joinedParticipantId = message.payload.participantId as string;
        if (!myParticipantIdRef.current) {
          myParticipantIdRef.current = joinedParticipantId;
        }
        // Filtere den eigenen Teilnehmer aus der Liste
        const otherParticipants = (message.payload.participants as MeetingParticipant[])
          .filter(p => p.id !== myParticipantIdRef.current);
        setParticipants(otherParticipants);
        if (message.payload.iceServers) {
          setIceServers(message.payload.iceServers as RTCIceServer[]);
        }
        
        // WICHTIG: Der neu beitretende Client sendet KEINE Offers!
        // Der existierende Teilnehmer (der das `participant-joined` Event bekommt) 
        // ist verantwortlich für das Erstellen des Offers.
        // Der neu beitretende Client wartet einfach auf eingehende Offers.
        break;
      }

      case 'offer':
        if (message.payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload.sdp as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          wsRef.current?.send(JSON.stringify({
            type: 'answer',
            payload: { 
              sdp: answer,
              targetParticipantId: message.payload.fromParticipantId,
            },
          }));
        }
        break;

      case 'answer':
        if (message.payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.payload.sdp as RTCSessionDescriptionInit));
        }
        break;

      case 'ice-candidate':
        if (message.payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(message.payload.candidate as RTCIceCandidateInit));
        }
        break;

      case 'participant-joined': {
        setParticipants(prev => [...prev, {
          id: message.payload.participantId as string,
          oderId: message.payload.oderId as string || '',
          name: message.payload.userName as string,
          role: 'participant',
          audioEnabled: true,
          videoEnabled: true,
          screenSharing: false,
          status: 'connected',
        }]);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        wsRef.current?.send(JSON.stringify({
          type: 'offer',
          payload: { 
            sdp: offer,
            targetParticipantId: message.payload.participantId,
          },
        }));
        break;
      }

      case 'participant-left':
        setParticipants(prev => prev.filter(p => p.id !== message.payload.participantId));
        break;

      case 'participant-media-update':
        setParticipants(prev => 
          prev.map(p => {
            if (p.id === message.payload.participantId) {
              return {
                ...p,
                audioEnabled: message.payload.isMuted !== undefined ? !(message.payload.isMuted) : p.audioEnabled,
                videoEnabled: message.payload.isVideoOff !== undefined ? !(message.payload.isVideoOff) : p.videoEnabled,
                screenSharing: message.payload.isSharingScreen as boolean ?? p.screenSharing,
              };
            }
            return p;
          })
        );
        break;

      case 'error':
        setError(message.payload.message as string);
        break;

      case 'ping':
        // Server-seitiger Ping - antworte mit Pong um Connection am Leben zu halten
        wsRef.current?.send(JSON.stringify({
          type: 'pong',
          payload: {},
        }));
        break;

      case 'pong':
        // Server hat auf unseren Ping geantwortet (falls wir jemals client-seitig pingen)
        break;

      // ============== CHAT HANDLING ==============
      case 'chat-message': {
        const newMessage: ChatMessage = {
          id: message.payload.messageId as string,
          participantId: message.payload.participantId as string,
          userName: message.payload.userName as string,
          message: message.payload.message as string,
          timestamp: message.timestamp as string || new Date().toISOString(),
          isOwn: message.payload.participantId === myParticipantIdRef.current,
        };
        setChatMessages(prev => [...prev, newMessage]);
        // Unread-Counter erhöhen wenn Chat nicht offen ist
        if (!showChatPanel) {
          setUnreadMessages(prev => prev + 1);
        }
        // Auto-scroll zum Ende
        setTimeout(() => {
          chatContainerRef.current?.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
        break;
      }

      // ============== SCREEN SHARE PERMISSION HANDLING ==============
      case 'screen-share-request':
        // Host bekommt Anfrage zum Bildschirm-Teilen
        if (isHost) {
          setScreenShareRequests(prev => [...prev, {
            participantId: message.payload.participantId as string,
            userName: message.payload.userName as string,
            timestamp: Date.now(),
          }]);
        }
        break;

      case 'screen-share-approved':
        // Teilnehmer bekommt Genehmigung
        setIsScreenShareApproved(true);
        break;

      case 'screen-share-denied':
        // Teilnehmer bekommt Ablehnung
        setIsScreenShareApproved(false);
        setError('Der Host hat deine Bildschirmfreigabe-Anfrage abgelehnt.');
        break;

      // ============== HOST CONTROL HANDLING ==============
      case 'host-muted-you':
        // Host hat mich stummgeschaltet
        setMutedByHost(true);
        setAudioEnabled(false);
        if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = false;
          }
        }
        break;

      case 'host-unmute-request':
        // Host erlaubt mir wieder zu sprechen
        setMutedByHost(false);
        break;

      case 'removed-by-host':
        // Ich wurde vom Host entfernt
        setMeetingState('ended');
        setRoom(null);
        setParticipants([]);
        onMeetingEnded?.();
        if (typeof window !== 'undefined') {
          window.location.href = message.payload.redirectUrl as string || 'https://taskilo.de';
        }
        break;

      case 'spotlight-changed':
        // Spotlight wurde geändert
        setSpotlightParticipantId(message.payload.spotlightParticipantId as string | null);
        break;

      // ============== LOBBY/JOIN REQUEST HANDLING ==============
      case 'join-request':
        // Jemand möchte dem Meeting beitreten - nur relevant für den Host
        if (onJoinRequest) {
          onJoinRequest({
            participantId: message.payload.participantId as string,
            userName: message.payload.userName as string,
            userId: message.payload.userId as string | undefined,
            timestamp: Date.now(),
          });
        }
        break;

      case 'meeting-ended':
        // Host hat das Meeting beendet - Gäste zur Startseite weiterleiten
        setMeetingState('ended');
        setRoom(null);
        setParticipants([]);
        onMeetingEnded?.();
        // Gäste werden zur Taskilo Startseite weitergeleitet
        if (typeof window !== 'undefined') {
          window.location.href = 'https://taskilo.de';
        }
        break;
    }
  }, [onJoinRequest, onMeetingEnded]);

  // ============== INTERNAL JOIN (uses handleSignalingMessage) ==============

  // Ref um den aktuellen Join-Vorgang zu tracken (für Abbruch bei Strict Mode)
  const joinAbortControllerRef = useRef<AbortController | null>(null);
  const isJoiningRef = useRef(false);

  const joinMeetingInternal = useCallback(async (
    code: string, 
    servers: RTCIceServer[], 
    websocketUrl?: string
  ) => {

    // Verhindere doppelte Verbindungen
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        return;
      }
    }

    // Verhindere parallele Join-Versuche
    if (isJoiningRef.current) {
      return;
    }

    isJoiningRef.current = true;

    // Abbrechen eines vorherigen Join-Vorgangs
    if (joinAbortControllerRef.current) {
      joinAbortControllerRef.current.abort();
    }
    joinAbortControllerRef.current = new AbortController();
    const signal = joinAbortControllerRef.current.signal;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });

      // Check ob aborted während getUserMedia
      if (signal.aborted) {
        stream.getTracks().forEach(track => track.stop());
        isJoiningRef.current = false;
        return;
      }
      
      localStreamRef.current = stream;
      
      // Setze lokales Video - wir versuchen es direkt und auch nach einem Frame
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      } else {
      }

      const wsEndpoint = websocketUrl || wsUrl || 'wss://mail.taskilo.de/ws/meeting';
      
      const ws = new WebSocket(wsEndpoint);
      wsRef.current = ws;

      // Heartbeat-Intervall für Application-Level Pings
      let pingIntervalId: NodeJS.Timeout | null = null;

      ws.onopen = () => {
        if (signal.aborted) {
          ws.close();
          return;
        }
        ws.send(JSON.stringify({
          type: 'join',
          payload: {
            roomCode: code,
            userId,
            userName,
          },
        }));
        
        // Starte Heartbeat - sende alle 15 Sekunden einen Ping
        pingIntervalId = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (signal.aborted) return;
        handleSignalingMessage(JSON.parse(event.data));
      };

      ws.onerror = (wsError) => {
        isJoiningRef.current = false;
        if (pingIntervalId) clearInterval(pingIntervalId);
      };

      ws.onclose = (closeEvent) => {
        isJoiningRef.current = false;
        if (pingIntervalId) clearInterval(pingIntervalId);
      };

      // Check ob aborted während WebSocket-Setup
      if (signal.aborted) {
        ws.close();
        isJoiningRef.current = false;
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: servers });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            payload: { candidate: event.candidate },
          }));
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // WICHTIG: onnegotiationneeded wird ausgelöst wenn Tracks hinzugefügt werden
      // Bei Multi-Peer würde man hier für jeden Peer ein Offer erstellen
      // Für jetzt: Wir erstellen das Offer wenn ein neuer Teilnehmer beitritt (participant-joined)
      pc.onnegotiationneeded = async () => {
        // Wir handlen das im participant-joined Event stattdessen
        // um zu wissen, an wen wir das Offer senden sollen
      };

      pc.onconnectionstatechange = () => {
      };

      pc.oniceconnectionstatechange = () => {
      };

      setMeetingState('in-meeting');
      
    } catch (err) {
      isJoiningRef.current = false;
      const message = err instanceof Error ? err.message : 'Failed to setup media';
      setError(message);
      setMeetingState('error');
      onError?.(message);
    }
  }, [userId, userName, videoEnabled, audioEnabled, wsUrl, handleSignalingMessage, onError]);

  // ============== API CALLS ==============

  const createMeeting = useCallback(async () => {
    setMeetingState('creating');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId,
          name: orderId ? `Auftrag ${orderId.slice(-6).toUpperCase()}` : undefined,
          type: 'instant',
          metadata: { orderId, companyId, source },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create meeting');
      }

      setRoom(data.room);
      setIceServers(data.iceServers);
      onMeetingCreated?.(data.room);

      // Auto-join nach Erstellung
      await joinMeetingInternal(data.room.code, data.iceServers);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create meeting';
      setError(message);
      setMeetingState('error');
      onError?.(message);
    }
  }, [userId, orderId, companyId, source, API_BASE, API_KEY, joinMeetingInternal, onMeetingCreated, onError]);

  const joinMeeting = useCallback(async (code: string) => {
    setMeetingState('joining');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${code}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId,
          name: userName,
          email: userEmail,
          avatarUrl: userAvatarUrl,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to join meeting');
      }

      setRoom(data.room);
      setParticipants(data.room.participants);
      setIceServers(data.connection.iceServers);
      setWsUrl(data.connection.wsUrl);
      
      await joinMeetingInternal(code, data.connection.iceServers, data.connection.wsUrl);
      
      onMeetingJoined?.(data.room);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join meeting';
      setError(message);
      setMeetingState('error');
      onError?.(message);
    }
  }, [userId, userName, userEmail, userAvatarUrl, API_BASE, API_KEY, joinMeetingInternal, onMeetingJoined, onError]);

  const endMeeting = useCallback(() => {
    // Sende end-meeting an Server (nur Host kann Meeting beenden)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end-meeting',
        payload: {},
      }));
    }

    // Cleanup WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Cleanup PeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Cleanup local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setMeetingState('ended');
    setRoom(null);
    setParticipants([]);
    onMeetingEnded?.();
  }, [onMeetingEnded]);

  // ============== LOBBY/JOIN REQUEST CONTROLS ==============

  /**
   * Host genehmigt einen Beitritt
   */
  const approveJoinRequest = useCallback((participantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'approve-join',
      payload: {
        requestingParticipantId: participantId,
      },
    }));
  }, []);

  /**
   * Host lehnt einen Beitritt ab
   */
  const denyJoinRequest = useCallback((participantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'deny-join',
      payload: {
        requestingParticipantId: participantId,
      },
    }));
  }, []);

  // Expose approve/deny functions via ref
  useEffect(() => {
    if (meetingRef) {
      meetingRef.current = {
        approveJoinRequest,
        denyJoinRequest,
      };
    }
    return () => {
      if (meetingRef) {
        meetingRef.current = null;
      }
    };
  }, [meetingRef, approveJoinRequest, denyJoinRequest]);

  // ============== MEDIA CONTROLS ==============

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        
        wsRef.current?.send(JSON.stringify({
          type: audioTrack.enabled ? 'unmute' : 'mute',
        }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
        
        wsRef.current?.send(JSON.stringify({
          type: videoTrack.enabled ? 'video-on' : 'video-off',
        }));
      }
    }
  }, []);

  const copyMeetingLink = useCallback(() => {
    if (room?.url) {
      navigator.clipboard.writeText(room.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [room]);

  // ============== CHAT FUNCTIONS ==============

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      payload: {
        message: chatInput.trim(),
      },
    }));
    
    setChatInput('');
  }, [chatInput]);

  const handleChatKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }, [sendChatMessage]);

  // Reset unread counter when chat panel opens
  useEffect(() => {
    if (showChatPanel) {
      setUnreadMessages(0);
    }
  }, [showChatPanel]);

  // ============== SCREEN SHARE FUNCTIONS ==============

  const requestScreenShare = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Host braucht keine Genehmigung
    if (isHost) {
      setIsScreenShareApproved(true);
      startScreenShare();
      return;
    }
    
    // Teilnehmer fragen Host um Erlaubnis
    wsRef.current.send(JSON.stringify({
      type: 'screen-share-request',
      payload: {},
    }));
  }, [isHost]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      screenStreamRef.current = screenStream;
      setScreenSharing(true);
      
      // Ersetze Video-Track in PeerConnection
      const videoTrack = screenStream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;
      
      if (pc && videoTrack) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }
      
      // Benachrichtige andere Teilnehmer
      wsRef.current?.send(JSON.stringify({
        type: 'screen-share-start',
        payload: {},
      }));
      
      // Wenn Screen-Share beendet wird (User klickt "Stop sharing")
      videoTrack.onended = () => {
        // Inline stop logic statt stopScreenShare aufrufen (Closure-Problem vermeiden)
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        
        // Zurück zur Kamera
        if (localStreamRef.current && peerConnectionRef.current) {
          const cameraTrack = localStreamRef.current.getVideoTracks()[0];
          if (cameraTrack) {
            const senderToReplace = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (senderToReplace) {
              senderToReplace.replaceTrack(cameraTrack);
            }
          }
        }
        
        setScreenSharing(false);
        setIsScreenShareApproved(false);
        
        // Benachrichtige andere Teilnehmer
        wsRef.current?.send(JSON.stringify({
          type: 'screen-share-stop',
          payload: {},
        }));
      };
      
    } catch (err) {
      // User hat abgebrochen oder Fehler - KEIN Error-State setzen bei Abbruch
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        setError('Bildschirmfreigabe konnte nicht gestartet werden.');
      }
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    // Screen-Stream stoppen
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    // Zurück zur Kamera
    if (localStreamRef.current && peerConnectionRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(cameraTrack);
        }
      }
    }
    
    setScreenSharing(false);
    setIsScreenShareApproved(false);
    
    // Benachrichtige andere Teilnehmer
    wsRef.current?.send(JSON.stringify({
      type: 'screen-share-stop',
      payload: {},
    }));
  }, []);

  const toggleScreenShare = useCallback(() => {
    if (screenSharing) {
      stopScreenShare();
    } else if (isHost || isScreenShareApproved) {
      startScreenShare();
    } else {
      requestScreenShare();
    }
  }, [screenSharing, isHost, isScreenShareApproved, startScreenShare, stopScreenShare, requestScreenShare]);

  // Host genehmigt Screen-Share-Anfrage
  const approveScreenShare = useCallback((participantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'approve-screen-share',
      payload: {
        requestingParticipantId: participantId,
      },
    }));
    
    // Aus der Liste entfernen
    setScreenShareRequests(prev => prev.filter(r => r.participantId !== participantId));
  }, []);

  // Host lehnt Screen-Share-Anfrage ab
  const denyScreenShare = useCallback((participantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'deny-screen-share',
      payload: {
        requestingParticipantId: participantId,
      },
    }));
    
    // Aus der Liste entfernen
    setScreenShareRequests(prev => prev.filter(r => r.participantId !== participantId));
  }, []);

  // ============== HOST CONTROL FUNCTIONS ==============

  // Host schaltet einen Teilnehmer stumm
  const hostMuteParticipant = useCallback((targetParticipantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isHost) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'host-mute-participant',
      payload: { targetParticipantId },
    }));
    
    // Lokalen State aktualisieren
    setParticipants(prev => prev.map(p => 
      p.id === targetParticipantId ? { ...p, audioEnabled: false } : p
    ));
  }, [isHost]);

  // Host hebt Stummschaltung auf
  const hostUnmuteParticipant = useCallback((targetParticipantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isHost) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'host-unmute-participant',
      payload: { targetParticipantId },
    }));
  }, [isHost]);

  // Host entfernt einen Teilnehmer
  const hostRemoveParticipant = useCallback((targetParticipantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isHost) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'host-remove-participant',
      payload: { targetParticipantId },
    }));
    
    // Lokalen State aktualisieren
    setParticipants(prev => prev.filter(p => p.id !== targetParticipantId));
  }, [isHost]);

  // Host setzt Spotlight auf einen Teilnehmer
  const hostSetSpotlight = useCallback((targetParticipantId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isHost) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'host-spotlight-participant',
      payload: { targetParticipantId },
    }));
    
    setSpotlightParticipantId(targetParticipantId);
  }, [isHost]);

  // Host entfernt Spotlight
  const hostClearSpotlight = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isHost) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'host-clear-spotlight',
      payload: {},
    }));
    
    setSpotlightParticipantId(null);
  }, [isHost]);

  // ============== MAIL INVITE FUNCTIONS ==============

  const sendMailInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !room?.url) {
      return;
    }
    
    setInviteSending(true);
    setInviteSuccess(null);
    
    try {
      const response = await fetch('/api/webmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: inviteEmail.trim(),
          subject: `Einladung zum Taskilo Meeting: ${room.name || room.code}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0d9488;">Einladung zum Taskilo Meeting</h2>
              <p>Hallo,</p>
              <p><strong>${userName}</strong> lädt Sie zu einem Video-Meeting ein.</p>
              <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Meeting:</strong> ${room.name || `Meeting ${room.code}`}</p>
                <p style="margin: 0;"><strong>Meeting-Code:</strong> ${room.code}</p>
              </div>
              <a href="${room.url}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Jetzt beitreten</a>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">Oder kopieren Sie diesen Link: <a href="${room.url}">${room.url}</a></p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #999; font-size: 12px;">Diese Einladung wurde über Taskilo verschickt.</p>
            </div>
          `,
          text: `${userName} lädt Sie zu einem Taskilo Meeting ein.\n\nMeeting: ${room.name || room.code}\nMeeting-Code: ${room.code}\n\nJetzt beitreten: ${room.url}`,
          fromName: userName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Einladung konnte nicht gesendet werden');
      }
      
      setInviteSuccess(`Einladung an ${inviteEmail} gesendet`);
      setInviteEmail('');
      setTimeout(() => setInviteSuccess(null), 3000);
      
    } catch (err) {
      setError('E-Mail-Einladung konnte nicht gesendet werden.');
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, room, userName]);

  // ============== EFFECTS ==============

  // Session Storage Key für Meeting-Persistenz
  const SESSION_STORAGE_KEY = 'taskilo_active_meeting';

  // Speichere aktives Meeting in Session Storage
  useEffect(() => {
    if (room && meetingState === 'in-meeting') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        roomCode: room.code,
        roomId: room.id,
        roomName: room.name,
        roomUrl: room.url,
        isHost,
        timestamp: Date.now(),
      }));
    }
  }, [room, meetingState, isHost]);

  // Bei Page Load: Prüfe ob aktives Meeting wiederhergestellt werden soll
  useEffect(() => {
    const savedMeeting = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedMeeting && meetingState === 'idle' && !hasJoinedRef.current) {
      try {
        const meetingData = JSON.parse(savedMeeting);
        // Nur wiederherstellen wenn nicht älter als 2 Stunden
        if (Date.now() - meetingData.timestamp < 2 * 60 * 60 * 1000) {
          hasJoinedRef.current = true;
          joinMeeting(meetingData.roomCode);
        } else {
          // Altes Meeting entfernen
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, [meetingState, joinMeeting]);

  // Bei Meeting-Ende: Session Storage löschen
  useEffect(() => {
    if (meetingState === 'ended') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [meetingState]);

  // Auto-join effect - nur einmal ausführen
  useEffect(() => {
    if (autoJoin && roomCode && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinMeeting(roomCode);
    }
  }, [autoJoin, roomCode, joinMeeting]);

  // Setze lokales Video wenn Stream vorhanden und ref bereit
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  });

  // Cleanup nur bei echtem Unmount - useRef um Strict Mode double-invoke zu handhaben
  useEffect(() => {
    isMountedRef.current = true;
    
    // Wenn wir einen pending cleanup haben, abbrechen (Strict Mode re-mount)
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    
    return () => {
      // Verzögern des Cleanups um Strict Mode double-invoke zu erkennen
      cleanupTimeoutRef.current = setTimeout(() => {
        
        // Abort laufende Join-Vorgänge
        if (joinAbortControllerRef.current) {
          joinAbortControllerRef.current.abort();
          joinAbortControllerRef.current = null;
        }
        
        // Cleanup WebSocket
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        
        // Cleanup PeerConnection
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        
        // Cleanup local stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        
        isMountedRef.current = false;
        hasJoinedRef.current = false;
        cleanupTimeoutRef.current = null;
      }, 100); // 100ms Verzögerung um Strict Mode re-mount zu erkennen
    };
  }, []);

  // ============== RENDER ==============

  // Idle State - Buttons zum Erstellen/Beitreten
  if (meetingState === 'idle') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 space-y-6', className)}>
        <div className="text-center">
          <Video className="w-16 h-16 mx-auto text-teal-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Taskilo Video Meeting</h2>
          <p className="text-gray-500 mt-2">Starte oder trete einem Meeting bei</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={createMeeting}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3"
          >
            <Video className="w-5 h-5 mr-2" />
            Neues Meeting starten
          </Button>

          {roomCode && (
            <Button
              onClick={() => joinMeeting(roomCode)}
              variant="outline"
              className="px-6 py-3"
            >
              <Users className="w-5 h-5 mr-2" />
              Meeting beitreten
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Creating/Joining State
  if (meetingState === 'creating' || meetingState === 'joining') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <Loader2 className="w-12 h-12 animate-spin text-teal-500 mb-4" />
        <p className="text-gray-600">
          {meetingState === 'creating' ? 'Meeting wird erstellt...' : 'Meeting wird beigetreten...'}
        </p>
      </div>
    );
  }

  // Error State
  if (meetingState === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <div className="bg-red-50 rounded-lg p-6 text-center max-w-md">
          <X className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Fehler</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => setMeetingState('idle')} variant="outline">
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Ended State
  if (meetingState === 'ended') {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <PhoneOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting beendet</h2>
        <p className="text-gray-500 mb-6">Das Meeting wurde beendet.</p>
        <Button onClick={() => setMeetingState('idle')} className="bg-teal-500 hover:bg-teal-600">
          Neues Meeting starten
        </Button>
      </div>
    );
  }

  // In Meeting State
  return (
    <div className={cn('flex h-full min-h-[500px] bg-gray-900', className)}>
      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Meeting Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">{room?.name || `Meeting ${room?.code}`}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyMeetingLink}
              className="text-gray-300 hover:text-white"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="text-gray-300 hover:text-white"
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1}</span>
          </div>
        </div>

        {/* Screen Share Requests Banner (nur für Host) */}
        {isHost && screenShareRequests.length > 0 && (
          <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
            {screenShareRequests.map((request) => (
              <div key={request.participantId} className="flex items-center justify-between text-sm">
                <span className="text-yellow-200">
                  <strong>{request.userName}</strong> möchte den Bildschirm teilen
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveScreenShare(request.participantId)}
                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-3"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Erlauben
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => denyScreenShare(request.participantId)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-7 px-3"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Ablehnen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Grid */}
        <div className="flex-1 relative p-4 min-h-0">
          {/* Remote Video (Main) */}
          <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {participants.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/90">
                <Users className="w-16 h-16 text-gray-500 mb-4" />
                <p className="text-gray-400 text-lg">Warte auf Teilnehmer...</p>
                <p className="text-gray-500 text-sm mt-2">Teile den Meeting-Link um andere einzuladen</p>
              </div>
            )}
          </div>

          {/* Local Video (PiP) */}
          <div className="absolute bottom-6 right-6 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                {userAvatarUrl ? (
                  <Image src={userAvatarUrl} alt={userName} width={48} height={48} className="rounded-full" />
                ) : (
                  <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            {screenSharing && (
              <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded">
                Bildschirm wird geteilt
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-800">
          <Button
            variant="ghost"
            size="lg"
            onClick={toggleAudio}
            className={cn(
              'rounded-full p-4',
              audioEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={toggleVideo}
            className={cn(
              'rounded-full p-4',
              videoEnabled ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          {allowScreenShare && (
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleScreenShare}
              className={cn(
                'rounded-full p-4',
                screenSharing ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-700 text-white hover:bg-gray-600'
              )}
            >
              {screenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </Button>
          )}

          {showParticipants && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowParticipantPanel(!showParticipantPanel)}
              className={cn(
                'rounded-full p-4',
                showParticipantPanel ? 'bg-teal-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              )}
            >
              <Users className="w-6 h-6" />
            </Button>
          )}

          {showChat && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowChatPanel(!showChatPanel)}
              className={cn(
                'rounded-full p-4 relative',
                showChatPanel ? 'bg-teal-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              )}
            >
              <MessageSquare className="w-6 h-6" />
              {unreadMessages > 0 && !showChatPanel && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="lg"
            onClick={endMeeting}
            className="rounded-full p-4 bg-red-500 text-white hover:bg-red-600"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Participant Panel (rechts, vor Chat) */}
      {showParticipantPanel && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium">Teilnehmer ({participants.length + 1})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipantPanel(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Spotlight Banner */}
          {spotlightParticipantId && (
            <div className="px-4 py-2 bg-yellow-500/20 border-b border-yellow-500/30 flex items-center justify-between">
              <span className="text-yellow-200 text-sm flex items-center gap-2">
                <Star className="w-4 h-4" />
                Spotlight aktiv
              </span>
              {isHost && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={hostClearSpotlight}
                  className="text-yellow-200 hover:text-white h-6 px-2 text-xs"
                >
                  Aufheben
                </Button>
              )}
            </div>
          )}
          
          {/* Participant List */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Ich selbst */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/50 mb-2">
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate flex items-center gap-2">
                  {userName} (Du)
                  {isHost && <span className="text-xs bg-teal-600 px-1.5 py-0.5 rounded">Host</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-red-400" />}
                  {videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3 text-red-400" />}
                  {mutedByHost && <span className="text-red-400">(vom Host stummgeschaltet)</span>}
                </div>
              </div>
            </div>

            {/* Andere Teilnehmer */}
            {participants.map((participant) => (
              <div 
                key={participant.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg mb-1 group',
                  spotlightParticipantId === participant.id ? 'bg-yellow-500/20 border border-yellow-500/30' : 'hover:bg-gray-700/50'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                  {participant.avatarUrl ? (
                    <Image src={participant.avatarUrl} alt={participant.name} width={40} height={40} className="rounded-full" />
                  ) : (
                    participant.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate flex items-center gap-2">
                    {participant.name}
                    {participant.role === 'host' && <span className="text-xs bg-teal-600 px-1.5 py-0.5 rounded">Host</span>}
                    {spotlightParticipantId === participant.id && <Star className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {participant.audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-red-400" />}
                    {participant.videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3 text-red-400" />}
                    {participant.screenSharing && <Monitor className="w-3 h-3 text-teal-400" />}
                  </div>
                </div>
                
                {/* Host Controls für diesen Teilnehmer */}
                {isHost && participant.role !== 'host' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Mute/Unmute */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => participant.audioEnabled ? hostMuteParticipant(participant.id) : hostUnmuteParticipant(participant.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-600"
                      title={participant.audioEnabled ? 'Stummschalten' : 'Stummschaltung aufheben'}
                    >
                      {participant.audioEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    
                    {/* Spotlight */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => spotlightParticipantId === participant.id ? hostClearSpotlight() : hostSetSpotlight(participant.id)}
                      className={cn(
                        'h-8 w-8 p-0 hover:bg-gray-600',
                        spotlightParticipantId === participant.id ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
                      )}
                      title={spotlightParticipantId === participant.id ? 'Spotlight entfernen' : 'Nur diesen hören'}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                    
                    {/* Entfernen */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => hostRemoveParticipant(participant.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/20"
                      title="Aus Meeting entfernen"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {participants.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                Noch keine weiteren Teilnehmer
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Panel (rechts) */}
      {showChatPanel && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium">Chat</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatPanel(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                Noch keine Nachrichten
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.isOwn ? 'items-end' : 'items-start'
                  )}
                >
                  <span className="text-xs text-gray-500 mb-1">
                    {msg.isOwn ? 'Du' : msg.userName}
                  </span>
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg max-w-[85%] break-words',
                      msg.isOwn 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-700 text-gray-100'
                    )}
                  >
                    {msg.message}
                  </div>
                  <span className="text-xs text-gray-600 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
          
          {/* Chat Input */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyPress}
                placeholder="Nachricht schreiben..."
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
              <Button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mail Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Per E-Mail einladen</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Sende eine Einladung per E-Mail an einen Teilnehmer.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full"
                />
              </div>
              
              {inviteSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {inviteSuccess}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={sendMailInvite}
                  disabled={!inviteEmail.trim() || inviteSending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {inviteSending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Einladung senden
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskiloMeeting;

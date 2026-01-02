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
  Settings,
  Copy,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
  const [copied, setCopied] = useState(false);
  
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
    }
  }, [onJoinRequest]);

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

  // ============== EFFECTS ==============

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
    <div className={cn('flex flex-col h-full min-h-[500px] bg-gray-900', className)}>
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
        </div>
        
        <div className="flex items-center gap-2 text-gray-300">
          <Users className="w-4 h-4" />
          <span>{participants.length + 1}</span>
        </div>
      </div>

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
            className={cn(
              'rounded-full p-4',
              screenSharing ? 'bg-teal-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
            )}
          >
            <Monitor className="w-6 h-6" />
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
              'rounded-full p-4',
              showChatPanel ? 'bg-teal-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
            )}
          >
            <MessageSquare className="w-6 h-6" />
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
  );
};

export default TaskiloMeeting;

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users,
  Copy,
  Plus,
  ScreenShare,
  ScreenShareOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import SimplePeer from 'simple-peer';
import { getDatabase, ref, onValue, push, set, remove, onChildAdded } from 'firebase/database';
import { app } from '@/firebase/clients';
import { SubPageHeader } from '@/components/webmail/SubPageHeader';

interface Participant {
  id: string;
  name: string;
  email: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface MeetingRoom {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  participants: { [key: string]: { name: string; email: string; joinedAt: number } };
}

export default function WebmailMeetPage() {
  const { session } = useWebmailSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdParam = searchParams.get('room');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_showJoinModal, setShowJoinModal] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(roomIdParam || '');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<MeetingRoom | null>(null);
  
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [_isFullscreen, _setIsFullscreen] = useState(false);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const peersRef = useRef<Map<string, SimplePeer>>(new Map());
  const rtdb = getDatabase(app);

  useEffect(() => {
    if (!session?.isAuthenticated) {
      router.push('/webmail');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.isAuthenticated, router]);

  useEffect(() => {
    // Auto-join if room ID is in URL
    if (session?.isAuthenticated && roomIdParam) {
      setJoinRoomId(roomIdParam);
      // Delay to ensure component is mounted
      const timer = setTimeout(() => {
        handleJoinMeeting(roomIdParam);
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdParam, session?.isAuthenticated]);

  useEffect(() => {
    const peers = peersRef.current;
    return () => {
      // Cleanup on unmount
      peers.forEach((peer) => peer.destroy());
      peers.clear();
    };
  }, []);

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const segments: string[] = [];
    for (let i = 0; i < 3; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }
    return segments.join('-'); // e.g., "abcd-efgh-ijkl"
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Failed to get media:', error);
      toast.error('Kamera/Mikrofon konnte nicht aktiviert werden');
      return null;
    }
  };

  const handleCreateMeeting = async () => {
    if (!session?.email) return;

    const roomId = generateRoomId();
    const stream = await initializeMedia();
    if (!stream) return;

    const roomRef = ref(rtdb, `webmail-meetings/${roomId}`);
    const roomData: MeetingRoom = {
      id: roomId,
      name: meetingName || `Meeting von ${session.email.split('@')[0]}`,
      createdBy: session.email,
      createdAt: Date.now(),
      participants: {
        [session.email.replace(/\./g, '_')]: {
          name: session.email.split('@')[0],
          email: session.email,
          joinedAt: Date.now(),
        },
      },
    };

    await set(roomRef, roomData);
    setCurrentRoom(roomData);
    setIsInMeeting(true);
    setShowCreateModal(false);

    // Listen for new participants
    setupParticipantListeners(roomId);

    // Update URL
    router.push(`/webmail/meet?room=${roomId}`);

    toast.success('Meeting erstellt');
  };

  const handleJoinMeeting = async (roomId?: string) => {
    if (!session?.email) return;
    const id = roomId || joinRoomId;
    if (!id) {
      toast.error('Bitte gib eine Meeting-ID ein');
      return;
    }

    const stream = await initializeMedia();
    if (!stream) return;

    // Check if room exists
    const roomRef = ref(rtdb, `webmail-meetings/${id}`);
    
    return new Promise<void>((resolve) => {
      onValue(roomRef, async (snapshot) => {
        const roomData = snapshot.val();
        if (!roomData) {
          toast.error('Meeting nicht gefunden');
          resolve();
          return;
        }

        // Add self to participants
        const participantRef = ref(rtdb, `webmail-meetings/${id}/participants/${session.email.replace(/\./g, '_')}`);
        await set(participantRef, {
          name: session.email.split('@')[0],
          email: session.email,
          joinedAt: Date.now(),
        });

        setCurrentRoom(roomData);
        setIsInMeeting(true);
        setShowJoinModal(false);

        // Listen for participants and signaling
        setupParticipantListeners(id);
        setupSignaling(id);

        // Update URL
        if (!roomIdParam) {
          router.push(`/webmail/meet?room=${id}`);
        }

        toast.success('Meeting beigetreten');
        resolve();
      }, { onlyOnce: true });
    });
  };

  const setupParticipantListeners = (roomId: string) => {
    const participantsRef = ref(rtdb, `webmail-meetings/${roomId}/participants`);
    
    onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const participantList: Participant[] = Object.entries(data)
          .filter(([key]) => key !== session?.email?.replace(/\./g, '_'))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(([key, value]: [string, any]) => ({
            id: key,
            name: value.name,
            email: value.email,
          }));
        
        // Create peer connections for new participants
        participantList.forEach((p) => {
          if (!peersRef.current.has(p.id)) {
            createPeerConnection(roomId, p.id, true);
          }
        });

        setParticipants(participantList);
      }
    });
  };

  const setupSignaling = (roomId: string) => {
    if (!session?.email) return;
    
    const myId = session.email.replace(/\./g, '_');
    const signalsRef = ref(rtdb, `webmail-meetings/${roomId}/signals/${myId}`);

    onChildAdded(signalsRef, (snapshot) => {
      const signal = snapshot.val();
      if (signal && signal.from !== myId) {
        const peer = peersRef.current.get(signal.from);
        if (peer) {
          peer.signal(signal.data);
        } else {
          // Create peer as receiver
          createPeerConnection(roomId, signal.from, false, signal.data);
        }
        // Remove processed signal
        remove(snapshot.ref);
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPeerConnection = (roomId: string, participantId: string, initiator: boolean, initialSignal?: any) => {
    if (!session?.email || !localStream) return;

    const myId = session.email.replace(/\./g, '_');
    
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStream,
    });

    // @ts-expect-error SimplePeer event types
    peer.on('signal', (data: unknown) => {
      const signalRef = ref(rtdb, `webmail-meetings/${roomId}/signals/${participantId}`);
      push(signalRef, {
        from: myId,
        data,
        timestamp: Date.now(),
      });
    });

    // @ts-expect-error SimplePeer event types
    peer.on('stream', (stream: MediaStream) => {
      setParticipants((prev) => 
        prev.map((p) => 
          p.id === participantId ? { ...p, stream } : p
        )
      );
    });

    // @ts-expect-error SimplePeer event types
    peer.on('error', () => {
      // Silently handle peer error
    });

    // @ts-expect-error SimplePeer event types
    peer.on('close', () => {
      peersRef.current.delete(participantId);
    });

    if (initialSignal) {
      peer.signal(initialSignal);
    }

    peersRef.current.set(participantId, peer);
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      localStream?.getVideoTracks().forEach((track) => track.stop());
      const stream = await initializeMedia();
      if (stream) {
        // Replace tracks in all peer connections
        peersRef.current.forEach((peer) => {
          const videoTrack = stream.getVideoTracks()[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sender = (peer as any)._pc?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peersRef.current.forEach((peer) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sender = (peer as any)._pc?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });

        videoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch {
        // Silently handle error
      }
    }
  };

  const cleanupMeeting = () => {
    // Stop all tracks
    localStream?.getTracks().forEach((track) => track.stop());
    
    // Close all peer connections
    peersRef.current.forEach((peer) => peer.destroy());
    peersRef.current.clear();

    // Remove from participants
    if (currentRoom && session?.email) {
      const participantRef = ref(rtdb, `webmail-meetings/${currentRoom.id}/participants/${session.email.replace(/\./g, '_')}`);
      remove(participantRef);
    }

    setLocalStream(null);
    setParticipants([]);
    setIsInMeeting(false);
    setCurrentRoom(null);
  };

  const handleLeaveMeeting = () => {
    cleanupMeeting();
    router.push('/webmail/meet');
    toast.info('Meeting verlassen');
  };

  const copyMeetingLink = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(`${window.location.origin}/webmail/meet?room=${currentRoom.id}`);
      toast.success('Link kopiert');
    }
  };

  // Meeting View
  if (isInMeeting && currentRoom) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-900">
        {/* Meeting Header */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">{currentRoom.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={copyMeetingLink}
            >
              <Copy className="h-4 w-4 mr-1" />
              Link kopieren
            </Button>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Users className="h-4 w-4" />
            {participants.length + 1} Teilnehmer
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={`grid gap-4 h-full ${
            participants.length === 0 ? 'grid-cols-1' :
            participants.length === 1 ? 'grid-cols-2' :
            participants.length <= 3 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-sm">
                Du {!isMicOn && <MicOff className="inline h-3 w-3 ml-1" />}
              </div>
              {!isCameraOn && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl">
                    {session?.email?.[0]?.toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {participants.map((participant) => (
              <div key={participant.id} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
                {participant.stream ? (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(el) => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl">
                      {participant.name[0]?.toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-sm">
                  {participant.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 px-4 py-4 flex items-center justify-center gap-4">
          <Button
            variant={isMicOn ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={toggleMic}
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          <Button
            variant={isCameraOn ? 'secondary' : 'destructive'}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={toggleCamera}
          >
            {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          <Button
            variant={isScreenSharing ? 'default' : 'secondary'}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? <ScreenShareOff className="h-6 w-6" /> : <ScreenShare className="h-6 w-6" />}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={handleLeaveMeeting}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  // Lobby View
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <SubPageHeader
        userEmail={session?.email || ''}
        onLogout={() => router.push('/webmail')}
        title="Meet"
        icon={<Video className="h-6 w-6" />}
      />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
              <Video className="h-10 w-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Video-Meetings</h2>
            <p className="mt-2 text-gray-600">
              Starte ein neues Meeting oder tritt einem bestehenden bei
            </p>
          </div>

          <div className="space-y-4">
            <Button
              className="w-full h-14 text-lg"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Neues Meeting
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-2 text-gray-500">oder</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Meeting-Code eingeben"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="h-14"
              />
              <Button
                variant="outline"
                className="h-14 px-6"
                onClick={() => handleJoinMeeting()}
                disabled={!joinRoomId}
              >
                Beitreten
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Meeting Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Meeting erstellen</DialogTitle>
            <DialogDescription>
              Gib deinem Meeting einen Namen (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="meetingName">Meeting-Name</Label>
            <Input
              id="meetingName"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="z.B. Team-Besprechung"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateMeeting}>
              Meeting starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

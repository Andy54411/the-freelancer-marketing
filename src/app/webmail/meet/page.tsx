'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video, Plus, Users, ArrowRight, Copy, Check, User, Loader2, Clock, CheckCircle, XCircle, UserPlus } from 'lucide-react';
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
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { MailHeader } from '@/components/webmail/MailHeader';
import { TaskiloMeeting, MeetingRoom, TaskiloMeetingHandle } from '@/components/video/TaskiloMeeting';

// Lobby/Wartezimmer-Status
type LobbyStatus = 'idle' | 'waiting' | 'approved' | 'denied';

interface JoinRequest {
  participantId: string;
  userName: string;
  userId?: string;
  timestamp: number;
}

export default function WebmailMeetPage() {
  const { session } = useWebmailSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCodeParam = searchParams.get('room');
  const { theme } = useWebmailTheme();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState(roomCodeParam || '');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdMeetingUrl, setCreatedMeetingUrl] = useState<string | null>(null);
  
  // Guest state für nicht-authentifizierte User
  const [guestName, setGuestName] = useState('');
  const [showGuestJoinModal, setShowGuestJoinModal] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  // Admin/Host state - wenn User das Meeting erstellt hat
  const [isHost, setIsHost] = useState(false);
  const createdRoomCodeRef = useRef<string | null>(null);
  
  // Session Storage Key für Host-Status
  const HOST_SESSION_KEY = 'taskilo_meeting_host';
  
  // Lobby/Wartezimmer state
  const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('idle');
  const [showPreJoinModal, setShowPreJoinModal] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const lobbyWsRef = useRef<WebSocket | null>(null);
  
  // Ref für TaskiloMeeting (approve/deny Funktionen)
  const meetingRef = useRef<TaskiloMeetingHandle | null>(null);

  // Pre-Join Modal wenn room code in URL (nicht-Host)
  useEffect(() => {
    if (roomCodeParam) {
      // Prüfe ob der User der Host ist:
      // 1. Hat diesen Raum gerade erstellt (createdRoomCodeRef)
      // 2. Oder war vorher Host dieses Raums (Session Storage)
      const savedHostRoom = sessionStorage.getItem(HOST_SESSION_KEY);
      const isHostOfThisRoom = createdRoomCodeRef.current === roomCodeParam || savedHostRoom === roomCodeParam;
      
      if (isHostOfThisRoom) {
        // Host - direkt beitreten ohne Lobby
        setIsHost(true);
        setCurrentRoomCode(roomCodeParam);
        setIsInMeeting(true);
        // Host-Status speichern für Page Refresh
        sessionStorage.setItem(HOST_SESSION_KEY, roomCodeParam);
      } else if (session?.isAuthenticated) {
        // Authentifizierter User (nicht Host) - Pre-Join Modal zeigen
        setShowPreJoinModal(true);
      } else {
        // Gast - Namen abfragen
        setShowGuestJoinModal(true);
      }
    }
  }, [roomCodeParam, session?.isAuthenticated]);

  const handleGuestJoin = () => {
    // Wird nicht mehr direkt aufgerufen - stattdessen handleGuestPreJoin
    handleGuestPreJoin();
  };

  const handleCreateMeeting = async () => {
    if (!session?.email) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_MEETING_API_URL || 'https://mail.taskilo.de/api/meeting';
      const API_KEY = process.env.NEXT_PUBLIC_WEBMAIL_API_KEY || '';

      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId: session.email,
          name: meetingName || `Meeting von ${session.email.split('@')[0]}`,
          type: 'instant',
          metadata: { source: 'webmail' },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      const meetingUrl = `${window.location.origin}/webmail/meet?room=${data.room.code}`;
      setCreatedMeetingUrl(meetingUrl);
      toast.success('Meeting erstellt! Du kannst den Link jetzt teilen.');
      
    } catch (error) {
      console.error('Create meeting error:', error);
      toast.error('Meeting konnte nicht erstellt werden');
    }
  };

  const handleJoinMeeting = () => {
    if (!joinRoomCode.trim()) {
      toast.error('Bitte gib einen Meeting-Code ein');
      return;
    }

    // Navigiere zur Meeting-URL
    router.push(`/webmail/meet?room=${joinRoomCode.trim()}`);
    setShowJoinModal(false);
  };

  const handleStartMeeting = () => {
    if (createdMeetingUrl) {
      const code = createdMeetingUrl.split('room=')[1];
      // Merke dass dieser User der Host ist
      createdRoomCodeRef.current = code;
      setIsHost(true);
      setCurrentRoomCode(code);
      setIsInMeeting(true);
      setShowCreateModal(false);
      setCreatedMeetingUrl(null);
      router.push(`/webmail/meet?room=${code}`);
    }
  };

  // Lobby WebSocket für Beitrittsanfragen
  const connectToLobby = useCallback((roomCode: string, userName: string) => {
    const wsEndpoint = 'wss://mail.taskilo.de/ws/meeting';
    const ws = new WebSocket(wsEndpoint);
    lobbyWsRef.current = ws;
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'request-join',
        payload: {
          roomCode,
          userName,
          userId: session?.email || `guest-${userName}`,
        },
      }));
      setLobbyStatus('waiting');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'join-approved':
          setLobbyStatus('approved');
          toast.success('Beitritt genehmigt!');
          // Kurz warten dann Meeting beitreten
          setTimeout(() => {
            setShowPreJoinModal(false);
            setCurrentRoomCode(roomCode);
            setIsInMeeting(true);
          }, 500);
          break;
          
        case 'join-denied':
          setLobbyStatus('denied');
          toast.error('Beitritt abgelehnt');
          break;
          
        case 'host-not-present':
          // Host ist noch nicht da - trotzdem warten lassen
          break;
          
        case 'error':
          toast.error(message.payload?.message || 'Fehler beim Beitritt');
          setLobbyStatus('idle');
          break;
      }
    };
    
    ws.onerror = () => {
      // Bei Fehler direkt beitreten (Fallback)
      setShowPreJoinModal(false);
      setCurrentRoomCode(roomCode);
      setIsInMeeting(true);
    };
    
    ws.onclose = () => {
    };
  }, [session?.email]);

  // Pre-Join bestätigen - Beitrittsanfrage senden
  const handlePreJoinConfirm = () => {
    if (!roomCodeParam) return;
    const userName = session?.email?.split('@')[0] || 'Unbekannt';
    connectToLobby(roomCodeParam, userName);
  };

  // Gast-Pre-Join (nach Namenseingabe)
  const handleGuestPreJoin = () => {
    if (!guestName.trim()) {
      toast.error('Bitte gib deinen Namen ein');
      return;
    }
    if (!roomCodeParam) return;
    
    setIsGuest(true);
    setShowGuestJoinModal(false);
    setShowPreJoinModal(true);
    // Nach kurzer Verzögerung Lobby-Verbindung aufbauen
    setTimeout(() => {
      connectToLobby(roomCodeParam, guestName);
    }, 100);
  };

  // Admin: Beitrittsanfrage genehmigen
  const handleApproveJoinRequest = (request: JoinRequest) => {
    // Sende Approve über die Meeting-WebSocket
    if (meetingRef.current) {
      meetingRef.current.approveJoinRequest(request.participantId);
    }
    setPendingJoinRequests(prev => prev.filter(r => r.participantId !== request.participantId));
  };

  // Admin: Beitrittsanfrage ablehnen
  const handleDenyJoinRequest = (request: JoinRequest) => {
    // Sende Deny über die Meeting-WebSocket
    if (meetingRef.current) {
      meetingRef.current.denyJoinRequest(request.participantId);
    }
    setPendingJoinRequests(prev => prev.filter(r => r.participantId !== request.participantId));
  };

  // Cleanup WebSocket
  useEffect(() => {
    return () => {
      if (lobbyWsRef.current) {
        lobbyWsRef.current.close();
      }
    };
  }, []);

  const copyMeetingLink = () => {
    if (createdMeetingUrl) {
      navigator.clipboard.writeText(createdMeetingUrl);
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMeetingCreated = (room: MeetingRoom) => {
  };

  const handleMeetingJoined = (room: MeetingRoom) => {
    toast.success('Meeting beigetreten');
  };

  const handleMeetingEnded = () => {
    setIsInMeeting(false);
    setCurrentRoomCode(null);
    setIsGuest(false);
    setGuestName('');
    setIsHost(false);
    // Host-Status aus Session Storage löschen
    sessionStorage.removeItem(HOST_SESSION_KEY);
    router.push('/webmail/meet');
    toast.info('Meeting beendet');
  };

  const handleMeetingError = (error: string) => {
    toast.error(error);
  };

  // Ermittle User-Daten (Session oder Gast)
  const currentUserEmail = session?.email || (isGuest ? `guest-${Date.now()}@taskilo.de` : '');
  const currentUserName = session?.email?.split('@')[0] || guestName || 'Gast';
  const currentUserId = session?.email || `guest-${guestName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

  // Wenn im Meeting, zeige TaskiloMeeting Komponente
  if (isInMeeting && currentRoomCode && (session?.email || isGuest)) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <MailHeader userEmail={session?.email || `Gast: ${guestName}`} />
        <div className="flex-1 min-h-0">
          <TaskiloMeeting
            roomCode={currentRoomCode}
            source="webmail"
            userId={currentUserId}
            userName={currentUserName}
            userEmail={currentUserEmail}
            isHost={isHost}
            autoJoin={true}
            meetingRef={meetingRef}
            onMeetingCreated={handleMeetingCreated}
            onMeetingJoined={handleMeetingJoined}
            onMeetingEnded={handleMeetingEnded}
            onError={handleMeetingError}
            onJoinRequest={(request) => {
              setPendingJoinRequests(prev => [...prev, request]);
            }}
            className="h-full"
          />
        </div>
        
        {/* Pending Join Requests Modal für Host */}
        {isHost && pendingJoinRequests.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {pendingJoinRequests.map((request) => (
              <div 
                key={request.participantId}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[300px]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{request.userName}</p>
                    <p className="text-sm text-gray-500">möchte dem Meeting beitreten</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDenyJoinRequest(request)}
                  >
                    Ablehnen
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-teal-500 hover:bg-teal-600"
                    onClick={() => handleApproveJoinRequest(request)}
                  >
                    Zulassen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Lobby-Ansicht - Google Meet Style
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* MailHeader oben */}
      <MailHeader userEmail={session?.email || ''} />
      
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Linke Sidebar - Desktop */}
        <div className={`hidden md:block w-64 flex-shrink-0 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          {/* Logo */}
          <div className="p-4 flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Taskilo Meet
            </span>
          </div>

          {/* Navigation */}
          <nav className="mt-4 px-2">
            <button
              onClick={() => {}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-left transition-colors ${
                theme === 'dark' 
                  ? 'bg-teal-900/30 text-teal-400' 
                  : 'bg-teal-50 text-teal-700'
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="font-medium">Besprechungen</span>
            </button>
            
            <button
              onClick={() => router.push('/webmail')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-left transition-colors mt-1 ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:bg-gray-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
              <span>Zurück zu E-Mail</span>
            </button>
          </nav>
        </div>

      {/* Mobile Header */}
      <div className={`md:hidden flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Taskilo Meet
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/webmail')}
            className={`p-2 rounded-full ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          {session?.email && (
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {session.email.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Hauptbereich */}
      <div className="flex-1 flex flex-col">
        {/* Header - Desktop */}
        <div className={`hidden md:flex h-16 items-center justify-end px-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {new Date().toLocaleDateString('de-DE', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
            </span>
            {session?.email && (
              <div className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center text-white font-medium">
                {session.email.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-3xl w-full">
            {/* Titel */}
            <div className="text-center mb-8 md:mb-12">
              <h1 className={`text-2xl md:text-4xl font-normal mb-3 md:mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Videoanrufe und
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>-konferenzen für alle
              </h1>
              <p className={`text-sm md:text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Mit Taskilo Meet kommunizieren, zusammenarbeiten und
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>Kunden treffen - egal, wo Sie gerade sind
              </p>
            </div>

            {/* Action Buttons - Mobile: Stack, Desktop: Row */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8 md:mb-16">
              {/* Neue Videokonferenz */}
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto bg-teal-500 hover:bg-teal-600 text-white px-6 py-5 md:py-6 text-base rounded-md flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                Neue Videokonferenz
              </Button>

              {/* Code eingeben - Mobile: Full width */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Input
                    placeholder="Code oder Link eingeben"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoomCode.trim() && handleJoinMeeting()}
                    className={`w-full md:w-64 pl-10 py-5 md:py-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
                  />
                  <Users className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <Button 
                  variant="ghost"
                  onClick={handleJoinMeeting}
                  disabled={!joinRoomCode.trim()}
                  className={`py-5 md:py-6 ${joinRoomCode.trim() ? 'text-teal-600 hover:text-teal-700' : 'text-gray-400'}`}
                >
                  Teilnehmen
                </Button>
              </div>
            </div>

            {/* Trennlinie */}
            <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} mb-6 md:mb-8`} />

            {/* Features Carousel Placeholder - kleiner auf Mobile */}
            <div className="flex items-center justify-center">
              <div className={`w-48 h-48 md:w-80 md:h-80 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'} flex items-center justify-center`}>
                <div className="grid grid-cols-2 gap-2 md:gap-4 p-4 md:p-8">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-pink-200 rounded-lg flex items-center justify-center">
                    <User className="w-8 h-8 md:w-12 md:h-12 text-pink-600" />
                  </div>
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-yellow-200 rounded-lg flex items-center justify-center">
                    <User className="w-8 h-8 md:w-12 md:h-12 text-yellow-600" />
                  </div>
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-teal-200 rounded-lg flex items-center justify-center">
                    <User className="w-8 h-8 md:w-12 md:h-12 text-teal-600" />
                  </div>
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-orange-200 rounded-lg flex items-center justify-center">
                    <User className="w-8 h-8 md:w-12 md:h-12 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Text */}
            <div className="text-center mt-6 md:mt-8">
              <p className={`text-base md:text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Sichere Video-Meetings
              </p>
              <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                HD Video, Bildschirmfreigabe, bis zu 10 Teilnehmer
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Create Meeting Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neues Meeting erstellen</DialogTitle>
            <DialogDescription>
              Gib deinem Meeting einen Namen und erstelle einen Einladungslink.
            </DialogDescription>
          </DialogHeader>
          
          {!createdMeetingUrl ? (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="meetingName">Meeting-Name (optional)</Label>
                  <Input
                    id="meetingName"
                    placeholder="z.B. Team-Besprechung"
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateMeeting} className="bg-teal-500 hover:bg-teal-600">
                  Meeting erstellen
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium mb-2">Meeting erstellt!</p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={createdMeetingUrl} 
                      readOnly 
                      className="text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyMeetingLink}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowCreateModal(false);
                  setCreatedMeetingUrl(null);
                  setMeetingName('');
                }}>
                  Schließen
                </Button>
                <Button onClick={handleStartMeeting} className="bg-teal-500 hover:bg-teal-600">
                  Meeting starten
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Join Meeting Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meeting beitreten</DialogTitle>
            <DialogDescription>
              Gib den Meeting-Code ein, um beizutreten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="joinCode">Meeting-Code</Label>
              <Input
                id="joinCode"
                placeholder="z.B. abc-defg-hij"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleJoinMeeting} className="bg-teal-500 hover:bg-teal-600">
              Beitreten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Join Modal - für nicht-authentifizierte Benutzer mit Meeting-Link */}
      <Dialog open={showGuestJoinModal} onOpenChange={setShowGuestJoinModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-teal-500" />
              Als Gast beitreten
            </DialogTitle>
            <DialogDescription>
              Gib deinen Namen ein, um dem Meeting beizutreten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="guestName">Dein Name</Label>
              <Input
                id="guestName"
                placeholder="z.B. Max Mustermann"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuestJoin()}
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-500">
              Du trittst dem Meeting <strong>{roomCodeParam}</strong> bei.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGuestJoinModal(false);
              router.push('/webmail/meet');
            }}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleGuestJoin} 
              className="bg-teal-500 hover:bg-teal-600"
              disabled={!guestName.trim()}
            >
              Beitreten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Join Modal - Warte auf Zulassung durch Host */}
      <Dialog open={showPreJoinModal} onOpenChange={(open) => {
        if (!open && lobbyStatus !== 'waiting') {
          setShowPreJoinModal(false);
          if (lobbyStatus !== 'approved') {
            router.push('/webmail/meet');
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lobbyStatus === 'waiting' && <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />}
              {lobbyStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {lobbyStatus === 'denied' && <XCircle className="h-5 w-5 text-red-500" />}
              {lobbyStatus === 'idle' && <UserPlus className="h-5 w-5 text-teal-500" />}
              {lobbyStatus === 'idle' && 'Meeting beitreten'}
              {lobbyStatus === 'waiting' && 'Warte auf Zulassung...'}
              {lobbyStatus === 'approved' && 'Beitritt genehmigt!'}
              {lobbyStatus === 'denied' && 'Beitritt abgelehnt'}
            </DialogTitle>
            <DialogDescription>
              {lobbyStatus === 'idle' && `Du möchtest dem Meeting ${roomCodeParam} beitreten.`}
              {lobbyStatus === 'waiting' && 'Der Host muss deinen Beitritt genehmigen. Bitte warte einen Moment.'}
              {lobbyStatus === 'approved' && 'Du wirst gleich zum Meeting weitergeleitet...'}
              {lobbyStatus === 'denied' && 'Der Host hat deinen Beitritt abgelehnt.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            {lobbyStatus === 'idle' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-10 h-10 text-teal-600" />
                </div>
                <p className="text-gray-600">
                  Bereit, dem Meeting als <strong>{session?.email?.split('@')[0] || guestName || 'Gast'}</strong> beizutreten?
                </p>
              </div>
            )}
            
            {lobbyStatus === 'waiting' && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Der Host wurde benachrichtigt...</p>
              </div>
            )}
            
            {lobbyStatus === 'approved' && (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-green-600 font-medium">Willkommen!</p>
              </div>
            )}
            
            {lobbyStatus === 'denied' && (
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Du kannst diesem Meeting nicht beitreten.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            {lobbyStatus === 'idle' && (
              <>
                <Button variant="outline" onClick={() => {
                  setShowPreJoinModal(false);
                  router.push('/webmail/meet');
                }}>
                  Abbrechen
                </Button>
                <Button onClick={handlePreJoinConfirm} className="bg-teal-500 hover:bg-teal-600">
                  Beitritt anfragen
                </Button>
              </>
            )}
            
            {lobbyStatus === 'waiting' && (
              <Button variant="outline" onClick={() => {
                setShowPreJoinModal(false);
                setLobbyStatus('idle');
                lobbyWsRef.current?.close();
                router.push('/webmail/meet');
              }}>
                Abbrechen
              </Button>
            )}
            
            {lobbyStatus === 'denied' && (
              <Button variant="outline" onClick={() => {
                setShowPreJoinModal(false);
                setLobbyStatus('idle');
                router.push('/webmail/meet');
              }}>
                Schließen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

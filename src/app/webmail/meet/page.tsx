'use client';

import { useState, useEffect } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video, Plus, Users, ArrowRight, Copy, Check } from 'lucide-react';
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
import { TaskiloMeeting, MeetingRoom } from '@/components/video/TaskiloMeeting';

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
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(roomCodeParam);
  const [copied, setCopied] = useState(false);
  const [createdMeetingUrl, setCreatedMeetingUrl] = useState<string | null>(null);

  // Auto-join wenn room code in URL
  useEffect(() => {
    if (session?.isAuthenticated && roomCodeParam) {
      setCurrentRoomCode(roomCodeParam);
      setIsInMeeting(true);
    }
  }, [roomCodeParam, session?.isAuthenticated]);

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
      setCurrentRoomCode(code);
      setIsInMeeting(true);
      setShowCreateModal(false);
      setCreatedMeetingUrl(null);
      router.push(`/webmail/meet?room=${code}`);
    }
  };

  const copyMeetingLink = () => {
    if (createdMeetingUrl) {
      navigator.clipboard.writeText(createdMeetingUrl);
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMeetingCreated = (room: MeetingRoom) => {
    console.log('[WebmailMeet] Meeting created:', room);
  };

  const handleMeetingJoined = (room: MeetingRoom) => {
    console.log('[WebmailMeet] Meeting joined:', room);
    toast.success('Meeting beigetreten');
  };

  const handleMeetingEnded = () => {
    setIsInMeeting(false);
    setCurrentRoomCode(null);
    router.push('/webmail/meet');
    toast.info('Meeting beendet');
  };

  const handleMeetingError = (error: string) => {
    console.error('[WebmailMeet] Error:', error);
    toast.error(error);
  };

  // Wenn im Meeting, zeige TaskiloMeeting Komponente
  if (isInMeeting && currentRoomCode && session?.email) {
    return (
      <div className="h-screen flex flex-col">
        <MailHeader userEmail={session.email} />
        <div className="flex-1">
          <TaskiloMeeting
            roomCode={currentRoomCode}
            source="webmail"
            userId={session.email}
            userName={session.email.split('@')[0]}
            userEmail={session.email}
            autoJoin={true}
            onMeetingCreated={handleMeetingCreated}
            onMeetingJoined={handleMeetingJoined}
            onMeetingEnded={handleMeetingEnded}
            onError={handleMeetingError}
            className="h-full"
          />
        </div>
      </div>
    );
  }

  // Lobby-Ansicht
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <MailHeader userEmail={session?.email || ''} />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
            <Video className="w-10 h-10 text-teal-600" />
          </div>
          <h1 className={`text-3xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Taskilo Meet
          </h1>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Sichere Video-Meetings direkt aus deinem Webmail
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Neues Meeting erstellen */}
          <div 
            className={`p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-teal-500 hover:bg-teal-50/50 ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                : 'bg-white border-gray-200'
            }`}
            onClick={() => setShowCreateModal(true)}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Plus className="w-6 h-6 text-teal-600" />
              </div>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Neues Meeting
              </h2>
            </div>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Erstelle ein neues Meeting und lade Teilnehmer per Link ein.
            </p>
          </div>

          {/* Meeting beitreten */}
          <div 
            className={`p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-teal-500 hover:bg-teal-50/50 ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                : 'bg-white border-gray-200'
            }`}
            onClick={() => setShowJoinModal(true)}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Meeting beitreten
              </h2>
            </div>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Tritt einem bestehenden Meeting mit dem Meeting-Code bei.
            </p>
          </div>
        </div>

        {/* Info */}
        <div className={`mt-8 p-6 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Funktionen
          </h3>
          <ul className={`space-y-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <li className="flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-500" /> HD Video & Audio
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-500" /> Bis zu 10 Teilnehmer
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-teal-500" /> Bildschirmfreigabe
            </li>
          </ul>
        </div>
      </div>

      {/* Create Meeting Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
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
        <DialogContent>
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
    </div>
  );
}

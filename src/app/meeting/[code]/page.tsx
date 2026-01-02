'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TaskiloMeeting } from '@/components/video/TaskiloMeeting';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Video, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MeetingInfo {
  id: string;
  code: string;
  name?: string;
  status: 'waiting' | 'active' | 'ended';
  participantCount: number;
  maxParticipants: number;
}

export default function MeetingPage() {
  const params = useParams();
  const code = typeof params?.code === 'string' ? params.code : '';
  
  const { user, loading: authLoading } = useAuth();
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_MEETING_API_URL || 'https://mail.taskilo.de/api/meeting';

  useEffect(() => {
    const fetchMeetingInfo = async () => {
      if (!code) {
        setError('Kein Meeting-Code angegeben');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/${code}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Meeting nicht gefunden');
          setLoading(false);
          return;
        }

        setMeetingInfo(data.room);
      } catch {
        setError('Fehler beim Laden des Meetings');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingInfo();
  }, [code, API_BASE]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-600">Meeting wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meeting nicht verfügbar</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button className="bg-teal-500 hover:bg-teal-600">
              Zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (meetingInfo?.status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meeting beendet</h1>
          <p className="text-gray-600 mb-6">Dieses Meeting wurde beendet.</p>
          <Link href="/">
            <Button className="bg-teal-500 hover:bg-teal-600">
              Zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Pre-Join Screen
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Video className="w-16 h-16 mx-auto text-teal-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">
              {meetingInfo?.name || 'Taskilo Meeting'}
            </h1>
            <p className="text-gray-500 mt-1">Code: {code}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status:</span>
              <span className={meetingInfo?.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                {meetingInfo?.status === 'active' ? 'Läuft' : 'Wartet auf Teilnehmer'}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Teilnehmer:</span>
              <span className="text-gray-900">
                {meetingInfo?.participantCount || 0} / {meetingInfo?.maxParticipants || 10}
              </span>
            </div>
          </div>

          {user ? (
            <Button
              onClick={() => setJoined(true)}
              className="w-full bg-teal-500 hover:bg-teal-600 py-6 text-lg"
            >
              Meeting beitreten
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                Bitte melde dich an, um dem Meeting beizutreten.
              </p>
              <Link href={`/login?redirect=/meeting/${code}`}>
                <Button className="w-full bg-teal-500 hover:bg-teal-600">
                  Anmelden
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // In-Meeting View
  return (
    <div className="h-screen">
      <TaskiloMeeting
        roomCode={code}
        userId={user?.uid || ''}
        userName={user?.firstName || user?.lastName || 'Gast'}
        userEmail={user?.email || undefined}
        userAvatarUrl={user?.profilePictureURL}
        autoJoin={true}
        onMeetingEnded={() => {
          setJoined(false);
        }}
        onError={(error) => {
          setError(error);
          setJoined(false);
        }}
        className="h-full"
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, Check, X, Clock, AlertCircle } from 'lucide-react';
import { useWebmailSession } from '@/app/webmail/layout';
import { MailHeader } from '@/components/webmail/MailHeader';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface Invite {
  id: string;
  senderEmail: string;
  senderName: string;
  partnerEmail: string;
  partnerName: string;
  startDate: string | null;
  includeAllPhotos: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export default function PhotosInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { session } = useWebmailSession();
  const { isDark } = useWebmailTheme();
  
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);

  // Einladung laden
  useEffect(() => {
    const loadInvite = async () => {
      try {
        const response = await fetch(`/api/photos/partner-invite/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Einladung konnte nicht geladen werden');
          return;
        }

        setInvite(data.invite);

        // Prüfen ob User eingeloggt ist und ob E-Mail übereinstimmt
        if (!session?.email) {
          setNeedsAccount(true);
        } else if (session.email.toLowerCase() !== data.invite.partnerEmail.toLowerCase()) {
          setError(`Diese Einladung wurde an ${data.invite.partnerEmail} gesendet. Du bist als ${session.email} angemeldet.`);
        }
      } catch {
        setError('Einladung konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadInvite();
    }
  }, [token, session?.email]);

  // Einladung annehmen
  const handleAccept = async () => {
    if (!invite || !session?.email) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/photos/partner-invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.email,
          password: session.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Einladung konnte nicht angenommen werden');
        return;
      }

      // Zur geteilten Fotos-Seite weiterleiten
      router.push('/webmail/photos?section=geteilt');
    } catch {
      setError('Einladung konnte nicht angenommen werden');
    } finally {
      setProcessing(false);
    }
  };

  // Einladung ablehnen
  const handleDecline = async () => {
    if (!invite) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/photos/partner-invite/${token}/decline`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/webmail/photos');
      }
    } catch {
      setError('Fehler beim Ablehnen');
    } finally {
      setProcessing(false);
    }
  };

  // Zur Anmeldung weiterleiten
  const handleLogin = () => {
    // Einladungs-Token in URL für Redirect nach Login speichern
    router.push(`/webmail?redirect=/webmail/photos/invite/${token}`);
  };

  // Konto erstellen
  const handleCreateAccount = () => {
    router.push(`/webmail/signup?invite=${token}&email=${encodeURIComponent(invite?.partnerEmail || '')}`);
  };

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", isDark ? "bg-[#1f1f1f]" : "bg-gray-50")}>
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#1f1f1f]" : "bg-gray-50")}>
      {session && <MailHeader userEmail={session.email} />}
      
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className={cn(
          "rounded-2xl shadow-lg overflow-hidden",
          isDark ? "bg-[#2d2e30]" : "bg-white"
        )}>
          {/* Header */}
          <div className="bg-linear-to-br from-teal-500 to-teal-600 px-8 py-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-medium text-white">
              Mit Partner teilen
            </h1>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {error ? (
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
                  isDark ? "bg-red-900/30" : "bg-red-100"
                )}>
                  <AlertCircle className={cn("w-8 h-8", isDark ? "text-red-400" : "text-red-600")} />
                </div>
                <p className={cn("text-lg mb-6", isDark ? "text-gray-300" : "text-gray-700")}>
                  {error}
                </p>
                <button
                  onClick={() => router.push('/webmail/photos')}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors"
                >
                  Zu Fotos
                </button>
              </div>
            ) : invite?.status === 'expired' ? (
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
                  isDark ? "bg-yellow-900/30" : "bg-yellow-100"
                )}>
                  <Clock className={cn("w-8 h-8", isDark ? "text-yellow-400" : "text-yellow-600")} />
                </div>
                <h2 className={cn("text-xl font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                  Einladung abgelaufen
                </h2>
                <p className={cn("mb-6", isDark ? "text-gray-400" : "text-gray-500")}>
                  Diese Einladung ist nicht mehr gültig. Bitte den Absender, eine neue Einladung zu senden.
                </p>
              </div>
            ) : invite?.status === 'accepted' ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-teal-600" />
                </div>
                <h2 className={cn("text-xl font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                  Bereits angenommen
                </h2>
                <p className={cn("mb-6", isDark ? "text-gray-400" : "text-gray-500")}>
                  Du hast diese Einladung bereits angenommen.
                </p>
                <button
                  onClick={() => router.push('/webmail/photos?section=geteilt')}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors"
                >
                  Geteilte Fotos ansehen
                </button>
              </div>
            ) : needsAccount ? (
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
                  isDark ? "bg-teal-900/30" : "bg-teal-100"
                )}>
                  <Users className={cn("w-8 h-8", isDark ? "text-teal-400" : "text-teal-600")} />
                </div>
                <h2 className={cn("text-xl font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                  Einladung von {invite?.senderName}
                </h2>
                <p className={cn("mb-2", isDark ? "text-gray-400" : "text-gray-500")}>
                  {invite?.senderEmail}
                </p>
                <p className={cn("mb-6", isDark ? "text-gray-400" : "text-gray-500")}>
                  Um Fotos zu teilen, benötigst du ein Taskilo Webmail Konto.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={handleLogin}
                    className="w-full px-6 py-3 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors"
                  >
                    Anmelden
                  </button>
                  <button
                    onClick={handleCreateAccount}
                    className={cn(
                      "w-full px-6 py-3 rounded-full font-medium border transition-colors",
                      isDark 
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    Kostenloses Konto erstellen
                  </button>
                </div>
              </div>
            ) : invite ? (
              <div>
                {/* Sender Info */}
                <div className="text-center mb-6">
                  <div className={cn(
                    "w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-white text-2xl font-medium",
                    "bg-linear-to-br from-teal-500 to-teal-600"
                  )}>
                    {invite.senderName.charAt(0).toUpperCase()}
                  </div>
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                    {invite.senderEmail}
                  </p>
                </div>

                {/* Einladungstext */}
                <div className={cn(
                  "p-4 rounded-xl mb-6",
                  isDark ? "bg-[#3c4043]" : "bg-gray-50"
                )}>
                  <p className={cn("text-center font-medium mb-3", isDark ? "text-white" : "text-gray-900")}>
                    {invite.senderName} möchte über „Mit Partner teilen" Inhalte mit dir teilen
                  </p>
                  <p className={cn("text-center text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                    Über „Mit Partner teilen" kannst du ganz einfach wichtige Erinnerungen von deinem Partner erhalten.
                  </p>
                </div>

                {/* Info */}
                <p className={cn("text-sm text-center mb-6", isDark ? "text-gray-500" : "text-gray-500")}>
                  Die Fotos und Videos werden nicht auf deinen Speicherplatz angerechnet.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDecline}
                    disabled={processing}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-full font-medium border transition-colors",
                      isDark 
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700" 
                        : "border-gray-300 text-gray-700 hover:bg-gray-50",
                      processing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <X className="w-5 h-5 inline-block mr-2" />
                    Ablehnen
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={processing}
                    className={cn(
                      "flex-1 px-6 py-3 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors",
                      processing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {processing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    ) : (
                      <Check className="w-5 h-5 inline-block mr-2" />
                    )}
                    Annehmen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

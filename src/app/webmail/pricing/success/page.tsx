'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Loader2, Mail, ArrowRight, Sun, Moon } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SessionData {
  customerEmail: string;
  planName: string;
  amount: number;
  interval: string;
}

function SuccessContent() {
  const { isDark, toggleTheme } = useWebmailTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      router.push('/webmail/pricing');
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/webmail/checkout/verify?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setSessionData(data.session);
        } else {
          setError(data.error || 'Sitzung konnte nicht verifiziert werden');
        }
      } catch {
        setError('Verbindungsfehler');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]')}>
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('min-h-screen flex flex-col items-center justify-center p-4', isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]')}>
        <div className={cn('rounded-2xl p-8 max-w-md w-full text-center', isDark ? 'bg-[#292a2d]' : 'bg-white')}>
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/webmail/pricing">
            <Button variant="outline">Zurueck zu den Tarifen</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen transition-colors', isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]')}>
      {/* Header */}
      <header className={cn('border-b', isDark ? 'bg-[#202124] border-[#5f6368]' : 'bg-white border-gray-200')}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/webmail" className="flex items-center gap-3">
            <Image
              src="/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg"
              alt="Taskilo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className={cn('font-semibold text-lg', isDark ? 'text-white' : 'text-gray-900')}>
              Taskilo Mail
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className={cn('p-2 rounded-full transition-colors', isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600')}
            aria-label={isDark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Success Content */}
      <main className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
        <div className={cn('rounded-2xl p-8 md:p-12 max-w-lg w-full text-center', isDark ? 'bg-[#292a2d]' : 'bg-white')}>
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-teal-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className={cn('text-2xl md:text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
            Vielen Dank fuer Ihre Bestellung!
          </h1>

          {/* Description */}
          <p className={cn('mb-8', isDark ? 'text-gray-400' : 'text-gray-600')}>
            Ihre Bestellung wurde erfolgreich abgeschlossen. Sie erhalten in Kuerze eine Bestaetigungs-E-Mail.
          </p>

          {/* Order Details */}
          {sessionData && (
            <div className={cn('rounded-xl p-4 mb-8 text-left', isDark ? 'bg-[#303134]' : 'bg-gray-50')}>
              <h3 className={cn('font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>
                Ihre Bestelldetails
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={cn(isDark ? 'text-gray-400' : 'text-gray-500')}>Tarif:</span>
                  <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {sessionData.planName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cn(isDark ? 'text-gray-400' : 'text-gray-500')}>E-Mail:</span>
                  <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {sessionData.customerEmail}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cn(isDark ? 'text-gray-400' : 'text-gray-500')}>Betrag:</span>
                  <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {(sessionData.amount / 100).toFixed(2)} EUR/{sessionData.interval === 'month' ? 'Monat' : 'Jahr'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className={cn('rounded-xl p-4 mb-8 text-left', isDark ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-teal-50 border border-teal-100')}>
            <h3 className={cn('font-semibold mb-2 flex items-center gap-2', 'text-teal-600')}>
              <Mail className="w-5 h-5" />
              Naechste Schritte
            </h3>
            <ol className={cn('list-decimal list-inside space-y-1 text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
              <li>Pruefen Sie Ihr E-Mail-Postfach fuer die Bestaetigung</li>
              <li>Erstellen Sie Ihre @taskilo.de E-Mail-Adresse</li>
              <li>Melden Sie sich im Webmail an und nutzen Sie alle Funktionen</li>
            </ol>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/webmail?create=true" className="flex-1">
              <Button className="w-full bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white">
                E-Mail-Adresse erstellen
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/webmail" className="flex-1">
              <Button variant="outline" className={cn('w-full', isDark && 'border-[#5f6368] text-gray-300 hover:bg-[#303134]')}>
                Zum Webmail
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WebmailSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#202124]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

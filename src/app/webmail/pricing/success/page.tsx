'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Mail, ArrowRight } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HeroHeader } from '@/components/hero8-header';

interface SessionData {
  customerEmail: string;
  planName: string;
  amount: number;
  interval: string;
}

function SuccessContent() {
  const { isDark } = useWebmailTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const subscriptionId = searchParams.get('subscription_id');

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Revolut Subscription Flow - subscription_id
    if (subscriptionId) {
      // Subscription erfolgreich - zeige Erfolgsseite
      setSessionData({
        customerEmail: '',
        planName: 'Taskilo ProMail',
        amount: 299,
        interval: 'month',
      });
      setLoading(false);
      return;
    }

    // Legacy Stripe Flow - session_id
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
  }, [sessionId, subscriptionId, router]);

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
      {/* Unified Header */}
      <HeroHeader />

      {/* Success Content */}
      <main className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)] mt-16">
        <div className={cn('rounded-2xl p-8 md:p-12 max-w-lg w-full text-center', isDark ? 'bg-[#292a2d]' : 'bg-white')}>
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-teal-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className={cn('text-2xl md:text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
            Vielen Dank für Ihre Bestellung!
          </h1>

          {/* Description */}
          <p className={cn('mb-8', isDark ? 'text-white' : 'text-gray-600')}>
            Ihre Bestellung wurde erfolgreich abgeschlossen. Sie erhalten in Kürze eine Bestätigungs-E-Mail.
          </p>

          {/* Order Details */}
          {sessionData && (
            <div className={cn('rounded-xl p-4 mb-8 text-left', isDark ? 'bg-[#303134]' : 'bg-gray-50')}>
              <h3 className={cn('font-semibold mb-3', isDark ? 'text-white' : 'text-gray-900')}>
                Ihre Bestelldetails
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={cn(isDark ? 'text-white' : 'text-gray-500')}>Tarif:</span>
                  <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {sessionData.planName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cn(isDark ? 'text-white' : 'text-gray-500')}>E-Mail:</span>
                  <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {sessionData.customerEmail}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cn(isDark ? 'text-white' : 'text-gray-500')}>Betrag:</span>
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
              Nächste Schritte
            </h3>
            <ol className={cn('list-decimal list-inside space-y-1 text-sm', isDark ? 'text-white' : 'text-gray-600')}>
              <li>Prüfen Sie Ihr E-Mail-Postfach für die Bestätigung</li>
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
              <Button variant="outline" className={cn('w-full', isDark && 'border-[#5f6368] text-white hover:bg-[#303134]')}>
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

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function BankingCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verarbeite Bank-Antwort...');

  useEffect(() => {
    const connectionId = searchParams.get('id');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Fehler von finAPI erhalten: ${error}`);
      // Optional: Leite nach ein paar Sekunden zurück
      setTimeout(() => {
        // Hier sollten Sie den Benutzer zu einer relevanten Seite leiten,
        // z.B. zurück zur Verbindungsseite mit einer Fehlermeldung.
        // router.push('/dashboard/company/.../finance/banking/connect?error=' + error);
      }, 5000);
    } else if (connectionId) {
      setStatus('success');
      setMessage(
        `Bankverbindung mit der ID ${connectionId} erfolgreich hergestellt! Sie werden weitergeleitet...`
      );
      // Hier könnten Sie eine API aufrufen, um den Status der Verbindung zu speichern.
      // z.B. POST /api/finapi/finalize-connection { connectionId }
      setTimeout(() => {
        // Leite den Benutzer zur Kontenübersicht weiter
        // router.push('/dashboard/company/.../finance/banking/accounts');
      }, 3000);
    } else {
      setStatus('error');
      setMessage('Ungültige Callback-Parameter. Keine Verbindungs-ID oder Fehler gefunden.');
    }
  }, [searchParams, router]);

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-gray-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-16 w-16 text-red-500" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {renderIcon()}
      <h1 className="text-2xl font-bold mt-6 mb-2">Banking-Verbindung</h1>
      <p className="text-lg text-gray-600 max-w-md">{message}</p>
    </div>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function VerifyEmailChangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const userId = searchParams.get('userId');

      if (!token || !userId) {
        setStatus('error');
        setMessage('Ungültiger Link. Token oder Benutzer-ID fehlt.');
        return;
      }

      try {
        const response = await fetch('/api/user/change-email/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, userId }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setMessage('Ihre E-Mail-Adresse wurde erfolgreich geändert.');
          setNewEmail(result.newEmail);
        } else {
          setStatus('error');
          setMessage(result.error || 'Fehler bei der Bestätigung');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">E-Mail-Adresse bestätigen</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-teal-600 animate-spin" />
              <p className="text-gray-600">E-Mail-Adresse wird verifiziert...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-gray-800 font-medium">{message}</p>
              {newEmail && (
                <p className="text-gray-600">
                  Neue E-Mail: <strong>{newEmail}</strong>
                </p>
              )}
              <p className="text-sm text-gray-500">
                Bitte melden Sie sich mit Ihrer neuen E-Mail-Adresse an.
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white"
              >
                Zur Anmeldung
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-red-100 rounded-full">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <p className="text-red-600 font-medium">{message}</p>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="mt-4"
              >
                Zur Startseite
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-12 w-12 text-teal-600 animate-spin" />
        </div>
      }
    >
      <VerifyEmailChangeContent />
    </Suspense>
  );
}

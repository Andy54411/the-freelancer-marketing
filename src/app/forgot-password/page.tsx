'use client';

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet. Überprüfen Sie Ihr Postfach.'
      );
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Es wurde kein Konto mit dieser E-Mail-Adresse gefunden.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Ungültige E-Mail-Adresse.');
      } else {
        setError('Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo />
        </div>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Passwort zurücksetzen</CardTitle>
            <CardDescription>
              Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu erhalten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre.email@beispiel.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#14ad9f] hover:bg-taskilo-hover"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    E-Mail senden
                  </>
                )}
              </Button>

              {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md text-sm text-center">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-sm text-center">
                  {error}
                </div>
              )}

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center text-sm text-[#14ad9f] hover:underline"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Zurück zur Anmeldung
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

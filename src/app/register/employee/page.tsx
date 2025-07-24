'use client';

import { useState, useEffect, Suspense } from 'react';
import { useFormStatus } from 'react-dom';
import { registerEmployee } from './actions';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full bg-[#14ad9f] hover:bg-teal-700" disabled={pending}>
      {pending ? 'Registrierung wird verarbeitet...' : 'Konto erstellen'}
    </Button>
  );
}

function RegistrationForm() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<{ error: string | null; success: boolean }>({
    error: null,
    success: false,
  });
  const [formDisabled, setFormDisabled] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    // Liest den Einladungscode aus der URL, wenn die Komponente geladen wird.
    const codeFromUrl = searchParams?.get('inviteCode');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormDisabled(true);
    const formData = new FormData(event.currentTarget);
    const result = await registerEmployee(state, formData);
    setState(result);
    setFormDisabled(false);
  }

  useEffect(() => {
    if (state.success) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }, [state.success]);

  if (state.success) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle className="text-2xl text-green-600">Registrierung erfolgreich!</CardTitle>
          <CardDescription className="mt-2">
            Dein Mitarbeiter-Konto wurde erstellt. Du wirst gleich weitergeleitet.
          </CardDescription>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle className="text-2xl">Mitarbeiter registrieren</CardTitle>
          <CardDescription>
            Bitte fülle das Formular aus, um ein Mitarbeiterkonto zu erstellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Vorname</Label>
                <Input id="firstName" name="firstName" required disabled={formDisabled} />
              </div>
              <div>
                <Label htmlFor="lastName">Nachname</Label>
                <Input id="lastName" name="lastName" required disabled={formDisabled} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required disabled={formDisabled} />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                disabled={formDisabled}
              />
            </div>
            <div>
              <Label htmlFor="inviteCode">Einladungscode</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                required
                disabled={formDisabled}
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
              />
            </div>
            <SubmitButton />
            {state.error && <p className="text-red-600 mt-2">{state.error}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function EmployeeRegistrationPage() {
  // Da wir `useSearchParams` verwenden, muss die Komponente, die den Hook nutzt,
  // in eine <Suspense>-Boundary eingewickelt werden.
  return (
    // Ein einfacher Lade-Fallback, während die URL-Parameter gelesen werden.
    <Suspense
      fallback={<div className="flex items-center justify-center min-h-screen">Lade...</div>}
    >
      <RegistrationForm />
    </Suspense>
  );
}

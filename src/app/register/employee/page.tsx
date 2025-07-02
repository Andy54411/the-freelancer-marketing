'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerEmployee } from './actions'; // Importiere die Action-Funktion
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import Link from 'next/link';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full bg-[#14ad9f] hover:bg-teal-700" disabled={pending}>
            {pending ? 'Registrierung wird verarbeitet...' : 'Konto erstellen'}
        </Button>
    );
}

export default function EmployeeRegistrationPage() {
    const [state, dispatch] = useActionState(registerEmployee, { error: null, success: false });

    if (state.success) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-gray-100">
                <Card className="w-full max-w-md text-center p-6">
                    <CardTitle className="text-2xl text-green-600">Registrierung erfolgreich!</CardTitle>
                    <CardDescription className="mt-2">Dein Mitarbeiter-Konto wurde erstellt. Du kannst dich jetzt anmelden.</CardDescription>
                    <Button asChild className="mt-4 bg-[#14ad9f] hover:bg-teal-700">
                        <Link href="/login">Zur Anmeldung</Link>
                    </Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Mitarbeiter-Registrierung</CardTitle>
                    <CardDescription>Erstelle ein neues Konto für das Tasko-Dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={dispatch} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">Vorname</Label>
                                <Input id="firstName" name="firstName" required />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Nachname</Label>
                                <Input id="lastName" name="lastName" required />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="email">E-Mail</Label>
                            <Input id="email" name="email" type="email" required />
                        </div>
                        <div>
                            <Label htmlFor="password">Passwort</Label>
                            <Input id="password" name="password" type="password" required minLength={6} />
                        </div>
                        <div>
                            <Label htmlFor="inviteCode">Einladungscode</Label>
                            <Input id="inviteCode" name="inviteCode" required />
                        </div>
                        {state.error && (<p className="text-sm text-red-500">{state.error}</p>)}
                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
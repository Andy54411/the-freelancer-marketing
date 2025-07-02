'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    OAuthProvider,
    User,
} from 'firebase/auth';
import { auth } from '@/firebase/clients';
import { LoginForm } from '@/components/login-form';
import { Logo } from '@/components/logo';

const POPUP_LOG = "LoginPage:";
const POPUP_ERROR = "LoginPage ERROR:";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(null);

    const handleEmailPasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError("Bitte E-Mail und Passwort eingeben.");
            return;
        }
        setLoading('email');
        setError(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Die Weiterleitung wird jetzt vollständig vom AuthContext gehandhabt.
            // Nach einem erfolgreichen Login wird die Seite durch die Weiterleitung
            // ohnehin unmounted. Das Zurücksetzen des Ladezustands ist nur bei
            // einem Fehler notwendig.
            console.log(POPUP_LOG, "Login erfolgreich für:", userCredential.user.uid);
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const firebaseError = err as { code: string; message: string };
                console.error(POPUP_ERROR, "Email/Passwort Login Fehler:", firebaseError.code, firebaseError.message);
                if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-email'].includes(firebaseError.code)) {
                    setError('Ungültige E-Mail-Adresse oder falsches Passwort.');
                } else {
                    setError('Login fehlgeschlagen. Bitte versuchen Sie es später erneut.');
                }
            } else {
                setError('Ein unbekannter Fehler ist aufgetreten.');
            }
            // Setze den Ladezustand nur bei einem Fehler zurück.
            setLoading(null);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading('google');
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            // Die Weiterleitung wird jetzt vollständig vom AuthContext gehandhabt.
            // Nach einem erfolgreichen Login wird die Seite durch die Weiterleitung
            // ohnehin unmounted. Das Zurücksetzen des Ladezustands ist nur bei
            // einem Fehler notwendig.
            console.log(POPUP_LOG, "Login erfolgreich für:", result.user.uid);
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const firebaseError = err as { code: string; message: string };
                console.error(POPUP_ERROR, "Google Login Fehler:", firebaseError.code, firebaseError.message);
                if (firebaseError.code === 'auth/popup-closed-by-user') {
                    console.log(POPUP_LOG, 'Google Login Popup vom Nutzer geschlossen.');
                } else if (firebaseError.code === 'auth/account-exists-with-different-credential') {
                    setError('Ein Konto mit dieser E-Mail-Adresse existiert bereits mit einer anderen Anmeldemethode.');
                } else {
                    setError('Google Login fehlgeschlagen.');
                }
            } else {
                setError('Ein unbekannter Fehler ist aufgetreten.');
            }
            // Setze den Ladezustand nur bei einem Fehler zurück.
            setLoading(null);
        }
    };

    const handleAppleLogin = async () => {
        setLoading('apple');
        setError(null);
        try {
            const provider = new OAuthProvider('apple.com');
            const result = await signInWithPopup(auth, provider);
            // Die Weiterleitung wird jetzt vollständig vom AuthContext gehandhabt.
            // Nach einem erfolgreichen Login wird die Seite durch die Weiterleitung
            // ohnehin unmounted. Das Zurücksetzen des Ladezustands ist nur bei
            // einem Fehler notwendig.
            console.log(POPUP_LOG, "Login erfolgreich für:", result.user.uid);
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const firebaseError = err as { code: string; message: string };
                console.error(POPUP_ERROR, "Apple Login Fehler:", firebaseError.code, firebaseError.message);
                if (firebaseError.code === 'auth/popup-closed-by-user') {
                    console.log(POPUP_LOG, 'Apple Login Popup vom Nutzer geschlossen.');
                } else if (firebaseError.code === 'auth/account-exists-with-different-credential') {
                    setError('Ein Konto mit dieser E-Mail-Adresse existiert bereits mit einer anderen Anmeldemethode.');
                } else {
                    setError('Apple Login fehlgeschlagen.');
                }
            } else {
                setError('Ein unbekannter Fehler ist aufgetreten.');
            }
            // Setze den Ladezustand nur bei einem Fehler zurück.
            setLoading(null);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <Logo />
                </div>
                <LoginForm
                    className="w-full"
                    email={email}
                    onEmailChange={setEmail}
                    password={password}
                    onPasswordChange={setPassword}
                    onSubmitEmailPassword={handleEmailPasswordLogin}
                    onGoogleLogin={handleGoogleLogin}
                    onAppleLogin={handleAppleLogin}
                    disabled={loading !== null}
                />
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-sm text-center mt-3">
                        {error}
                    </div>
                )}
            </div>
        </main>
    );
}
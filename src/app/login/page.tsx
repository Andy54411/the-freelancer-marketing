'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '@/firebase/clients';
import { LoginForm } from '@/components/login-form';
import { Logo } from '@/components/logo';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirectTo') || '/dashboard';

  const handleEmailPasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setLoading('email');
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Explizite Weiterleitung nach erfolgreichem Login
      router.replace(redirectTo);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as { code: string; message: string };

        if (
          [
            'auth/user-not-found',
            'auth/wrong-password',
            'auth/invalid-credential',
            'auth/invalid-email',
          ].includes(firebaseError.code)
        ) {
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
      await signInWithPopup(auth, provider);
      // Explizite Weiterleitung nach erfolgreichem Login
      router.replace(redirectTo);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as { code: string; message: string };

        if (firebaseError.code === 'auth/popup-closed-by-user') {
          // User closed popup, no error to show
        } else if (firebaseError.code === 'auth/account-exists-with-different-credential') {
          setError(
            'Ein Konto mit dieser E-Mail-Adresse existiert bereits mit einer anderen Anmeldemethode.'
          );
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
      provider.addScope('email');
      provider.addScope('name');
      await signInWithPopup(auth, provider);
      // Explizite Weiterleitung nach erfolgreichem Login
      router.replace(redirectTo);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as { code: string; message: string };

        if (firebaseError.code === 'auth/popup-closed-by-user') {
          // User closed popup, no error to show
        } else if (firebaseError.code === 'auth/account-exists-with-different-credential') {
          setError(
            'Ein Konto mit dieser E-Mail-Adresse existiert bereits mit einer anderen Anmeldemethode.'
          );
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
    <main className="min-h-screen bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]"></div>
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center mb-8">
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
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm text-center shadow-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 flex items-center justify-center px-4">
          <div className="bg-white shadow-xl rounded-lg p-8 w-full max-w-md">
            <div className="text-center">
              <Logo />
              <h1 className="text-2xl font-bold text-gray-900 mt-2">Anmeldung</h1>
              <div className="flex justify-center items-center mt-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
              <p className="text-gray-600 mt-2">Wird geladen...</p>
            </div>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

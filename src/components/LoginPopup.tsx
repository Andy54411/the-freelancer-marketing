// src/components/LoginPopup.tsx (oder dein gewünschter Pfad)
'use client';

import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  OAuthProvider, // Für Apple Login
  // AuthError // AuthError ist ein Typ, kein Wert für instanceof
} from 'firebase/auth';
import { auth } from '@/firebase/clients'; // Dein Firebase Auth Import
import { LoginForm } from './login-form'; // Importiere deine LoginForm UI-Komponente
// import { Button } from '@/components/ui/button'; // Marked as unused

// Logging-Konstanten (optional)
const POPUP_LOG = 'LoginPopup:';
const POPUP_ERROR = 'LoginPopup ERROR:';
// const POPUP_WARN = "LoginPopup WARN:"; // Marked as unused

interface LoginPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialEmail?: string; // Optional, um E-Mail vorzubelegen
}

export default function LoginPopup({
  isOpen,
  onClose,
  onLoginSuccess,
  initialEmail = '',
}: LoginPopupProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(null);

  // Setzt die E-Mail zurück, wenn das Popup neu geöffnet wird (optional)
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || ''); // Setzt E-Mail, wenn Popup geöffnet wird
      setPassword(''); // Passwort immer zurücksetzen
      setError(null); // Fehler zurücksetzen
    }
  }, [isOpen, initialEmail]);

  const handleEmailPasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setLoading('email');
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      onLoginSuccess(userCredential.user);
    } catch (err: unknown) {
      // Prüfen, ob es ein Firebase Auth Fehler ist, indem wir auf 'code' und 'message' prüfen
      if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
        const firebaseError = err as { code: string; message: string }; // Type Assertion

        if (
          firebaseError.code === 'auth/user-not-found' ||
          firebaseError.code === 'auth/wrong-password' ||
          firebaseError.code === 'auth/invalid-credential' || // Neuerer Fehlercode für falsche Credentials
          firebaseError.code === 'auth/invalid-email'
        ) {
          setError('Ungültige E-Mail-Adresse oder falsches Passwort.');
        } else {
          setError('Login fehlgeschlagen. Bitte versuchen Sie es später erneut.');
        }
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading('google');
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      onLoginSuccess(result.user);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
        const firebaseError = err as { code: string; message: string };

        if (firebaseError.code === 'auth/popup-closed-by-user') {
          // Kein Fehler anzeigen, Nutzer hat das Popup geschlossen
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
    } finally {
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
      const result = await signInWithPopup(auth, provider);

      // Das Popup schließen und die Weiterleitung wird vom AuthContext gehandhabt
      onClose();
    } catch (err: unknown) {
      console.error('Apple Sign-In Fehler:', err);
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseErr = err as { code: string; message: string };
        if (firebaseErr.code === 'auth/popup-closed-by-user') {
          // Popup wurde vom Benutzer geschlossen - kein Fehler anzeigen
        } else if (firebaseErr.code === 'auth/cancelled-popup-request') {
          // Popup-Anfrage wurde abgebrochen - kein Fehler anzeigen
        } else {
          setError('Apple Sign-In fehlgeschlagen. Bitte versuchen Sie es erneut.');
        }
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(null);
    }
  };

  // Verhindert Schließen des Popups bei Klick auf den Inhalt
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-transparent bg-opacity-70 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose} // Schließt bei Klick auf Overlay
    >
      <div
        className="relative w-full max-w-md" // Nimmt die Breite der LoginForm Card
        onClick={handleDialogClick} // Verhindert Schließen bei Klick auf Dialog selbst
      >
        {/* Der Schließen-Button ist jetzt Teil der LoginForm-Card in deiner originalen UI,
           oder du kannst ihn hier explizit hinzufügen, wenn die LoginForm ihn nicht hat.
           Für eine saubere Trennung ist es oft besser, den Schließen-Button hier im Popup-Wrapper zu haben.
          */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-[60] bg-gray-200 text-gray-800 hover:bg-teal-100 hover:text-teal-800 rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
          aria-label="Popup schließen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <LoginForm
          className="w-full" // Stellt sicher, dass die Card die Breite ausfüllt
          email={email}
          onEmailChange={setEmail}
          password={password}
          onPasswordChange={setPassword}
          onSubmitEmailPassword={handleEmailPasswordLogin}
          onGoogleLogin={handleGoogleLogin}
          onAppleLogin={handleAppleLogin}
          // HINWEIS: Die LoginForm-Komponente sollte eine 'disabled'-Prop erhalten,
          // um die Buttons während des Ladevorgangs zu deaktivieren.
          disabled={loading !== null}
          // TODO: error und loading Props an LoginForm übergeben, falls die UI das dort anzeigen soll.
          // Aktuell wird der Fehler nur unterhalb der LoginForm angezeigt (siehe unten).
          // Der "Sign up"-Link in LoginForm müsste onClose aufrufen oder speziell behandelt werden.
        />
        {/* Fehleranzeige direkt unter dem Formular, falls gewünscht */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-sm text-center mt-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

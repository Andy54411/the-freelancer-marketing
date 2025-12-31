// src/components/LoginPopup.tsx (oder dein gewünschter Pfad)
'use client';

import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '@/firebase/clients';
import { LoginForm } from './login-form';
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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Setzt die E-Mail zurueck, wenn das Popup neu geoeffnet wird
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setPassword('');
      setError(null);
      setAuthMode('signin');
    }
  }, [isOpen, initialEmail]);

  const handleEmailPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    
    // Passwort-Validierung fuer Registrierung
    if (authMode === 'signup' && password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    
    setLoading('email');
    setError(null);
    
    try {
      if (authMode === 'signup') {
        // Registrierung
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      } else {
        // Anmeldung
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
        const firebaseError = err as { code: string; message: string };

        if (authMode === 'signup') {
          // Registrierungs-Fehler
          if (firebaseError.code === 'auth/email-already-in-use') {
            setError('Diese E-Mail-Adresse wird bereits verwendet.');
          } else if (firebaseError.code === 'auth/invalid-email') {
            setError('Ungueltige E-Mail-Adresse.');
          } else if (firebaseError.code === 'auth/weak-password') {
            setError('Das Passwort ist zu schwach. Mindestens 6 Zeichen.');
          } else {
            setError('Registrierung fehlgeschlagen. Bitte versuchen Sie es spaeter erneut.');
          }
        } else {
          // Anmelde-Fehler
          if (
            firebaseError.code === 'auth/user-not-found' ||
            firebaseError.code === 'auth/wrong-password' ||
            firebaseError.code === 'auth/invalid-credential' ||
            firebaseError.code === 'auth/invalid-email'
          ) {
            setError('Ungueltige E-Mail-Adresse oder falsches Passwort.');
          } else {
            setError('Login fehlgeschlagen. Bitte versuchen Sie es spaeter erneut.');
          }
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
      const appleResult = await signInWithPopup(auth, provider);
      onLoginSuccess(appleResult.user);
    } catch (err: unknown) {
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
      className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex"
        onClick={handleDialogClick}
      >
        {/* Schliessen-Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-60 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Popup schliessen"
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

        {/* Linke Seite - Bild und Marketing */}
        <div className="hidden md:flex md:w-[45%] bg-[#14ad9f] relative overflow-hidden">
          {/* Hintergrundbild */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80)',
            }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/85 to-teal-700/85" />
          
          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col justify-center text-white">
            <h2 className="text-2xl font-bold mb-6">
              Erfolg beginnt hier
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Hunderte Kategorien von Dienstleistungen</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Qualitaetsarbeit schneller erledigt</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Zugang zu Talenten in ganz Deutschland</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rechte Seite - Login Form */}
        <div className="w-full md:w-[55%] p-6 md:p-8">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {authMode === 'signup' ? 'Neues Konto erstellen' : 'In Ihrem Konto anmelden'}
            </h3>
            <p className="text-sm text-gray-600">
              {authMode === 'signup' ? (
                <>Bereits registriert? <button type="button" onClick={() => setAuthMode('signin')} className="text-[#14ad9f] font-medium cursor-pointer hover:text-teal-700 transition-colors">Anmelden</button></>
              ) : (
                <>Noch kein Konto? <button type="button" onClick={() => setAuthMode('signup')} className="text-[#14ad9f] font-medium cursor-pointer hover:text-teal-700 transition-colors">Hier registrieren</button></>
              )}
            </p>
          </div>

          <LoginForm
            className="w-full"
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            onSubmitEmailPassword={handleEmailPasswordSubmit}
            onGoogleLogin={handleGoogleLogin}
            onAppleLogin={handleAppleLogin}
            disabled={loading !== null}
            authMode={authMode}
          />
          
          {/* Fehleranzeige */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-md text-xs text-center mt-3">
              {error}
            </div>
          )}

          {/* AGB Hinweis */}
          <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
            Durch die Anmeldung stimmen Sie unseren{' '}
            <a href="/agb" className="text-[#14ad9f] hover:underline">AGB</a>{' '}
            zu. Bitte lesen Sie unsere{' '}
            <a href="/datenschutz" className="text-[#14ad9f] hover:underline">Datenschutzerklaerung</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

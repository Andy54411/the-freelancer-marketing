// /Users/andystaudinger/Taskilo/src/components/ReviewForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/firebase/clients';
import { useAlertHelpers } from '@/components/ui/AlertProvider';

// Funktionen-Instanz initialisieren
const functionsInstance = getFunctions(app, 'europe-west1');

// Interfaces für die Callable Function (Input und Output)
interface SubmitReviewData {
  anbieterId: string;
  kundeId: string;
  auftragId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL: string; // Jetzt erforderlich
  kategorie: string;
  unterkategorie: string;
}

interface SubmitReviewResult {
  message: string;
  reviewId: string;
}

interface ReviewFormProps {
  anbieterId: string;
  auftragId: string;
  kategorie: string;
  unterkategorie: string;
}

export default function ReviewForm({
  anbieterId,
  auftragId,
  kategorie,
  unterkategorie,
}: ReviewFormProps) {
  const { showError } = useAlertHelpers();
  const [sterne, setSterne] = useState(5);
  const [kommentar, setKommentar] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);

  // Überprüfe beim Laden der Komponente, ob der User ein Profilbild hat
  useEffect(() => {
    const user = getAuth().currentUser;
    if (user) {
      const photoURL = user.photoURL;
      setUserPhotoURL(photoURL);
      setHasProfilePicture(!!photoURL && photoURL.trim() !== '');
    }
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    const user = getAuth().currentUser;
    if (!user) {
      showError('Anmeldung erforderlich', 'Bitte zuerst einloggen.');
      setLoading(false);
      return;
    }

    // Überprüfung: Benutzer muss ein Profilbild haben
    if (!user.photoURL || user.photoURL.trim() === '') {
      setError(
        'Sie müssen ein Profilbild haben, um eine Bewertung abgeben zu können. Bitte fügen Sie ein Profilbild zu Ihrem Account hinzu.'
      );
      setLoading(false);
      return;
    }

    const kundeId = user.uid;
    const kundeProfilePictureURL = user.photoURL;

    const body: SubmitReviewData = {
      anbieterId,
      kundeId,
      auftragId,
      sterne,
      kommentar,
      kundeProfilePictureURL,
      kategorie,
      unterkategorie,
    };

    try {
      // The httpsCallable function works for both production and emulators.
      // The Firebase client SDK automatically routes the request to the emulator if it's configured.
      const submitReviewCallable = httpsCallable<SubmitReviewData, SubmitReviewResult>(
        functionsInstance,
        'submitReview'
      );
      const result = await submitReviewCallable(body);
      const resultData = result.data;

      setSuccess(true);
      setKommentar('');
    } catch (err: unknown) {
      let errorMessage = 'Bewertung konnte nicht gesendet werden.';
      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        const errorObj = err as { code: string; message: string };
        errorMessage = `Fehler von Cloud Function (${errorObj.code}): ${errorObj.message}`;
      } else if (err instanceof Error) {
        errorMessage = `Netzwerkfehler: ${err.message}`;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as any).message === 'string'
      ) {
        errorMessage = (err as any).message;
      }
      setError(errorMessage);
      showError('Bewertungsfehler', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bewertung abgeben</h3>

      {/* Warnung, wenn kein Profilbild vorhanden ist */}
      {!hasProfilePicture && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Profilbild erforderlich</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Um eine Bewertung abgeben zu können, müssen Sie ein Profilbild in Ihrem Account
                  haben. Bitte fügen Sie ein Profilbild hinzu und laden Sie die Seite dann neu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bewertungsformular - nur aktiviert wenn Profilbild vorhanden */}
      <div className={!hasProfilePicture ? 'opacity-50 pointer-events-none' : ''}>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setSterne(n)}
              disabled={!hasProfilePicture}
              className={`text-2xl ${n <= sterne ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          placeholder={
            hasProfilePicture
              ? 'Dein Kommentar (optional)'
              : 'Profilbild erforderlich für Bewertungen'
          }
          value={kommentar}
          onChange={e => setKommentar(e.target.value)}
          rows={4}
          disabled={!hasProfilePicture}
          className="w-full rounded-md border p-3 mb-4"
        />

        {error && <p className="text-red-600 mt-3 mb-2">❌ {error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !hasProfilePicture}
          className={`px-6 py-2 rounded-md transition ${
            hasProfilePicture
              ? 'bg-[#14ad9f] text-white hover:bg-teal-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Wird gesendet...' : 'Bewertung senden'}
        </button>

        {success && <p className="text-green-600 mt-3">✔️ Bewertung erfolgreich gesendet</p>}
      </div>
    </div>
  );
}

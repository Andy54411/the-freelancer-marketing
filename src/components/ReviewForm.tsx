// /Users/andystaudinger/Taskilo/src/components/ReviewForm.tsx
'use client';

import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { httpsCallable, getFunctions, FunctionsError } from 'firebase/functions';
import { app } from '@/firebase/clients';

// Funktionen-Instanz initialisieren
const functionsInstance = getFunctions(app, 'europe-west1');

// Interfaces für die Callable Function (Input und Output)
interface SubmitReviewData {
  anbieterId: string;
  kundeId: string;
  auftragId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
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
  const [sterne, setSterne] = useState(5);
  const [kommentar, setKommentar] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    const user = getAuth().currentUser;
    if (!user) {
      alert('Bitte zuerst einloggen.');
      setLoading(false);
      return;
    }

    const kundeId = user.uid;
    const kundeProfilePictureURL = user.photoURL || '';

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

      console.log('Bewertung erfolgreich gesendet:', resultData);
      setSuccess(true);
      setKommentar('');
    } catch (err: unknown) {
      console.error('Fehler beim Senden der Bewertung:', err);
      let errorMessage = 'Bewertung konnte nicht gesendet werden.';
      if (err instanceof FunctionsError) {
        errorMessage = `Fehler von Cloud Function (${err.code}): ${err.message}`;
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
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bewertung abgeben</h3>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setSterne(n)}
            className={`text-2xl ${n <= sterne ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        placeholder="Dein Kommentar (optional)"
        value={kommentar}
        onChange={e => setKommentar(e.target.value)}
        rows={4}
        className="w-full rounded-md border p-3 mb-4"
      />

      {error && <p className="text-red-600 mt-3 mb-2">❌ {error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-[#14ad9f] text-white px-6 py-2 rounded-md hover:bg-teal-700 transition"
      >
        {loading ? 'Wird gesendet...' : 'Bewertung senden'}
      </button>

      {success && <p className="text-green-600 mt-3">✔️ Bewertung erfolgreich gesendet</p>}
    </div>
  );
}

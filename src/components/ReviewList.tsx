// /Users/andystaudinger/Tasko/src/components/ReviewList.tsx
'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { httpsCallable, getFunctions, FunctionsError } from 'firebase/functions';
import { app } from '@/firebase/clients';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

// --- Functions Initialisierung (jetzt wird getReviewsCallable nur bei Bedarf genutzt) ---
// Wir initialisieren hier NUR die functionsInstance, um sie später zu nutzen.
// Die Callable-Instanz erstellen wir bedingt im useEffect.
const functionsInstance = getFunctions(app);

// --- Interfaces ---
interface Review {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number; _nanoseconds: number } | Date; // Behalten Sie das so, wie es vom Backend kommt
}

interface ReviewListProps {
  anbieterId: string;
}

// --- Hilfsfunktion zum Rendern von Sternen ---
function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

// --- ReviewList Komponente ---
export default function ReviewList({ anbieterId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!anbieterId) {
        setReviews([]);
        setAverage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let data: Review[];

        // Prüfe, ob wir im Emulator-Modus sind
        if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST) {
          // Direkter fetch-Aufruf für den Emulator-Modus
          const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST;
          const emulatorPort = 5001; // Standard-Port für Functions Emulator

          // Die URL für den direkten fetch-Aufruf der onRequest-Funktion
          const url = `http://${emulatorHost}:${emulatorPort}/tilvo-f142f/us-central1/getReviewsByProvider`;

          // Die Payload für Callable-Funktionen wird als JSON im 'data'-Feld gesendet
          const payload = { data: { anbieterId } };

          const res = await fetch(url, {
            method: 'POST', // Callable-Funktionen senden POST
            headers: {
              'Content-Type': 'application/json',
              // Hier sind keine zusätzlichen CORS-Header nötig, da der Backend-Workaround greifen sollte
            },
            body: JSON.stringify(payload),
          });

          // Die Antwort von onRequest-Funktionen muss manuell ausgepackt werden
          const responseData = await res.json();

          if (!res.ok || responseData.error) {
            throw new Error(responseData.error?.message || `Serverfehler: ${res.status}`);
          }
          data = responseData.data; // Die eigentlichen Daten sind in responseData.data
        } else {
          // Im Produktionsmodus weiterhin httpsCallable verwenden (oder auch hier auf fetch umstellen)
          const getReviewsProdCallable = httpsCallable<{ anbieterId: string }, Review[]>(functionsInstance, 'getReviewsByProvider');
          const result = await getReviewsProdCallable({ anbieterId });
          data = result.data;
        }

        if (!Array.isArray(data)) {
          throw new Error('Ungültiges Datenformat von der Cloud Function.');
        }

        setReviews(data);

        if (data.length > 0) {
          const total = data.reduce((sum: number, r: Review) => sum + (r.sterne || 0), 0);
          setAverage(Number((total / data.length).toFixed(1)));
        } else {
          setAverage(null);
        }
      } catch (err: unknown) {
        console.error('Fehler beim Laden der Bewertungen:', err);

        let errorMessage = 'Ein unbekannter Fehler ist beim Laden der Bewertungen aufgetreten.';
        if (err instanceof FunctionsError) {
          errorMessage = `Fehler von Cloud Function (${err.code}): ${err.message}`;
        } else if (err instanceof Error) {
          errorMessage = `Netzwerkfehler: ${err.message}`;
        } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [anbieterId]);

  // --- UI-Rendering ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <FiLoader className="animate-spin text-3xl text-[#14ad9f] mr-3" />
        <span className="text-gray-700">Lade Bewertungen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center">
        <FiAlertCircle className="inline mr-2" />
        <span className="block sm:inline">{error}</span>
        <p className="mt-2 text-sm">Bitte versuchen Sie es später noch einmal oder kontaktieren Sie den Support.</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500">Noch keine Bewertungen vorhanden.</p>;
  }

  return (
    <div className="mt-10 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Bewertungen</h3>
        {average !== null && (
          <p className="text-sm text-gray-700">
            Durchschnitt: <span className="text-yellow-500">★ {average}</span>
          </p>
        )}
      </div>

      {reviews.map((review) => (
        <div key={review.id} className="bg-white p-4 rounded-lg shadow border space-y-2">
          <div className="flex items-center gap-4">
            <Image
              src={review.kundeProfilePictureURL || '/default-avatar.jpg'}
              alt="Kunde"
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div className="text-yellow-500 text-base font-medium">
              {renderStars(review.sterne)} <span className="text-gray-700">({review.sterne})</span>
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {review.kommentar || 'Keine Nachricht hinterlassen.'}
          </p>
        </div>
      ))}
    </div>
  );
}
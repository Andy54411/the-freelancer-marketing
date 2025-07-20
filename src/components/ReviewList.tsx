// /Users/andystaudinger/Taskilo/src/components/ReviewList.tsx
'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/firebase/clients';
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle, User as FiUser } from 'lucide-react';

// --- Functions Initialisierung (jetzt wird getReviewsCallable nur bei Bedarf genutzt) ---
// Wir initialisieren hier NUR die functionsInstance, um sie später zu nutzen.
// Die Callable-Instanz erstellen wir bedingt im useEffect.
const functionsInstance = getFunctions(app, 'europe-west1');

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
        // Fallback to HTTP endpoint if callable function fails
        try {
          // The httpsCallable function works for both production and emulators.
          // The Firebase client SDK automatically routes the request to the emulator if it's configured.
          const getReviewsCallable = httpsCallable<{ anbieterId: string }, Review[]>(
            functionsInstance,
            'getReviewsByProvider'
          );
          const result = await getReviewsCallable({ anbieterId });
          const data = result.data;

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
        } catch (callableError) {
          console.warn('Callable function failed, trying HTTP endpoint:', callableError);

          // Fallback to HTTP endpoint
          const response = await fetch(
            `https://europe-west1-tilvo-f142f.cloudfunctions.net/getReviewsByProviderHTTP`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ anbieterId }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (!Array.isArray(data)) {
            throw new Error('Ungültiges Datenformat vom HTTP Endpoint.');
          }

          setReviews(data);

          if (data.length > 0) {
            const total = data.reduce((sum: number, r: Review) => sum + (r.sterne || 0), 0);
            setAverage(Number((total / data.length).toFixed(1)));
          } else {
            setAverage(null);
          }
        }
      } catch (err: unknown) {
        console.error('Fehler beim Laden der Bewertungen:', err);

        let errorMessage = 'Ein unbekannter Fehler ist beim Laden der Bewertungen aufgetreten.';
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
        <p className="mt-2 text-sm">
          Bitte versuchen Sie es später noch einmal oder kontaktieren Sie den Support.
        </p>
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

      {reviews.map(review => (
        <div key={review.id} className="bg-white p-4 rounded-lg shadow border space-y-2">
          <div className="flex items-center gap-4">
            {review.kundeProfilePictureURL ? (
              <Image
                src={review.kundeProfilePictureURL}
                alt="Kunde"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <FiUser className="text-gray-500" />
              </div>
            )}
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

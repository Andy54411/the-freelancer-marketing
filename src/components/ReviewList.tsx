// /Users/andystaudinger/Taskilo/src/components/ReviewList.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle, User as FiUser } from 'lucide-react';

// --- Interfaces ---
interface Review {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number; _nanoseconds: number } | Date; // Behalten Sie das so, wie es vom Backend kommt
  // Unternehmensantwort
  antwort?: {
    text: string;
    antwortDatum: Date | { _seconds: number; _nanoseconds: number };
    antwortVon: string; // Company Name or ID
  };
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

// --- Hilfsfunktion zum Formatieren von Daten ---
function formatReviewDate(
  date: Date | { _seconds: number; _nanoseconds: number } | undefined
): string {
  if (!date) return '';

  let actualDate: Date;
  if (date instanceof Date) {
    actualDate = date;
  } else if (typeof date === 'object' && '_seconds' in date) {
    actualDate = new Date(date._seconds * 1000);
  } else {
    return '';
  }

  return actualDate.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
        // Directly use HTTP endpoint to avoid CORS issues with callable functions
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
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <FiUser className="text-gray-500" />
            </div>
            <div className="text-yellow-500 text-base font-medium">
              {renderStars(review.sterne)} <span className="text-gray-700">({review.sterne})</span>
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {review.kommentar || 'Keine Nachricht hinterlassen.'}
          </p>

          {/* Unternehmensantwort anzeigen, falls vorhanden */}
          {review.antwort && (
            <div className="mt-4 ml-6 border-l-2 border-blue-100 pl-4 bg-blue-50 rounded-r-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">U</span>
                </div>
                <span className="text-sm font-medium text-blue-700">
                  Antwort von {review.antwort.antwortVon}
                </span>
                <span className="text-xs text-gray-500">
                  {formatReviewDate(review.antwort.antwortDatum)}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.antwort.text}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

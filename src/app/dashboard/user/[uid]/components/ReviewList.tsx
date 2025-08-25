// src/components/ReviewList.tsx
'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clients'; // Importiere die konfigurierte functions-Instanz
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

// Interfaces
interface Review {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number; _nanoseconds: number } | Date;
}

interface ReviewListProps {
  anbieterId: string;
}

// Hilfsfunktion zum Rendern von Sternen
function renderStars(rating: number) {
  if (!rating || rating < 0) return '–';
  const fullStars = Math.floor(rating > 5 ? 5 : rating);
  const emptyStars = 5 - fullStars;
  return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
}

// ReviewList Komponente
export default function ReviewList({ anbieterId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!anbieterId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Für dieses Beispiel verwenden wir direkt httpsCallable, da die Emulator-Logik komplex sein kann.
        // Deine Logik mit dem direkten Fetch-Aufruf für den Emulator ist in Ordnung, aber dies ist eine Vereinfachung.
        const getReviewsCallable = httpsCallable<{ anbieterId: string }, { data: Review[] }>(
          functions,
          'getReviewsByProvider'
        );
        const result = await getReviewsCallable({ anbieterId });

        const data = result.data.data;

        if (!Array.isArray(data)) {
          throw new Error('Ungültiges Datenformat von der Cloud Function empfangen.');
        }

        setReviews(data);

        if (data.length > 0) {
          const total = data.reduce((sum, r) => sum + (r.sterne || 0), 0);
          setAverage(Number((total / data.length).toFixed(1)));
        } else {
          setAverage(null);
        }
      } catch (err: unknown) {

        let errorMessage = 'Bewertungen konnten nicht geladen werden.';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [anbieterId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <FiLoader className="animate-spin text-2xl text-[#14ad9f]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-center text-sm">
        <FiAlertCircle className="inline mr-2" />
        {error}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-center text-gray-500 py-4">Noch keine Bewertungen vorhanden.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Bewertungen ({reviews.length})</h3>
        {average !== null && (
          <p className="text-sm font-medium text-gray-700">
            Schnitt: <span className="text-yellow-500 font-bold">★ {average}</span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Image
                src={review.kundeProfilePictureURL || '/default-avatar.png'}
                alt="Kunde"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
              <div>
                <div className="text-yellow-500 text-lg">{renderStars(review.sterne)}</div>
              </div>
            </div>
            {review.kommentar && (
              <p className="text-sm text-gray-800 pt-3 mt-3 border-t border-gray-200">
                {review.kommentar}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

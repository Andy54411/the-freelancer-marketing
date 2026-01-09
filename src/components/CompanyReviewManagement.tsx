'use client';

import { useState, useEffect } from 'react';
import { FiMessageSquare, FiUser, FiLoader, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';
import ReviewReplyForm from './ReviewReplyForm';

interface Review {
  id: string;
  kundeId: string;
  sterne: number;
  kommentar: string;
  kundeProfilePictureURL?: string;
  erstellungsdatum?: { _seconds: number; _nanoseconds: number } | Date;
  antwort?: {
    text: string;
    antwortDatum: Date | { _seconds: number; _nanoseconds: number };
    antwortVon: string;
  };
}

interface CompanyReviewManagementProps {
  companyId: string;
  companyName: string;
}

export default function CompanyReviewManagement({
  companyId,
  companyName,
}: CompanyReviewManagementProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Hilfsfunktion zum Rendern von Sternen
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
  };

  // Hilfsfunktion zum Formatieren von Daten
  const formatReviewDate = (
    date: Date | { _seconds: number; _nanoseconds: number } | undefined
  ): string => {
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchReviews = async () => {
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
          body: JSON.stringify({ anbieterId: companyId }),
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
    } catch {
      setError('Fehler beim Laden der Bewertungen. Bitte versuchen Sie es später noch einmal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [companyId]);

  const handleReplySubmitted = () => {
    setReplyingTo(null);
    fetchReviews(); // Refresh reviews to show new reply
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FiLoader className="animate-spin text-2xl text-blue-500" />
        <span className="ml-2 text-gray-600">Bewertungen werden geladen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <FiAlertCircle className="inline mr-2" />
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center p-8">
        <FiMessageSquare className="mx-auto text-4xl text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Bewertungen</h3>
        <p className="text-gray-500">
          Sobald Kunden Ihr Unternehmen bewerten, werden die Bewertungen hier angezeigt.
        </p>
      </div>
    );
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.sterne, 0) / reviews.length;

  return (
    <div className="space-y-6">
      {/* Header with statistics */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bewertungen verwalten</h2>
            <p className="text-sm text-gray-600">
              {reviews.length} Bewertung{reviews.length !== 1 ? 'en' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-500">★ {averageRating.toFixed(1)}</div>
            <p className="text-sm text-gray-600">Durchschnitt</p>
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white p-6 rounded-lg shadow border">
            {/* Review header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {review.kundeProfilePictureURL ? (
                  <Image
                    src={review.kundeProfilePictureURL}
                    alt="Kunde"
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <FiUser className="text-gray-500" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-yellow-500 text-lg">{renderStars(review.sterne)}</div>
                    <span className="text-sm text-gray-500">
                      ({review.sterne} Stern{review.sterne !== 1 ? 'e' : ''})
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatReviewDate(review.erstellungsdatum)}
                  </p>
                </div>
              </div>
            </div>

            {/* Review content */}
            <div className="mb-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {review.kommentar || 'Keine Nachricht hinterlassen.'}
              </p>
            </div>

            {/* Existing reply */}
            {review.antwort ? (
              <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 rounded-r-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                  <span className="text-sm font-medium text-blue-700">Ihre Antwort</span>
                  <span className="text-xs text-gray-500">
                    {formatReviewDate(review.antwort.antwortDatum)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.antwort.text}</p>
              </div>
            ) : (
              /* Reply button or form */
              <div className="pt-4 border-t border-gray-200">
                {replyingTo === review.id ? (
                  <ReviewReplyForm
                    reviewId={review.id}
                    companyId={companyId}
                    companyName={companyName}
                    onReplySubmitted={handleReplySubmitted}
                    onCancel={handleCancelReply}
                  />
                ) : (
                  <button
                    onClick={() => setReplyingTo(review.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiMessageSquare />
                    Antworten
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

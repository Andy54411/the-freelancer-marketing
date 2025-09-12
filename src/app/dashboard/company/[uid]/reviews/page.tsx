'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface Review {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  customerEmail?: string;
  orderId?: string;
  createdAt: any;
  updatedAt?: any;
  providerId: string;
  customerId: string;
  providerResponse?: {
    message: string;
    date: any;
    respondedAt: any;
  };
}

interface ReviewItemProps {
  review: Review;
  onReplySubmitted: () => void;
}

function ReviewItem({ review, onReplySubmitted }: ReviewItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Bestehende Antwort als Standard laden
  useEffect(() => {
    if (review.providerResponse?.message) {
      setReplyText(review.providerResponse.message);
    }
  }, [review.providerResponse]);

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const reviewRef = doc(db, 'reviews', review.id);

      await updateDoc(reviewRef, {
        providerResponse: {
          message: replyText.trim(),
          date: serverTimestamp(),
          respondedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      setShowReplyForm(false);
      onReplySubmitted();
    } catch (err) {
      console.error('❌ Error saving provider response:', err);
      alert('Fehler beim Speichern der Antwort. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Rating Sterne rendern
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        className={`w-4 h-4 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // Datum formatieren
  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Unbekanntes Datum';

    try {
      const date = (timestamp as { toDate?: () => Date }).toDate
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string | number | Date);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Unbekanntes Datum';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {review.customerName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{review.customerName}</p>
              <div className="flex items-center mt-1">
                {renderStars(review.rating)}
                <span className="ml-2 text-sm text-gray-500">{formatDate(review.createdAt)}</span>
              </div>
            </div>
            {review.orderId && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Auftrag #{review.orderId.split('_').pop()}
              </span>
            )}
          </div>

          {/* Kundenkommentar */}
          {review.comment && <p className="mt-3 text-sm text-gray-700">{review.comment}</p>}

          {/* Anbieter-Antwort anzeigen */}
          {review.providerResponse?.message && (
            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-[#14ad9f] rounded-r-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#14ad9f]">Antwort des Anbieters</span>
                <span className="text-xs text-gray-500">
                  {formatDate(review.providerResponse.date)}
                </span>
              </div>
              <p className="text-sm text-gray-700">{review.providerResponse.message}</p>
            </div>
          )}

          {/* Antwort-Button */}
          <div className="mt-4">
            {!showReplyForm ? (
              <button
                onClick={() => setShowReplyForm(true)}
                className="text-sm text-[#14ad9f] hover:text-[#129488] font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                {review.providerResponse?.message ? 'Antwort bearbeiten' : 'Antworten'}
              </button>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Ihre Antwort auf diese Bewertung..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] text-sm"
                  rows={3}
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitReply}
                    disabled={submittingReply || !replyText.trim()}
                    className="px-4 py-2 bg-[#14ad9f] hover:bg-[#129488] disabled:bg-gray-300 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    {submittingReply ? 'Sendet...' : 'Antworten'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText(review.providerResponse?.message || '');
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-md transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reviews aus Firestore laden
  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    setError(null);

    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('providerId', '==', uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        reviewsQuery,
        snapshot => {
          const reviewsData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();

            return {
              id: doc.id,
              rating: data.rating || 0,
              comment: data.comment || data.review || '',
              customerName: data.customerName || 'Anonymer Kunde',
              customerEmail: data.customerEmail || '',
              orderId: data.orderId || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              providerId: data.providerId || '',
              customerId: data.customerId || '',
              providerResponse: data.providerResponse || null, // WICHTIG: Anbieter-Antwort laden
            } as Review;
          });

          setReviews(reviewsData);
          setLoading(false);
        },
        err => {
          console.error('❌ Error loading reviews:', err);
          setError('Fehler beim Laden der Bewertungen');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('❌ Error setting up reviews listener:', err);
      setError('Fehler beim Laden der Bewertungen');
      setLoading(false);
    }
  }, [uid]);

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  // Rating Sterne rendern
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <svg
        key={index}
        className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // Durchschnittsbewertung berechnen
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Bewertungen</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie Ihre Kundenbewertungen und antworten Sie auf Feedback
        </p>
      </div>

      {/* Statistiken */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{reviews.length}</div>
              <div className="text-sm text-gray-500">Bewertungen insgesamt</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
              <div className="flex justify-center mt-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-sm text-gray-500">Durchschnittsbewertung</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {reviews.filter(r => r.rating >= 4).length}
              </div>
              <div className="text-sm text-gray-500">Positive Bewertungen</div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Content */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Lade Bewertungen...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bewertungen vorhanden</h3>
            <p className="text-gray-500">
              Sobald Kunden Ihr Unternehmen bewerten, werden die Bewertungen hier angezeigt.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reviews.map(review => (
              <ReviewItem key={review.id} review={review} onReplySubmitted={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

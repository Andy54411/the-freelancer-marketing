'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy, startAfter } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  Star,
  Award,
  ThumbsUp,
  ThumbsDown,
  VerifiedIcon,
  RotateCcw,
  ChevronDown,
  Languages,
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  reviewerCountry?: string;
  date: any;
  projectTitle?: string;
  projectPrice?: string;
  projectDuration?: string;
  isVerified?: boolean;
  isReturningCustomer?: boolean;
  helpfulVotes?: number;
  providerResponse?: {
    comment: string;
    date: any;
  };
}

interface ProviderReviewsProps {
  providerId: string;
  reviewCount?: number;
  averageRating?: number;
}

export default function ProviderReviews({
  providerId,
  reviewCount = 0,
  averageRating = 0,
}: ProviderReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [translatedReviews, setTranslatedReviews] = useState<Map<string, string>>(new Map());
  const [translatingReviews, setTranslatingReviews] = useState<Set<string>>(new Set());
  const [translatedResponses, setTranslatedResponses] = useState<Map<string, string>>(new Map());
  const [translatingResponses, setTranslatingResponses] = useState<Set<string>>(new Set());

  const REVIEWS_PER_PAGE = 5;

  useEffect(() => {
    loadReviews(true);
  }, [providerId]);

  const loadReviews = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
        setReviews([]);
        setLastVisible(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      let reviewsQuery = query(
        collection(db, 'reviews'),
        where('providerId', '==', providerId),
        orderBy('date', 'desc'),
        limit(REVIEWS_PER_PAGE)
      );

      if (!initial && lastVisible) {
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', providerId),
          orderBy('date', 'desc'),
          startAfter(lastVisible),
          limit(REVIEWS_PER_PAGE)
        );
      }

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          rating: data.rating || 0,
          comment: data.comment || '',
          reviewerName: data.reviewerName || 'Anonymer Nutzer',
          reviewerCountry: data.reviewerCountry,
          date: data.date,
          projectTitle: data.projectTitle,
          projectPrice: data.projectPrice,
          projectDuration: data.projectDuration,
          isVerified: data.isVerified || false,
          isReturningCustomer: data.isReturningCustomer || false,
          helpfulVotes: data.helpfulVotes || 0,
          providerResponse: data.providerResponse,
        };
      }) as Review[];

      if (initial) {
        setReviews(reviewsData);
      } else {
        setReviews(prev => [...prev, ...reviewsData]);
      }

      // Set pagination state
      if (reviewsSnapshot.docs.length < REVIEWS_PER_PAGE) {
        setHasMore(false);
      }

      if (reviewsSnapshot.docs.length > 0) {
        setLastVisible(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1]);
      }
    } catch (error) {

    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const toggleExpandReview = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const formatDate = (date: any) => {
    if (!date) return 'Datum unbekannt';
    const reviewDate = date.toDate?.() || new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - reviewDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'vor 1 Tag';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    if (diffDays < 30) return `vor ${Math.ceil(diffDays / 7)} Wochen`;
    if (diffDays < 365) return `vor ${Math.ceil(diffDays / 30)} Monaten`;
    return `vor ${Math.ceil(diffDays / 365)} Jahren`;
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${sizeClass} ${
              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getAvatarInitial = (name: string) => {
    if (!name || typeof name !== 'string') return '?';
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    if (!name || typeof name !== 'string') return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const translateText = async (text: string, reviewId: string, isResponse: boolean = false) => {
    // Wenn bereits übersetzt, zeige Original
    if (isResponse) {
      if (translatedResponses.has(reviewId)) {
        setTranslatedResponses(prev => {
          const newMap = new Map(prev);
          newMap.delete(reviewId);
          return newMap;
        });
        return;
      }
      setTranslatingResponses(prev => new Set([...prev, reviewId]));
    } else {
      if (translatedReviews.has(reviewId)) {
        setTranslatedReviews(prev => {
          const newMap = new Map(prev);
          newMap.delete(reviewId);
          return newMap;
        });
        return;
      }
      setTranslatingReviews(prev => new Set([...prev, reviewId]));
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          targetLang: 'de',
        }),
      });

      if (!response.ok) {
        throw new Error('Übersetzung fehlgeschlagen');
      }

      const data = await response.json();

      if (isResponse) {
        setTranslatedResponses(prev => new Map([...prev, [reviewId, data.translatedText]]));
      } else {
        setTranslatedReviews(prev => new Map([...prev, [reviewId, data.translatedText]]));
      }
    } catch (error) {

      // Fallback: zeige Original-Text
    } finally {
      if (isResponse) {
        setTranslatingResponses(prev => {
          const newSet = new Set(prev);
          newSet.delete(reviewId);
          return newSet;
        });
      } else {
        setTranslatingReviews(prev => {
          const newSet = new Set(prev);
          newSet.delete(reviewId);
          return newSet;
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Bewertungen ({reviewCount})
        </h2>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse border-b border-gray-200 dark:border-gray-700 pb-6"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Bewertungen ({reviewCount})
      </h2>

      {/* Rating Summary */}
      {averageRating > 0 && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(averageRating), 'md')}
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {reviewCount} Bewertungen
              </div>
            </div>
          </div>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map(review => {
            const isExpanded = expandedReviews.has(review.id);
            const reviewComment = review.comment || '';
            const shouldTruncate = reviewComment.length > 200;
            const displayComment =
              isExpanded || !shouldTruncate ? reviewComment : truncateText(reviewComment);

            return (
              <div
                key={review.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0"
              >
                <div className="flex flex-col space-y-4">
                  {/* User Header */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 ${getAvatarColor(review.reviewerName || 'Anonymous')} rounded-full flex items-center justify-center text-white font-semibold`}
                      >
                        {getAvatarInitial(review.reviewerName || 'Anonymous')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {review.reviewerName || 'Anonymer Nutzer'}
                        </p>
                        {review.isVerified && (
                          <div className="flex items-center space-x-1 text-sm">
                            <VerifiedIcon className="w-4 h-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              Verifiziert
                            </span>
                          </div>
                        )}
                        {review.isReturningCustomer && (
                          <div className="flex items-center space-x-1 text-sm">
                            <RotateCcw className="w-4 h-4 text-blue-500" />
                            <span className="text-[#14ad9f] dark:text-[#14ad9f] font-medium">
                              Wiederkehrender Kunde
                            </span>
                          </div>
                        )}
                      </div>
                      {review.reviewerCountry && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {review.reviewerCountry}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rating and Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                        <strong className="text-lg font-semibold ml-2">{review.rating}</strong>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(review.date)}
                      </span>
                    </div>
                  </div>

                  {/* Project Title */}
                  {review.projectTitle && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Projekt: {review.projectTitle}
                      </p>
                    </div>
                  )}

                  {/* Review Text */}
                  {(reviewComment || translatedReviews.has(review.id)) && (
                    <div className="prose max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {translatedReviews.has(review.id)
                          ? translatedReviews.get(review.id)
                          : displayComment}
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleExpandReview(review.id)}
                            className="text-[#14ad9f] dark:text-[#14ad9f] hover:underline ml-1"
                          >
                            {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                          </button>
                        )}
                      </p>

                      {/* Translation Button */}
                      {reviewComment && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => translateText(reviewComment, review.id)}
                            disabled={translatingReviews.has(review.id)}
                            className="inline-flex items-center gap-1 text-xs text-[#14ad9f] hover:text-teal-600 font-medium disabled:opacity-50"
                          >
                            {translatingReviews.has(review.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-[#14ad9f]"></div>
                                Übersetze...
                              </>
                            ) : (
                              <>
                                <Languages className="w-3 h-3" />
                                {translatedReviews.has(review.id)
                                  ? 'Original anzeigen'
                                  : 'Übersetzen'}
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project Details */}
                  {(review.projectPrice || review.projectDuration) && (
                    <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-4">
                        {review.projectPrice && (
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {review.projectPrice}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">Preis</p>
                          </div>
                        )}
                        {review.projectPrice && review.projectDuration && (
                          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                        )}
                        {review.projectDuration && (
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {review.projectDuration}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">Dauer</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Provider Response */}
                  {review.providerResponse && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ml-8">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          A
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            Antwort des Anbieters
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {translatedResponses.has(review.id)
                              ? translatedResponses.get(review.id)
                              : review.providerResponse.comment}
                          </p>

                          {/* Translation Button for Response */}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() =>
                                translateText(review.providerResponse!.comment, review.id, true)
                              }
                              disabled={translatingResponses.has(review.id)}
                              className="inline-flex items-center gap-1 text-xs text-[#14ad9f] hover:text-teal-600 font-medium disabled:opacity-50"
                            >
                              {translatingResponses.has(review.id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-[#14ad9f]"></div>
                                  Übersetze...
                                </>
                              ) : (
                                <>
                                  <Languages className="w-3 h-3" />
                                  {translatedResponses.has(review.id)
                                    ? 'Original anzeigen'
                                    : 'Übersetzen'}
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDate(review.providerResponse.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Helpful Buttons */}
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Hilfreich?</span>
                    <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span>Ja</span>
                      {review.helpfulVotes && review.helpfulVotes > 0 && (
                        <span className="text-xs">({review.helpfulVotes})</span>
                      )}
                    </button>
                    <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                      <span>Nein</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={() => loadReviews(false)}
                disabled={loadingMore}
                className="bg-[#14ad9f] hover:bg-teal-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Lädt...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Weitere Bewertungen laden
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Noch keine Bewertungen vorhanden</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Star, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ReviewRequestService, ReviewRequest } from '@/services/reviewRequestService';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function OrderReviewPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewRequest | null>(null);
  
  // Form State
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  
  const loadReviewRequest = useCallback(async () => {
    try {
      const request = await ReviewRequestService.getByOrderToken(token);
      
      if (!request) {
        setError('Dieser Bewertungslink ist ungültig.');
        setLoading(false);
        return;
      }
      
      if (request.orderReviewCompletedAt) {
        setError('Sie haben diesen Auftrag bereits bewertet.');
        setLoading(false);
        return;
      }
      
      const now = new Date().getTime();
      const expiresAt = request.orderReviewExpiresAt?.toMillis() || 0;
      
      if (expiresAt < now) {
        setError('Dieser Bewertungslink ist abgelaufen.');
        setLoading(false);
        return;
      }
      
      setReviewData(request);
      setLoading(false);
    } catch (_err) {
      setError('Ein Fehler ist aufgetreten.');
      setLoading(false);
    }
  }, [token]);
  
  useEffect(() => {
    loadReviewRequest();
  }, [loadReviewRequest]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Bitte wählen Sie eine Sternebewertung');
      return;
    }
    
    if (comment.length < 10) {
      toast.error('Bitte schreiben Sie mindestens 10 Zeichen');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order',
          token,
          rating,
          comment,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSubmitted(true);
        toast.success('Vielen Dank für Ihre Bewertung!');
      } else {
        toast.error(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (_err) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#14ad9f] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Bewertung nicht möglich</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="https://taskilo.de"
            className="inline-block bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-600 transition-colors"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vielen Dank!</h1>
          <p className="text-gray-600 mb-4">
            Ihre Bewertung wurde erfolgreich übermittelt.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            In 2 Tagen erhalten Sie eine weitere E-Mail, um Ihre Gesamterfahrung mit {reviewData?.providerName} zu bewerten.
          </p>
          <a 
            href="https://taskilo.de"
            className="inline-block bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-600 transition-colors"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={150}
            height={50}
            className="mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wie war Ihr Auftrag?
          </h1>
          <p className="text-gray-600">
            Bewerten Sie Ihre Erfahrung mit <strong>{reviewData?.providerName}</strong>
          </p>
        </div>
        
        {/* Order Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#14ad9f]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{reviewData?.orderTitle}</h3>
              <p className="text-sm text-gray-500">Abgeschlossener Auftrag</p>
            </div>
          </div>
        </div>
        
        {/* Review Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          {/* Star Rating */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Wie zufrieden waren Sie insgesamt?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {rating === 1 && 'Sehr unzufrieden'}
              {rating === 2 && 'Unzufrieden'}
              {rating === 3 && 'Neutral'}
              {rating === 4 && 'Zufrieden'}
              {rating === 5 && 'Sehr zufrieden'}
            </p>
          </div>
          
          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ihre Bewertung
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Beschreiben Sie Ihre Erfahrung..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/10 Zeichen (Minimum)
            </p>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full bg-linear-to-r from-[#14ad9f] to-teal-600 text-white py-4 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              'Bewertung absenden'
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Ihre Bewertung ist öffentlich sichtbar und hilft anderen Kunden.
          </p>
        </form>
      </div>
    </div>
  );
}

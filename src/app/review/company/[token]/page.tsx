'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ReviewRequestService, ReviewRequest } from '@/services/reviewRequestService';
import toast from 'react-hot-toast';
import Image from 'next/image';

// 10 Bewertungskategorien
const REVIEW_CATEGORIES = [
  { key: 'qualityOfWork', label: 'Qualität der Arbeit', description: 'Wie bewerten Sie die Qualität der erbrachten Leistung?' },
  { key: 'communication', label: 'Kommunikation', description: 'Wie gut war die Kommunikation vor und während des Auftrags?' },
  { key: 'punctuality', label: 'Pünktlichkeit', description: 'War der Dienstleister pünktlich und hat Termine eingehalten?' },
  { key: 'professionalism', label: 'Professionalität', description: 'Wie professionell war das Auftreten des Dienstleisters?' },
  { key: 'pricePerformance', label: 'Preis-Leistungs-Verhältnis', description: 'Entsprach der Preis der erbrachten Leistung?' },
  { key: 'reliability', label: 'Zuverlässigkeit', description: 'War der Dienstleister zuverlässig und vertrauenswürdig?' },
  { key: 'friendliness', label: 'Freundlichkeit', description: 'Wie freundlich und zuvorkommend war der Dienstleister?' },
  { key: 'expertise', label: 'Fachkompetenz', description: 'Wie kompetent war der Dienstleister in seinem Fachgebiet?' },
  { key: 'cleanliness', label: 'Sauberkeit/Ordnung', description: 'War der Arbeitsbereich sauber und ordentlich?' },
  { key: 'recommendation', label: 'Weiterempfehlung', description: 'Wie wahrscheinlich würden Sie diesen Dienstleister weiterempfehlen?' },
];

export default function CompanyReviewPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewRequest | null>(null);
  
  // Form State - alle 10 Kategorien mit 1-10 Skala
  const [ratings, setRatings] = useState<Record<string, number>>({
    qualityOfWork: 0,
    communication: 0,
    punctuality: 0,
    professionalism: 0,
    pricePerformance: 0,
    reliability: 0,
    friendliness: 0,
    expertise: 0,
    cleanliness: 0,
    recommendation: 0,
  });
  const [overallComment, setOverallComment] = useState('');
  const [wouldHireAgain, setWouldHireAgain] = useState<boolean | null>(null);
  
  const loadReviewRequest = useCallback(async () => {
    try {
      const request = await ReviewRequestService.getByCompanyToken(token);
      
      if (!request) {
        setError('Dieser Bewertungslink ist ungültig.');
        setLoading(false);
        return;
      }
      
      if (request.companyReviewCompletedAt) {
        setError('Sie haben diese Firmenbewertung bereits abgegeben.');
        setLoading(false);
        return;
      }
      
      if (request.companyReviewExpiresAt) {
        const now = new Date().getTime();
        const expiresAt = request.companyReviewExpiresAt.toMillis();
        
        if (expiresAt < now) {
          setError('Dieser Bewertungslink ist abgelaufen.');
          setLoading(false);
          return;
        }
      }
      
      setReviewData(request);
      setLoading(false);
    } catch {
      setError('Ein Fehler ist aufgetreten.');
      setLoading(false);
    }
  }, [token]);
  
  useEffect(() => {
    loadReviewRequest();
  }, [loadReviewRequest]);
  
  const handleRatingChange = (key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    const unratedCategories = REVIEW_CATEGORIES.filter(cat => ratings[cat.key] === 0);
    if (unratedCategories.length > 0) {
      toast.error(`Bitte bewerten Sie alle Kategorien`);
      return;
    }
    
    if (overallComment.length < 10) {
      toast.error('Bitte schreiben Sie mindestens 10 Zeichen');
      return;
    }
    
    if (wouldHireAgain === null) {
      toast.error('Bitte beantworten Sie die Frage zur Wiederbuchung');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'company',
          token,
          ...ratings,
          overallComment,
          wouldHireAgain,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSubmitted(true);
        toast.success('Vielen Dank für Ihre detaillierte Bewertung!');
      } else {
        toast.error(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Berechne Durchschnitt
  const averageRating = Object.values(ratings).reduce((a, b) => a + b, 0) / 10;
  const completedCount = Object.values(ratings).filter(r => r > 0).length;
  
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
          <p className="text-gray-600 mb-6">
            Ihre detaillierte Bewertung hilft uns, die Qualität auf Taskilo sicherzustellen.
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
    <div className="min-h-screen bg-linear-to-b from-teal-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
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
            Detaillierte Bewertung
          </h1>
          <p className="text-gray-600">
            Bewerten Sie <strong>{reviewData?.providerName}</strong> in 10 Kategorien
          </p>
        </div>
        
        {/* Progress Indicator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Fortschritt</span>
            <span className="text-sm text-gray-500">{completedCount}/10 bewertet</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / 10) * 100}%` }}
            />
          </div>
          {averageRating > 0 && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Durchschnitt: <strong>{averageRating.toFixed(1)}</strong> von 10
            </p>
          )}
        </div>
        
        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Categories */}
          {REVIEW_CATEGORIES.map((category, index) => (
            <div key={category.key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[#14ad9f]">
                    {index + 1}/10
                  </span>
                  <h3 className="font-semibold text-gray-900">{category.label}</h3>
                </div>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
              
              {/* 1-10 Rating Selector */}
              <div className="flex gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleRatingChange(category.key, num)}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                      ratings[category.key] === num
                        ? 'bg-[#14ad9f] text-white shadow-lg scale-105'
                        : ratings[category.key] > 0 && ratings[category.key] >= num
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              {/* Rating Label */}
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>Sehr schlecht</span>
                <span>Ausgezeichnet</span>
              </div>
            </div>
          ))}
          
          {/* Would Hire Again */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Würden Sie diesen Dienstleister erneut beauftragen?
            </h3>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setWouldHireAgain(true)}
                className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                  wouldHireAgain === true
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Ja, auf jeden Fall
              </button>
              <button
                type="button"
                onClick={() => setWouldHireAgain(false)}
                className={`flex-1 py-4 rounded-lg font-semibold transition-all ${
                  wouldHireAgain === false
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Eher nicht
              </button>
            </div>
          </div>
          
          {/* Overall Comment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Ihr Gesamteindruck
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Beschreiben Sie Ihre Gesamterfahrung mit diesem Dienstleister.
            </p>
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="Was hat Ihnen besonders gefallen? Was könnte verbessert werden?"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {overallComment.length}/10 Zeichen (Minimum)
            </p>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || completedCount < 10 || wouldHireAgain === null}
            className="w-full bg-linear-to-r from-[#14ad9f] to-teal-600 text-white py-4 rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
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
          
          <p className="text-xs text-gray-500 text-center">
            Diese Bewertung wird intern verwendet und hilft uns, die Qualität der Dienstleister zu überwachen.
          </p>
        </form>
      </div>
    </div>
  );
}

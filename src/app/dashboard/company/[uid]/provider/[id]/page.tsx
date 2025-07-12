'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Star, MapPin, ArrowLeft, Briefcase, Clock, Award, Users, MessageCircle, Calendar } from 'lucide-react';
import DirectChatModal from '@/components/DirectChatModal';
import ResponseTimeDisplay from '@/components/ResponseTimeDisplay';
import { useAuth } from '@/contexts/AuthContext';

interface Provider {
  id: string;
  companyName?: string;
  userName?: string;
  profilePictureFirebaseUrl?: string;
  profilePictureURL?: string;
  photoURL?: string;
  bio?: string;
  description?: string;
  location?: string;
  skills?: string[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  isCompany?: boolean;
  priceRange?: string;
  responseTime?: string;
  hourlyRate?: number;
  email?: string;
  phone?: string;
  website?: string;
  founded?: string;
  teamSize?: string;
  languages?: string[];
  portfolio?: any[];
  services?: string[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  date: any;
  projectTitle?: string;
}

export default function CompanyProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const companyUid = params.uid as string;
  const providerId = params.id as string;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  
  // Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    loadProviderData();
    loadCompanyData();
    loadReviews();
  }, [providerId]);

  const loadProviderData = async () => {
    try {
      setLoading(true);

      // Erst in der firma Collection suchen
      const firmaDoc = await getDoc(doc(db, 'firma', providerId));
      
      if (firmaDoc.exists()) {
        const data = firmaDoc.data();
        setProvider({
          id: firmaDoc.id,
          companyName: data.companyName,
          profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
          profilePictureURL: data.profilePictureURL,
          photoURL: data.photoURL,
          bio: data.description || data.bio,
          description: data.description,
          location: data.location || `${data.companyCity || ''}, ${data.companyCountry || ''}`.trim().replace(/^,\s*/, ''),
          skills: data.services || data.skills || [],
          selectedCategory: data.selectedCategory,
          selectedSubcategory: data.selectedSubcategory,
          rating: data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          completedJobs: data.completedJobs || 0,
          isCompany: true,
          priceRange: data.priceRange,
          responseTime: data.responseTime,
          hourlyRate: data.hourlyRate,
          email: data.email,
          phone: data.phone,
          website: data.website,
          founded: data.founded,
          teamSize: data.teamSize,
          languages: data.languages || [],
          portfolio: data.portfolio || [],
          services: data.services || []
        });
      } else {
        // Falls nicht in firma gefunden, in users suchen
        const userDoc = await getDoc(doc(db, 'users', providerId));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProvider({
            id: userDoc.id,
            userName: data.userName || data.displayName,
            profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
            profilePictureURL: data.profilePictureURL,
            photoURL: data.photoURL,
            bio: data.bio,
            location: data.location,
            skills: data.skills || [],
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            completedJobs: data.completedJobs || 0,
            isCompany: false,
            priceRange: data.priceRange,
            responseTime: data.responseTime,
            hourlyRate: data.hourlyRate,
            email: data.email,
            phone: data.phone,
            website: data.website,
            languages: data.languages || [],
            portfolio: data.portfolio || []
          });
        } else {
          console.error('Provider nicht gefunden');
          router.push(`/dashboard/company/${companyUid}`);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Provider-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    if (!companyUid) return;
    
    try {
      const firmaDoc = await getDoc(doc(db, 'firma', companyUid));
      if (firmaDoc.exists()) {
        const data = firmaDoc.data();
        setCompanyName(data.companyName || 'Unbekanntes Unternehmen');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Unternehmensdaten:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('providerId', '==', providerId),
        limit(10)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];

      // Sortiere nach Datum im Client
      reviewsData.sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(0);
        const dateB = b.date?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setReviews(reviewsData);
    } catch (error) {
      console.error('Fehler beim Laden der Bewertungen:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const openChatWithProvider = () => {
    if (provider) {
      setChatModalOpen(true);
    }
  };

  const getProfileImage = () => {
    return provider?.profilePictureFirebaseUrl ||
      provider?.profilePictureURL ||
      provider?.photoURL ||
      '/images/default-avatar.jpg';
  };

  const getProviderName = () => {
    return provider?.companyName || provider?.userName || 'Unbekannter Anbieter';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Anbieter nicht gefunden
          </h1>
          <button
            onClick={() => router.push(`/dashboard/company/${companyUid}`)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-[#14ad9f] transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Anbieter-Profil
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Provider Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <img
                    src={getProfileImage()}
                    alt={getProviderName()}
                    className="w-24 h-24 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                    }}
                  />
                  {provider.isCompany && (
                    <div className="absolute -bottom-2 -right-2 bg-[#14ad9f] text-white text-xs px-2 py-1 rounded-full">
                      PRO
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {getProviderName()}
                  </h1>

                  {provider.location && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                      <MapPin className="w-4 h-4" />
                      {provider.location}
                    </div>
                  )}

                  {/* Rating */}
                  {(provider.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < Math.floor(provider.rating ?? 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {(provider.rating ?? 0).toFixed(1)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        ({provider.reviewCount} Bewertungen)
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
                    {provider.completedJobs && provider.completedJobs > 0 && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {provider.completedJobs} Projekte abgeschlossen
                      </div>
                    )}
                    {provider.responseTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Antwortet in {provider.responseTime}
                      </div>
                    )}
                    {provider.teamSize && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {provider.teamSize} Mitarbeiter
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:items-end">
                  {provider.hourlyRate && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#14ad9f]">
                        €{provider.hourlyRate}/h
                      </div>
                      <div className="text-sm text-gray-500">
                        Stundensatz
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={openChatWithProvider}
                    className="bg-[#14ad9f] hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Jetzt kontaktieren
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            {(provider.bio || provider.description) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Über {provider.isCompany ? 'das Unternehmen' : 'mich'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {provider.bio || provider.description}
                </p>
              </div>
            )}

            {/* Skills & Services */}
            {provider.skills && provider.skills.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Fähigkeiten & Services
                </h2>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-[#14ad9f]/10 text-[#14ad9f] px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Bewertungen ({provider.reviewCount || 0})
              </h2>

              {reviewsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-16 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mt-2"></div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {review.reviewerName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {review.date?.toDate?.()?.toLocaleDateString('de-DE') || 'Datum unbekannt'}
                        </span>
                      </div>
                      {review.projectTitle && (
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Projekt: {review.projectTitle}
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-400">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Noch keine Bewertungen vorhanden
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Kontaktinformationen
              </h3>
              <div className="space-y-3">
                {provider.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      E-Mail
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {provider.email}
                    </p>
                  </div>
                )}
                {provider.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Telefon
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {provider.phone}
                    </p>
                  </div>
                )}
                {provider.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Website
                    </label>
                    <a
                      href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#14ad9f] hover:text-teal-600 break-all"
                    >
                      {provider.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Antwortzeit-Garantie */}
            <ResponseTimeDisplay 
              providerId={providerId}
              guaranteeHours={24}
              showDetailed={true}
            />

            {/* Additional Info */}
            {(provider.founded || provider.languages?.length) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Weitere Informationen
                </h3>
                <div className="space-y-3">
                  {provider.founded && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Gegründet
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {provider.founded}
                      </p>
                    </div>
                  )}
                  {provider.languages && provider.languages.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Sprachen
                      </label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {provider.languages.map((language, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Schnellaktionen
              </h3>
              <div className="space-y-3">
                <button
                  onClick={openChatWithProvider}
                  className="w-full bg-[#14ad9f] hover:bg-teal-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Nachricht senden
                </button>
                <button
                  onClick={() => {/* Implementiere Terminbuchung */}}
                  className="w-full border border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Termin buchen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Chat Modal */}
      {provider && (
        <DirectChatModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          providerId={provider.id}
          providerName={getProviderName()}
          companyId={companyUid}
          companyName={companyName}
        />
      )}
    </div>
  );
}

// /Users/andystaudinger/Taskilo/src/app/profile/[username]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, app } from '@/firebase/clients'; // Deine Firebase-Client-Initialisierung
import { User as FirebaseUser, getAuth } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link'; // HINZUGEFÜGT: Import für Link
import ProviderReviews from '@/components/ProviderReviews';
import {
  FiMapPin,
  FiMessageSquare,
  FiStar,
  FiAward,
  FiBriefcase,
  FiBookOpen,
  FiHeart,
  FiPlusCircle,
  FiEdit3,
  FiShare2,
  FiEye,
  FiLoader,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiZap,
  FiChevronDown,
} from 'react-icons/fi'; // HINZUGEFÜGT: FiLoader, FiAlertCircle
import Header from '@/components/Header'; // Dein existierender Header

const auth = getAuth(app);

// Typdefinitionen (ggf. in eine zentrale types.ts auslagern)
interface UserProfile {
  uid: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  country?: string; // z.B. "Deutschland"
  city?: string;
  memberSince?: any; // Firestore Timestamp oder Date-String
  description?: string;
  languages?: { language: string; proficiency: string }[];
  skills?: string[];
  education?: { school: string; degree: string; year: string }[];
  certifications?: { name: string; from: string; year: string }[];
  user_type?: 'kunde' | 'firma'; // Oder spezifischere Typen
  // Spezifische Felder für "firma"
  companyName?: string;
  servicesOffered?: {
    category: string;
    subcategory: string;
    description: string;
    price?: string;
  }[];
  portfolio?: { title: string; description: string; imageUrl?: string; projectUrl?: string }[];
  hourlyRate?: number;
  responseTime?: number; // in hours
  completionRate?: number; // percentage
  totalOrders?: number;
  isOnline?: boolean;
  badges?: string[]; // e.g., ["Top Rated", "Fast Delivery"]
  // ... weitere Felder
}

interface Review {
  id: string;
  reviewerName: string;
  reviewerImage?: string;
  rating: number;
  comment: string;
  date: any; // Firestore Timestamp oder Date-String
}

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  price: number;
  description: string;
  imageUrl?: string;
}

const UserProfilePage = () => {
  const router = useRouter();
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [expandedFaq, setExpandedFaq] = useState(-1);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, []);

  useEffect(() => {
    if (!username) return;

    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        // KRITISCHE KORREKTUR: Erst companies, dann users Collection für Username-Suche
        let userDoc: any = null;
        let userData: UserProfile | null = null;

        // 1. Prüfe companies Collection für Username
        const companiesRef = collection(db, 'companies');
        const companiesQuery = query(companiesRef, where('username', '==', username), limit(1));
        const companiesSnapshot = await getDocs(companiesQuery);

        if (!companiesSnapshot.empty) {
          userDoc = companiesSnapshot.docs[0];
          userData = userDoc.data() as UserProfile;
        } else {
          // 2. Fallback: users Collection für Username
          const usersRef = collection(db, 'users');
          const usersQuery = query(usersRef, where('username', '==', username), limit(1));
          const usersSnapshot = await getDocs(usersQuery);

          if (!usersSnapshot.empty) {
            userDoc = usersSnapshot.docs[0];
            userData = userDoc.data() as UserProfile;
          }
        }

        if (!userDoc || !userData) {
          setError('Benutzerprofil nicht gefunden.');
          setLoading(false);
          return;
        }

        setProfile({ ...userData, uid: userDoc.id }); // UID hinzufügen

        // Beispiel: Lade Dienstleistungen (Gigs) des Nutzers, falls es ein Anbieter ist
        // Check if user is a company by checking companies collection
        const companyDoc = await getDoc(doc(db, 'companies', userDoc.id));
        if (companyDoc.exists()) {
          const servicesRef = collection(db, 'services'); // Oder wie deine Sammlung heißt
          const servicesQuery = query(
            servicesRef,
            where('providerUid', '==', userDoc.id),
            limit(5)
          );
          const servicesSnapshot = await getDocs(servicesQuery);
          setServices(
            servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ServiceItem)
          );
        }

        // Beispiel: Lade Bewertungen für den Nutzer
        const reviewsRef = collection(db, 'reviews'); // Oder wie deine Sammlung heißt
        const reviewsQuery = query(
          reviewsRef,
          where('reviewedUid', '==', userDoc.id),
          orderBy('date', 'desc'),
          limit(5)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Review));
      } catch (err) {
        setError('Fehler beim Laden des Profils.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [username]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
        <p className="ml-3">Profil wird geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <FiAlertCircle className="mr-2" /> {error}
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-10">Benutzerprofil nicht gefunden.</div>;
  }

  const isOwnProfile = currentUser?.uid === profile.uid;

  return (
    <>
      <Header />
      <main className="bg-gray-100 py-8 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Linke Spalte: Profil-Sidebar */}
            <aside className="md:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
                    src={profile.photoURL || '/default-avatar.png'}
                    alt={profile.displayName || profile.username || 'Profilbild'}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                  />
                  {isOwnProfile && (
                    <button className="absolute bottom-0 right-0 bg-[#14ad9f] text-white p-2 rounded-full hover:bg-teal-600 transition-colors">
                      <FiEdit3 size={16} />
                    </button>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {profile.displayName || profile.username}
                  {profile.isOnline && <span className="w-3 h-3 bg-green-500 rounded-full"></span>}
                </h1>
                {profile.companyName && (
                  <p className="text-md text-gray-600">{profile.companyName}</p>
                )}

                {/* Badges */}
                {profile.badges && profile.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.badges.map(badge => (
                      <span
                        key={badge}
                        className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                      >
                        <FiAward size={12} /> {badge}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-2">
                  {profile.description 
                    ? (profile.description.replace(/<[^>]*>/g, '').substring(0, 100) + (profile.description.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''))
                    : 'Keine Beschreibung vorhanden.'}
                </p>

                {isOwnProfile ? (
                  <Link
                    href={`/dashboard/user/${profile.uid}/settings`}
                    className="mt-4 inline-block bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full"
                  >
                    Profil bearbeiten
                  </Link>
                ) : (
                  <div className="mt-4 space-y-2">
                    <button className="w-full bg-[#14ad9f] text-white font-semibold py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2">
                      <FiMessageSquare /> Service anfragen
                    </button>
                    <button className="w-full border border-[#14ad9f] text-[#14ad9f] font-semibold py-2 px-4 rounded-lg hover:bg-[#14ad9f] hover:text-white transition-colors flex items-center justify-center gap-2">
                      <FiShare2 /> Profil teilen
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold text-gray-700">Statistiken</h2>
                  <FiTrendingUp className="text-[#14ad9f]" />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Standort:</span>{' '}
                    <span className="font-medium text-gray-700 flex items-center gap-1">
                      <FiMapPin size={12} /> {profile.city || 'N/A'}, {profile.country || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mitglied seit:</span>{' '}
                    <span className="font-medium text-gray-700">
                      {profile.memberSince
                        ? new Date(profile.memberSince.seconds * 1000).toLocaleDateString('de-DE')
                        : 'N/A'}
                    </span>
                  </div>

                  {/* Fiverr-ähnliche Metriken */}
                  {profile.responseTime && (
                    <div className="flex justify-between">
                      <span>Antwortzeit:</span>{' '}
                      <span className="font-medium text-green-600 flex items-center gap-1">
                        <FiClock size={12} /> ~{profile.responseTime}h
                      </span>
                    </div>
                  )}
                  {profile.completionRate && (
                    <div className="flex justify-between">
                      <span>Erfolgsrate:</span>{' '}
                      <span className="font-medium text-green-600 flex items-center gap-1">
                        <FiCheckCircle size={12} /> {profile.completionRate}%
                      </span>
                    </div>
                  )}
                  {profile.totalOrders && (
                    <div className="flex justify-between">
                      <span>Projekte:</span>{' '}
                      <span className="font-medium text-gray-700">{profile.totalOrders}</span>
                    </div>
                  )}

                  {/* Bewertungsschnitt */}
                  {reviews.length > 0 && (
                    <div className="flex justify-between">
                      <span>Bewertung:</span>
                      <span className="font-medium text-yellow-600 flex items-center gap-1">
                        <FiStar size={12} className="fill-current" />
                        {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(
                          1
                        )}{' '}
                        ({reviews.length})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {profile.languages && profile.languages.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">Sprachen</h2>
                  <ul className="space-y-1 text-sm">
                    {profile.languages.map(lang => (
                      <li key={lang.language}>
                        {lang.language} - <span className="text-gray-600">{lang.proficiency}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold text-gray-700 mb-3">Fähigkeiten</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map(skill => (
                      <span
                        key={skill}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Rechte Spalte: Hauptinhalt (Services, Portfolio, Bewertungen) */}
            <section className="md:col-span-2 space-y-8">
              {/* Schnell-Buchung Banner für Dienstleister */}
              {services.length > 0 && !isOwnProfile && (
                <div className="bg-linear-to-r from-[#14ad9f] to-teal-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Bereit für Ihr Projekt?</h3>
                      <p className="text-teal-100">
                        Starten Sie noch heute mit einem professionellen Service!
                      </p>
                    </div>
                    <button className="bg-white text-[#14ad9f] font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2">
                      <FiZap /> Kostenlose Beratung
                    </button>
                  </div>
                </div>
              )}

              {/* Services - für alle Anbieter mit Services anzeigen */}
              {services.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Angebotene Dienstleistungen
                    </h2>
                    <span className="text-sm text-gray-500">
                      {services.length} Services verfügbar
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map(service => (
                      <div
                        key={service.id}
                        className="border rounded-lg hover:shadow-lg transition-all duration-300 overflow-hidden group"
                      >
                        {service.imageUrl && (
                          <div className="relative h-40 overflow-hidden">
                            <Image
                              src={service.imageUrl}
                              alt={service.title}
                              width={300}
                              height={200}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 right-2">
                              <span className="bg-white/90 text-[#14ad9f] text-xs px-2 py-1 rounded-full font-semibold">
                                Ab {(service.price / 100).toFixed(0)}€
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-[#14ad9f] mb-1 line-clamp-2">
                            {service.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">
                            {service.category} › {service.subcategory}
                          </p>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {service.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-yellow-500">
                              <FiStar size={14} className="fill-current" />
                              <span className="text-sm font-medium">4.9</span>
                              <span className="text-xs text-gray-500">(24)</span>
                            </div>
                            <p className="font-bold text-gray-800">
                              Ab {(service.price / 100).toFixed(2)} €
                            </p>
                          </div>

                          <Link
                            href={`/services/details/${service.id}`}
                            className="mt-3 w-full bg-[#14ad9f] text-white text-center py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors inline-block font-medium"
                          >
                            Jetzt buchen
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio - für alle Anbieter mit Portfolio anzeigen */}
              {profile.portfolio && profile.portfolio.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiBriefcase className="text-[#14ad9f]" />
                    Portfolio
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.portfolio.map((project, index) => (
                      <div key={index} className="group cursor-pointer">
                        {project.imageUrl && (
                          <div className="relative h-32 rounded-lg overflow-hidden mb-2">
                            <Image
                              src={project.imageUrl}
                              alt={project.title}
                              width={200}
                              height={128}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <FiEye className="text-white text-xl" />
                            </div>
                          </div>
                        )}
                        <h4 className="font-semibold text-gray-800 text-sm">{project.title}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hier könnten Portfolio-Projekte angezeigt werden, ähnlich wie Dienstleistungen */}

              {/* Reviews Section - Using ProviderReviews Component */}
              <ProviderReviews
                providerId={profile.uid}
                reviewCount={reviews.length}
                averageRating={
                  reviews.length > 0
                    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
                    : 0
                }
              />

              {/* FAQ-Sektion */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Häufig gestellte Fragen
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      question: 'Wie läuft ein Projekt ab?',
                      answer:
                        'Zuerst besprechen wir Ihre Anforderungen im Detail. Dann erstelle ich einen konkreten Projektplan mit Zeitrahmen und Meilensteinen. Sie erhalten regelmäßige Updates zum Fortschritt.',
                    },
                    {
                      question: 'Bieten Sie Überarbeitungen an?',
                      answer:
                        'Ja, bei allen Paketen sind Überarbeitungen inklusive. Die genaue Anzahl hängt vom gewählten Paket ab.',
                    },
                    {
                      question: 'Wie schnell antworten Sie auf Nachrichten?',
                      answer:
                        'Ich antworte normalerweise innerhalb von 2-4 Stunden während der Geschäftszeiten.',
                    },
                    {
                      question: 'Arbeiten Sie auch am Wochenende?',
                      answer:
                        'Bei dringenden Projekten bin ich auch am Wochenende verfügbar. Dies besprechen wir vorab individuell.',
                    },
                  ].map((faq, index) => (
                    <div key={index} className="border rounded-lg">
                      <button
                        className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedFaq(expandedFaq === index ? -1 : index)}
                      >
                        <span className="font-medium text-gray-700">{faq.question}</span>
                        <FiChevronDown
                          className={`transform transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {expandedFaq === index && (
                        <div className="px-4 pb-3 text-sm text-gray-600 border-t bg-gray-50">
                          <p className="pt-3">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default UserProfilePage;

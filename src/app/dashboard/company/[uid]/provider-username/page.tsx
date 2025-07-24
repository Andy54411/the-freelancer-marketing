// /Users/andystaudinger/Taskilo/src/app/profile/[username]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, app } from '@/firebase/clients'; // Deine Firebase-Client-Initialisierung
import { User as FirebaseUser, getAuth } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link'; // HINZUGEFÜGT: Import für Link
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
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!username) return;

    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Annahme: Du suchst Nutzerprofile anhand des 'username' Feldes.
        // Wenn du nach UID suchst, müsstest du den Pfad anpassen und `doc(db, 'users', username)` verwenden.
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('Benutzerprofil nicht gefunden.');
          setLoading(false);
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserProfile;
        setProfile({ ...userData, uid: userDoc.id }); // UID hinzufügen

        // Beispiel: Lade Dienstleistungen (Gigs) des Nutzers, falls es ein Anbieter ist
        if (userData.user_type === 'firma') {
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
        console.error('Fehler beim Laden des Profils:', err);
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
                {profile.user_type === 'firma' && profile.companyName && (
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
                  {profile.description?.substring(0, 100) || 'Keine Beschreibung vorhanden.'}
                  {profile.description && profile.description.length > 100 && '...'}
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
                <div className="bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white p-6 rounded-lg shadow-lg">
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

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Kundenbewertungen</h2>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <FiStar className="fill-current" />
                        <span className="font-semibold">
                          {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(
                            1
                          )}
                        </span>
                      </div>
                      <span className="text-gray-500">({reviews.length} Bewertungen)</span>
                    </div>
                  )}
                </div>

                {reviews.length > 0 ? (
                  <>
                    {/* Bewertungsverteilung */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-5 gap-2 text-center text-sm">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = reviews.filter(r => r.rating === star).length;
                          const percentage =
                            reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                          return (
                            <div key={star} className="flex flex-col items-center">
                              <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                <span className="text-xs">{star}</span>
                                <FiStar size={12} className="fill-current" />
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bewertungsliste */}
                    <ul className="space-y-4">
                      {reviews.map(review => (
                        <li key={review.id} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-start space-x-3">
                            <Image
                              src={review.reviewerImage || '/default-avatar.png'}
                              alt={review.reviewerName}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-gray-700">{review.reviewerName}</p>
                                <span className="text-xs text-gray-500">
                                  {new Date(review.date.seconds * 1000).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                              <div className="flex items-center text-yellow-500 mb-2">
                                {[...Array(5)].map((_, i) => (
                                  <FiStar
                                    key={i}
                                    size={14}
                                    className={
                                      i < review.rating
                                        ? 'fill-current'
                                        : 'stroke-current opacity-30'
                                    }
                                  />
                                ))}
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {review.comment}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FiMessageSquare className="mx-auto text-gray-400 text-3xl mb-2" />
                    <p className="text-gray-500">Noch keine Bewertungen vorhanden.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Seien Sie der Erste, der eine Bewertung abgibt!
                    </p>
                  </div>
                )}
              </div>

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

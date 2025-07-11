// /Users/andystaudinger/Taskilo/src/app/profile/[username]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, app } from '@/firebase/clients'; // Deine Firebase-Client-Initialisierung
import { User as FirebaseUser, getAuth } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link'; // HINZUGEFÜGT: Import für Link
import { FiMapPin, FiMessageSquare, FiStar, FiAward, FiBriefcase, FiBookOpen, FiHeart, FiPlusCircle, FiEdit3, FiShare2, FiEye, FiLoader, FiAlertCircle } from 'react-icons/fi'; // HINZUGEFÜGT: FiLoader, FiAlertCircle
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
    servicesOffered?: { category: string; subcategory: string; description: string; price?: string }[];
    portfolio?: { title: string; description: string; imageUrl?: string; projectUrl?: string }[];
    hourlyRate?: number;
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
    const username = typeof params.username === 'string' ? params.username : '';

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

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
                    const servicesQuery = query(servicesRef, where('providerUid', '==', userDoc.id), limit(5));
                    const servicesSnapshot = await getDocs(servicesQuery);
                    setServices(servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceItem)));
                }

                // Beispiel: Lade Bewertungen für den Nutzer
                const reviewsRef = collection(db, 'reviews'); // Oder wie deine Sammlung heißt
                const reviewsQuery = query(reviewsRef, where('reviewedUid', '==', userDoc.id), orderBy('date', 'desc'), limit(5));
                const reviewsSnapshot = await getDocs(reviewsQuery);
                setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));

            } catch (err) {
                console.error("Fehler beim Laden des Profils:", err);
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
                                <h1 className="text-2xl font-bold text-gray-800">{profile.displayName || profile.username}</h1>
                                {profile.user_type === 'firma' && profile.companyName && <p className="text-md text-gray-600">{profile.companyName}</p>}
                                <p className="text-sm text-gray-500 mt-1">{profile.description?.substring(0, 100) || "Keine Beschreibung vorhanden."}{profile.description && profile.description.length > 100 && "..."}</p>

                                {isOwnProfile ? (
                                    <Link href={`/dashboard/user/${profile.uid}/settings`} className="mt-4 inline-block bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors w-full">
                                        Profil bearbeiten
                                    </Link>
                                ) : (
                                    <button className="mt-4 bg-[#14ad9f] text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors w-full">
                                        Kontaktieren
                                    </button>
                                )}
                                <button className="mt-2 border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors w-full flex items-center justify-center">
                                    <FiShare2 className="mr-2" /> Profil teilen
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-lg font-semibold text-gray-700">Statistiken</h2>
                                    {/* <FiEye className="text-gray-400" /> */}
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Standort:</span> <span className="font-medium text-gray-700">{profile.city || 'N/A'}, {profile.country || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span>Mitglied seit:</span> <span className="font-medium text-gray-700">{profile.memberSince ? new Date(profile.memberSince.seconds * 1000).toLocaleDateString('de-DE') : 'N/A'}</span></div>
                                    {/* Weitere Statistiken hier */}
                                </div>
                            </div>

                            {profile.languages && profile.languages.length > 0 && (
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Sprachen</h2>
                                    <ul className="space-y-1 text-sm">
                                        {profile.languages.map(lang => <li key={lang.language}>{lang.language} - <span className="text-gray-600">{lang.proficiency}</span></li>)}
                                    </ul>
                                </div>
                            )}

                            {profile.skills && profile.skills.length > 0 && (
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Fähigkeiten</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map(skill => <span key={skill} className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">{skill}</span>)}
                                    </div>
                                </div>
                            )}
                        </aside>

                        {/* Rechte Spalte: Hauptinhalt (Services, Portfolio, Bewertungen) */}
                        <section className="md:col-span-2 space-y-8">
                            {profile.user_type === 'firma' && services.length > 0 && (
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Angebotene Dienstleistungen</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {services.map(service => (
                                            <div key={service.id} className="border p-4 rounded-lg hover:shadow-md transition-shadow">
                                                {service.imageUrl && <Image src={service.imageUrl} alt={service.title} width={300} height={200} className="rounded-md mb-2 object-cover w-full h-40" />}
                                                <h3 className="font-semibold text-[#14ad9f]">{service.title}</h3>
                                                <p className="text-xs text-gray-500">{service.category} &gt; {service.subcategory}</p>
                                                <p className="text-sm text-gray-600 mt-1 truncate">{service.description}</p>
                                                <p className="font-bold mt-2 text-gray-700">Ab {(service.price / 100).toFixed(2)} €</p>
                                                <Link href={`/services/details/${service.id}`} className="text-sm text-teal-600 hover:underline mt-2 inline-block">
                                                    Details ansehen
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hier könnten Portfolio-Projekte angezeigt werden, ähnlich wie Dienstleistungen */}

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">Bewertungen ({reviews.length})</h2>
                                {reviews.length > 0 ? (
                                    <ul className="space-y-4">
                                        {reviews.map(review => (
                                            <li key={review.id} className="border-b pb-4 last:border-b-0">
                                                <div className="flex items-start space-x-3">
                                                    <Image src={review.reviewerImage || '/default-avatar.png'} alt={review.reviewerName} width={40} height={40} className="rounded-full" />
                                                    <div>
                                                        <p className="font-semibold text-gray-700">{review.reviewerName}</p>
                                                        <div className="flex items-center text-yellow-500">
                                                            {[...Array(5)].map((_, i) => <FiStar key={i} className={i < review.rating ? 'fill-current' : 'stroke-current'} />)}
                                                            <span className="text-xs text-gray-500 ml-2">{new Date(review.date.seconds * 1000).toLocaleDateString('de-DE')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500">Noch keine Bewertungen vorhanden.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
};

export default UserProfilePage;
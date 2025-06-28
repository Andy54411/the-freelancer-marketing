// src/components/UserHeader.tsx with notification badge

'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'; // Added memo
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Importiere Link
import { User, getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { app, storage, db } from '@/firebase/clients'; // Firebase App, Storage, Firestore
import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage'; // Firebase Storage Functions
import { doc, getDoc } from 'firebase/firestore'; // Firestore Functions
import { categories, Category } from '@/lib/categoriesData'; // Categories for search
import { Logo } from '@/components/logo'; // Logo component
import AppHeaderNavigation from './AppHeaderNavigation'; // Category navigation below header
import { FiSearch, FiBell, FiMail, FiHelpCircle, FiChevronDown, FiGrid, FiBriefcase, FiUsers, FiAward, FiSettings, FiLogOut, FiFilePlus, FiInbox, FiCheckSquare, FiUser } from 'react-icons/fi'; // Icons
import { collection, query, where, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { Badge } from "@/components/ui/badge";
const auth = getAuth(app);

interface UserHeaderProps {
    currentUid: string;
}

const UserHeader: React.FC<UserHeaderProps> = ({ currentUid }) => {

    const router = useRouter();
    const [profilePictureURLFromStorage, setProfilePictureURLFromStorage] = useState<string | null>(null);
    const [firestoreUserData, setFirestoreUserData] = useState<FirestoreUserData | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const searchDropdownContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    const loadProfilePictureFromStorage = useCallback(async (uid: string) => {
        if (!uid) {
            setProfilePictureURLFromStorage(null);
            return;
        }
        try {
            const folderRef = storageRef(storage, `profilePictures/${uid}`);
            const list = await listAll(folderRef);
            if (list.items.length > 0) {
                const url = await getDownloadURL(list.items[0]);
                setProfilePictureURLFromStorage(url);
            } else {
                setProfilePictureURLFromStorage(null);
            }
        } catch (error) {
            console.error("UserHeader: Fehler beim Laden des Profilbilds aus Storage:", error);
            setProfilePictureURLFromStorage(null);
        }
    }, []);

    const loadFirestoreUserData = useCallback(async (uid: string) => {
        if (!uid) {
            setFirestoreUserData(null);
            return;
        }
        try {
            const userDocRef = doc(db, "users", uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setFirestoreUserData(userDocSnap.data() as FirestoreUserData);
            } else {
                console.warn("UserHeader: Firestore-Benutzerdokument nicht gefunden für UID:", uid);
                setFirestoreUserData(null);
            }
        } catch (error) {
            console.error("UserHeader: Fehler beim Laden der Firestore-Benutzerdaten:", error);
            setFirestoreUserData(null);
        }
    }, []);

    const subscribeToUnreadMessages = useCallback((uid: string | undefined) => {
        if (!uid) {
            setUnreadMessagesCount(0);
            return () => { }; // Return an empty cleanup function for cleanup
        }

        const chatCollectionRef = collection(db, 'chats');
        const unreadMessagesQuery = query(
            chatCollectionRef,
            where('users', 'array-contains', uid),
            where('lastMessage.senderId', '!=', uid),
            where('lastMessage.isRead', '==', false)
        );
        const unsubscribe = onSnapshot(unreadMessagesQuery, (snapshot: QuerySnapshot) => {
            setUnreadMessagesCount(snapshot.size);
        });
        return () => unsubscribe(); // Clean up the subscription
    }, []);

    useEffect(() => {
        // Effekt zur Überwachung des Authentifizierungsstatus und zum Laden der initialen Daten
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => { // Explizite Typisierung für 'user'
            setCurrentUser(user);
            if (user?.uid) {
                // Ensure the user UID matches the URL UID for security
                if (user.uid !== currentUid) {
                    router.replace(`/dashboard/user/${user.uid}`); // Redirect to correct user dashboard
                    return;
                }
                loadProfilePictureFromStorage(user.uid);
                loadFirestoreUserData(user.uid);
            } else {
                setProfilePictureURLFromStorage(null);
                setFirestoreUserData(null);
                // If no user, and not on login page, redirect to login
                if (!window.location.pathname.startsWith('/login')) {
                    router.replace(`/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                }
            }
        });
        return () => unsubscribe();
    }, [currentUid, router, loadProfilePictureFromStorage, loadFirestoreUserData]);

    // Separater Effekt zum Abonnieren von Nachrichten, basierend auf dem aktuellen Benutzer
    useEffect(() => {
        const unsubscribe = subscribeToUnreadMessages(currentUser?.uid);
        return unsubscribe; // Gibt die Cleanup-Funktion von onSnapshot zurück
    }, [currentUser, subscribeToUnreadMessages]);

    useEffect(() => {
        const handleProfileUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ profilePictureURL?: string }>;
            if (customEvent.detail?.profilePictureURL) {
                setCurrentUser(prevUser => prevUser ? ({ ...prevUser, photoURL: customEvent.detail.profilePictureURL || null }) : null);
            }
            if (currentUser?.uid) {
                loadProfilePictureFromStorage(currentUser.uid);
                loadFirestoreUserData(currentUser.uid);
            }
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, [currentUser?.uid, loadProfilePictureFromStorage, loadFirestoreUserData]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node) && isProfileDropdownOpen) {
                setIsProfileDropdownOpen(false);
            }
            if (searchDropdownContainerRef.current && !searchDropdownContainerRef.current.contains(event.target as Node) && isSearchDropdownOpen) {
                setIsSearchDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileDropdownRef, searchDropdownContainerRef, isProfileDropdownOpen, isSearchDropdownOpen]);

    const handleSubcategorySelect = useCallback(() => {
        setIsSearchDropdownOpen(false);
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
            setSearchTerm('');
        }
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setIsProfileDropdownOpen(false);
            setFirestoreUserData(null);
            router.push('/');
        } catch (error) {
            console.error("Fehler beim Abmelden:", error);
        }
    }, [router]);

    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) {
            return categories;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return categories
            .map(category => ({
                ...category,
                subcategories: category.subcategories.filter(subcategory =>
                    subcategory.toLowerCase().includes(lowerSearchTerm)
                ),
            }))
            .filter(category => category.subcategories.length > 0);
    }, [searchTerm]);

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-50 md:relative">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        {/* Logo */}
                        <Link href="/" className="text-3xl font-bold text-[#14ad9f]">
                            <Logo />
                        </Link>

                        {/* Suchleiste */}
                        <div className="relative flex-grow max-w-xl mx-4" ref={searchDropdownContainerRef}>
                            <input
                                ref={searchInputRef}
                                type="search"
                                placeholder="Dienstleistung auswählen oder suchen..."
                                className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                                onFocus={() => setIsSearchDropdownOpen(true)}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                value={searchTerm}
                            />
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            {isSearchDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full max-h-96 overflow-y-auto bg-white rounded-md shadow-lg z-30 ring-1 ring-black ring-opacity-5">
                                    {filteredCategories.map((category: Category) => (
                                        <div key={category.title} className="p-2">
                                            <h3 className="font-semibold text-gray-700 px-2 text-sm sticky top-0 bg-gray-50 py-1">{category.title}</h3>
                                            <ul className="mt-1">
                                                {category.subcategories.map(subcategory => (
                                                    <li key={subcategory}>
                                                        <Link
                                                            href={`/services/${encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))}`}
                                                            className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-[#14ad9f] rounded"
                                                            onClick={handleSubcategorySelect}
                                                        >
                                                            {subcategory}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                    {filteredCategories.length === 0 && searchTerm.trim() && <p className="p-4 text-sm text-gray-500">Keine Übereinstimmungen für "{searchTerm}" gefunden.</p>}
                                </div>
                            )}
                        </div>

                        {/* Icons und Benutzerprofil */}
                        <div className="flex items-center space-x-4">
                            <div className="relative"> {/* Wrapper für die Glocke */}
                                <button className="text-gray-600 hover:text-[#14ad9f]"><FiBell size={22} /></button>
                                {unreadMessagesCount > 0 && (
                                    <Badge
                                        className="absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-xs font-medium bg-[#14ad9f] text-white z-10"
                                    >
                                        {unreadMessagesCount}
                                    </Badge>
                                )}
                            </div>
                            <Link
                                href={currentUser ? `/dashboard/user/${currentUser.uid}/inbox` : '/login'}
                                className="text-gray-600 hover:text-[#14ad9f]">
                                <FiMail size={22} />
                            </Link>
                            <button className="text-gray-600 hover:text-[#14ad9f]"><FiHelpCircle size={22} /></button>

                            {currentUser ? (
                                <div className="relative" ref={profileDropdownRef}>
                                    <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center">
                                        {profilePictureURLFromStorage || currentUser.photoURL ? (
                                            <img
                                                src={profilePictureURLFromStorage || currentUser.photoURL || ''}
                                                alt="Avatar"
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                <FiUser className="text-gray-500" />
                                            </div>
                                        )}
                                        <FiChevronDown className={`ml-1 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isProfileDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                                            <div className="px-4 py-3 text-left">
                                                <p className="text-sm font-semibold">
                                                    {(firestoreUserData?.firstName && firestoreUserData?.lastName)
                                                        ? `${firestoreUserData.firstName} ${firestoreUserData.lastName}`
                                                        : currentUser.displayName || currentUser.email}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {firestoreUserData?.user_type ? firestoreUserData.user_type.charAt(0).toUpperCase() + firestoreUserData.user_type.slice(1) : 'Benutzer'}
                                                </p>
                                            </div>
                                            <hr />
                                            {/* --- DYNAMISCHE LINKS BASIEREND AUF USER_TYPE --- */}
                                            {firestoreUserData?.user_type === 'firma' ? (
                                                // Links für 'firma'
                                                <>
                                                    <Link href={`/dashboard/company/${currentUser.uid}`} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiGrid className="inline mr-2" />Dashboard & Aufträge
                                                    </Link>
                                                    <Link href={`/dashboard/company/${currentUser.uid}/orders/overview`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiCheckSquare className="inline mr-2" />Meine Aufträge
                                                    </Link>
                                                    <Link href={`/dashboard/company/${currentUser.uid}/inbox`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiInbox className="inline mr-2" />Posteingang
                                                    </Link>
                                                    <hr />
                                                    <Link href={`/dashboard/company/${currentUser.uid}/settings`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiSettings className="inline mr-2" />Meine Einstellungen
                                                    </Link>
                                                </>
                                            ) : (
                                                // Links für 'kunde' (oder Standard)
                                                <>
                                                    <Link href={`/dashboard/user/${currentUser.uid}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiGrid className="inline mr-2" />Dashboard
                                                    </Link>
                                                    <Link href={`/dashboard/user/${currentUser.uid}/projects`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiBriefcase className="inline mr-2" />Projekte
                                                    </Link>
                                                    <Link href={`/dashboard/user/${currentUser.uid}/orders/overview`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiInbox className="inline mr-2" />Aufträge
                                                    </Link>
                                                    <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiFilePlus className="inline mr-2" />Eine Projektanfrage posten</Link>
                                                    <hr />
                                                    <Link href={currentUser ? `/dashboard/user/${currentUid}/settings` : '/login'} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiSettings className="inline mr-2" />Meine Einstellungen</Link>
                                                </>
                                            )}
                                            <hr className="my-1" />
                                            <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"><FiLogOut className="inline mr-2" />Abmelden</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login" className="text-sm font-medium text-[#14ad9f] hover:underline">
                                    Anmelden
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                <AppHeaderNavigation />
            </header>

            <style jsx>{`
                @media (max-width: 768px) {
                header {
                    position: relative;
                }

                .container {
                    padding-left: 1rem;
                    padding-right: 1rem;
                }
                }
            `}
            </style>
        </>
    );
}
export default memo(UserHeader); // Export as memoized
interface FirestoreUserData {
    firstName?: string;
    lastName?: string;
    user_type?: 'kunde' | 'firma' | 'admin';
    profilePictureURL?: string; // Firebase Storage URL
}
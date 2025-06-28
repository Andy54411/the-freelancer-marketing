// Header.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'; // Import memo
import AppHeaderNavigation from './AppHeaderNavigation'; // Pfad anpassen, falls nötig
import Link from 'next/link'; // Importiere Link
import { FiSearch, FiBell, FiMail, FiHelpCircle, FiChevronDown, FiGrid, FiBriefcase, FiUsers, FiAward, FiSettings, FiLogOut, FiFilePlus, FiInbox, FiCheckSquare, FiUser } from 'react-icons/fi'; // FiUser hinzugefügt
import { User, getAuth, signOut } from 'firebase/auth'; // Für Benutzer-Infos und Logout
import { app, storage, db } from '@/firebase/clients'; // Firebase App-Instanz, Storage und Firestore DB
import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage'; // Firebase Storage Funktionen
import { doc, getDoc } from 'firebase/firestore'; // Firestore Funktionen
import { collection, query, where, onSnapshot, QuerySnapshot } from 'firebase/firestore'; // Firestore Funktionen für Echtzeit-Updates
import { categories, Category } from '@/lib/categoriesData'; // Importiere Kategorien und Typen
import { useRouter } from 'next/navigation';

const auth = getAuth(app);

// Minimaler Typ für Firestore-Benutzerdaten, die im Header benötigt werden
interface FirestoreUserData {
    firstName?: string;
    lastName?: string;
    user_type?: 'kunde' | 'firma' | 'admin'; // Passen Sie diese Typen ggf. an Ihre Struktur an
}

// NEU: Props, um den Header als allgemeinen App-Header oder als spezifischen Company-Header zu verwenden
interface CompanyData {
    uid: string;
    companyName: string;
    logoUrl?: string;
}

interface HeaderProps {
    // Wenn 'company' übergeben wird, wird der Header im "Company Dashboard"-Modus angezeigt
    company?: CompanyData | null;
    onSettingsClick?: () => void; // Callback für den Klick auf "Meine Einstellungen" im Firmen-Kontext
    onDashboardClick?: () => void; // Callback für den Klick auf "Dashboard" im Firmen-Kontext
}

const Header: React.FC<HeaderProps> = ({ company, onSettingsClick, onDashboardClick }) => {
    const [profilePictureURLFromStorage, setProfilePictureURLFromStorage] = useState<string | null>(null);
    const [firestoreUserData, setFirestoreUserData] = useState<FirestoreUserData | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false); // State für Such-Dropdown
    const [searchTerm, setSearchTerm] = useState(''); // NEU: State für den Suchbegriff
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const searchDropdownContainerRef = useRef<HTMLDivElement>(null); // Ref für Such-Dropdown-Container
    const searchInputRef = useRef<HTMLInputElement>(null); // Ref für das Such-Inputfeld
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0); // State für ungelesene Nachrichten
    const router = useRouter();

    const subscribeToUnreadMessages = useCallback((uid: string | undefined) => {
        if (!uid) {
            setUnreadMessagesCount(0);
            return () => { }; // Leere Cleanup-Funktion zurückgeben
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
        return () => unsubscribe(); // Cleanup-Funktion für den Listener
    }, []);
    // Effekt zur Überwachung des Authentifizierungsstatus
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Effekt zum Abonnieren von Nachrichten, basierend auf dem aktuellen Benutzer
    useEffect(() => {
        const unsubscribe = subscribeToUnreadMessages(currentUser?.uid);
        return unsubscribe; // Gibt die Cleanup-Funktion von onSnapshot zurück
    }, [currentUser, subscribeToUnreadMessages]);

    const loadProfilePictureFromStorage = useCallback(async (uid: string) => {
        if (!uid) {
            setProfilePictureURLFromStorage(null);
            return;
        }
        try {
            const folderRef = storageRef(storage, `profilePictures/${uid}`);
            const list = await listAll(folderRef);
            if (list.items.length > 0) {
                // Nimm das erste Bild oder implementiere eine Logik, um das aktuellste zu finden
                const url = await getDownloadURL(list.items[0]);
                setProfilePictureURLFromStorage(url);
            } else {
                setProfilePictureURLFromStorage(null); // Kein Bild im Storage gefunden
            }
        } catch (error) {
            console.error("Header: Fehler beim Laden des Profilbilds aus Storage:", error);
            setProfilePictureURLFromStorage(null); // Fehlerfall
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
                console.warn("Header: Firestore-Benutzerdokument nicht gefunden für UID:", uid);
                setFirestoreUserData(null);
            }
        } catch (error) {
            console.error("Header: Fehler beim Laden der Firestore-Benutzerdaten:", error);
            setFirestoreUserData(null);
        }
    }, []);

    useEffect(() => {
        if (currentUser?.uid) {
            loadProfilePictureFromStorage(currentUser.uid);
            loadFirestoreUserData(currentUser.uid);
        } else {
            setProfilePictureURLFromStorage(null); // Benutzer abgemeldet oder UID nicht vorhanden
            setFirestoreUserData(null);
        }
    }, [currentUser?.uid, loadProfilePictureFromStorage, loadFirestoreUserData]);

    useEffect(() => {
        const handleProfileUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ profilePictureURL?: string }>;
            // 1. Aktualisiere currentUser.photoURL (kann die URL aus dem Event sein)
            if (customEvent.detail?.profilePictureURL) {
                setCurrentUser(prevUser => prevUser ? ({ ...prevUser, photoURL: customEvent.detail.profilePictureURL || null }) : null);
            }
            // 2. Lade das Bild explizit neu aus dem Storage, um Konsistenz sicherzustellen
            if (currentUser?.uid) {
                loadProfilePictureFromStorage(currentUser.uid);
                // Optional: Wenn das Event auch Namensänderungen etc. signalisieren könnte:
                // loadFirestoreUserData(currentUser.uid);
            }
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, [currentUser?.uid, loadProfilePictureFromStorage, loadFirestoreUserData]);

    useEffect(() => {
        // Schließt das Dropdown, wenn außerhalb geklickt wird
        function handleClickOutside(event: MouseEvent) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node) && isProfileDropdownOpen) {
                setIsProfileDropdownOpen(false);
            }
            // Schließt Such-Dropdown, wenn außerhalb geklickt wird
            if (searchDropdownContainerRef.current && !searchDropdownContainerRef.current.contains(event.target as Node) && isSearchDropdownOpen) {
                setIsSearchDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileDropdownRef, searchDropdownContainerRef, isProfileDropdownOpen, isSearchDropdownOpen]); // States hinzugefügt

    const handleSubcategorySelect = () => {
        setIsSearchDropdownOpen(false);
        if (searchInputRef.current) {
            // Suchfeld leeren nach Auswahl
            searchInputRef.current.value = '';
            setSearchTerm(''); // Auch den State zurücksetzen
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsProfileDropdownOpen(false);
            setFirestoreUserData(null); // Firestore-Daten beim Logout zurücksetzen
            router.push('/'); // Weiterleitung zur Startseite nach dem Logout
        } catch (error) {
            console.error("Fehler beim Abmelden:", error);
        }
    };
    // NEU: Gefilterte Kategorien basierend auf dem Suchbegriff
    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) {
            return categories; // Zeige alle, wenn kein Suchbegriff vorhanden ist
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return categories
            .map(category => ({
                ...category,
                subcategories: category.subcategories.filter(subcategory =>
                    subcategory.toLowerCase().includes(lowerSearchTerm)
                ),
            }))
            .filter(category => category.subcategories.length > 0); // Nur Kategorien mit passenden Unterkategorien anzeigen
    }, [searchTerm]);

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-50 md:relative"> {/* added md:relative */}
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        {company ? (
                            // --- ANSICHT FÜR COMPANY DASHBOARD ---
                            <div className="flex items-center gap-4">
                                {company.logoUrl && (
                                    <img src={company.logoUrl} alt={`${company.companyName} Logo`} className="h-10 w-10 rounded-md object-cover" />
                                )}
                                <h1 className="text-2xl font-bold text-gray-800">{company.companyName}</h1>
                            </div>
                        ) : (
                            // --- STANDARD-ANSICHT FÜR DIE APP (Logo) ---
                            <Link href="/" className="text-3xl font-bold text-[#14ad9f]">
                                Tasko
                            </Link>
                        )}

                        {/* Suchleiste (vereinfacht) - Immer anzeigen */}
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
                                    <span className="absolute -top-1 -right-1 bg-[#14ad9f] text-white rounded-full px-1.5 py-0.5 text-xs font-medium z-10">
                                        {unreadMessagesCount}
                                    </span>
                                )}
                            </div>
                            <Link
                                href={currentUser ? (company ? `/dashboard/company/${company.uid}/inbox` : `/dashboard/user/${currentUser.uid}/inbox`) : '/login'}
                                className="text-gray-600 hover:text-[#14ad9f]">
                                <FiMail size={22} />
                            </Link>
                            <button className="text-gray-600 hover:text-[#14ad9f]"><FiHelpCircle size={22} /></button>

                            {currentUser ? (
                                <div className="relative" ref={profileDropdownRef}>
                                    <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center">
                                        {profilePictureURLFromStorage || currentUser.photoURL ? (
                                            <img
                                                src={profilePictureURLFromStorage || currentUser.photoURL || ''} // Fügt einen leeren String als Fallback hinzu
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
                                                    <button onClick={() => { onDashboardClick ? onDashboardClick() : router.push(`/dashboard/company/${currentUser.uid}`); setIsProfileDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                        <FiGrid className="inline mr-2" />Dashboard & Aufträge
                                                    </button>
                                                    <Link href={`/dashboard/company/${currentUser.uid}/orders/overview`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiCheckSquare className="inline mr-2" />Meine Aufträge
                                                    </Link>
                                                    <Link href={`/dashboard/company/${currentUser.uid}/inbox`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiInbox className="inline mr-2" />Posteingang
                                                    </Link>
                                                    <hr />
                                                    <button onClick={() => { onSettingsClick ? onSettingsClick() : router.push(`/dashboard/company/${currentUser.uid}`); setIsProfileDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                        <FiSettings className="inline mr-2" />Meine Einstellungen
                                                    </button>
                                                </>
                                            ) : (
                                                // Links für 'kunde' (oder Standard)
                                                <>
                                                    <Link href={`/dashboard/user/${currentUser.uid}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiGrid className="inline mr-2" />Dashboard
                                                    </Link>
                                                    <Link href={`/dashboard/user/${currentUser.uid}/orders/overview`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiInbox className="inline mr-2" />Aufträge
                                                    </Link>
                                                    <hr />
                                                    <Link href={`/dashboard/user/${currentUser.uid}/settings`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}>
                                                        <FiSettings className="inline mr-2" />Meine Einstellungen
                                                    </Link>
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
                {/* Die Kategorien-Navigation wird nur im allgemeinen Modus angezeigt, nicht im Company-Dashboard */}
                <AppHeaderNavigation />
            </header>

            <style jsx>{`
                @media (max-width: 768px) {
                header {
                    position: relative; /* Header nicht mehr sticky auf kleinen Bildschirmen */
                }

                .container {
                    /* z.B. Padding reduzieren, um Platz zu sparen */
                    padding-left: 1rem;
                    padding-right: 1rem;
                }
                /* Weitere Anpassungen für kleinere Bildschirme hier */
                }
            `}
            </style>
        </>
    );
};

export default memo(Header); // Exportiere die Komponente als memoisiert

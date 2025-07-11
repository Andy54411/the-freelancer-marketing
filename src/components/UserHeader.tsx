// src/components/UserHeader.tsx with notification badge

'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'; // Added memo
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Importiere Link
import { User, getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { app, storage, db } from '@/firebase/clients';
import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage'; // Firebase Storage Functions
import { doc, getDoc, collection, query, where, onSnapshot, QuerySnapshot, orderBy, limit, updateDoc, Timestamp } from 'firebase/firestore';
import { categories, Category } from '@/lib/categoriesData'; // Categories for search
import { Logo } from '@/components/logo'; // Logo component
import AppHeaderNavigation from './AppHeaderNavigation'; // Category navigation below header
import { Search as FiSearch, Bell as FiBell, Mail as FiMail, HelpCircle as FiHelpCircle, ChevronDown as FiChevronDown, Grid as FiGrid, Briefcase as FiBriefcase, Users as FiUsers, Award as FiAward, Settings as FiSettings, LogOut as FiLogOut, FilePlus as FiFilePlus, Inbox as FiInbox, CheckSquare as FiCheckSquare, User as FiUser, Package as FiPackage, Info as FiInfo } from 'lucide-react';
import { useAuth, HeaderChatPreview } from '@/contexts/AuthContext'; // HeaderChatPreview aus dem Context importieren
const auth = getAuth(app);

// NEU: Interface für Benachrichtigungen
interface NotificationPreview {
    id: string;
    type: 'order' | 'support' | 'system' | 'update';
    message: string;
    link: string;
    isRead: boolean;
    createdAt: Timestamp;
}

interface UserHeaderProps {
    currentUid: string;
}

const UserHeader: React.FC<UserHeaderProps> = ({ currentUid }) => {
    const { unreadMessagesCount, recentChats } = useAuth(); // KORREKTUR: Daten aus dem Context beziehen

    const router = useRouter();
    const [profilePictureURLFromStorage, setProfilePictureURLFromStorage] = useState<string | null>(null);
    const [firestoreUserData, setFirestoreUserData] = useState<FirestoreUserData | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [isInboxDropdownOpen, setIsInboxDropdownOpen] = useState(false);
    const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0); // NEU
    const [notifications, setNotifications] = useState<NotificationPreview[]>([]); // NEU
    const [searchTerm, setSearchTerm] = useState('');
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const searchDropdownContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const inboxHoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const notificationHoverTimeout = useRef<NodeJS.Timeout | null>(null); // NEU

    // NEU: Funktion zum Abonnieren von Benachrichtigungen
    const subscribeToNotifications = useCallback((uid: string | undefined) => {
        if (!uid) {
            setUnreadNotificationsCount(0);
            setNotifications([]);
            return () => { };
        }

        console.log(`[UserHeader] Subscribing to notifications for user: ${uid}`);

        // KORREKTUR: Explizite where-Klausel hinzufügen, um den Firestore-Sicherheitsregeln zu entsprechen
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', uid), // WICHTIG: Diese where-Klausel ist für die Firestore-Regel erforderlich
            orderBy('createdAt', 'desc'), // Index ist jetzt verfügbar
            limit(10) // Die 10 neuesten Benachrichtigungen
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot: QuerySnapshot) => {
            console.log(`[UserHeader] Benachrichtigungen erfolgreich geladen für User: ${uid}, Anzahl: ${snapshot.size}`);
            const fetchedNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as NotificationPreview));

            const unreadCount = fetchedNotifications.filter(n => !n.isRead).length;
            setNotifications(fetchedNotifications);
            setUnreadNotificationsCount(unreadCount);
        }, (error) => {
            console.error("[UserHeader] Fehler beim Laden der Benachrichtigungen:", error);
            console.error("[UserHeader] Detaillierte Fehleranalyse:", {
                code: error.code,
                message: error.message,
                uid: uid,
                isAuthenticated: !!auth.currentUser,
                currentUserUid: auth.currentUser?.uid,
                queryPath: 'notifications',
                queryConstraints: [
                    `where('userId', '==', '${uid}')`,
                    `orderBy('createdAt', 'desc')`,
                    `limit(10)`
                ]
            });

            // Zusätzliche Diagnostik für Firestore Rules
            if (error.code === 'permission-denied') {
                console.warn("[UserHeader] Permission Denied - mögliche Ursachen:");
                console.warn("1. Firestore Rules erlauben keine 'list'-Operation für notifications");
                console.warn("2. User ist nicht authentifiziert oder Auth-Token ist abgelaufen");
                console.warn("3. Where-Klausel stimmt nicht mit den Firestore Rules überein");
                console.warn("4. Index fehlt für die Query");
            }

            // Fallback: Setze leere Arrays bei Fehlern
            setNotifications([]);
            setUnreadNotificationsCount(0);
        });

        return () => unsubscribe();
    }, []);

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

    // Effekt zum Abonnieren von Nachrichten, basierend auf dem aktuellen Benutzer und seinem Typ
    useEffect(() => {
        if (currentUser?.uid) {
            const unsubscribeNotifications = subscribeToNotifications(currentUser.uid);
            return () => {
                unsubscribeNotifications();
            };
        }
    }, [currentUser, subscribeToNotifications]);

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

    const handleSubcategorySelect = () => {
        setIsSearchDropdownOpen(false);
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
            setSearchTerm('');
        }
    };

    // NEU: Hover-Handler für das Posteingang-Dropdown
    const handleInboxEnter = () => {
        if (inboxHoverTimeout.current) {
            clearTimeout(inboxHoverTimeout.current);
        }
        setIsInboxDropdownOpen(true);
    };

    const handleInboxLeave = () => {
        inboxHoverTimeout.current = setTimeout(() => {
            setIsInboxDropdownOpen(false);
        }, 300); // Eine kleine Verzögerung, damit der Benutzer die Maus zum Dropdown bewegen kann
    };

    // NEU: Hover-Handler für das Benachrichtigungs-Dropdown
    const handleNotificationEnter = () => {
        if (notificationHoverTimeout.current) {
            clearTimeout(notificationHoverTimeout.current);
        }
        setIsNotificationDropdownOpen(true);
    };

    const handleNotificationLeave = () => {
        notificationHoverTimeout.current = setTimeout(() => {
            setIsNotificationDropdownOpen(false);
        }, 300);
    };

    // NEU: Funktion zum Öffnen des Chatbots
    const handleHelpClick = () => {
        window.dispatchEvent(new CustomEvent('openChatbot'));
    };

    // NEU: Funktion zum Markieren einer Benachrichtigung als gelesen
    const handleNotificationClick = async (notificationId: string) => {
        setIsNotificationDropdownOpen(false); // Dropdown schließen
        const notificationRef = doc(db, 'notifications', notificationId);
        try {
            // Wir müssen nicht auf das Ergebnis warten, die UI wird durch den Listener aktualisiert
            await updateDoc(notificationRef, { isRead: true });
        } catch (error) {
            console.error("Fehler beim Aktualisieren der Benachrichtigung:", error);
        }
    };

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
                                                            href={`/dashboard/services/${encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))}`}
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
                                    {filteredCategories.length === 0 && searchTerm.trim() && <p className="p-4 text-sm text-gray-500">Keine Übereinstimmungen für &ldquo;{searchTerm}&rdquo; gefunden.</p>}
                                </div>
                            )}
                        </div>

                        {/* Icons und Benutzerprofil */}
                        <div className="flex items-center space-x-4">
                            {/* NEU: Glocken-Icon mit Hover-Dropdown und Badge */}
                            <div
                                className="relative"
                                onMouseEnter={handleNotificationEnter}
                                onMouseLeave={handleNotificationLeave}
                            >
                                <button className="text-gray-600 hover:text-[#14ad9f] block">
                                    <FiBell size={22} />
                                </button>
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-medium z-10">
                                        {unreadNotificationsCount}
                                    </span>
                                )}
                                {isNotificationDropdownOpen && currentUser && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                                        <div className="p-3 border-b">
                                            <h4 className="font-semibold text-gray-800">Benachrichtigungen</h4>
                                        </div>
                                        {notifications.length > 0 ? (
                                            <ul>
                                                {notifications.map(notification => (
                                                    <li key={notification.id}>
                                                        <Link
                                                            href={notification.link || '#'}
                                                            onClick={() => handleNotificationClick(notification.id)}
                                                            className={`block p-3 hover:bg-gray-100 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                                                    {notification.type === 'order' && <FiPackage className="text-gray-600" />}
                                                                    {notification.type === 'support' && <FiHelpCircle className="text-gray-600" />}
                                                                    {(notification.type === 'system' || notification.type === 'update') && <FiInfo className="text-gray-600" />}
                                                                </div>
                                                                <div className="flex-1 overflow-hidden">
                                                                    <p className={`text-sm ${!notification.isRead ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{notification.message}</p>
                                                                    <p className="text-xs text-gray-400 mt-1">{notification.createdAt.toDate().toLocaleString('de-DE')}</p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (<p className="p-4 text-sm text-gray-500 text-center">Keine neuen Benachrichtigungen.</p>)}
                                    </div>
                                )}
                            </div>
                            {/* NEU: Posteingang-Icon mit Hover-Dropdown und Badge */}
                            <div
                                className="relative"
                                onMouseEnter={handleInboxEnter}
                                onMouseLeave={handleInboxLeave}
                            >
                                <Link
                                    href={currentUser ? `/dashboard/user/${currentUser.uid}/inbox` : '/login'}
                                    className="text-gray-600 hover:text-[#14ad9f] block" // block, damit der Badge richtig positioniert wird
                                >
                                    <FiMail size={22} />
                                </Link>
                                {unreadMessagesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#14ad9f] text-white rounded-full px-1.5 py-0.5 text-xs font-medium z-10">
                                        {unreadMessagesCount}
                                    </span>
                                )}
                                {isInboxDropdownOpen && currentUser && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                                        <div className="p-3 border-b">
                                            <h4 className="font-semibold text-gray-800">Letzte Nachrichten</h4>
                                        </div>
                                        {recentChats.length > 0 ? (
                                            <ul>
                                                {recentChats.map(chat => (
                                                    <li key={chat.id}>
                                                        <Link
                                                            href={chat.link || '#'}
                                                            onClick={() => setIsInboxDropdownOpen(false)}
                                                            className={`block p-3 hover:bg-gray-100 ${chat.isUnread ? 'bg-teal-50' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {chat.otherUserAvatarUrl ? (
                                                                    <img src={chat.otherUserAvatarUrl} alt={chat.otherUserName} className="w-10 h-10 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><FiUser /></div>
                                                                )}
                                                                <div className="flex-1 overflow-hidden">
                                                                    <p className="font-semibold truncate text-sm">{chat.otherUserName}</p>
                                                                    <p className={`text-sm truncate ${chat.isUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                                                        {chat.lastMessageText}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="p-4 text-sm text-gray-500 text-center">Keine neuen Nachrichten.</p>
                                        )}
                                        <div className="border-t p-2 text-center">
                                            <Link href={currentUser ? `/dashboard/user/${currentUser.uid}/inbox` : '/login'} onClick={() => setIsInboxDropdownOpen(false)} className="text-sm font-medium text-[#14ad9f] hover:underline">
                                                Zum Posteingang
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleHelpClick} className="text-gray-600 hover:text-[#14ad9f]" aria-label="Hilfe & Support Chatbot öffnen">
                                <FiHelpCircle size={22} />
                            </button>

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
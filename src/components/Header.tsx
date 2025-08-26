// Header.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'; // Import memo
import AppHeaderNavigation from './AppHeaderNavigation'; // Pfad anpassen, falls nötig
import Link from 'next/link'; // Importiere Link
import {
  Search as FiSearch,
  Bell as FiBell,
  Mail as FiMail,
  HelpCircle as FiHelpCircle,
  ChevronDown as FiChevronDown,
  Grid as FiGrid,
  Briefcase as FiBriefcase,
  Users as FiUsers,
  Award as FiAward,
  Settings as FiSettings,
  LogOut as FiLogOut,
  FilePlus as FiFilePlus,
  Inbox as FiInbox,
  CheckSquare as FiCheckSquare,
  User as FiUser,
} from 'lucide-react'; // FiUser hinzugefügt
import { User, getAuth, signOut } from 'firebase/auth'; // Für Benutzer-Infos und Logout
import { app, storage, db } from '@/firebase/clients'; // Firebase App-Instanz, Storage und Firestore DB
import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage'; // Firebase Storage Funktionen
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  orderBy,
  limit,
} from 'firebase/firestore'; // Firestore Funktionen
import { categories, Category } from '@/lib/categoriesData'; // Importiere Kategorien und Typen
import { useRouter } from 'next/navigation';

const auth = getAuth(app);

// Minimaler Typ für Firestore-Benutzerdaten, die im Header benötigt werden
interface FirestoreUserData {
  firstName?: string;
  lastName?: string;
  user_type?: 'kunde' | 'firma' | 'admin'; // Passen Sie diese Typen ggf. an Ihre Struktur an
}

// NEU: Interface für die Chat-Vorschau im Header-Dropdown
interface HeaderChatPreview {
  id: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  lastMessageText: string;
  isUnread: boolean;
  link: string;
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
  const [profilePictureURLFromStorage, setProfilePictureURLFromStorage] = useState<string | null>(
    null
  );
  const [imageLoadError, setImageLoadError] = useState(false); // NEU: Track ob Bild geladen werden konnte
  const [firestoreUserData, setFirestoreUserData] = useState<FirestoreUserData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Debug: Log state changes
  useEffect(() => {}, [profilePictureURLFromStorage, currentUser?.photoURL, currentUser?.uid]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false); // State für Such-Dropdown
  const [isInboxDropdownOpen, setIsInboxDropdownOpen] = useState(false); // NEU: State für Posteingang-Dropdown
  const [searchTerm, setSearchTerm] = useState(''); // NEU: State für den Suchbegriff
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const searchDropdownContainerRef = useRef<HTMLDivElement>(null); // Ref für Such-Dropdown-Container
  const searchInputRef = useRef<HTMLInputElement>(null); // Ref für das Such-Inputfeld
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0); // State für ungelesene Nachrichten
  const [recentChats, setRecentChats] = useState<HeaderChatPreview[]>([]); // NEU: State für die letzten Chats
  const inboxHoverTimeout = useRef<NodeJS.Timeout | null>(null); // NEU: Ref für den Hover-Timeout
  const router = useRouter();

  const subscribeToRecentChats = useCallback(
    (uid: string | undefined, userType: FirestoreUserData['user_type']) => {
      if (!uid || !userType) {
        setUnreadMessagesCount(0);
        setRecentChats([]);
        return () => {}; // Leere Cleanup-Funktion zurückgeben
      }

      const chatCollectionRef = collection(db, 'chats');
      const recentChatsQuery = query(
        chatCollectionRef,
        where('users', 'array-contains', uid),
        orderBy('lastUpdated', 'desc'),
        limit(5) // Lade die 5 neuesten Konversationen für die Vorschau
      );

      const unsubscribe = onSnapshot(
        recentChatsQuery,
        async (snapshot: QuerySnapshot) => {
          const chatsData = await Promise.all(
            snapshot.docs.map(async docSnap => {
              const data = docSnap.data();
              const otherUserId = data.users.find((id: string) => id !== uid);

              // Lade die Benutzerdaten direkt aus der users-Collection
              let otherUserName = 'Unbekannter Benutzer';
              let otherUserAvatarUrl = null;

              if (otherUserId) {
                try {
                  const otherUserDocRef = doc(db, 'users', otherUserId);
                  const otherUserDoc = await getDoc(otherUserDocRef);
                  if (otherUserDoc.exists()) {
                    const otherUserData = otherUserDoc.data();
                    // Verwende firstName + lastName oder displayName oder email als Fallback
                    otherUserName =
                      otherUserData.firstName && otherUserData.lastName
                        ? `${otherUserData.firstName} ${otherUserData.lastName}`
                        : otherUserData.displayName ||
                          otherUserData.email ||
                          'Unbekannter Benutzer';

                    // Verwende die korrekten Felder für das Profilbild
                    otherUserAvatarUrl =
                      otherUserData.profilePictureFirebaseUrl ||
                      otherUserData.profilePictureURL ||
                      otherUserData.photoURL ||
                      null;
                  }
                } catch (error) {}
              }

              // Bestimme den korrekten Link zum Posteingang basierend auf dem Benutzertyp
              const inboxLink =
                userType === 'firma'
                  ? `/dashboard/company/${uid}/inbox`
                  : `/dashboard/user/${uid}/inbox`;

              return {
                id: docSnap.id,
                otherUserName,
                otherUserAvatarUrl,
                lastMessageText: data.lastMessage?.text || '',
                isUnread: data.lastMessage?.senderId !== uid && !data.lastMessage?.isRead,
                link: inboxLink,
              };
            })
          );

          const unreadCount = chatsData.filter(chat => chat.isUnread).length;
          setUnreadMessagesCount(unreadCount);
          setRecentChats(chatsData);
        },
        error => {
          setUnreadMessagesCount(0);
          setRecentChats([]);
        }
      );
      return () => unsubscribe(); // Cleanup-Funktion für den Listener
    },
    []
  );

  // Effekt zur Überwachung des Authentifizierungsstatus
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Effekt zum Abonnieren von Nachrichten, basierend auf dem aktuellen Benutzer und seinem Typ
  useEffect(() => {
    if (currentUser?.uid && firestoreUserData) {
      const unsubscribe = subscribeToRecentChats(currentUser.uid, firestoreUserData.user_type);
      return unsubscribe;
    }
  }, [currentUser, firestoreUserData, subscribeToRecentChats]);

  const loadProfilePictureFromStorage = useCallback(async (uid: string) => {
    if (!uid) {
      setProfilePictureURLFromStorage(null);
      return;
    }
    try {
      // Versuche zuerst die Firestore-Benutzerdaten zu laden, um die direkte URL zu bekommen
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // TEST: Versuche die URL direkt zu testen
        const testUrl = userData.profilePictureFirebaseUrl;
        if (testUrl) {
          // Versuche die Firebase Storage URL direkt ohne Encoding zu verwenden
          const directUrl = testUrl
            .replace(/user_uploads%2F/, 'user_uploads/')
            .replace(/%2F/g, '/');
        }

        const profilePictureUrl =
          userData.profilePictureFirebaseUrl || userData.profilePictureURL || userData.photoURL;

        if (profilePictureUrl) {
          // NEUE LOGIK: Verwende die Storage getDownloadURL Methode für bessere Kompatibilität
          if (userData.profilePictureURL && !userData.profilePictureURL.startsWith('http')) {
            try {
              const imageRef = storageRef(storage, userData.profilePictureURL);
              const downloadUrl = await getDownloadURL(imageRef);

              setProfilePictureURLFromStorage(downloadUrl);
              setImageLoadError(false);

              return;
            } catch (storageError) {}
          }

          // Fallback: Verwende die direkte URL
          let finalUrl = profilePictureUrl;
          if (!profilePictureUrl.startsWith('http')) {
            // Falls es nur ein Pfad ist, füge die Firebase Storage Base URL hinzu
            finalUrl = `https://storage.googleapis.com/tilvo-f142f.firebasestorage.app/${encodeURIComponent(profilePictureUrl)}`;
          }
          setProfilePictureURLFromStorage(finalUrl);
          setImageLoadError(false); // Reset error state when new image is set

          return;
        }
      } else {
      }

      // Fallback: Suche im Storage (für Rückwärtskompatibilität)
      const folderRef = storageRef(storage, `profilePictures/${uid}`);
      const list = await listAll(folderRef);
      if (list.items.length > 0) {
        // Nimm das erste Bild oder implementiere eine Logik, um das aktuellste zu finden
        const url = await getDownloadURL(list.items[0]);
        setProfilePictureURLFromStorage(url);
      } else {
        // Versuche auch den user_uploads Ordner
        const userUploadsRef = storageRef(storage, `user_uploads/${uid}`);
        const userUploadsList = await listAll(userUploadsRef);
        const imageFiles = userUploadsList.items.filter(
          item =>
            item.name.toLowerCase().includes('business_icon') ||
            item.name.toLowerCase().includes('profile') ||
            item.name.toLowerCase().endsWith('.jpg') ||
            item.name.toLowerCase().endsWith('.jpeg') ||
            item.name.toLowerCase().endsWith('.png')
        );
        if (imageFiles.length > 0) {
          const url = await getDownloadURL(imageFiles[0]);
          setProfilePictureURLFromStorage(url);
        } else {
          setProfilePictureURLFromStorage(null); // Kein Bild gefunden
        }
      }
    } catch (error) {
      setProfilePictureURLFromStorage(null); // Fehlerfall
    }
  }, []);

  const loadFirestoreUserData = useCallback(async (uid: string) => {
    if (!uid) {
      setFirestoreUserData(null);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as FirestoreUserData;

        setFirestoreUserData(userData);
      } else {
        setFirestoreUserData(null);
      }
    } catch (error) {
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
        setCurrentUser(prevUser =>
          prevUser ? { ...prevUser, photoURL: customEvent.detail.profilePictureURL || null } : null
        );
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
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node) &&
        isProfileDropdownOpen
      ) {
        setIsProfileDropdownOpen(false);
      }
      // Schließt Such-Dropdown, wenn außerhalb geklickt wird
      if (
        searchDropdownContainerRef.current &&
        !searchDropdownContainerRef.current.contains(event.target as Node) &&
        isSearchDropdownOpen
      ) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  // NEU: Funktion zum Öffnen des Chatbots
  const handleHelpClick = () => {
    window.dispatchEvent(new CustomEvent('openChatbot'));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsProfileDropdownOpen(false);
      setFirestoreUserData(null); // Firestore-Daten beim Logout zurücksetzen
      router.push('/'); // Weiterleitung zur Startseite nach dem Logout
    } catch (error) {}
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

  // Debug: Log company prop

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {company ? (
              // --- ANSICHT FÜR COMPANY DASHBOARD ---
              <div className="flex items-center gap-3">
                {/* Taskilo Logo auch im Company Dashboard anzeigen */}
                <Link href="/" className="text-xl font-bold text-[#14ad9f]">
                  Taskilo
                </Link>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 hidden sm:block">
                  {company.companyName}
                </h1>
              </div>
            ) : (
              // --- STANDARD-ANSICHT FÜR DIE APP (Logo) ---
              <Link href="/" className="text-xl sm:text-2xl font-bold text-[#14ad9f]">
                Taskilo
              </Link>
            )}

            {/* Suchleiste - Responsive */}
            <div
              className="relative flex-grow max-w-xl mx-2 sm:mx-4"
              ref={searchDropdownContainerRef}
            >
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Dienstleistung auswählen..."
                className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-sm sm:text-base"
                onFocus={() => setIsSearchDropdownOpen(true)}
                onChange={e => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              {isSearchDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-96 overflow-y-auto bg-white rounded-md shadow-lg z-30 ring-1 ring-black ring-opacity-5">
                  {filteredCategories.map((category: Category) => (
                    <div key={category.title} className="p-2">
                      <h3 className="font-semibold text-gray-700 px-2 text-xs sm:text-sm sticky top-0 bg-gray-50 py-1">
                        {category.title}
                      </h3>
                      <ul className="mt-1">
                        {category.subcategories.map(subcategory => (
                          <li key={subcategory}>
                            <Link
                              href={
                                currentUser
                                  ? company
                                    ? `/dashboard/company/${company.uid}/services/${encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))}`
                                    : `/dashboard/user/${currentUser.uid}/services/${encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))}`
                                  : '/login'
                              }
                              className="block px-4 py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 hover:text-[#14ad9f] rounded"
                              onClick={handleSubcategorySelect}
                            >
                              {subcategory}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {filteredCategories.length === 0 && searchTerm.trim() && (
                    <p className="p-4 text-xs sm:text-sm text-gray-500">
                      Keine Übereinstimmungen für &ldquo;{searchTerm}&rdquo; gefunden.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Icons und Benutzerprofil */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Benachrichtigungen - nur desktop */}
              <div className="relative hidden sm:block">
                {' '}
                {/* Wrapper für die Glocke */}
                <button className="text-gray-600 hover:text-[#14ad9f] p-1">
                  <FiBell size={20} />
                </button>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#14ad9f] text-white rounded-full px-1.5 py-0.5 text-xs font-medium z-10">
                    {unreadMessagesCount}
                  </span>
                )}
              </div>

              {/* NEU: Posteingang-Icon mit Hover-Dropdown - nur desktop */}
              <div
                className="relative hidden sm:block"
                onMouseEnter={handleInboxEnter}
                onMouseLeave={handleInboxLeave}
              >
                <Link
                  href={
                    currentUser
                      ? company
                        ? `/dashboard/company/${company.uid}/inbox`
                        : `/dashboard/user/${currentUser.uid}/inbox`
                      : '/login'
                  }
                  className="text-gray-600 hover:text-[#14ad9f] p-1 block"
                >
                  <FiMail size={20} />
                </Link>
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
                              href={chat.link}
                              onClick={() => setIsInboxDropdownOpen(false)}
                              className={`block p-3 hover:bg-gray-100 ${chat.isUnread ? 'bg-teal-50' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                {chat.otherUserAvatarUrl ? (
                                  <img
                                    src={chat.otherUserAvatarUrl}
                                    alt={chat.otherUserName}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <FiUser />
                                  </div>
                                )}
                                <div className="flex-1 overflow-hidden">
                                  <p className="font-semibold truncate text-sm">
                                    {chat.otherUserName}
                                  </p>
                                  <p
                                    className={`text-sm truncate ${chat.isUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                                  >
                                    {chat.lastMessageText}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-sm text-gray-500 text-center">
                        Keine neuen Nachrichten.
                      </p>
                    )}
                    <div className="border-t p-2 text-center">
                      <Link
                        href={
                          currentUser
                            ? company
                              ? `/dashboard/company/${company.uid}/inbox`
                              : `/dashboard/user/${currentUser.uid}/inbox`
                            : '/login'
                        }
                        onClick={() => setIsInboxDropdownOpen(false)}
                        className="text-sm font-medium text-[#14ad9f] hover:underline"
                      >
                        Zum Posteingang
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Hilfe Button - nur desktop */}
              <button
                onClick={handleHelpClick}
                className="text-gray-600 hover:text-[#14ad9f] p-1 hidden sm:block"
                aria-label="Hilfe & Support Chatbot öffnen"
              >
                <FiHelpCircle size={20} />
              </button>

              {currentUser ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center"
                  >
                    {/* PRIORITÄT: Benutzer-Profilbild > Firmenlogo > Platzhalter */}
                    {(profilePictureURLFromStorage || currentUser.photoURL) && !imageLoadError ? (
                      <img
                        src={profilePictureURLFromStorage || currentUser.photoURL || ''}
                        alt="Avatar"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                        onError={e => {
                          setImageLoadError(true);
                        }}
                        onLoad={() => {
                          setImageLoadError(false);
                        }}
                      />
                    ) : company?.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt="Firmenlogo"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-cover"
                      />
                    ) : (
                      // Fallback wenn kein Bild vorhanden oder Ladefehler
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <FiUser className="text-gray-500 text-sm" />
                      </div>
                    )}
                    <FiChevronDown
                      className={`ml-1 transition-transform text-sm ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-3 text-left">
                        <p className="text-sm font-semibold">
                          {firestoreUserData?.firstName && firestoreUserData?.lastName
                            ? `${firestoreUserData.firstName} ${firestoreUserData.lastName}`
                            : currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {firestoreUserData?.user_type
                            ? firestoreUserData.user_type.charAt(0).toUpperCase() +
                              firestoreUserData.user_type.slice(1)
                            : 'Benutzer'}
                        </p>
                      </div>
                      <hr />
                      {/* --- DYNAMISCHE LINKS BASIEREND AUF COMPANY STATUS --- */}
                      {firestoreUserData && (firestoreUserData as any).companyName ? (
                        // Links für Companies
                        <>
                          <button
                            onClick={() => {
                              if (onDashboardClick) {
                                onDashboardClick();
                              } else {
                                router.push(`/dashboard/company/${currentUser.uid}`);
                              }
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <FiGrid className="inline mr-2" />
                            Dashboard & Aufträge
                          </button>
                          <Link
                            href={`/dashboard/company/${currentUser.uid}/orders/overview`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiCheckSquare className="inline mr-2" />
                            Meine Aufträge
                          </Link>
                          <Link
                            href={`/dashboard/company/${currentUser.uid}/inbox`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiInbox className="inline mr-2" />
                            Posteingang
                          </Link>
                          <hr />
                          <button
                            onClick={() => {
                              if (onSettingsClick) {
                                onSettingsClick();
                              } else {
                                router.push(`/dashboard/company/${currentUser.uid}`);
                              }
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <FiSettings className="inline mr-2" />
                            Meine Einstellungen
                          </button>
                        </>
                      ) : (
                        // Links für 'kunde' (oder Standard)
                        <>
                          <Link
                            href={`/dashboard/user/${currentUser.uid}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiGrid className="inline mr-2" />
                            Dashboard
                          </Link>
                          <Link
                            href={`/dashboard/user/${currentUser.uid}/orders/overview`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiInbox className="inline mr-2" />
                            Aufträge
                          </Link>
                          <hr />
                          <Link
                            href={`/dashboard/user/${currentUser.uid}/settings`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiSettings className="inline mr-2" />
                            Meine Einstellungen
                          </Link>
                        </>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <FiLogOut className="inline mr-2" />
                        Abmelden
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-medium text-[#14ad9f] hover:underline px-2 py-1"
                >
                  Anmelden
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Die Kategorien-Navigation wird nur im allgemeinen Modus angezeigt, nicht im Company-Dashboard */}
        {!company && <AppHeaderNavigation />}
      </header>

      <style jsx>
        {`
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

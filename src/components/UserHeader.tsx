// src/components/UserHeader.tsx with notification badge

'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'; // Added memo
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Importiere Link
import { User, getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { app, storage, db } from '@/firebase/clients';
import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage'; // Firebase Storage Functions
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
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { categories, Category } from '@/lib/categoriesData'; // Categories for search
import { WorkspaceService } from '@/services/WorkspaceService'; // For Quick Note functionality
import { Logo } from '@/components/logo';
import AppHeaderNavigation from './AppHeaderNavigation'; // Category navigation below header
import { QuickNoteDialog } from '@/components/workspace/QuickNoteDialog'; // Quick Note Dialog
import {
  Search as FiSearch,
  Bell as FiBell,
  Mail as FiMail,
  HelpCircle as FiHelpCircle,
  ChevronDown as FiChevronDown,
  Grid as FiGrid,
  Briefcase as FiBriefcase,
  Settings as FiSettings,
  LogOut as FiLogOut,
  FilePlus as FiFilePlus,
  Inbox as FiInbox,
  CheckSquare as FiCheckSquare,
  User as FiUser,
  Package as FiPackage,
  Info as FiInfo,
  FileText as FiFileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OverdueInvoicesAlert } from '@/components/finance/OverdueInvoicesAlert';
const auth = getAuth(app);

// NEU: Interface für Benachrichtigungen
interface NotificationPreview {
  id: string;
  type:
    | 'order'
    | 'support'
    | 'system'
    | 'update'
    | 'new_proposal'
    | 'proposal_accepted'
    | 'proposal_declined'
    | 'project_created'
    | 'quote_accepted'
    | 'contact_exchanged';
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Timestamp;
}

interface UserHeaderProps {
  currentUid: string;
}

const UserHeader: React.FC<UserHeaderProps> = ({ currentUid }) => {
  const { user: authUser, loading: authLoading, unreadMessagesCount, recentChats } = useAuth(); // KORREKTUR: Alle Daten aus dem Context beziehen

  const router = useRouter();
  const [profilePictureURLFromStorage, setProfilePictureURLFromStorage] = useState<string | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isInboxDropdownOpen, setIsInboxDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0); // NEU
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]); // NEU
  const [workspaces, setWorkspaces] = useState<any[]>([]); // For Quick Note functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false); // NEW: Verhindert Redirect-Loops
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
      return () => {};
    }

    // KORREKTUR: Prüfe Auth-Status bevor Query ausgeführt wird
    if (!auth.currentUser) {
      setUnreadNotificationsCount(0);
      setNotifications([]);
      return () => {};
    }

    // KORREKTUR: Stelle sicher, dass der aktuelle User dem UID entspricht
    if (auth.currentUser.uid !== uid) {
      setUnreadNotificationsCount(0);
      setNotifications([]);
      return () => {};
    }

    // Ändere Query um nur ungelesene Benachrichtigungen zu holen
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', uid), // WICHTIG: Diese where-Klausel ist für die Firestore-Regel erforderlich
      where('isRead', '==', false), // Nur ungelesene Benachrichtigungen
      orderBy('createdAt', 'desc'), // Index ist jetzt verfügbar
      limit(10) // Die 10 neuesten ungelesenen Benachrichtigungen
    );

    let isSubscriptionActive = true; // Flag to prevent processing after unmount

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot: QuerySnapshot) => {
        if (!isSubscriptionActive) return; // Prevent processing if component unmounted

        const fetchedNotifications = snapshot.docs.map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as NotificationPreview
        );

        // Da wir nur ungelesene Benachrichtigungen laden, ist die Anzahl gleich der Gesamtanzahl
        setNotifications(fetchedNotifications);
        setUnreadNotificationsCount(fetchedNotifications.length);
      },
      error => {
        if (!isSubscriptionActive) return; // Prevent processing if component unmounted

        // KORREKTUR: Verwende warn statt error für permission-denied, um Console-Spam zu reduzieren
        if (error.code === 'permission-denied') {
        } else {
        }

        // Fallback: Setze leere Arrays bei Fehlern (ohne weitere Console-Ausgaben)
        setNotifications([]);
        setUnreadNotificationsCount(0);
      }
    );

    return () => {
      isSubscriptionActive = false;
      unsubscribe();
    };
  }, []); // auth und db sind stabile Referenzen und müssen nicht in die deps

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
      setProfilePictureURLFromStorage(null);
    }
  }, []);

  useEffect(() => {
    // Effekt zur Überwachung des Authentifizierungsstatus
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setCurrentUser(user);
      if (user?.uid) {
        loadProfilePictureFromStorage(user.uid);
      } else {
        setProfilePictureURLFromStorage(null);
        // If no user, and not on login page, redirect to login
        if (!window.location.pathname.startsWith('/login')) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
          );
        }
      }
    });
    return () => unsubscribe();
  }, [currentUid, router, loadProfilePictureFromStorage]);

  // Smart Redirect basierend auf user_type - KORRIGIERTE LOGIK mit Loop-Schutz
  useEffect(() => {
    // Verhindere Redirect wenn bereits umgeleitet wird
    if (isRedirecting) {
      console.log('� REDIRECT: Bereits am Umleiten, überspringe...');
      return;
    }

    console.log('�🔍 Redirect Check:', {
      currentUser: currentUser?.uid,
      currentUid: currentUid,
      authUser: authUser,
      user_type: authUser?.user_type, // Verwende AuthContext statt firestoreUserData
      currentPath: window.location.pathname,
      isRedirecting,
    });

    if (currentUser?.uid && authUser && currentUser.uid === currentUid) {
      const currentPath = window.location.pathname;
      const userType = authUser.user_type; // Verwende AuthContext

      console.log(`🎯 REDIRECT CHECK: userType="${userType}", path="${currentPath}"`);

      // Wenn Firma-User auf /dashboard/user/ ist → SOFORTIGER redirect zu /dashboard/company/
      if (userType === 'firma' && currentPath.startsWith('/dashboard/user/')) {
        console.log(
          `🔄 FIRMA USER auf USER DASHBOARD ERKANNT! SOFORTIGE Umleitung zu Company Dashboard...`
        );
        setIsRedirecting(true);
        // Verwende window.location.href für sofortigen, zuverlässigen Redirect
        window.location.href = `/dashboard/company/${currentUser.uid}`;
        return;
      }

      // Wenn Normal-User auf /dashboard/company/ ist → SOFORTIGER redirect zu /dashboard/user/
      if (userType !== 'firma' && currentPath.startsWith('/dashboard/company/')) {
        console.log(
          `🔄 USER auf COMPANY DASHBOARD ERKANNT! SOFORTIGE Umleitung zu User Dashboard...`
        );
        setIsRedirecting(true);
        // Verwende window.location.href für sofortigen, zuverlässigen Redirect
        window.location.href = `/dashboard/user/${currentUser.uid}`;
        return;
      }

      console.log(
        `✅ REDIRECT: Keine Umleitung nötig für userType="${userType}" auf path="${currentPath}"`
      );
    } else {
      console.log(
        `⏳ REDIRECT: Warte auf Daten... currentUser=${!!currentUser?.uid}, authUser=${!!authUser}, uid match=${currentUser?.uid === currentUid}`
      );
    }
  }, [currentUser?.uid, currentUid, authUser, isRedirecting]);

  // Reset isRedirecting nach kurzer Zeit falls Redirect fehlschlägt
  useEffect(() => {
    if (isRedirecting) {
      const timeout = setTimeout(() => {
        console.log('⏰ REDIRECT TIMEOUT: Setze isRedirecting zurück nach 2 Sekunden');
        setIsRedirecting(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isRedirecting]);

  // Effekt zum Abonnieren von Nachrichten, basierend auf dem aktuellen Benutzer und seinem Typ
  useEffect(() => {
    // KORREKTUR: Nur subscribe wenn currentUser und currentUid übereinstimmen
    if (currentUser?.uid && currentUser.uid === currentUid) {
      const unsubscribeNotifications = subscribeToNotifications(currentUser.uid);
      return () => {
        unsubscribeNotifications();
      };
    } else {
      // Cleanup wenn User nicht übereinstimmt
      setNotifications([]);
      setUnreadNotificationsCount(0);
    }
  }, [currentUser?.uid, currentUid, subscribeToNotifications]);

  // Load workspaces for Quick Note functionality
  useEffect(() => {
    if (currentUser?.uid && authUser?.companyName) {
      const loadWorkspaces = async () => {
        try {
          const workspaceData = await WorkspaceService.getWorkspaces(currentUser.uid);
          setWorkspaces(workspaceData);
        } catch (error) {
          setWorkspaces([]);
        }
      };
      loadWorkspaces();
    } else {
      setWorkspaces([]);
    }
  }, [currentUser?.uid, authUser?.user_type]);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ profilePictureURL?: string }>;
      if (customEvent.detail?.profilePictureURL) {
        setCurrentUser(prevUser =>
          prevUser ? { ...prevUser, photoURL: customEvent.detail.profilePictureURL || null } : null
        );
      }
      if (currentUser?.uid) {
        loadProfilePictureFromStorage(currentUser.uid);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [currentUser?.uid, loadProfilePictureFromStorage]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node) &&
        isProfileDropdownOpen
      ) {
        setIsProfileDropdownOpen(false);
      }
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
  }, [isProfileDropdownOpen, isSearchDropdownOpen]);

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

  // NEU: Funktion zum LÖSCHEN einer Benachrichtigung aus der Datenbank
  const handleNotificationClick = async (notificationId: string, link: string) => {
    try {
      // LÖSCHEN statt als gelesen markieren - verhindert Datenbank-Überladung
      if (notificationId) {
        const notificationRef = doc(db, 'notifications', notificationId);
        await deleteDoc(notificationRef);
        console.log(`✅ Notification ${notificationId} deleted from database`);

        // Auch aus lokalem State entfernen
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Continue anyway - don't block navigation
    }

    // Navigate to the link
    if (link) {
      window.location.href = link;
    }
  };

  // NEU: Funktion zum Markieren aller Benachrichtigungen als gelesen
  const handleMarkAllAsRead = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Markieren aller Benachrichtigungen');
      }

      const result = await response.json();
    } catch (error) {}
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      setIsProfileDropdownOpen(false);
      router.push('/');
    } catch (error) {}
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
      <header className="bg-white shadow-sm relative">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="text-4xl font-bold text-[#14ad9f] flex items-center">
              <div className="h-10 w-auto">
                <Logo variant="default" />
              </div>
            </Link>

            {/* Suchleiste */}
            <div className="relative flex-grow max-w-xl mx-4" ref={searchDropdownContainerRef}>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Dienstleistung auswählen oder suchen..."
                className="w-full p-3 pl-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-base"
                onFocus={() => setIsSearchDropdownOpen(true)}
                onChange={e => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              {isSearchDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-96 overflow-y-auto bg-white rounded-md shadow-lg z-30 ring-1 ring-black ring-opacity-5">
                  {filteredCategories.map((category: Category) => (
                    <div key={category.title} className="p-2">
                      <h3 className="font-semibold text-gray-700 px-2 text-sm sticky top-0 bg-gray-50 py-1">
                        {category.title}
                      </h3>
                      <ul className="mt-1">
                        {category.subcategories.map(subcategory => (
                          <li key={subcategory}>
                            <Link
                              href={`/login`}
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
                  {filteredCategories.length === 0 && searchTerm.trim() && (
                    <p className="p-4 text-sm text-gray-500">
                      Keine Übereinstimmungen für &ldquo;{searchTerm}&rdquo; gefunden.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Icons und Benutzerprofil */}
            <div className="flex items-center space-x-4">
              {/* Quick Note Dialog - nur für Company-Benutzer */}
              {currentUser?.uid && authUser?.companyName && workspaces.length > 0 && (
                <QuickNoteDialog
                  workspaces={workspaces}
                  companyId={currentUser.uid}
                  userId={currentUser.uid}
                  onNoteAdded={() => {
                    // Optional: Refresh workspaces after note is added
                  }}
                />
              )}

              {/* NEU: Glocken-Icon mit Hover-Dropdown und Badge */}
              <div
                className="relative"
                onMouseEnter={handleNotificationEnter}
                onMouseLeave={handleNotificationLeave}
              >
                <button className="text-gray-600 hover:text-[#14ad9f] block p-2 rounded-md hover:bg-gray-100">
                  <FiBell size={24} />
                </button>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-medium z-10">
                    {unreadNotificationsCount}
                  </span>
                )}
                {isNotificationDropdownOpen && currentUser && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                    <div className="p-3 border-b flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">Benachrichtigungen</h4>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-[#14ad9f] hover:text-[#129488] font-medium"
                        >
                          Alle als gelesen markieren
                        </button>
                      )}
                    </div>

                    {/* Überfällige Rechnungen Alert für Company-Benutzer */}
                    {currentUid && (
                      <div className="border-b">
                        <OverdueInvoicesAlert
                          companyId={currentUid}
                          onViewInvoicesClick={() => {
                            router.push(`/dashboard/company/${currentUid}/finance/invoices`);
                            setIsNotificationDropdownOpen(false);
                          }}
                        />
                      </div>
                    )}

                    {notifications.length > 0 ? (
                      <ul>
                        {notifications.map(notification => (
                          <li key={notification.id}>
                            <Link
                              href={notification.link || '#'}
                              onClick={() =>
                                handleNotificationClick(notification.id, notification.link || '#')
                              }
                              className="block p-3 hover:bg-gray-100 bg-blue-50"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                  {notification.type === 'order' && (
                                    <FiPackage className="text-gray-600" />
                                  )}
                                  {notification.type === 'support' && (
                                    <FiHelpCircle className="text-gray-600" />
                                  )}
                                  {(notification.type === 'system' ||
                                    notification.type === 'update') && (
                                    <FiInfo className="text-gray-600" />
                                  )}
                                  {notification.type === 'new_proposal' && (
                                    <FiFileText className="text-blue-600" />
                                  )}
                                  {notification.type === 'proposal_accepted' && (
                                    <FiCheckSquare className="text-green-600" />
                                  )}
                                  {notification.type === 'proposal_declined' && (
                                    <FiUser className="text-red-600" />
                                  )}
                                  {notification.type === 'project_created' && (
                                    <FiBriefcase className="text-[#14ad9f]" />
                                  )}
                                  {notification.type === 'quote_accepted' && (
                                    <FiCheckSquare className="text-green-600" />
                                  )}
                                  {notification.type === 'contact_exchanged' && (
                                    <FiMail className="text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-sm text-gray-900 font-medium">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {(() => {
                                      if (notification.createdAt?.toDate) {
                                        return notification.createdAt
                                          .toDate()
                                          .toLocaleString('de-DE');
                                      } else if (typeof notification.createdAt === 'string') {
                                        return new Date(notification.createdAt).toLocaleString(
                                          'de-DE'
                                        );
                                      } else {
                                        return new Date().toLocaleString('de-DE');
                                      }
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-sm text-gray-500 text-center">
                        Keine neuen Benachrichtigungen.
                      </p>
                    )}
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
                  className="text-gray-600 hover:text-[#14ad9f] block p-2 rounded-md hover:bg-gray-100" // block, damit der Badge richtig positioniert wird
                >
                  <FiMail size={24} />
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
                        href={currentUser ? `/dashboard/user/${currentUser.uid}/inbox` : '/login'}
                        onClick={() => setIsInboxDropdownOpen(false)}
                        className="text-sm font-medium text-[#14ad9f] hover:underline"
                      >
                        Zum Posteingang
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleHelpClick}
                className="text-gray-600 hover:text-[#14ad9f] p-2 rounded-md hover:bg-gray-100"
                aria-label="Hilfe & Support Chatbot öffnen"
              >
                <FiHelpCircle size={24} />
              </button>

              {currentUser ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center"
                  >
                    {profilePictureURLFromStorage || currentUser.photoURL ? (
                      <img
                        src={profilePictureURLFromStorage || currentUser.photoURL || ''}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <FiUser className="text-gray-500 w-5 h-5" />
                      </div>
                    )}
                    <FiChevronDown
                      className={`ml-1 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-3 text-left">
                        <p className="text-sm font-semibold">
                          {authUser?.firstName && authUser?.lastName
                            ? `${authUser.firstName} ${authUser.lastName}`
                            : currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {authUser?.user_type
                            ? authUser.user_type.charAt(0).toUpperCase() +
                              authUser.user_type.slice(1)
                            : 'Benutzer'}
                        </p>
                      </div>
                      <hr />
                      {/* --- DYNAMISCHE LINKS BASIEREND AUF COMPANY STATUS --- */}
                      {authUser?.companyName ? (
                        // Links für Companies
                        <>
                          <Link
                            href={`/dashboard/company/${currentUser.uid}`}
                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiGrid className="inline mr-2" />
                            Dashboard & Aufträge
                          </Link>
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
                          <Link
                            href={`/dashboard/company/${currentUser.uid}/settings`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiSettings className="inline mr-2" />
                            Meine Einstellungen
                          </Link>
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
                            href={`/dashboard/user/${currentUser.uid}/projects`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiPackage className="inline mr-2" />
                            Meine Projekte
                          </Link>
                          <Link
                            href={`/dashboard/user/${currentUser.uid}/orders/overview`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiBriefcase className="inline mr-2" />
                            Meine Aufträge
                          </Link>
                          <Link
                            href={`/dashboard/user/${currentUser.uid}/quotes`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiFileText className="inline mr-2" />
                            Meine Angebote
                          </Link>
                          <Link
                            href={
                              currentUser
                                ? `/dashboard/user/${currentUid}/projects/create`
                                : '/login'
                            }
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiFilePlus className="inline mr-2" />
                            Eine Projektanfrage posten
                          </Link>
                          <hr />
                          <Link
                            href={currentUser ? `/dashboard/user/${currentUid}/settings` : '/login'}
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
                <Link href="/login" className="text-sm font-medium text-[#14ad9f] hover:underline">
                  Anmelden
                </Link>
              )}
            </div>
          </div>
        </div>
        <AppHeaderNavigation />
      </header>

      <style jsx>
        {`
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
};
export default memo(UserHeader); // Export as memoized

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
  getDocs,
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
  Trash2 as FiTrash2,
  Check as FiCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OverdueInvoicesAlert } from '@/components/finance/OverdueInvoicesAlert';
import { useUpdateNotifications } from '@/hooks/useUpdateNotifications';
import useMeasure from 'react-use-measure';

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

  // Update-Notification System
  const { unseenCount, unseenUpdates, setShowNotificationModal, dismissUpdate, markUpdateAsSeen } =
    useUpdateNotifications();

  const router = useRouter();
  const [profilePictureURLFromStorage, setProfilePictureURLFromStorage] = useState<string | null>(
    null
  );
  const [profilePictureFromFirestore, setProfilePictureFromFirestore] = useState<string | null>(
    null
  );
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isInboxDropdownOpen, setIsInboxDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0); // NEU
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]); // NEU

  // Scroll-Logic for hiding header
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [headerRef, bounds] = useMeasure();

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;

        // Ignore negative scroll (Safari bounce)
        if (currentScrollY < 0) return;

        const diff = currentScrollY - lastScrollY.current;

        // Hide if scrolling down AND scrolled past 100px
        if (diff > 0 && currentScrollY > 100) {
          setIsVisible(false);
        }
        // Show if scrolling up significantly (more than 10px) or at the very top
        else if (diff < -10 || currentScrollY < 100) {
          setIsVisible(true);
        }

        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, []);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0); // 🔔 UNREAD EMAILS
  const [workspaces, setWorkspaces] = useState<any[]>([]); // For Quick Note functionality
  const [searchTerm, setSearchTerm] = useState('');
  // ENTFERNT: isRedirecting State - Redirect wird jetzt zentral im AuthContext behandelt
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

    // DEBUG: Prüfe erst alle Notifications für diesen User
    const allNotificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    getDocs(allNotificationsQuery)
      .then(snap => {
        const allDocs = snap.docs.map(d => ({
          id: d.id,
          isRead: d.data().isRead,
          type: d.data().type,
          message: d.data().message,
          createdAt: d.data().createdAt,
        }));
      })
      .catch(err => {
        console.error('[NotificationDebug] Error fetching all notifications:', err);
      });

    // LÖSUNG: Lade ALLE Notifications und filtere client-seitig
    // Grund: Manche Notifications haben kein isRead Feld (= ungelesen)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', uid), // WICHTIG: Diese where-Klausel ist für die Firestore-Regel erforderlich
      orderBy('createdAt', 'desc'),
      limit(20) // Lade mehr, da wir client-seitig filtern
    );

    let isSubscriptionActive = true; // Flag to prevent processing after unmount

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot: QuerySnapshot) => {
        if (!isSubscriptionActive) return; // Prevent processing if component unmounted

        const allNotifications = snapshot.docs.map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as NotificationPreview
        );

        // Client-seitige Filterung: isRead === false ODER isRead === undefined
        const unreadNotifications = allNotifications.filter(
          notif => notif.isRead === false || notif.isRead === undefined
        );

        // Nur ungelesene Notifications anzeigen
        setNotifications(unreadNotifications);
        setUnreadNotificationsCount(unreadNotifications.length);
      },
      error => {
        if (!isSubscriptionActive) return; // Prevent processing if component unmounted

        console.error('[NotificationDebug] Error:', error.code, error.message);

        // Bei Permission-Fehler: Setze Counts auf 0 statt Fehler zu werfen
        if (error.code === 'permission-denied') {
          setNotifications([]);
          setUnreadNotificationsCount(0);
        } else {
          // Andere Fehler: Auch auf 0 setzen
          setNotifications([]);
          setUnreadNotificationsCount(0);
        }
      }
    );

    return () => {
      isSubscriptionActive = false;
      unsubscribe();
    };
  }, []); // auth und db sind stabile Referenzen und müssen nicht in die deps

  // Lade Profil aus Firestore (Company oder User Collection)
  const loadProfileFromFirestore = useCallback(async (uid: string) => {
    try {
      // Debug-Log entfernt

      // Versuche zuerst companies Collection
      const companyDoc = await getDoc(doc(db, 'companies', uid));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        const profileUrl =
          companyData.step3?.profilePictureURL ||
          companyData.profilePictureURL ||
          companyData.profilePictureFirebaseUrl ||
          companyData.profileImage ||
          null;

        // Company Logo laden
        setCompanyLogo(profileUrl);
        setProfilePictureURLFromStorage(profileUrl);
        return;
      }

      // Fallback: users Collection
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profileUrl =
          userData.profilePictureURL || userData.profileImage || userData.photoURL || null;

        // Debug-Log entfernt
        setProfilePictureURLFromStorage(profileUrl);
        return;
      }

      // Debug-Log entfernt
      setProfilePictureURLFromStorage(null);
    } catch (error) {
      setProfilePictureURLFromStorage(null);
    }
  }, []); // 🎯 NEUE FUNKTION: Lade Profilbild aus Firestore Company-Collection
  const loadProfilePictureFromFirestore = useCallback(async (uid: string) => {
    if (!uid) {
      // Debug-Log entfernt
      setProfilePictureFromFirestore(null);
      return;
    }
    try {
      // Debug-Log entfernt
      const companyDoc = await getDoc(doc(db, 'companies', uid));

      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        const profileImage =
          companyData.profileImage || companyData.profileImageUrl || companyData.avatar;

        if (profileImage) {
          // Debug-Log entfernt
          setProfilePictureFromFirestore(profileImage);
        } else {
          // Debug-Log entfernt
          setProfilePictureFromFirestore(null);
        }
      } else {
        // Debug-Log entfernt
        setProfilePictureFromFirestore(null);
      }
    } catch (error) {
      setProfilePictureFromFirestore(null);
    }
  }, []);

  useEffect(() => {
    // Effekt zur Überwachung des Authentifizierungsstatus
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setCurrentUser(user);
      if (user?.uid) {
        loadProfileFromFirestore(user.uid);
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
  }, [currentUid, router, loadProfilePictureFromFirestore]);

  // DEAKTIVIERT: Redirect-Logik wird jetzt im AuthContext gehandhabt
  // Smart Redirect basierend auf user_type - KORRIGIERTE LOGIK mit Loop-Schutz
  useEffect(() => {
    // REDIRECT-LOGIK DEAKTIVIERT: Wird jetzt zentral im AuthContext behandelt
    // Dies verhindert Endlos-Loops zwischen AuthContext und UserHeader

    // Nur Debug-Logs beibehalten für Monitoring
    if (currentUser?.uid && authUser && currentUser.uid === currentUid) {
      const user_type = authUser.user_type;
      const currentPath = window.location.pathname;

      // Debug-Log entfernt
    }
  }, [currentUser?.uid, currentUid, authUser]);

  // Effekt zum Abonnieren von Nachrichten - OPTIMIERT für sofortiges Laden
  useEffect(() => {
    // Subscribe sofort wenn currentUser vorhanden ist
    if (!currentUser?.uid) {
      // Cleanup wenn kein User

      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }

    const unsubscribeNotifications = subscribeToNotifications(currentUser.uid);
    return () => {
      unsubscribeNotifications();
    };
  }, [currentUser?.uid, subscribeToNotifications]);

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
        loadProfilePictureFromFirestore(currentUser.uid);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [currentUser?.uid, loadProfilePictureFromFirestore]);

  // 🔔 EMAIL NOTIFICATIONS: Listener für ungelesene E-Mails (benutzer-spezifisch)
  useEffect(() => {
    if (!currentUid) {
      setUnreadEmailsCount(0);
      return;
    }

    // Die effektive User-ID - für Mitarbeiter ihre eigene UID, für Inhaber die Company-UID
    const effectiveUserId = currentUser?.uid || currentUid;

    console.log(`📧 [UserHeader] Email Listener für User: ${effectiveUserId}`);

    // Listener auf emailCache für ungelesene E-Mails - MIT userId Filter!
    const emailCacheRef = collection(db, 'companies', currentUid, 'emailCache');
    const unreadEmailsQuery = query(
      emailCacheRef,
      where('userId', '==', effectiveUserId)
    );

    const unsubscribe = onSnapshot(
      unreadEmailsQuery,
      snapshot => {
        // Zähle MANUELL ungelesene Emails (read === false oder read nicht vorhanden)
        const unreadCount = snapshot.docs.filter(doc => {
          const data = doc.data();
          return data.read === false || data.read === undefined;
        }).length;

        setUnreadEmailsCount(unreadCount);

        // Optional: Browser-Notification bei neuen Emails (nur wenn Tab im Hintergrund)
        if (unreadCount > 0 && document.hidden) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Neue E-Mail erhalten! 📧', {
              body: `Du hast ${unreadCount} ungelesene E-Mail${unreadCount > 1 ? 's' : ''}`,
              icon: '/favicon.ico',
            });
          }
        }
      },
      error => {
        console.error('❌ [UserHeader] Email notification listener error:', error);
        setUnreadEmailsCount(0);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUid, currentUser?.uid]);

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
        // Debug-Log entfernt

        // Auch aus lokalem State entfernen
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {}

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
      <div style={{ height: bounds.height > 0 ? bounds.height : 120 }} className="w-full" />
      <header
        ref={headerRef}
        className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out"
        style={{ transform: isVisible ? 'translateY(0)' : 'translateY(-100%)' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Logo */}
            <Link href="/" className="text-xl sm:text-2xl font-bold text-[#14ad9f] shrink-0">
              Taskilo
            </Link>

            {/* Suchleiste */}
            <div className="relative flex-1" ref={searchDropdownContainerRef}>
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
            <div className="flex items-center space-x-2 sm:space-x-4">
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
                className="relative hidden sm:block"
                onMouseEnter={handleNotificationEnter}
                onMouseLeave={handleNotificationLeave}
              >
                <button className="text-gray-600 hover:text-[#14ad9f] p-1">
                  <FiBell size={20} />
                </button>
                {(unreadNotificationsCount > 0 || unseenCount > 0 || unreadEmailsCount > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-medium z-10">
                    {unreadNotificationsCount + unseenCount + unreadEmailsCount}
                  </span>
                )}
                {isNotificationDropdownOpen && currentUser && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                    <div className="p-3 border-b flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">Benachrichtigungen</h4>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-taskilo hover:text-taskilo-hover font-medium"
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

                    {/* Email Notifications */}
                    {unreadEmailsCount > 0 && (
                      <>
                        <div className="border-b border-gray-200 px-3 py-2 bg-blue-50">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                              <FiMail className="w-4 h-4" />
                              Ungelesene E-Mails ({unreadEmailsCount})
                            </h5>
                            <Link
                              href={`/dashboard/company/${currentUid}/emails`}
                              onClick={() => setIsNotificationDropdownOpen(false)}
                              className="text-xs text-taskilo hover:text-taskilo-hover font-medium"
                            >
                              Alle anzeigen
                            </Link>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/company/${currentUid}/emails`}
                          onClick={() => setIsNotificationDropdownOpen(false)}
                          className="block p-3 hover:bg-gray-100 bg-blue-50/30"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                              <FiMail className="text-white w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 font-medium">
                                {unreadEmailsCount} ungelesene E-Mail
                                {unreadEmailsCount !== 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Klicken um E-Mail-Postfach zu öffnen
                              </p>
                            </div>
                          </div>
                        </Link>
                      </>
                    )}

                    {/* System Notifications */}
                    {notifications.length > 0 ? (
                      <>
                        {unreadEmailsCount > 0 && (
                          <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
                            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              System-Benachrichtigungen
                            </h5>
                          </div>
                        )}
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
                      </>
                    ) : unreadEmailsCount === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">
                        Keine neuen Benachrichtigungen.
                      </p>
                    ) : null}

                    {/* Update-Benachrichtigungen */}
                    {unseenUpdates.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Neue Updates ({unseenCount})
                            </h5>
                            <button
                              onClick={() => {
                                setShowNotificationModal(true);
                                setIsNotificationDropdownOpen(false);
                              }}
                              className="text-xs text-taskilo hover:text-taskilo-hover font-medium"
                            >
                              Alle anzeigen
                            </button>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {unseenUpdates.slice(0, 3).map(update => (
                            <div
                              key={update.id}
                              className="group border-l-4 border-[#14ad9f] hover:bg-gray-50"
                            >
                              <div className="p-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#14ad9f] flex items-center justify-center shrink-0">
                                    <FiInfo className="text-white w-4 h-4" />
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <p className="text-sm text-gray-900 font-medium">
                                      {update.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Version {update.version} •{' '}
                                      {update.category === 'feature'
                                        ? 'Neue Funktion'
                                        : update.category === 'improvement'
                                          ? 'Verbesserung'
                                          : update.category === 'bugfix'
                                            ? 'Fehlerbehebung'
                                            : 'Sicherheit'}
                                    </p>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      // Bestimme die richtige Updates-Route basierend auf User-Typ
                                      const userType = authUser?.user_type;
                                      let updatesRoute = '';

                                      if (userType === 'firma' && currentUser?.uid) {
                                        updatesRoute = `/dashboard/company/${currentUser.uid}/updates`;
                                      } else if (currentUser?.uid) {
                                        updatesRoute = `/dashboard/user/${currentUser.uid}/updates`;
                                      }

                                      if (updatesRoute) {
                                        router.push(updatesRoute);
                                        setIsNotificationDropdownOpen(false);
                                      }
                                    }}
                                    className="text-xs text-taskilo hover:text-taskilo-hover font-medium"
                                  >
                                    Details anzeigen
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={async e => {
                                        e.stopPropagation();
                                        await markUpdateAsSeen(
                                          update.id,
                                          update.version || '1.0.0'
                                        );
                                      }}
                                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                                      title="Als gelesen markieren"
                                    >
                                      <FiCheck className="w-3 h-3" />
                                      Gelesen
                                    </button>

                                    <button
                                      onClick={async e => {
                                        e.stopPropagation();
                                        await dismissUpdate(update.id, update.version || '1.0.0');
                                      }}
                                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                                      title="Update-Benachrichtigung löschen"
                                    >
                                      <FiTrash2 className="w-3 h-3" />
                                      Löschen
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {/* NEU: Posteingang-Icon mit Hover-Dropdown und Badge */}
              <div
                className="relative hidden sm:block"
                onMouseEnter={handleInboxEnter}
                onMouseLeave={handleInboxLeave}
              >
                <Link
                  href={currentUser ? `/dashboard/user/${currentUser.uid}/inbox` : '/login'}
                  className="text-gray-600 hover:text-[#14ad9f] p-1 block"
                >
                  <FiMail size={20} />
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
                    {companyLogo || profilePictureURLFromStorage || currentUser.photoURL ? (
                      <img
                        src={
                          companyLogo || profilePictureURLFromStorage || currentUser.photoURL || ''
                        }
                        alt={companyLogo ? 'Company Logo' : 'Avatar'}
                        className={`w-7 h-7 sm:w-8 sm:h-8 object-cover ${
                          companyLogo ? 'rounded-md' : 'rounded-full'
                        }`}
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <FiUser className="text-gray-500 w-4 h-4" />
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
                          {authUser?.firstName && authUser?.lastName
                            ? `${authUser.firstName} ${authUser.lastName}`
                            : currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            // Verbesserte Logik: Verwende authUser.user_type als primäre Quelle
                            if (authUser?.user_type === 'firma' || authUser?.companyName) {
                              return 'Anbieter';
                            } else if (authUser?.user_type === 'kunde') {
                              return 'Kunde';
                            }

                            // Fallback auf URL-basierte Erkennung
                            if (typeof window !== 'undefined') {
                              const currentPath = window.location.pathname;
                              if (currentPath.includes('/dashboard/company/')) {
                                return 'Anbieter';
                              } else if (currentPath.includes('/dashboard/user/')) {
                                return 'Kunde';
                              }
                            }

                            // Letzter Fallback
                            return authUser?.user_type
                              ? authUser.user_type.charAt(0).toUpperCase() +
                                  authUser.user_type.slice(1)
                              : 'Benutzer';
                          })()}
                        </p>
                      </div>
                      <hr />
                      {/* --- DYNAMISCHE LINKS BASIEREND AUF USER TYPE --- */}
                      {(() => {
                        // Verbesserte Logik: Verwende authUser.user_type als primäre Quelle
                        const isCompany = authUser?.user_type === 'firma' || authUser?.companyName;

                        // Fallback auf URL-basierte Erkennung wenn user_type nicht klar ist
                        const urlBasedCompany =
                          typeof window !== 'undefined' &&
                          window.location.pathname.includes('/dashboard/company/');

                        if (isCompany || urlBasedCompany) {
                          // Links für Company Dashboard
                          return (
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
                          );
                        } else {
                          // Links für User Dashboard
                          return (
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
                                <FiCheckSquare className="inline mr-2" />
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
                                href={`/dashboard/user/${currentUser.uid}/projects/create`}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setIsProfileDropdownOpen(false)}
                              >
                                <FiFilePlus className="inline mr-2" />
                                Eine Projektanfrage posten
                              </Link>
                              <Link
                                href={`/dashboard/user/${currentUser.uid}/career`}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={() => setIsProfileDropdownOpen(false)}
                              >
                                <FiBriefcase className="inline mr-2" />
                                Karriere / Jobs
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
                          );
                        }
                      })()}
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
    </>
  );
};
export default memo(UserHeader); // Export as memoized

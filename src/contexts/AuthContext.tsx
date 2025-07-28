'use client';

import { type User as FirebaseUser, onAuthStateChanged, signOut } from '@/firebase/clients';
import { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { orderBy, limit } from 'firebase/firestore'; // NEU: orderBy und limit importieren
import { auth, db } from '@/firebase/clients';
import { userPresence } from '@/lib/userPresence'; // NEU: User Presence importieren

/**
 * Definiert ein einheitliches Benutzerprofil, das Daten aus Firebase Auth
 * und Firestore kombiniert. Dies wird zum neuen 'user'-Objekt.
 */
export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'master' | 'support' | 'firma' | 'kunde'; // Korrekte Rollen-Hierarchie: master ist höchste Berechtigung
  firstName?: string;
  lastName?: string;
  profilePictureURL?: string; // NEU: Avatar-URL für alle Benutzerprofile
  // Fügen Sie hier weitere globale Profilfelder hinzu
}

// NEU: Interface für die Chat-Vorschau, die im Header benötigt wird.
// Dies stellt sicher, dass der Context und der Header dieselbe Datenstruktur verwenden.
export interface HeaderChatPreview {
  id: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  lastMessageText: string;
  isUnread: boolean;
  link: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>; // NEU: Logout-Funktion hinzufügen
  userRole: 'master' | 'support' | 'firma' | 'kunde' | null;
  unreadMessagesCount: number;
  recentChats: HeaderChatPreview[]; // NEU: Fügt die letzten Chats zum Context hinzu
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [recentChats, setRecentChats] = useState<HeaderChatPreview[]>([]); // NEU: State für die letzten Chats

  const router = useRouter();
  const pathname = usePathname();

  // NEU: Logout-Funktion implementieren
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      // Optional: Leite den Benutzer nach dem Logout weiter
      router.push('/login');
    } catch (error) {
      console.error('Fehler beim Abmelden: ', error);
      // Hier könnten Sie dem Benutzer eine Fehlermeldung anzeigen
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      try {
        if (fbUser) {
          // Token aktualisieren, um die neuesten Claims zu erhalten.
          const idTokenResult = await fbUser.getIdTokenResult(true);
          setFirebaseUser(fbUser);

          // Debug: Claims loggen
          console.log('AuthContext: Custom Claims:', idTokenResult.claims);

          if (!db) {
            throw new Error('Firestore DB-Instanz ist nicht initialisiert.');
          }
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();

            // Rollenbestimmung: Custom Claim hat Vorrang.
            const roleFromClaim = idTokenResult.claims.master
              ? 'master'
              : idTokenResult.claims.role === 'master'
                ? 'master'
                : idTokenResult.claims.role === 'support'
                  ? 'support'
                  : idTokenResult.claims.role === 'firma'
                    ? 'firma'
                    : idTokenResult.claims.role === 'kunde'
                      ? 'kunde'
                      : null;
            const roleFromDb = (profileData.user_type as UserProfile['role']) || 'kunde';

            const finalRole = roleFromClaim || roleFromDb;

            // Debug: Rollen loggen
            console.log('AuthContext: Role from claim:', roleFromClaim);
            console.log('AuthContext: Role from DB:', roleFromDb);
            console.log('AuthContext: Final role:', finalRole);

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: finalRole,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              profilePictureURL: profileData.profilePictureURL || undefined,
            });

            // NEU: Initialisiere User Presence nach erfolgreicher Authentifizierung
            userPresence.initializePresence(fbUser.uid).catch(console.error);
          } else {
            console.warn(
              `AuthContext: Benutzer ${fbUser.uid} ist authentifiziert, aber das Firestore-Dokument wurde nicht gefunden.`
            );
            // Auch hier den Claim berücksichtigen, falls das DB-Dokument fehlt.
            const roleFromClaim = idTokenResult.claims.master
              ? 'master'
              : idTokenResult.claims.role === 'master'
                ? 'master'
                : idTokenResult.claims.role === 'support'
                  ? 'support'
                  : idTokenResult.claims.role === 'firma'
                    ? 'firma'
                    : idTokenResult.claims.role === 'kunde'
                      ? 'kunde'
                      : 'kunde';

            console.log('AuthContext: Fallback role from claim:', roleFromClaim);

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: roleFromClaim,
            });

            // NEU: Initialisiere User Presence auch für Fallback-Fall
            userPresence.initializePresence(fbUser.uid).catch(console.error);
          }
        } else {
          setUser(null);
          setFirebaseUser(null);

          // NEU: Cleanup Presence wenn User sich abmeldet
          userPresence.cleanupPresence();
        }
      } catch (error) {
        console.error(
          'AuthContext: Fehler beim Abrufen des Benutzerprofils oder der Claims.',
          error
        );
        setUser(null);
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Effekt für die Weiterleitung nach erfolgreichem Login
  useEffect(() => {
    console.log(
      `AuthContext: Login-Effekt ausgeführt - loading: ${loading}, user: ${user ? user.email : 'null'}, isRedirecting: ${isRedirecting}, pathname: ${pathname}`
    );

    // Nur ausführen, wenn der Ladevorgang abgeschlossen ist, ein Benutzer vorhanden ist und wir nicht bereits weiterleiten
    if (!loading && user && !isRedirecting) {
      // KORREKTUR: Überprüfe, ob der Benutzer gerade registriert wurde und eine spezifische Weiterleitung hat
      const justRegistered = sessionStorage.getItem('justRegistered');
      const registrationRedirectTo = sessionStorage.getItem('registrationRedirectTo');

      if (justRegistered === 'true' && registrationRedirectTo) {
        console.log(
          'AuthContext: Benutzer gerade registriert, weiterleiten zu:',
          registrationRedirectTo
        );
        // Cleanup der sessionStorage items
        sessionStorage.removeItem('justRegistered');
        sessionStorage.removeItem('registrationRedirectTo');
        setIsRedirecting(true);
        // Verwende window.location.assign für vollständige Navigation mit URL-Parametern
        window.location.assign(registrationRedirectTo);
        return;
      }

      // ERWEITERTE WEITERLEITUNGSLOGIK
      let shouldRedirect = false;
      let targetPath = '';

      // Master/Support werden von allen öffentlichen Seiten weitergeleitet
      if (user.role === 'master' || user.role === 'support') {
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          shouldRedirect = true;
          targetPath = '/dashboard/admin'; // Master/Support-Dashboard
        }
      }
      // Firmen werden auch von der Startseite weitergeleitet
      else if (user.role === 'firma') {
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          shouldRedirect = true;
          targetPath = `/dashboard/company/${user.uid}`; // Firmen-Dashboard
        }
      }
      // Kunden nur von Login/Register-Seiten
      else if (pathname === '/login' || pathname === '/register') {
        shouldRedirect = true;
        targetPath = `/dashboard/user/${user.uid}`; // Kunden-Dashboard
      }

      if (shouldRedirect && targetPath) {
        console.log(
          `AuthContext: Weiterleitung von ${pathname} zu ${targetPath} für Rolle ${user.role}`
        );
        setIsRedirecting(true);
        router.push(targetPath);
      }
    }
    // Wenn der Ladevorgang abgeschlossen ist und kein Benutzer vorhanden ist, das Flag zurücksetzen
    else if (!loading && !user) {
      setIsRedirecting(false);
    }
  }, [user, loading, router, pathname, isRedirecting]);

  // NEU: Chat-Listener für eingeloggte Benutzer
  useEffect(() => {
    if (!user?.uid) {
      setUnreadMessagesCount(0);
      setRecentChats([]); // Chats ebenfalls zurücksetzen
      return;
    }
    // HINZUGEFÜGT: Zusätzliche Sicherheitsprüfung für die DB-Instanz.
    if (!db) {
      console.error(
        '[AuthContext] Firestore DB ist nicht für den Listener für ungelesene Nachrichten verfügbar.'
      );
      setUnreadMessagesCount(0);
      setRecentChats([]);
      return;
    }

    const chatsRef = collection(db, 'chats');
    // Diese eine Abfrage holt die 5 neuesten, aktiven Chats.
    const recentChatsQuery = query(
      chatsRef,
      where('users', 'array-contains', user.uid),
      where('isLocked', '==', false),
      orderBy('lastUpdated', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      recentChatsQuery,
      snapshot => {
        const chatsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const otherUserId = data.users.find((id: string) => id !== user.uid);
          const userDetails = otherUserId ? data.userDetails?.[otherUserId] : null;
          const inboxLink =
            user.role === 'firma'
              ? `/dashboard/company/${user.uid}/inbox`
              : `/dashboard/user/${user.uid}/inbox`;

          return {
            id: doc.id,
            otherUserName: userDetails?.name || 'Unbekannter Benutzer',
            otherUserAvatarUrl: userDetails?.avatarUrl || null,
            lastMessageText: data.lastMessage?.text || '',
            isUnread: data.lastMessage?.senderId !== user.uid && !data.lastMessage?.isRead,
            link: inboxLink,
          };
        });

        const unreadCount = chatsData.filter(chat => chat.isUnread).length;
        setUnreadMessagesCount(unreadCount);
        setRecentChats(chatsData);
      },
      error => {
        console.error('[AuthContext] Fehler beim Abhören der Chats:', error);
        setUnreadMessagesCount(0);
        setRecentChats([]);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]); // Abhängig vom Benutzerobjekt

  // HINWEIS: `useMemo` wird verwendet, um unnötige Neurenderungen von abhängigen Komponenten zu vermeiden.
  // Der Context-Wert wird nur dann neu berechnet, wenn sich eine der Abhängigkeiten ändert.
  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      loading,
      logout, // NEU: Logout-Funktion im Context bereitstellen
      userRole: user?.role || null,
      unreadMessagesCount,
      recentChats,
    }),
    [user, firebaseUser, loading, unreadMessagesCount, recentChats]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

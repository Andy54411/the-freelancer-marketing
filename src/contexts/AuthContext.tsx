'use client';

import { type User as FirebaseUser, onAuthStateChanged, signOut } from '@/firebase/clients';
import { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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
  user_type: 'master' | 'support' | 'firma' | 'kunde'; // Verwende user_type statt role für Konsistenz
  firstName?: string;
  lastName?: string;
  profilePictureURL?: string; // NEU: Avatar-URL für alle Benutzerprofile
  companyName?: string; // NEU: Firmenname für Unternehmenskonten
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

  const pathname = usePathname();

  // NEU: Logout-Funktion implementieren
  const logout = async () => {
    try {
      // NEU: Cleanup Presence VOR dem Logout
      await userPresence.cleanupPresence();

      // Clear middleware cookies
      document.cookie =
        'taskilo_onboarding_complete=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict';
      document.cookie =
        'taskilo_profile_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict';

      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      // Optional: Leite den Benutzer nach dem Logout weiter
      window.location.href = '/login';
    } catch (error) {
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

          if (!db) {
            throw new Error('Firestore DB-Instanz ist nicht initialisiert.');
          }

          // Versuche zuerst users collection
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let profileData: any = null;
          let userFound = false;

          if (userDocSnap.exists()) {
            profileData = userDocSnap.data();
            userFound = true;
          } else {
            // FALLBACK: Prüfe companies collection (wie UserHeader)
            const companyDocRef = doc(db, 'companies', fbUser.uid);
            const companyDocSnap = await getDoc(companyDocRef);

            if (companyDocSnap.exists()) {
              profileData = companyDocSnap.data();
              userFound = true;
            }
          }

          if (userFound && profileData) {
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
            const roleFromDb = (profileData.user_type as UserProfile['user_type']) || 'kunde';

            const finalRole = roleFromClaim || roleFromDb;

            // Debug: Rollen loggen
            console.log('🔍 LOGIN REDIRECT CHECK:', {
              uid: fbUser.uid,
              email: fbUser.email,
              user_type: finalRole,
              pathname,
              isRedirecting,
            });

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              user_type: finalRole,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              profilePictureURL: profileData.profilePictureURL || undefined,
            });

            // KRITISCH: AUTO-REDIRECT nach LOGIN basierend auf user_type
            if (!isRedirecting) {
              let needsRedirect = false;
              let targetPath = '';

              // 1. Nach Login-Redirect
              if (pathname?.includes('/login')) {
                needsRedirect = true;
              }
              // 2. Firma User auf User Dashboard - SOFORT UMLEITEN!
              else if (finalRole === 'firma' && pathname?.includes('/dashboard/user/')) {
                needsRedirect = true;
                console.log('🚨 FIRMA auf USER DASHBOARD erkannt! Sofortige Umleitung...');
              }
              // 3. Kunde User auf Company Dashboard - SOFORT UMLEITEN!
              else if (finalRole === 'kunde' && pathname?.includes('/dashboard/company/')) {
                needsRedirect = true;
                console.log('🚨 KUNDE auf COMPANY DASHBOARD erkannt! Sofortige Umleitung...');
              }

              if (needsRedirect) {
                setIsRedirecting(true);

                targetPath =
                  finalRole === 'firma'
                    ? `/dashboard/company/${fbUser.uid}`
                    : finalRole === 'kunde'
                      ? `/dashboard/user/${fbUser.uid}`
                      : finalRole === 'master' || finalRole === 'support'
                        ? '/dashboard/admin'
                        : `/dashboard/user/${fbUser.uid}`; // Fallback

                console.log(`🚀 AUTO-REDIRECT: ${finalRole} von ${pathname} → ${targetPath}`);
                window.location.assign(targetPath);
                return;
              }
            }

            // Set middleware cookies for onboarding check
            if (finalRole === 'firma') {
              const onboardingCompleted = profileData.onboardingCompleted || false;
              const profileStatus = profileData.profileStatus || 'pending_review';

              document.cookie = `taskilo_onboarding_complete=${onboardingCompleted}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
              document.cookie = `taskilo_profile_status=${profileStatus}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
            }

            // NEU: Initialisiere User Presence nach erfolgreicher Authentifizierung
            userPresence.initializePresence(fbUser.uid).catch(console.error);
          } else {
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

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              user_type: roleFromClaim,
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
        setUser(null);
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, isRedirecting]); // KRITISCH: pathname als Dependency hinzufügen!

  // Effekt für die Weiterleitung nach erfolgreichem Login
  useEffect(() => {
    // Nur für Registration-Redirects (spezielle Parameter-Behandlung)
    if (!loading && user && !isRedirecting) {
      const justRegistered = sessionStorage.getItem('justRegistered');
      const registrationRedirectTo = sessionStorage.getItem('registrationRedirectTo');

      if (justRegistered === 'true' && registrationRedirectTo) {
        // Cleanup der sessionStorage items
        sessionStorage.removeItem('justRegistered');
        sessionStorage.removeItem('registrationRedirectTo');
        setIsRedirecting(true);
        // Verwende window.location.assign für vollständige Navigation mit URL-Parametern
        window.location.assign(registrationRedirectTo);
        return;
      }
    }
    // Wenn der Ladevorgang abgeschlossen ist und kein Benutzer vorhanden ist, das Flag zurücksetzen
    else if (!loading && !user) {
      setIsRedirecting(false);
    }
  }, [user, loading, pathname, isRedirecting]);

  // NEU: Chat-Listener für eingeloggte Benutzer
  useEffect(() => {
    if (!user?.uid) {
      setUnreadMessagesCount(0);
      setRecentChats([]); // Chats ebenfalls zurücksetzen
      return;
    }
    // HINZUGEFÜGT: Zusätzliche Sicherheitsprüfung für die DB-Instanz.
    if (!db) {
      setUnreadMessagesCount(0);
      setRecentChats([]);
      return;
    }

    // TEMPORÄR DEAKTIVIERT: Chat Real-time Subscriptions wegen Performance-Problemen
    // TODO: Implementiere effizientes Chat-Loading für Header
    /*
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
            user.user_type === 'firma'
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
        console.error('🔥 Firestore onSnapshot Error (Chat loading):', error);
        setUnreadMessagesCount(0);
        setRecentChats([]);
      }
    );

    return unsubscribe;
    */

    // Placeholder für Chat-Daten ohne Real-time Subscription
    setUnreadMessagesCount(0);
    setRecentChats([]);
    return () => {}; // Leere cleanup function
  }, [user]); // Abhängig vom Benutzerobjekt

  // HINWEIS: `useMemo` wird verwendet, um unnötige Neurenderungen von abhängigen Komponenten zu vermeiden.
  // Der Context-Wert wird nur dann neu berechnet, wenn sich eine der Abhängigkeiten ändert.
  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      loading,
      logout, // NEU: Logout-Funktion im Context bereitstellen
      userRole: user?.user_type || null,
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

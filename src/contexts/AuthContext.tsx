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
export interface LinkedCompany {
  companyId: string;
  companyName: string;
  employeeId: string;
  role: 'mitarbeiter';
  linkedAt: string;
  permissions?: {
    overview: boolean;
    personal: boolean;
    employees: boolean;
    shiftPlanning: boolean;
    timeTracking: boolean;
    absences: boolean;
    evaluations: boolean;
    orders: boolean;
    quotes: boolean;
    invoices: boolean;
    customers: boolean;
    calendar: boolean;
    workspace: boolean;
    finance: boolean;
    expenses: boolean;
    inventory: boolean;
    settings: boolean;
  };
}

export interface UserProfile {
  uid: string;
  email: string | null;
  user_type: 'master' | 'support' | 'firma' | 'kunde' | 'mitarbeiter'; // Mitarbeiter für Firmen-Angestellte
  firstName?: string;
  lastName?: string;
  profilePictureURL?: string; // Avatar-URL für alle Benutzerprofile
  companyName?: string; // Firmenname für Unternehmenskonten
  companyId?: string; // Company ID für Mitarbeiter (verweist auf Arbeitgeber)
  employeeId?: string; // Employee Document ID für Mitarbeiter
  linkedCompanies?: LinkedCompany[]; // Multi-Firma-Zugang für Mitarbeiter
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
  logout: () => Promise<void>;
  userRole: 'master' | 'support' | 'firma' | 'kunde' | 'mitarbeiter' | null;
  unreadMessagesCount: number;
  recentChats: HeaderChatPreview[];
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
          console.log('[AuthContext] 🔥 onAuthStateChanged triggered for:', fbUser.uid);
          console.log('[AuthContext] 🔥 Current user state:', { 
            hasUser: !!user, 
            userUid: user?.uid, 
            userType: user?.user_type,
            fbUserUid: fbUser.uid 
          });
          
          // Token aktualisieren nur bei tatsächlichen Änderungen, nicht bei jedem Call
          const idTokenResult = await fbUser.getIdTokenResult(false); // false = cached token verwenden
          setFirebaseUser(fbUser);

          if (!db) {
            throw new Error('Firestore DB-Instanz ist nicht initialisiert.');
          }

          // Performance-Optimierung: User-Daten nur laden, wenn noch nicht vorhanden oder geändert
          if (user?.uid === fbUser.uid && user?.email === fbUser.email) {
            console.log('[AuthContext] 🟡 CACHED - User already loaded:', {
              uid: user.uid,
              user_type: user.user_type,
              email: user.email
            });
            // User ist bereits geladen und unverändert, skip DB queries
            setLoading(false);
            return;
          }

          console.log('[AuthContext] 🔵 LOADING user data from Firestore for:', fbUser.uid);
          // Versuche zuerst users collection
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let profileData: any = null;
          let userFound = false;

          if (userDocSnap.exists()) {
            profileData = userDocSnap.data();
            userFound = true;
            console.log('[AuthContext] ✅ User found in USERS collection:', {
              uid: fbUser.uid,
              user_type: profileData.user_type,
              firstName: profileData.firstName
            });
          } else {
            console.log('[AuthContext] ❌ Not in users collection, checking COMPANIES...');
            // FALLBACK: Prüfe companies collection (wie UserHeader)
            const companyDocRef = doc(db, 'companies', fbUser.uid);
            const companyDocSnap = await getDoc(companyDocRef);

            if (companyDocSnap.exists()) {
              profileData = companyDocSnap.data();
              userFound = true;
              console.log('[AuthContext] ✅ User found in COMPANIES collection:', {
                uid: fbUser.uid,
                user_type: profileData.user_type,
                companyName: profileData.companyName
              });
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
                      : idTokenResult.claims.role === 'mitarbeiter'
                        ? 'mitarbeiter'
                        : null;
            const roleFromDb = (profileData.user_type as UserProfile['user_type']) ?? 'kunde';

            const finalRole = roleFromClaim ?? roleFromDb;

            console.log('[AuthContext] FINAL ROLE DETERMINED:', {
              roleFromClaim,
              roleFromDb,
              finalRole,
              uid: fbUser.uid,
              willSetUserType: finalRole
            });

            // Prüfe auf pending Firmenverknüpfungen (Multi-Login System)
            let linkedCompanies = profileData.linkedCompanies ?? [];
            try {
              const idToken = await fbUser.getIdToken();
              const checkLinksResponse = await fetch('/api/auth/check-company-links', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${idToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (checkLinksResponse.ok) {
                const checkLinksData = await checkLinksResponse.json();
                if (checkLinksData.success && checkLinksData.linkedCompanies) {
                  linkedCompanies = checkLinksData.linkedCompanies;
                  console.log('[AuthContext] LinkedCompanies updated:', linkedCompanies.length);
                }
              }
            } catch (linkError) {
              console.error('[AuthContext] Error checking company links:', linkError);
            }

            const userData: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              user_type: finalRole,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              profilePictureURL: profileData.profilePictureURL ?? undefined,
              // Mitarbeiter-spezifische Felder
              companyId: profileData.companyId ?? undefined,
              employeeId: profileData.employeeId ?? undefined,
              companyName: profileData.companyName ?? undefined,
              // Multi-Login Firmenverknüpfungen
              linkedCompanies: linkedCompanies.length > 0 ? linkedCompanies : undefined,
            };

            console.log('[AuthContext] Setting user state with:', userData);
            setUser(userData);

            // KRITISCH: AUTO-REDIRECT nach LOGIN basierend auf user_type
            if (!isRedirecting) {
              let needsRedirect = false;
              let targetPath = '';
              
              // Lese redirectTo aus der URL (nur im Browser verfügbar)
              const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
              const redirectTo = urlParams?.get('redirectTo');

              // 1. Nach Login-Redirect ODER Homepage-Redirect
              if (pathname?.includes('/login') || pathname === '/') {
                needsRedirect = true;
              }
              // 2. Firma User auf User Dashboard - SOFORT UMLEITEN!
              else if (finalRole === 'firma' && pathname?.includes('/dashboard/user/')) {
                needsRedirect = true;
              }
              // 3. Kunde User auf Company Dashboard - SOFORT UMLEITEN!
              else if (finalRole === 'kunde' && pathname?.includes('/dashboard/company/')) {
                needsRedirect = true;
              }
              // 4. Mitarbeiter auf Admin Dashboard - SOFORT UMLEITEN!
              else if (finalRole === 'mitarbeiter' && pathname?.includes('/dashboard/admin')) {
                needsRedirect = true;
              }

              if (needsRedirect) {
                setIsRedirecting(true);

                // Nutze redirectTo wenn vorhanden und passend für die Rolle
                if (redirectTo) {
                  const companyIdForEmployee = profileData.companyId;
                  const isValidRedirect = 
                    (finalRole === 'firma' && redirectTo.includes(`/dashboard/company/${fbUser.uid}`)) ||
                    (finalRole === 'kunde' && redirectTo.includes(`/dashboard/user/${fbUser.uid}`)) ||
                    ((finalRole === 'master' || finalRole === 'support') && redirectTo.includes('/dashboard/admin')) ||
                    // Mitarbeiter darf nur auf Company Dashboard des Arbeitgebers
                    (finalRole === 'mitarbeiter' && companyIdForEmployee && redirectTo.includes(`/dashboard/company/${companyIdForEmployee}`));
                  
                  if (isValidRedirect) {
                    targetPath = redirectTo;
                  }
                }
                
                // Standard-Dashboard wenn kein gültiges redirectTo
                if (!targetPath) {
                  if (finalRole === 'firma') {
                    targetPath = `/dashboard/company/${fbUser.uid}`;
                  } else if (finalRole === 'kunde') {
                    targetPath = `/dashboard/user/${fbUser.uid}`;
                  } else if (finalRole === 'master' || finalRole === 'support') {
                    targetPath = '/dashboard/admin';
                  } else if (finalRole === 'mitarbeiter') {
                    // Mitarbeiter wird zum Company Dashboard des Arbeitgebers geleitet
                    // Priorität: 1. companyId aus Profil, 2. Erste verknüpfte Firma aus linkedCompanies
                    const employeeCompanyId = profileData.companyId ?? linkedCompanies[0]?.companyId;
                    if (employeeCompanyId) {
                      targetPath = `/dashboard/company/${employeeCompanyId}`;
                    } else {
                      targetPath = `/dashboard/user/${fbUser.uid}`; // Fallback wenn keine Firma
                    }
                  } else {
                    targetPath = `/dashboard/user/${fbUser.uid}`; // Fallback
                  }
                }

                // ROBUSTES REDIRECT mit Fallback
                try {
                  window.location.assign(targetPath);

                  // Fallback nach 2 Sekunden
                  setTimeout(() => {
                    if (window.location.pathname !== targetPath) {
                      window.location.href = targetPath;
                    }
                  }, 2000);
                } catch (error) {
                  window.location.href = targetPath;
                }
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
  }, []); // PERFORMANCE: Entferne pathname und isRedirecting Dependencies

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

'use client';

import { type User as FirebaseUser, onAuthStateChanged, signOut } from '@/firebase/clients';
import { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/clients';
import { userPresence } from '@/lib/userPresence'; // NEU: User Presence importieren
import { logEmployeeLogin } from '@/lib/employeeActivityLogger'; // NEU: Employee Activity Logger

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
  companyId?: string; // Company ID für Mitarbeiter (aus Custom Claims)
  employeeId?: string; // Employee Document ID für Mitarbeiter (aus Custom Claims)
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
      window.location.href = '/';
    } catch {
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

          // IMMER frisch aus Firestore laden um korrekte Routing-Entscheidungen zu treffen
          console.log('[AuthContext] 🔵 LOADING user data from Firestore for:', fbUser.uid);
          
          // Prüfe BEIDE Collections parallel für bessere Performance
          const userDocRef = doc(db, 'users', fbUser.uid);
          const companyDocRef = doc(db, 'companies', fbUser.uid);
          
          const [userDocSnap, companyDocSnap] = await Promise.all([
            getDoc(userDocRef),
            getDoc(companyDocRef)
          ]);

          let profileData: any = null;
          let userFound = false;

          // PRIORITÄT: Companies Collection für Firmen-Accounts
          // Wenn in companies gefunden UND user_type ist 'firma', verwende companies
          if (companyDocSnap.exists()) {
            const companyData = companyDocSnap.data();
            if (companyData.user_type === 'firma' || companyData.accountType === 'business') {
              profileData = companyData;
              userFound = true;
              console.log('[AuthContext] ✅ User found in COMPANIES collection (priority):', {
                uid: fbUser.uid,
                user_type: profileData.user_type,
                companyName: profileData.companyName
              });
            }
          }
          
          // Fallback: Users Collection für Kunden
          if (!userFound && userDocSnap.exists()) {
            profileData = userDocSnap.data();
            userFound = true;
            console.log('[AuthContext] ✅ User found in USERS collection:', {
              uid: fbUser.uid,
              user_type: profileData.user_type,
              firstName: profileData.firstName
            });
          }
          
          // Letzter Fallback: Companies ohne expliziten user_type check
          if (!userFound && companyDocSnap.exists()) {
            profileData = companyDocSnap.data();
            userFound = true;
            console.log('[AuthContext] ✅ User found in COMPANIES collection (fallback):', {
              uid: fbUser.uid,
              user_type: profileData.user_type,
              companyName: profileData.companyName
            });
          }

          // MITARBEITER: Wenn kein User-Dokument gefunden, aber Custom Claims 'mitarbeiter' vorhanden
          if (!userFound && idTokenResult.claims.role === 'mitarbeiter') {
            const employeeCompanyId = idTokenResult.claims.companyId as string;
            const employeeIdClaim = idTokenResult.claims.employeeId as string;
            
            if (employeeCompanyId && employeeIdClaim) {
              console.log('[AuthContext] ✅ Mitarbeiter erkannt über Custom Claims:', {
                companyId: employeeCompanyId,
                employeeId: employeeIdClaim,
              });
              
              // Lade Mitarbeiter-Daten aus der Company Subcollection
              try {
                const employeeDocRef = doc(db, 'companies', employeeCompanyId, 'employees', employeeIdClaim);
                const employeeDocSnap = await getDoc(employeeDocRef);
                
                if (employeeDocSnap.exists()) {
                  const empData = employeeDocSnap.data();
                  profileData = {
                    firstName: empData.firstName,
                    lastName: empData.lastName,
                    profilePictureURL: empData.avatar,
                    user_type: 'mitarbeiter',
                  };
                  userFound = true;
                  console.log('[AuthContext] ✅ Mitarbeiter-Daten geladen:', profileData);
                }
              } catch (empError) {
                console.error('[AuthContext] Fehler beim Laden der Mitarbeiter-Daten:', empError);
              }
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
                  : idTokenResult.claims.role === 'mitarbeiter'
                    ? 'mitarbeiter'
                    : null; // firma/kunde werden NICHT aus Claims übernommen - DB hat Vorrang!
            const roleFromDb = (profileData.user_type as UserProfile['user_type']) ?? 'kunde';

            // PRIORITÄT: DB hat Vorrang für firma/kunde, Claims nur für master/support/mitarbeiter
            const finalRole = roleFromClaim ?? roleFromDb;

            console.log('[AuthContext] FINAL ROLE DETERMINED:', {
              roleFromClaim,
              roleFromDb,
              finalRole,
              uid: fbUser.uid,
              willSetUserType: finalRole
            });

            // Für Mitarbeiter: companyId und employeeId aus Custom Claims
            const employeeCompanyId = (idTokenResult.claims.companyId as string) ?? undefined;
            const employeeId = (idTokenResult.claims.employeeId as string) ?? undefined;

            const userData: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              user_type: finalRole,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              profilePictureURL: profileData.profilePictureURL ?? undefined,
              // Mitarbeiter-spezifische Felder aus Custom Claims
              companyId: employeeCompanyId ?? profileData.companyId ?? undefined,
              employeeId: employeeId ?? profileData.employeeId ?? undefined,
              companyName: profileData.companyName ?? undefined,
            };

            console.log('[AuthContext] Setting user state with:', userData);
            setUser(userData);

            // NEU: Logge Mitarbeiter-Login für Firmeninhaber-Übersicht
            if (finalRole === 'mitarbeiter' && employeeCompanyId) {
              // Asynchron loggen, nicht auf Ergebnis warten
              logEmployeeLogin().catch(() => {
                // Ignoriere Fehler beim Loggen - Login soll trotzdem funktionieren
              });
            }

            // KRITISCH: AUTO-REDIRECT nach LOGIN basierend auf user_type
            if (!isRedirecting) {
              let needsRedirect = false;
              let targetPath = '';
              
              // Lese redirectTo aus der URL (nur im Browser verfügbar)
              const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
              const redirectTo = urlParams?.get('redirectTo');

              // 1. Nach Homepage-Redirect ODER Dashboard-Base-Route
              if (pathname === '/' || pathname === '/dashboard') {
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
                  const companyIdForEmployee = (idTokenResult.claims.companyId as string) ?? profileData.companyId;
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
                    // companyId aus Custom Claims holen (gesetzt beim Dashboard-Zugang erstellen)
                    const employeeCompanyId = (idTokenResult.claims.companyId as string) ?? profileData.companyId;
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
                } catch {
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
                      : idTokenResult.claims.role === 'mitarbeiter'
                        ? 'mitarbeiter'
                        : 'kunde';

            const employeeCompanyIdFromClaim = (idTokenResult.claims.companyId as string) ?? undefined;
            const employeeIdFromClaim = (idTokenResult.claims.employeeId as string) ?? undefined;

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              user_type: roleFromClaim,
              companyId: employeeCompanyIdFromClaim,
              employeeId: employeeIdFromClaim,
            });

            // Mitarbeiter-Redirect wenn kein DB-Dokument gefunden wurde
            if (roleFromClaim === 'mitarbeiter' && employeeCompanyIdFromClaim && !isRedirecting) {
              const currentPath = window.location.pathname;
              if (currentPath === '/') {
                setIsRedirecting(true);
                window.location.assign(`/dashboard/company/${employeeCompanyIdFromClaim}`);
                return;
              }
            }

            // NEU: Initialisiere User Presence auch für Fallback-Fall
            userPresence.initializePresence(fbUser.uid).catch(console.error);
          }
        } else {
          setUser(null);
          setFirebaseUser(null);

          // NEU: Cleanup Presence wenn User sich abmeldet
          userPresence.cleanupPresence();
        }
      } catch (err) {
        console.error('[AuthContext] Error in auth state change:', err);
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

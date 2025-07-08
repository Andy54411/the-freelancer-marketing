"use client";

import { type User as FirebaseUser, onAuthStateChanged, signOut } from "@/firebase/clients";
import { createContext, useState, useEffect, useContext, ReactNode, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { orderBy, limit } from "firebase/firestore"; // NEU: orderBy und limit importieren
import { auth, db } from '@/firebase/clients';

/**
 * Definiert ein einheitliches Benutzerprofil, das Daten aus Firebase Auth
 * und Firestore kombiniert. Dies wird zum neuen 'user'-Objekt.
 */
export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'master' | 'support' | 'firma' | 'kunde'; // Spezifischere Rollen
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
      console.error("Fehler beim Abmelden: ", error);
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

          if (!db) {
            throw new Error("Firestore DB-Instanz ist nicht initialisiert.");
          }
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();

            // Rollenbestimmung: Custom Claim hat Vorrang.
            const roleFromClaim = idTokenResult.claims.admin ? 'master' : null;
            const roleFromDb = (profileData.user_type as UserProfile['role']) || 'kunde';

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: roleFromClaim || roleFromDb, // Claim verwenden, sonst DB.
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              profilePictureURL: profileData.profilePictureURL || undefined,
            });
          } else {
            console.warn(`AuthContext: Benutzer ${fbUser.uid} ist authentifiziert, aber das Firestore-Dokument wurde nicht gefunden.`);
            // Auch hier den Claim berücksichtigen, falls das DB-Dokument fehlt.
            const roleFromClaim = idTokenResult.claims.admin ? 'master' : 'kunde';
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: roleFromClaim,
            });
          }
        } else {
          setUser(null);
          setFirebaseUser(null);
        }
      } catch (error) {
        console.error("AuthContext: Fehler beim Abrufen des Benutzerprofils oder der Claims.", error);
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
    // Nur ausführen, wenn der Ladevorgang abgeschlossen ist, ein Benutzer vorhanden ist und wir nicht bereits weiterleiten
    if (!loading && user && !isRedirecting) {
      let targetPath = '';
      if (user.role === 'master' || user.role === 'support') {
        targetPath = '/dashboard/admin'; // KORRIGIERT: Admin-Dashboard
      } else if (user.role === 'firma') {
        targetPath = `/dashboard/company/${user.uid}`; // Firmen-Dashboard
      } else {
        targetPath = `/dashboard/user/${user.uid}`; // Kunden-Dashboard
      }

      // Nur weiterleiten, wenn wir uns noch nicht am Ziel befinden
      if (pathname !== targetPath) {
        setIsRedirecting(true); // Weiterleitungs-Flag setzen
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
      console.error("[AuthContext] Firestore DB ist nicht für den Listener für ungelesene Nachrichten verfügbar.");
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

    const unsubscribe = onSnapshot(recentChatsQuery, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUserId = data.users.find((id: string) => id !== user.uid);
        const userDetails = otherUserId ? data.userDetails?.[otherUserId] : null;
        const inboxLink = user.role === 'firma' ? `/dashboard/company/${user.uid}/inbox` : `/dashboard/user/${user.uid}/inbox`;

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
    }, (error) => {
      console.error("[AuthContext] Fehler beim Abhören der Chats:", error);
      setUnreadMessagesCount(0);
      setRecentChats([]);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]); // Abhängig vom Benutzerobjekt

  // HINWEIS: `useMemo` wird verwendet, um unnötige Neurenderungen von abhängigen Komponenten zu vermeiden.
  // Der Context-Wert wird nur dann neu berechnet, wenn sich eine der Abhängigkeiten ändert.
  const value = useMemo(() => ({
    user,
    firebaseUser,
    loading,
    logout, // NEU: Logout-Funktion im Context bereitstellen
    userRole: user?.role || null,
    unreadMessagesCount,
    recentChats,
  }), [user, firebaseUser, loading, unreadMessagesCount, recentChats]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

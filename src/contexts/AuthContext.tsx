"use client";

import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
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
  userRole: 'master' | 'support' | 'user' | null;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          // HINZUGEFÜGT: Sicherheitsprüfung, um sicherzustellen, dass die DB-Instanz initialisiert ist.
          // Dies verhindert den Absturz, falls der Hook ausgeführt wird, bevor Firebase bereit ist.
          if (!db) {
            throw new Error("Firestore DB-Instanz ist nicht initialisiert.");
          }
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: (profileData.user_type as UserProfile['role']) || 'kunde',
              firstName: profileData.firstName,
              lastName: profileData.lastName,
            });
          } else {
            console.warn(`AuthContext: Benutzer ${fbUser.uid} ist authentifiziert, aber das Firestore-Dokument wurde nicht gefunden. Dies ist während der Registrierung zu erwarten. Es wird ein temporäres Profil verwendet.`);
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: 'kunde',
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

  // KORREKTUR: Dieser Effekt ist jetzt der ZENTRALE Listener für alle globalen Chat-Informationen.
  // Er ersetzt die separaten Listener in UserHeader und AuthContext.
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

    return () => unsubscribe();
  }, [user]);


  // Effekt für die automatische Weiterleitung nach dem Login
  useEffect(() => {
    if (loading || isRedirecting) {
      return;
    }

    const publicPaths = ['/', '/login', '/register/company', '/register/user'];
    const shouldRedirect = user && publicPaths.includes(pathname);

    if (shouldRedirect) {
      console.log(`AuthContext: Benutzer ${user.uid} ist auf einer öffentlichen Seite (${pathname}). Leite weiter...`);
      setIsRedirecting(true);

      let destination: string;
      switch (user.role) {
        case 'master':
        case 'support':
          destination = '/dashboard/admin';
          break;
        case 'firma':
          destination = `/dashboard/company/${user.uid}`;
          break;
        default:
          destination = `/dashboard/user/${user.uid}`;
          break;
      }
      console.log(`AuthContext: Benutzerrolle ist '${user.role}', leite weiter zu: ${destination}`);
      router.replace(destination);
    }
  }, [user, loading, pathname, router, isRedirecting]);

  const userRole = user?.role
    ? user.role === 'master' || user.role === 'support'
      ? user.role
      : user.role === 'firma'
        ? 'user'
        : 'user'
    : null;

  const value = useMemo(
    () => ({ user, firebaseUser, loading, userRole: userRole as 'master' | 'support' | 'user' | null, unreadMessagesCount, recentChats }),
    [user, firebaseUser, loading, userRole, unreadMessagesCount, recentChats]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

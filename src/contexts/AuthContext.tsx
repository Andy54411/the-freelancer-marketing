"use client";

import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from '../firebase/clients';

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

interface AuthContextType {
  user: UserProfile | null; // Das kombinierte, reichhaltige Benutzerobjekt
  firebaseUser: FirebaseUser | null; // Das rohe Firebase-Benutzerobjekt für spezielle Operationen
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // Zustand zur Vermeidung von Schleifen
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // Wrap the entire async logic in a try...catch...finally block
      // to handle potential errors and ensure loading state is always updated.
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          // Erzwinge ein Neuladen des Tokens, um die neuesten Custom Claims zu erhalten.
          // Dies ist entscheidend nach der Registrierung, damit die Rolle verfügbar wird.
          const idTokenResult = await fbUser.getIdTokenResult(true);
          const role = (idTokenResult.claims.role as UserProfile['role']) || 'kunde'; // Fallback auf 'kunde', falls der Claim noch nicht gesetzt ist.

          // Versuche, das Benutzerprofil aus Firestore abzurufen.
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              // HIER IST DIE KORREKTUR: Wir verwenden den 'user_type' direkt aus der Datenbank.
              // Das ist die "Source of Truth" und umgeht Probleme mit veralteten Tokens.
              role: (profileData.user_type as UserProfile['role']) || 'kunde',
              firstName: profileData.firstName,
              lastName: profileData.lastName,
            });
          } else {
            // Dieser Fall tritt während der Registrierung auf, wenn der Auth-Benutzer existiert,
            // das Firestore-Dokument aber noch nicht erstellt wurde.
            // Wir erstellen ein temporäres Benutzerobjekt, um zu verhindern, dass ProtectedRoute
            // eine Weiterleitung zur /login-Seite auslöst.
            console.warn(`AuthContext: Benutzer ${fbUser.uid} ist authentifiziert, aber das Firestore-Dokument wurde nicht gefunden. Dies ist während der Registrierung zu erwarten. Es wird ein temporäres Profil verwendet.`);
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              role: role, // Verwende die Rolle aus dem Token, auch wenn es der Standardwert ist.
            });
          }
        } else {
          // No user is signed in.
          setUser(null);
          setFirebaseUser(null);
        }
      } catch (error) {
        console.error("AuthContext: Fehler beim Abrufen des Benutzerprofils oder der Claims.", error);
        // If an error occurs, ensure the user is logged out in the state.
        setUser(null);
        setFirebaseUser(null);
      } finally {
        // This is crucial: always set loading to false after the process is complete,
        // whether it succeeded or failed. This prevents the app from getting stuck
        // in a loading state.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Effekt für die automatische Weiterleitung nach dem Login
  useEffect(() => {
    // Nichts tun, während der Auth-Status noch geprüft wird oder eine Weiterleitung bereits läuft.
    if (loading || isRedirecting) {
      return;
    }

    // Liste der öffentlichen Seiten, von denen ein eingeloggter Benutzer weitergeleitet werden soll.
    const publicPaths = ['/', '/login', '/register/company'];
    const shouldRedirect = user && publicPaths.includes(pathname);

    if (shouldRedirect) {
      console.log(`AuthContext: Benutzer ${user.uid} ist auf einer öffentlichen Seite (${pathname}). Leite weiter...`);

      // Setze den Weiterleitungs-Status, um zu verhindern, dass der Effekt erneut ausgeführt wird,
      // bevor die URL-Änderung wirksam wird.
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
        default: // 'kunde' oder undefiniert
          destination = `/dashboard/user/${user.uid}`;
          break;
      }
      console.log(`AuthContext: Benutzerrolle ist '${user.role}', leite weiter zu: ${destination}`);
      // Führe die Weiterleitung durch. `router.replace` ist hier besser, um die Login-Seite
      // aus der Browser-Historie zu entfernen.
      console.log(`[AuthContext] Rufe router.replace('${destination}') auf...`);
      router.replace(destination);
    }
  }, [user, loading, pathname, router, isRedirecting]); // Abhängigkeiten aktualisiert

  const value = { user, firebaseUser, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
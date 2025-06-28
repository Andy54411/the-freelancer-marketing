"use client";

import { User, onAuthStateChanged } from "firebase/auth";
import { createContext, useState, useEffect, useContext } from "react";
import { auth } from '../firebase/clients'; // Stelle sicher, dass der Pfad korrekt ist

export type AuthContextType = { // AuthContextType exportieren
  currentUser: User | null;
  loading: boolean; // Ladezustand hinzufügen
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Initialisiere loading mit true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Force a refresh of the ID token to get the latest custom claims.
        // This is crucial for security rules that depend on roles.
        // See: https://firebase.google.com/docs/auth/admin/custom-claims#propagate_claims_to_the_client
        await user.getIdToken(true);
        console.log("AuthContext: User token refreshed to get latest claims.");
      }
      setCurrentUser(user); // Set the user (or null if logged out)
      setLoading(false); // Authentication check is complete
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) { // Prüft auf undefined und null
    throw new Error("useAuth muss innerhalb eines AuthProvider verwendet werden");
  }
  return context;
};
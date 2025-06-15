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
    setLoading(true); // Beginne mit dem Laden
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as User | null); // Explizite Typzuweisung
      setLoading(false); // Ladevorgang abgeschlossen
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
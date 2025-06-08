// src/contexts/AuthContext.tsx
"use client";

import { User, onAuthStateChanged } from "firebase/auth";
import { createContext, useState, useEffect, useContext } from "react";
import { auth } from '../../firebase/clients'; // Stelle sicher, dass der Pfad korrekt ist

type AuthContextType = {
  currentUser: User | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as User | null); // Explizite Typzuweisung
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
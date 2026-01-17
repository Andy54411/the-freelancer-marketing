// src/components/DynamicHeader.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuth, onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { app } from '@/firebase/clients';
import Header from '@/components/Header';
import UserHeader from '@/components/UserHeader';

const auth = getAuth(app);

interface DynamicHeaderProps {
  className?: string;
}

export function DynamicHeader({ className: _className }: DynamicHeaderProps) {
  const { user: _authUser, loading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseAuthUser | null) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, []);

  // Während das Laden läuft, zeige einen Standard-Header an
  if (isLoading || authLoading) {
    return <Header />;
  }

  // Nicht eingeloggt: Standard Header
  if (!currentUser) {
    return <Header />;
  }

  // Eingeloggt: UserHeader (funktioniert sowohl für User als auch Company)
  // Der UserHeader unterscheidet bereits intern zwischen Company und User basierend auf AuthContext
  return <UserHeader currentUid={currentUser.uid} />;
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User, Building2, Shield, ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface UserData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  displayName?: string;
}

export default function SmoothRedirectOverlay() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showOverlay, setShowOverlay] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [userName, setUserName] = useState<string>('');

  // Firebase-Daten laden für personalisierten Namen
  useEffect(() => {
    const loadUserName = async () => {
      if (!user?.uid) return;

      try {
        let name = '';

        // Verwende firstName aus AuthContext falls verfügbar
        if (user.firstName) {
          name = user.firstName;
        } else {
          // Fallback: Lade direkt aus Firebase
          let userData: UserData | null = null;

          // Versuche users collection zuerst
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            userData = userDocSnap.data() as UserData;
          } else {
            // Fallback: companies collection
            const companyDocRef = doc(db, 'companies', user.uid);
            const companyDocSnap = await getDoc(companyDocRef);

            if (companyDocSnap.exists()) {
              userData = companyDocSnap.data() as UserData;
            }
          }

          if (userData) {
            name = userData.firstName || userData.companyName || userData.displayName || '';
          }
        }

        // Fallback-Namen basierend auf Rolle
        if (!name) {
          switch (user.role) {
            case 'master':
            case 'support':
              name = 'Admin';
              break;
            case 'firma':
              name = 'Unternehmen';
              break;
            default:
              name = 'liebe/r Nutzer/in';
          }
        }

        setUserName(name);
      } catch (error) {
        console.error('Error loading user name:', error);
        // Fallback bei Fehlern
        setUserName(user.role === 'firma' ? 'Unternehmen' : 'liebe/r Nutzer/in');
      }
    };

    if (user) {
      loadUserName();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user && userName) {
      // Prüfe ob User auf falscher Seite ist und redirect benötigt
      let needsRedirect = false;
      let targetPath = '';
      let message = '';

      // Master/Support
      if (user.role === 'master' || user.role === 'support') {
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          needsRedirect = true;
          targetPath = '/dashboard/admin';
          message = `Willkommen zurück, ${userName}! Sie werden zum Admin-Dashboard weitergeleitet...`;
        }
      }
      // Firma
      else if (user.role === 'firma') {
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          needsRedirect = true;
          targetPath = `/dashboard/company/${user.uid}`;
          message = `Willkommen zurück, ${userName}! Sie werden zu Ihrem Dashboard weitergeleitet...`;
        }
      }
      // Kunde
      else if (pathname === '/login' || pathname === '/register') {
        needsRedirect = true;
        targetPath = `/dashboard/user/${user.uid}`;
        message = `Willkommen zurück, ${userName}! Sie werden zu Ihrem Dashboard weitergeleitet...`;
      }

      if (needsRedirect && targetPath) {
        setRedirectMessage(message);
        setShowOverlay(true);

        // Progressiver Ladebalken
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress += 15;
          setProgress(currentProgress);

          if (currentProgress >= 100) {
            clearInterval(progressInterval);

            // Kurze Verzögerung dann redirect
            setTimeout(() => {
              router.push(targetPath);
            }, 300);
          }
        }, 150);

        return () => clearInterval(progressInterval);
      }
    }
  }, [user, loading, pathname, router, userName]);

  // Icon basierend auf User-Rolle
  const getRoleIcon = () => {
    if (!user) return <Loader2 className="animate-spin text-5xl text-[#14ad9f]" />;

    switch (user.role) {
      case 'master':
      case 'support':
        return <Shield className="text-5xl text-[#14ad9f] animate-pulse" />;
      case 'firma':
        return <Building2 className="text-5xl text-[#14ad9f] animate-pulse" />;
      default:
        return <User className="text-5xl text-[#14ad9f] animate-pulse" />;
    }
  };

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#14ad9f]/10 via-teal-50 to-blue-50"></div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-8 max-w-lg mx-auto p-8">
        {/* Logo/Icon Area */}
        <div className="flex justify-center">
          <div className="relative">
            {getRoleIcon()}
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-lg">
              <ArrowRight className="text-xl text-[#14ad9f]" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Login erfolgreich!</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{redirectMessage}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm mx-auto space-y-3">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#14ad9f] to-teal-500 h-3 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Weiterleitung...</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Subtle animation hint */}
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-[#14ad9f] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

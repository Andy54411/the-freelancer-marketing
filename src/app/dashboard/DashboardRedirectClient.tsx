'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 as FiLoader, User, Building2, Shield } from 'lucide-react';

export default function DashboardRedirectClient() {
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simuliere einen progressiven Ladebalken
  useEffect(() => {
    if (redirecting) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [redirecting]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      setRedirecting(true);

      // Kurze Verzögerung für smooth UX
      setTimeout(() => {
        setProgress(100);

        // Weitere kurze Verzögerung bevor Redirect
        setTimeout(() => {
          switch (user.role) {
            case 'master':
            case 'support':
              redirect('/dashboard/admin');
              break;
            case 'firma':
              redirect(`/dashboard/company/${user.uid}`);
              break;
            default:
              redirect(`/dashboard/user/${user.uid}`);
              break;
          }
        }, 300);
      }, 800);
    }
  }, [user, loading]);

  // Icon basierend auf User-Rolle
  const getRoleIcon = () => {
    if (!user) return <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />;

    switch (user.role) {
      case 'master':
      case 'support':
        return <Shield className="text-4xl text-[#14ad9f]" />;
      case 'firma':
        return <Building2 className="text-4xl text-[#14ad9f]" />;
      default:
        return <User className="text-4xl text-[#14ad9f]" />;
    }
  };

  // Personalisierte Nachricht basierend auf User-Rolle
  const getMessage = () => {
    if (loading) return 'Anmeldung wird überprüft...';
    if (!user) return 'Dashboard wird geladen...';

    const firstName = user.firstName || 'User';

    if (redirecting) {
      switch (user.role) {
        case 'master':
        case 'support':
          return `Willkommen zurück, ${firstName}! Admin-Dashboard wird geladen...`;
        case 'firma':
          return `Willkommen zurück, ${firstName}! Ihr Unternehmens-Dashboard wird geladen...`;
        default:
          return `Willkommen zurück, ${firstName}! Ihr Dashboard wird geladen...`;
      }
    }

    return 'Dashboard wird vorbereitet...';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#14ad9f]/5 via-teal-50 to-blue-50">
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        {/* Icon mit Animation */}
        <div className="flex justify-center">
          <div className={`transition-all duration-500 ${redirecting ? 'scale-110' : 'scale-100'}`}>
            {getRoleIcon()}
          </div>
        </div>

        {/* Hauptnachricht */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">{getMessage()}</h2>

          {redirecting && (
            <p className="text-sm text-gray-600">Sie werden automatisch weitergeleitet...</p>
          )}
        </div>

        {/* Progress Bar - nur bei Redirect */}
        {redirecting && (
          <div className="w-full max-w-xs mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{progress}%</p>
          </div>
        )}

        {/* Loading Spinner für Initial Load */}
        {!redirecting && (
          <div className="flex justify-center">
            <FiLoader className="animate-spin text-2xl text-[#14ad9f]" />
          </div>
        )}
      </div>
    </div>
  );
}

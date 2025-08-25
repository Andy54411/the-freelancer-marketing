'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Role-Based Redirect Component
 * Korrigiert falsche Routen basierend auf der User-Rolle
 */
export function RoleBasedRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) return;

    // Prüfe ob User auf falscher Route ist
    const isOnUserRoute = pathname?.startsWith('/dashboard/user/');
    const isOnCompanyRoute = pathname?.startsWith('/dashboard/company/');
    const isOnAdminRoute = pathname?.startsWith('/dashboard/admin');

    // Rolle "firma" sollte immer auf company-Dashboard sein
    if (user.role === 'firma' && !isOnCompanyRoute) {

      // Nur wenn der User auf /dashboard ist, leite direkt weiter
      if (pathname === '/dashboard') {
        router.replace(`/dashboard/company/${user.uid}`);
        return;
      }

      // Für andere Pfade wie /profile/xxx, behalte den ursprünglichen Pfad
      if (!pathname?.startsWith('/dashboard/')) {
        return; // Nicht weiterleiten wenn nicht im Dashboard-Bereich
      }

      // Extrahiere den Pfad nach der UID korrekt
      const pathMatch = pathname?.match(/\/dashboard\/(user|company)\/[^\/]+(.*)$/);
      const pathAfterUID = pathMatch && pathMatch[2] ? pathMatch[2] : '';
      const correctPath = `/dashboard/company/${user.uid}${pathAfterUID}`;

      // Verhindere Endlosschleife
      if (pathname !== correctPath) {
        router.replace(correctPath);
      }
      return;
    }

    // Rolle "kunde" sollte auf user-Dashboard sein
    if (user.role === 'kunde' && !isOnUserRoute) {

      // Nur wenn der User auf /dashboard ist, leite direkt weiter
      if (pathname === '/dashboard') {
        router.replace(`/dashboard/user/${user.uid}`);
        return;
      }

      // Für andere Pfade wie /profile/xxx, behalte den ursprünglichen Pfad
      if (!pathname?.startsWith('/dashboard/')) {
        return; // Nicht weiterleiten wenn nicht im Dashboard-Bereich
      }

      // Extrahiere den Pfad nach der UID korrekt
      const pathMatch = pathname?.match(/\/dashboard\/(user|company)\/[^\/]+(.*)$/);
      const pathAfterUID = pathMatch && pathMatch[2] ? pathMatch[2] : '';
      const correctPath = `/dashboard/user/${user.uid}${pathAfterUID}`;

      // Verhindere Endlosschleife
      if (pathname !== correctPath) {
        router.replace(correctPath);
      }
      return;
    }

    // Master/Support sollten auf admin-Dashboard sein
    if ((user.role === 'master' || user.role === 'support') && !isOnAdminRoute) {

      router.replace('/dashboard/admin');
      return;
    }
  }, [user, loading, pathname, router]);

  // Keine UI, nur Redirect-Logik
  return null;
}

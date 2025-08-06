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
      console.log('🔄 [RoleBasedRedirect] Correcting route for firma:', {
        currentPath: pathname,
        correctPath: `/dashboard/company/${user.uid}`,
        userRole: user.role,
      });

      // Extrahiere den aktuellen Pfad nach der UID
      const pathAfterUID = pathname?.replace(/\/dashboard\/(user|company)\/[^\/]+/, '') || '';
      const correctPath = `/dashboard/company/${user.uid}${pathAfterUID}`;

      router.replace(correctPath);
      return;
    }

    // Rolle "kunde" sollte auf user-Dashboard sein
    if (user.role === 'kunde' && !isOnUserRoute) {
      console.log('🔄 [RoleBasedRedirect] Correcting route for kunde:', {
        currentPath: pathname,
        correctPath: `/dashboard/user/${user.uid}`,
        userRole: user.role,
      });

      const pathAfterUID = pathname?.replace(/\/dashboard\/(user|company)\/[^\/]+/, '') || '';
      const correctPath = `/dashboard/user/${user.uid}${pathAfterUID}`;

      router.replace(correctPath);
      return;
    }

    // Master/Support sollten auf admin-Dashboard sein
    if ((user.role === 'master' || user.role === 'support') && !isOnAdminRoute) {
      console.log('🔄 [RoleBasedRedirect] Correcting route for admin:', {
        currentPath: pathname,
        correctPath: '/dashboard/admin',
        userRole: user.role,
      });

      router.replace('/dashboard/admin');
      return;
    }
  }, [user, loading, pathname, router]);

  // Keine UI, nur Redirect-Logik
  return null;
}

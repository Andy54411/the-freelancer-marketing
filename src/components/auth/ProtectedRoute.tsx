'use client';

import { useEffect, useMemo, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLoader } from 'react-icons/fi';

function ProtectedRouteInternal({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoize the redirect URL to avoid re-calculating it on every render.
  const redirectTo = useMemo(() => {
    const params = searchParams.toString();
    return `${pathname}${params ? `?${params}` : ''}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    // Do nothing while the auth state is loading.
    if (loading) {
      return;
    }

    // Skip protection for admin routes (they have their own auth system)
    if (pathname.startsWith('/dashboard/admin')) {
      return;
    }

    // When loading is finished and there's no user, redirect.
    if (!user) {
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, [user, loading, router, redirectTo, pathname]);

  // While loading, show a full-screen spinner to avoid content flicker.
  if (loading && !pathname.startsWith('/dashboard/admin')) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        <span>Authentifizierung wird geprüft...</span>
      </div>
    );
  }

  // If it's an admin route, let it handle its own auth
  if (pathname.startsWith('/dashboard/admin')) {
    return <>{children}</>;
  }

  // If loading is done and we have a user, render the protected content.
  if (user) {
    return <>{children}</>;
  }

  // If loading is done and there is no user, render nothing.
  // The useEffect is handling the redirect. This prevents a flash of the children.
  return null;
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
          <span>Authentifizierung wird geprüft...</span>
        </div>
      }
    >
      <ProtectedRouteInternal>{children}</ProtectedRouteInternal>
    </Suspense>
  );
}

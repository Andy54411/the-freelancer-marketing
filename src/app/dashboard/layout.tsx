'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import StripeElementsAppProvider from '@/components/StripeElementsAppProvider';
import { RoleBasedRedirect } from '@/components/auth/RoleBasedRedirect';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleBasedRedirect />
      <StripeElementsAppProvider>{children}</StripeElementsAppProvider>
    </ProtectedRoute>
  );
}

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      const userType = user.user_type || 'kunde';
      let targetUrl = '';
      
      switch (userType) {
        case 'master':
        case 'support':
          targetUrl = '/dashboard/admin';
          break;
        case 'firma':
          targetUrl = `/dashboard/company/${user.uid}`;
          break;
        default:
          targetUrl = `/dashboard/user/${user.uid}`;
          break;
      }
      
      router.replace(targetUrl);
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-teal-50 to-blue-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
        <p className="text-gray-600">Weiterleitung...</p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import UserHeader from '@/components/UserHeader';
import { HeroHeader } from '@/components/hero8-header';
import FooterSection from '@/components/footer';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 as FiLoader } from 'lucide-react';

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {user ? (
        <UserHeader currentUid={user.uid} />
      ) : (
        <HeroHeader />
      )}
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
      {!user && <FooterSection />}
    </div>
  );
}

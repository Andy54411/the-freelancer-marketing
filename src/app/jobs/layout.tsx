'use client';

import React from 'react';
import UserHeader from '@/components/UserHeader';
import Header from '@/components/Header';
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
        <Header />
      )}
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  );
}

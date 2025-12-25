'use client';

import { ReactNode } from 'react';
import { Toaster } from 'sonner';

interface ContactsLayoutProps {
  children: ReactNode;
}

export default function ContactsLayout({ children }: ContactsLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" richColors />
      {children}
    </div>
  );
}

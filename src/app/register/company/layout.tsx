'use client';

import { ReactNode } from 'react';
import { RegistrationProvider } from '@/contexts/Registration-Context';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <RegistrationProvider>
      {children}
    </RegistrationProvider>
  );
}

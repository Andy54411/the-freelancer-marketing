'use client';

import { ReactNode } from 'react';
import { RegistrationProvider } from '@/contexts/Registration-Context';
import { Logo } from '@/components/logo';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <RegistrationProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-teal-200 p-6">
        <header className="register-header text-center py-8">
          <div className="mx-auto mb-6 flex justify-center">
            <Logo variant="default" className="scale-150" />
          </div>
          <h1 className="text-4xl font-semibold text-[#14ad9f]">
            Registriere dein Unternehmen bei Taskilo
          </h1>
          <p className="text-lg text-[#14ad9f] mt-2">
            Fülle die folgenden Informationen aus, um fortzufahren
          </p>
        </header>

        <div className="w-full max-w-7xl p-0 bg-transparent">{children}</div>
      </div>
    </RegistrationProvider>
  );
}

'use client';
import Image from 'next/image';

import { ReactNode } from 'react';
import { RegistrationProvider } from '@/contexts/Registration-Context';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <RegistrationProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-teal-200 p-6">
        <header className="register-header text-center py-8">
          {/* Der Parent-Div benötigt position: relative für layout="fill" */}
          <div className="w-32 h-32 md:w-36 md:h-36 mx-auto mb-2 block relative"> {/* Beispielhafte Anpassung der Größe und Hinzufügen von 'relative' */}
            <Image
              src="/images/logo_tasko.png"
              alt="Tasko Logo"
              layout="fill"
              objectFit="contain"
              className="rounded-lg" // mx-auto ist nicht nötig bei layout="fill"
              priority // Da es ein Logo im Header ist, könnte es priorisiert werden
            />
          </div>
          <h1 className="text-4xl font-semibold text-[#14ad9f]">Registriere dein Unternehmen bei Tasko</h1>
          <p className="text-lg text-[#14ad9f] mt-2">Fülle die folgenden Informationen aus, um fortzufahren</p>
        </header>

        <div className="w-full max-w-7xl p-0 bg-transparent">
          {children}
        </div>
      </div>
    </RegistrationProvider>
  );
}

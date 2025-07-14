// src/app/dashboard/user/[uid]/components/DashboardNavbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

import { getAuth, onAuthStateChanged, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { app } from '../../../../../firebase/clients';

const auth = getAuth(app);

type MenuItem = { name: string; href: string };

// --- HIER WURDE DIE LISTE GELEERT ---
const menuItems: MenuItem[] = [
  // { name: 'Dashboard', href: '/dashboard/user/[uid]' },
  // { name: 'Aufträge', href: '/dashboard/user/[uid]/auftraege' },
  // { name: 'Profil', href: '/dashboard/user/[uid]/profile-settings' },
  // { name: 'Hilfe', href: '/help' },
];

export function DashboardNavbar({ currentUid }: { currentUid: string }) {
  const [menuState, setMenuState] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout fehlgeschlagen:', error);
    }
  };

  const dynamicMenuItems = menuItems.map(item => ({
    ...item,
    href: item.href.replace('[uid]', currentUid),
  }));

  return (
    <header className="w-full">
      <nav
        data-state={menuState && 'active'}
        className="bg-background/50 fixed z-20 w-full border-b backdrop-blur-3xl"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between py-4">
            <div className="flex items-center justify-between w-full lg:w-auto gap-8">
              <Link
                href={`/dashboard/user/${currentUid}`}
                className="flex items-center space-x-2"
                aria-label="Dashboard Home"
              >
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Menü schließen' : 'Menü öffnen'}
                className="relative z-20 block p-2 lg:hidden"
              >
                <Menu
                  className={cn(
                    'size-6 transition-all duration-200',
                    menuState && 'rotate-180 scale-0 opacity-0'
                  )}
                />
                <X
                  className={cn(
                    'size-6 absolute inset-0 m-auto rotate-180 scale-0 opacity-0 transition-all duration-200',
                    menuState && 'rotate-0 scale-100 opacity-100'
                  )}
                />
              </button>

              {/* Desktop Navigation ist jetzt leer */}
              <ul className="hidden lg:flex gap-8 text-sm">
                {dynamicMenuItems.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-accent-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cn(
                'w-full lg:w-fit flex-col lg:flex-row items-end lg:items-center justify-end gap-6',
                'lg:flex hidden'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:gap-3 gap-2 w-full md:w-fit">
                {currentUser ? (
                  <Button asChild variant="outline" size="sm" onClick={handleLogout}>
                    <Link href="#">Logout</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="sm">
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href="/register/company">Starte mit Taskilo</Link>
                    </Button>
                  </>
                )}
                <ModeToggle />
              </div>
            </div>

            {/* Mobile Navigation (ausklappbar) */}
            {menuState && (
              <div className="lg:hidden absolute top-full left-0 w-full bg-background z-10 border-t shadow-xl">
                <ul className="px-6 py-4 space-y-4 text-base">
                  {dynamicMenuItems.map((item, i) => (
                    <li key={i}>
                      <Link
                        href={item.href}
                        className="block text-muted-foreground hover:text-accent-foreground transition"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-6 flex flex-col gap-3">
                  {currentUser ? (
                    <Button asChild variant="outline" size="sm" onClick={handleLogout}>
                      <Link href="#">Logout</Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href="/register/company">Starte mit Taskilo</Link>
                      </Button>
                    </>
                  )}
                  <ModeToggle />
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

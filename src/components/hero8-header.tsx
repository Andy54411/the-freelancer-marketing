'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Logo } from './logo';
import { Menu, X, User, LogOut, Settings, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { Suspense, useEffect } from 'react';
import { ModeToggle } from './mode-toggle';
import LoginPopup from '@/components/LoginPopup';
import { User as FirebaseUser, onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, storage, db } from '@/firebase/clients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const menuItems = [
    { name: 'Dienstleistungen', href: '/services', labelKey: 'nav.services' },
    { name: 'Über uns', href: '/about', labelKey: 'nav.about' },
    { name: 'Kontakt', href: '/contact', labelKey: 'nav.contact' },
  ];

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async user => {
      console.log('HeroHeader: Auth state changed:', user?.uid);

      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });

        // Load profile picture from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('HeroHeader: User data from Firestore:', userData);

            if (userData.profilePictureFirebaseUrl) {
              console.log(
                'HeroHeader: Setting profile picture URL:',
                userData.profilePictureFirebaseUrl
              );
              setProfilePictureUrl(userData.profilePictureFirebaseUrl);
            } else {
              console.log('HeroHeader: No profilePictureFirebaseUrl found');
              setProfilePictureUrl(null);
            }
          } else {
            console.log('HeroHeader: User document not found');
            setProfilePictureUrl(null);
          }
        } catch (error) {
          console.error('HeroHeader: Error loading profile picture:', error);
          setProfilePictureUrl(null);
        }
      } else {
        setUser(null);
        setProfilePictureUrl(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenLoginPopup = () => {
    setIsLoginPopupOpen(true);
  };

  const handleCloseLoginPopup = () => {
    setIsLoginPopupOpen(false);
  };

  const handleLoginSuccess = () => {
    setIsLoginPopupOpen(false);
    window.location.href = '/dashboard';
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth(app);
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="bg-background/50 fixed z-20 w-full border-b backdrop-blur-3xl"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-between py-4">
            {/* Left Section */}
            <div className="flex items-center justify-between w-full lg:w-auto gap-8">
              <Link href="/" className="flex items-center space-x-2" aria-label="Taskilo Home">
                <Logo variant="white" />
              </Link>

              {/* Mobile Menu Toggle */}
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

              {/* Desktop Nav */}
              <ul className="hidden lg:flex gap-8 text-sm">
                {menuItems.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="text-white/90 hover:text-white font-medium drop-shadow-md transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Section incl. Mobile Dropdown */}
            <div
              className={cn(
                'w-full lg:w-fit flex-col lg:flex-row items-end lg:items-center justify-end gap-6',
                'flex' // Entferne hidden, damit die Buttons immer sichtbar sind
              )}
            >
              {!isLoading &&
                (user ? (
                  // Authenticated user
                  <div className="flex items-center gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                          <AvatarImage
                            src={profilePictureUrl || undefined}
                            alt={user.displayName || user.email || 'Benutzer'}
                          />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Profil
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="flex items-center gap-2 text-red-600"
                        >
                          <LogOut className="h-4 w-4" />
                          Abmelden
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex items-center gap-2">
                      <ModeToggle />
                    </div>
                  </div>
                ) : (
                  // Unauthenticated user
                  <div className="flex flex-col sm:flex-row sm:gap-3 gap-2 w-full md:w-fit items-center">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={handleOpenLoginPopup}>
                        <span>Anmelden</span>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white shadow-lg font-semibold transition-all duration-300"
                      >
                        <Link href="/register/company">
                          <span>Mit Taskilo starten</span>
                        </Link>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <ModeToggle />
                    </div>
                  </div>
                ))}
            </div>

            {/* Mobile Navigation */}
            {menuState && (
              <div className="lg:hidden absolute top-full left-0 w-full bg-background z-10 border-t shadow-xl">
                <ul className="px-6 py-4 space-y-4 text-base">
                  {menuItems.map((item, i) => (
                    <li key={i}>
                      <Link
                        href={item.href}
                        className="block text-foreground hover:text-[#14ad9f] font-medium transition"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-6 flex flex-col gap-3">
                  {!isLoading &&
                    (user ? (
                      // Authenticated user - mobile
                      <>
                        <div className="flex items-center gap-3 pb-3 border-b">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={profilePictureUrl || undefined}
                              alt={user.displayName || user.email || 'Benutzer'}
                            />
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.displayName || 'Benutzer'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/dashboard">Dashboard</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/dashboard/profile">Profil</Link>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleLogout}>
                          Abmelden
                        </Button>
                      </>
                    ) : (
                      // Unauthenticated user - mobile
                      <>
                        <Button variant="outline" size="sm" onClick={handleOpenLoginPopup}>
                          Anmelden
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white shadow-lg font-semibold transition-all duration-300"
                        >
                          <Link href="/register/company">Mit Taskilo starten</Link>
                        </Button>
                      </>
                    ))}
                  <div className="flex items-center gap-2 pt-3 border-t">
                    <ModeToggle />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* LoginPopup-Komponente hier einfügen */}
      <Suspense fallback={null}>
        <LoginPopup
          isOpen={isLoginPopupOpen}
          onClose={handleCloseLoginPopup}
          onLoginSuccess={handleLoginSuccess}
        />
      </Suspense>
    </header>
  );
};

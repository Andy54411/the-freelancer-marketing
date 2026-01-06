'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User, LogOut, Settings, Star, Clock, FileUser, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React, { Suspense, useEffect } from 'react';
import LoginPopup from '@/components/LoginPopup';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/firebase/clients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

// Debug-Logging für Hydration
const heroHeaderLog = (step: string, data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
  } else {
  }
};

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const HeroHeader = () => {
  heroHeaderLog('RENDER_START', { isServer: typeof window === 'undefined' });
  
  const [menuState, setMenuState] = React.useState(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  heroHeaderLog('STATE_INITIALIZED', { 
    menuState, 
    isLoginPopupOpen, 
    hasUser: !!user, 
    isLoading,
    profilePictureUrl: !!profilePictureUrl
  });

  const menuItems = [
    { name: 'Tasker', href: '/services', labelKey: 'nav.services' },
    { name: 'Marktplatz', href: '/marketplace', labelKey: 'nav.marketplace' },
  ];

  const menuItemsAfterDropdown = [
    { name: 'Stellenanzeigen', href: '/jobs', labelKey: 'nav.jobs' },
    { name: 'Preise', href: '/webmail/pricing', labelKey: 'nav.pricing' },
    { name: 'Über uns', href: '/about', labelKey: 'nav.about' },
  ];

  const businessSolutionsItems = [
    { 
      name: 'Tasker - Dienstleister', 
      href: '/services', 
      description: 'Alle Dienstleistungen durchsuchen',
      icon: Star
    },
    { 
      name: 'Marktplatz', 
      href: '/marketplace', 
      description: 'Projekte ausschreiben & Angebote erhalten',
      icon: Star
    },
    { 
      name: 'Kalender & Termine', 
      href: '/features/calendar', 
      description: 'Termine und Verfügbarkeiten verwalten',
      icon: Clock
    },
    { 
      name: 'E-Mail & Kommunikation', 
      href: '/features/webmail', 
      description: 'Professionelle E-Mail-Lösung für Ihr Team',
      icon: Mail
    },
    { 
      name: 'Buchhaltung & Rechnungen', 
      href: '/features/accounting', 
      description: 'GoBD-konforme Rechnungsstellung',
      icon: FileUser
    },
    { 
      name: 'Banking & Zahlungen', 
      href: '/features/banking', 
      description: 'Revolut & FinAPI Multi-Bank Integration',
      icon: Star
    },
    { 
      name: 'Lagerbestand', 
      href: '/features/inventory', 
      description: 'Artikel und Lagerbestände verwalten',
      icon: Star
    },
    { 
      name: 'Taskilo Advertising', 
      href: '/features/advertising', 
      description: 'Google Ads, LinkedIn & Meta',
      icon: Star
    },
    { 
      name: 'Personal & HR', 
      href: '/features/hr-management', 
      description: 'Mitarbeiter, Dienstplan, Gehaltsabrechnung',
      icon: FileUser
    },
    { 
      name: 'Recruiting', 
      href: '/features/recruiting', 
      description: 'Stellenanzeigen & Bewerbungen',
      icon: Star
    },
    { 
      name: 'Workspace & Projekte', 
      href: '/features/workspace', 
      description: 'Projekte, Aufgaben, Dokumente',
      icon: Star
    },
    { 
      name: 'WhatsApp Business', 
      href: '/features/whatsapp', 
      description: 'Kundenkommunikation über WhatsApp',
      icon: Star
    },
  ];

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async user => {
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

            if (userData.profilePictureFirebaseUrl) {
              setProfilePictureUrl(userData.profilePictureFirebaseUrl);
            } else {
              setProfilePictureUrl(null);
            }
          } else {
            setProfilePictureUrl(null);
          }
        } catch {
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
    } catch {}
  };

  heroHeaderLog('BEFORE_RENDER_RETURN', { 
    isLoading, 
    hasUser: !!user, 
    menuState 
  });
  
  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="bg-[#14ad9f]/95 relative z-50 w-full border-b border-teal-700/30 backdrop-blur-sm shadow-lg"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-between py-3">
            {/* Left Section */}
            <div className="flex items-center justify-between w-full lg:w-auto gap-8">
              <Link href="/" className="flex items-center" aria-label="Taskilo Home">
                <Image
                  src="/images/taskilo-logo-white.png"
                  alt="Taskilo"
                  width={150}
                  height={42}
                  className="h-10 w-auto"
                  priority
                />
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Menü schließen' : 'Menü öffnen'}
                className="relative z-20 block p-2 lg:hidden"
              >
                <Menu
                  className={cn(
                    'size-6 text-white transition-all duration-200',
                    menuState && 'rotate-180 scale-0 opacity-0'
                  )}
                />
                <X
                  className={cn(
                    'size-6 text-white absolute inset-0 m-auto rotate-180 scale-0 opacity-0 transition-all duration-200',
                    menuState && 'rotate-0 scale-100 opacity-100'
                  )}
                />
              </button>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-8 text-sm">
                {menuItems.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="text-white/90 hover:text-white font-medium drop-shadow-md transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Unternehmenslösungen Dropdown */}
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="bg-transparent text-white! hover:text-white! hover:bg-white/10 focus:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white! font-medium drop-shadow-md data-active:text-white!">
                        Unternehmenslösungen
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-white">
                          {businessSolutionsItems.map((item) => (
                            <li key={item.name}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={item.href}
                                  className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-teal-50 hover:text-[#14ad9f] focus:bg-teal-50 focus:text-[#14ad9f]"
                                >
                                  <div className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4 text-[#14ad9f]" />
                                    <div className="text-sm font-medium leading-none text-gray-900">{item.name}</div>
                                  </div>
                                  <p className="line-clamp-2 text-sm leading-snug text-gray-600 mt-1">
                                    {item.description}
                                  </p>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>

                {menuItemsAfterDropdown.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="text-white/90 hover:text-white font-medium drop-shadow-md transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Section - Desktop only */}
            <div
              className={cn(
                'hidden lg:flex w-fit flex-row items-center justify-end gap-6'
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
                  </div>
                ) : (
                  // Unauthenticated user
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenLoginPopup}
                      className="h-9 px-4 text-sm font-medium rounded-md border border-white/60 text-white bg-transparent hover:bg-white/10 transition-colors"
                    >
                      Anmelden
                    </button>
                    <Button
                      asChild
                      size="sm"
                      className="bg-white hover:bg-gray-100 text-[#14ad9f] font-semibold h-9 px-3 text-sm"
                    >
                      <Link href="/webmail/register">
                        <Mail className="w-4 h-4 mr-1" />
                        Mail Account erstellen
                      </Link>
                    </Button>
                  </div>
                ))}
            </div>

            {/* Mobile Navigation */}
            {menuState && (
              <div className="lg:hidden absolute top-full left-0 w-full bg-background z-10 border-t shadow-xl">
                <ul className="px-6 py-4 space-y-4 text-base">
                  {menuItems.slice(0, 1).map((item, i) => (
                    <li key={i}>
                      <Link
                        href={item.href}
                        className="block text-foreground hover:text-[#14ad9f] font-medium transition"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                  
                  {/* Unternehmenslösungen Section */}
                  <li>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Unternehmenslösungen</p>
                    <ul className="pl-4 space-y-2">
                      {businessSolutionsItems.map((item, i) => (
                        <li key={i}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 text-foreground hover:text-[#14ad9f] font-medium transition"
                          >
                            <item.icon className="h-4 w-4 text-[#14ad9f]" />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                  
                  {menuItems.slice(1).map((item, i) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMenuState(false);
                            handleOpenLoginPopup();
                          }}
                          className="w-full"
                        >
                          Anmelden
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="bg-[#14ad9f] hover:bg-[#0f9a8d] text-white font-semibold w-full"
                        >
                          <Link href="/register/company">
                            Mit Taskilo starten
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <Link href="/webmail/register">
                            <Mail className="w-4 h-4 mr-2" />
                            Mail Account erstellen
                          </Link>
                        </Button>
                      </>
                    ))}
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

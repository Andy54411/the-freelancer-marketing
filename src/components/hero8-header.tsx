'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Logo } from './logo'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'
import { ModeToggle } from './mode-toggle'

const menuItems = [
  { name: 'Startseite', href: '/' },
  { name: 'Hilfe', href: '#link' },
  { name: 'Vision', href: '#link' },
  { name: 'Preis', href: '#link' },
  { name: 'Blog', href: '#link' },
  { name: 'Über uns', href: '#link' },
  { name: 'Kontakt', href: '#link' },
  { name: 'Impressum', href: '#link' },
]

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false)

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
              <Link href="/" className="flex items-center space-x-2" aria-label="Tasko Home">
                <Logo />
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
                      className="text-muted-foreground hover:text-accent-foreground transition-colors"
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
                'lg:flex hidden'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:gap-3 gap-2 w-full md:w-fit">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register/company">
                    <span>Starte mit Tasko</span>
                  </Link>
                </Button>
                <ModeToggle />
              </div>
            </div>

            {/* Mobile Navigation */}
            {menuState && (
              <div className="lg:hidden absolute top-full left-0 w-full bg-background z-10 border-t shadow-xl">
                <ul className="px-6 py-4 space-y-4 text-base">
                  {menuItems.map((item, i) => (
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
                  <Button asChild variant="outline" size="sm">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/register/company">Starte mit Tasko</Link>
                  </Button>
                  <ModeToggle />
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}

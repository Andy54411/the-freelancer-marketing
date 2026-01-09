'use client';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import Link from 'next/link';
import { FiShield } from 'react-icons/fi';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';

export default function FooterSection() {
  const { resetConsent } = useCookieConsentContext();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCookieSettings = () => {
    resetConsent();
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage('Bitte geben Sie eine E-Mail-Adresse ein.');
      return;
    }

    if (!consentGiven) {
      setMessage('Bitte stimmen Sie der Datenverarbeitung zu (DSGVO erforderlich).');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: 'footer',
          consentGiven: true,
          preferences: ['general'],
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.requiresConfirmation) {
          setMessage(
            '📧 Bestätigungs-E-Mail gesendet! Bitte prüfen Sie Ihr Postfach und bestätigen Sie Ihre Anmeldung.'
          );
        } else {
          setMessage('✅ Erfolgreich angemeldet! Vielen Dank für Ihr Interesse.');
        }
        setEmail('');
        setName('');
        setConsentGiven(false);
      } else {
        setMessage(
          `❌ ${result.error || 'Fehler bei der Anmeldung. Bitte versuchen Sie es später erneut.'}`
        );
      }
    } catch {
      setMessage('❌ Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.');
    } finally {
      setIsLoading(false);

      // Nachricht nach 5 Sekunden ausblenden
      setTimeout(() => {
        setMessage('');
      }, 5000);
    }
  };

  const links = [
    {
      group: 'Produkt',
      items: [
        {
          title: 'Features',
          href: '/features#features',
        },
        {
          title: 'Kategorien',
          href: '/services',
        },
        {
          title: 'Preise',
          href: '/features#pricing',
        },
        {
          title: 'Hilfe',
          href: '/contact',
        },
      ],
    },
    {
      group: 'Features',
      items: [
        {
          title: 'WhatsApp Business',
          href: '/features/whatsapp',
        },
        {
          title: 'Taskilo Advertising',
          href: '/features/advertising',
        },
        {
          title: 'E-Rechnung',
          href: '/features/e-invoicing',
        },
        {
          title: 'Buchhaltung',
          href: '/features/accounting',
        },
      ],
    },
    {
      group: 'Lösungen',
      items: [
        {
          title: 'Für Unternehmen',
          href: '/register/company',
        },
        {
          title: 'Für Freelancer',
          href: '/register/company?type=freelancer',
        },
        {
          title: 'Für Kunden',
          href: '/register/user',
        },
        {
          title: 'Projekt starten',
          href: '/auftrag/get-started',
        },
        {
          title: 'Anbieter werden',
          href: '/register/company?type=company',
        },
      ],
    },
    {
      group: 'Unternehmen',
      items: [
        {
          title: 'Über uns',
          href: '/about',
        },
        {
          title: 'Karriere',
          href: '/careers',
        },
        {
          title: 'Blog',
          href: '/blog',
        },
        {
          title: 'Presse',
          href: '/press',
        },
        {
          title: 'Kontakt',
          href: '/contact',
        },
      ],
    },
    {
      group: 'Rechtliches',
      items: [
        {
          title: 'Impressum',
          href: '/impressum',
        },
        {
          title: 'Datenschutz',
          href: '/datenschutz',
        },
        {
          title: 'AGB',
          href: '/agb',
        },
        {
          title: 'Nutzungsbedingungen',
          href: '/nutzungsbedingungen',
        },
        {
          title: 'Cookies',
          href: '/cookies',
        },
        {
          title: 'Privatsphäre',
          href: '/privatsphaere',
        },
      ],
    },
  ];

  return (
    <footer className="bg-linear-to-r from-[#14ad9f] to-teal-600 text-white pt-20 relative overflow-hidden">
      <div className="relative z-10 mb-8 border-b border-white/20 md:mb-12">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6 px-6 pb-6">
          <Link href="/" aria-label="go home" className="block size-fit">
            <Logo />
          </Link>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="https://twitter.com/taskilo_de"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X/Twitter"
              className="text-white/70 hover:text-white block transition-colors"
            >
              <svg
                className="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z"
                ></path>
              </svg>
            </Link>
            <Link
              href="https://www.linkedin.com/company/taskilo/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-white/70 hover:text-white block transition-colors"
            >
              <svg
                className="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z"
                ></path>
              </svg>
            </Link>
            <Link
              href="https://www.facebook.com/profile.php?id=61577087494516"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-white/70 hover:text-white block transition-colors"
            >
              <svg
                className="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95"
                ></path>
              </svg>
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Threads"
              className="text-white/70 hover:text-white block transition-colors"
            >
              <svg
                className="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M19.25 8.505c-1.577-5.867-7-5.5-7-5.5s-7.5-.5-7.5 8.995s7.5 8.996 7.5 8.996s4.458.296 6.5-3.918c.667-1.858.5-5.573-6-5.573c0 0-3 0-3 2.5c0 .976 1 2 2.5 2s3.171-1.027 3.5-3c1-6-4.5-6.5-6-4"
                  color="currentColor"
                ></path>
              </svg>
            </Link>
            <Link
              href="https://www.instagram.com/taskilo.de"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/70 hover:text-white block transition-colors"
            >
              <svg
                className="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"
                ></path>
              </svg>
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="text-white/70 hover:text-white block transition-colors"
            >
              <svg
                className="size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48"
                ></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="grid gap-8 lg:gap-12">
          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {links.map((link, index) => (
              <div key={index} className="space-y-3 text-sm">
                <span className="block font-medium text-white">{link.group}</span>
                {link.items.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    className="text-white/70 hover:text-white block duration-150 transition-colors"
                  >
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          
          {/* Newsletter */}
          <form
            onSubmit={handleNewsletterSubmit}
            className="border-t border-white/20 pt-8 text-sm"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-4">
                <Label htmlFor="mail" className="block font-medium text-white text-lg">
                  Newsletter
                </Label>
                <span className="text-white/70 block text-sm mt-1">
                  Bleiben Sie über Updates und neue Features informiert.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  type="text"
                  placeholder="Name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 sm:flex-1"
                  disabled={isLoading}
                />
                <Input
                  type="email"
                  id="mail"
                  name="mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="E-Mail-Adresse"
                  className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 sm:flex-1"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 px-6 bg-white text-[#14ad9f] hover:bg-white/90 disabled:opacity-50 font-semibold"
                  disabled={isLoading || !consentGiven}
                >
                  {isLoading ? 'Lädt...' : 'Abonnieren'}
                </Button>
              </div>

              {/* DSGVO Einverständnis - kompakter */}
              <div className="flex items-center justify-center gap-3">
                <input
                  type="checkbox"
                  id="newsletter-consent"
                  checked={consentGiven}
                  onChange={e => setConsentGiven(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#14ad9f] focus:ring-[#14ad9f] focus:ring-2 shrink-0"
                  disabled={isLoading}
                />
                <label
                  htmlFor="newsletter-consent"
                  className="text-xs text-white/70 cursor-pointer"
                >
                  Ich stimme der{' '}
                  <a href="/datenschutz" className="text-white underline hover:text-white/80">
                    Datenschutzerklärung
                  </a>{' '}
                  zu. Jederzeit abbestellbar.
                </label>
              </div>

              {message && (
                <p
                  className={cn(
                    'text-center text-sm mt-3',
                    message.startsWith('✅') ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {message}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* App Store Badges */}
        <div className="mt-12 border-t border-white/20 pt-8">
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/90 font-medium text-sm">Laden Sie unsere App herunter</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://apps.apple.com/de/app/taskilo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download on App Store"
                className="transition-transform hover:scale-105"
              >
                <img
                  src="/app_svg/app-store-badge.3b027f0f.svg"
                  alt="Download on the App Store"
                  className="h-10 w-auto"
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=de.taskilo.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
                className="transition-transform hover:scale-105"
              >
                <img
                  src="/app_svg/google-play-badge.63c04d3e.svg"
                  alt="Get it on Google Play"
                  className="h-10 w-auto"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-white/20 py-6">
          <small className="text-white/70 order-last block text-center text-sm md:order-first">
            © {new Date().getFullYear()} Taskilo. Alle Rechte vorbehalten.
          </small>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCookieSettings}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              <FiShield className="w-4 h-4" />
              Cookie-Einstellungen
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

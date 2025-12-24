'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sun, MessageSquare, ExternalLink, FileText, Users } from 'lucide-react';

interface SidebarLink {
  title: string;
  href: string;
  current?: boolean;
}

interface HilfeLayoutProps {
  children: React.ReactNode;
  title: string;
  sidebarLinks: SidebarLink[];
  currentIndex: number;
  totalArticles: number;
}

export default function HilfeLayout({
  children,
  title,
  sidebarLinks,
  currentIndex: _currentIndex,
  totalArticles,
}: HilfeLayoutProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header/Appbar */}
      <header className={`sticky top-0 z-50 border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo and Product Name */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <Link 
                  href="/hilfe" 
                  className={`text-sm font-medium ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                >
                  Taskilo Kalender Hilfe
                </Link>
              </div>
            </div>

            {/* Center: Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/hilfe"
                className={`text-sm font-medium pb-4 pt-5 border-b-2 ${isDarkMode ? 'border-teal-400 text-teal-400' : 'border-teal-600 text-teal-600'}`}
              >
                Hilfecenter
              </Link>
              <Link 
                href="/kontakt"
                className={`text-sm font-medium pb-4 pt-5 border-b-2 border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Kontakt
              </Link>
            </nav>

            {/* Right: Product Link */}
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
                target="_blank"
              >
                <span>Taskilo Kalender</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Article Content */}
          <article className="flex-1 min-w-0">
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Article Header */}
              <h1 className={`text-2xl sm:text-3xl font-normal mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h1>

              {/* Article Body */}
              <div className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                {children}
              </div>

              {/* Feedback Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}>
                  <MessageSquare className="w-5 h-5" />
                  <span>Feedback zu diesem Artikel geben</span>
                </button>
              </div>
            </div>

            {/* Need More Help Section */}
            <div className={`mt-8 p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h2 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Benötigst du weitere Hilfe?
              </h2>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Probiere diese nächsten Schritte:
              </p>
              <Link 
                href="/kontakt"
                className={`inline-flex items-center gap-3 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Kontaktiere uns
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Erhalte Antworten vom Taskilo Support-Team
                  </div>
                </div>
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className={`sticky top-24 rounded-lg border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Link href="/hilfe" className="hover:underline">
                  Hilfe
                </Link>
              </h2>
              <ul className="space-y-1">
                {sidebarLinks.map((link, index) => (
                  <li key={link.href}>
                    <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {index + 1} von {totalArticles}
                    </div>
                    <Link
                      href={link.href}
                      className={`flex items-start gap-2 p-2 rounded text-sm ${
                        link.current
                          ? isDarkMode
                            ? 'bg-gray-700 text-white'
                            : 'bg-teal-50 text-teal-700'
                          : isDarkMode
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{link.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t mt-12 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                2025 Taskilo
              </span>
              <Link 
                href="/datenschutz" 
                className={isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
              >
                Datenschutz
              </Link>
              <Link 
                href="/agb" 
                className={isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
              >
                Nutzungsbedingungen
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label={isDarkMode ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Grid3X3, LayoutDashboard, Calendar, Users, Ticket, Building2, Settings, FileText, CreditCard, BarChart3, MessageSquare, XCircle, Bell, Shield, Mail, Briefcase, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface AppItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface AdminAppItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

// Taskilo Brand Colors
const TEAL_100 = '#ccfbf1';
const TEAL_200 = '#99f6e4';
const TEAL_400 = '#2dd4bf';
const TEAL_500 = '#14b8a6';
const TEAL_600 = '#0d9488';
const TEAL_700 = '#0f766e';
const TEAL_800 = '#115e59';

// Admin Apps - alle Apps aus der Admin-Sidebar
const adminApps: AdminAppItem[] = [
  {
    name: 'Übersicht',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Kalender',
    href: '/admin-calendar',
    icon: Calendar,
  },
  {
    name: 'Workspace',
    href: '/dashboard/admin/workspace',
    icon: Briefcase,
  },
  {
    name: 'Tickets',
    href: '/dashboard/admin/tickets',
    icon: Ticket,
  },
  {
    name: 'Chat-Monitoring',
    href: '/dashboard/admin/chat-monitoring',
    icon: MessageSquare,
  },
  {
    name: 'Storno',
    href: '/dashboard/admin/storno-management',
    icon: XCircle,
  },
  {
    name: 'Analytics',
    href: '/dashboard/admin/analytics',
    icon: BarChart3,
  },
  {
    name: 'Updates',
    href: '/dashboard/admin/updates',
    icon: Bell,
  },
  {
    name: 'Unternehmen',
    href: '/dashboard/admin/companies',
    icon: Building2,
  },
  {
    name: 'Benutzer',
    href: '/dashboard/admin/users',
    icon: Users,
  },
  {
    name: 'Admins',
    href: '/dashboard/admin/admin-users',
    icon: Shield,
  },
  {
    name: 'E-Mail',
    href: '/dashboard/admin/email',
    icon: Mail,
  },
  {
    name: 'Abrechnung',
    href: '/dashboard/admin/webmail-billing',
    icon: CreditCard,
  },
  {
    name: 'Einstellungen',
    href: '/dashboard/admin/settings',
    icon: Settings,
  },
];

const apps: AppItem[] = [
  {
    name: 'E-Mail',
    href: '/webmail',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Envelope body */}
        <rect x="4" y="10" width="40" height="28" rx="3" fill={TEAL_600}/>
        {/* Envelope flap */}
        <path d="M4 13l20 14 20-14" fill="none" stroke={TEAL_800} strokeWidth="2"/>
        {/* Inner highlight */}
        <path d="M4 13l20 12 20-12" fill={TEAL_500}/>
        {/* Letter lines */}
        <rect x="12" y="24" width="24" height="2" rx="1" fill={TEAL_100} opacity="0.5"/>
        <rect x="12" y="30" width="16" height="2" rx="1" fill={TEAL_100} opacity="0.5"/>
      </svg>
    ),
  },
  {
    name: 'Kalender',
    href: '/webmail/calendar',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Calendar body */}
        <rect x="6" y="10" width="36" height="32" rx="4" fill={TEAL_600}/>
        {/* Header bar */}
        <rect x="6" y="10" width="36" height="10" rx="4" fill={TEAL_800}/>
        <rect x="6" y="16" width="36" height="4" fill={TEAL_800}/>
        {/* Calendar rings */}
        <rect x="14" y="6" width="4" height="10" rx="2" fill={TEAL_700}/>
        <rect x="30" y="6" width="4" height="10" rx="2" fill={TEAL_700}/>
        {/* Date number */}
        <text x="24" y="34" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">
          {new Date().getDate()}
        </text>
      </svg>
    ),
  },
  {
    name: 'Meet',
    href: '/webmail/meet',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Camera body */}
        <rect x="4" y="14" width="28" height="20" rx="4" fill={TEAL_600}/>
        {/* Camera lens */}
        <path d="M32 18l10-4v20l-10-4z" fill={TEAL_700}/>
        {/* Record indicator */}
        <circle cx="12" cy="20" r="3" fill={TEAL_200}/>
        {/* Screen reflection */}
        <rect x="8" y="18" width="20" height="12" rx="2" fill={TEAL_500} opacity="0.3"/>
      </svg>
    ),
  },
  {
    name: 'Drive',
    href: '/webmail/drive',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Folder back */}
        <path d="M4 14c0-2.2 1.8-4 4-4h12l4 4h16c2.2 0 4 1.8 4 4v20c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V14z" fill={TEAL_700}/>
        {/* Folder front */}
        <path d="M4 18h40v20c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V18z" fill={TEAL_600}/>
        {/* Cloud icon inside */}
        <path d="M16 30a4 4 0 018 0h4a3 3 0 010 6H14a3 3 0 010-6h2z" fill={TEAL_200} opacity="0.7"/>
      </svg>
    ),
  },
  {
    name: 'Kontakte',
    href: '/contacts',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Card background */}
        <rect x="6" y="8" width="36" height="32" rx="4" fill={TEAL_600}/>
        {/* Person silhouette */}
        <circle cx="24" cy="18" r="6" fill={TEAL_200}/>
        <path d="M12 38c0-6.6 5.4-12 12-12s12 5.4 12 12" fill={TEAL_200}/>
        {/* Contact lines */}
        <rect x="10" y="12" width="2" height="24" rx="1" fill={TEAL_800}/>
      </svg>
    ),
  },
  {
    name: 'Chat',
    href: '/webmail/chat',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Chat bubble 1 */}
        <path d="M8 10h24c2.2 0 4 1.8 4 4v12c0 2.2-1.8 4-4 4H16l-8 6V14c0-2.2 1.8-4 4-4z" fill={TEAL_600}/>
        {/* Chat bubble 2 */}
        <path d="M16 22h24c2.2 0 4 1.8 4 4v12c0 2.2-1.8 4-4 4h-8l-6 4v-4h-6c-2.2 0-4-1.8-4-4V26c0-2.2 1.8-4 4-4z" fill={TEAL_500}/>
        {/* Dots */}
        <circle cx="24" cy="32" r="2" fill={TEAL_100}/>
        <circle cx="32" cy="32" r="2" fill={TEAL_100}/>
        <circle cx="40" cy="32" r="2" fill={TEAL_100}/>
      </svg>
    ),
  },
  {
    name: 'Aufgaben',
    href: '/webmail/tasks',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Clipboard */}
        <rect x="8" y="6" width="32" height="38" rx="4" fill={TEAL_600}/>
        {/* Clipboard top */}
        <rect x="16" y="4" width="16" height="6" rx="2" fill={TEAL_800}/>
        {/* Checkboxes */}
        <rect x="12" y="16" width="6" height="6" rx="1" fill={TEAL_200}/>
        <path d="M13 19l2 2 3-3" stroke={TEAL_700} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <rect x="22" y="17" width="14" height="3" rx="1" fill={TEAL_200} opacity="0.7"/>
        <rect x="12" y="26" width="6" height="6" rx="1" fill={TEAL_200}/>
        <rect x="22" y="27" width="14" height="3" rx="1" fill={TEAL_200} opacity="0.7"/>
        <rect x="12" y="36" width="6" height="6" rx="1" fill={TEAL_200}/>
        <rect x="22" y="37" width="10" height="3" rx="1" fill={TEAL_200} opacity="0.7"/>
      </svg>
    ),
  },
  {
    name: 'Notizen',
    href: '/webmail/notes',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Note paper */}
        <path d="M8 8h24l8 8v28c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4V12c0-2.2 1.8-4 4-4z" fill={TEAL_400}/>
        {/* Folded corner */}
        <path d="M32 8v8h8z" fill={TEAL_600}/>
        {/* Lines */}
        <rect x="14" y="22" width="20" height="2" rx="1" fill={TEAL_700} opacity="0.5"/>
        <rect x="14" y="28" width="16" height="2" rx="1" fill={TEAL_700} opacity="0.5"/>
        <rect x="14" y="34" width="18" height="2" rx="1" fill={TEAL_700} opacity="0.5"/>
        <rect x="14" y="40" width="12" height="2" rx="1" fill={TEAL_700} opacity="0.5"/>
      </svg>
    ),
  },
  {
    name: 'Einstellungen',
    href: '/webmail/settings',
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        {/* Gear outer */}
        <path d="M24 4l4 4 6-2 2 6 6 2-2 6 4 4-4 4 2 6-6 2-2 6-6-2-4 4-4-4-6 2-2-6-6-2 2-6-4-4 4-4-2-6 6-2 2-6 6 2z" fill={TEAL_600}/>
        {/* Gear inner circle */}
        <circle cx="24" cy="24" r="8" fill={TEAL_100}/>
        {/* Gear center */}
        <circle cx="24" cy="24" r="4" fill={TEAL_700}/>
      </svg>
    ),
  },
];

interface AppLauncherProps {
  className?: string;
}

export function AppLauncher({ className }: AppLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isDark } = useWebmailTheme();

  // Check admin permissions on mount
  useEffect(() => {
    async function checkAdminPermissions() {
      try {
        const response = await fetch('/api/admin/auth/verify');
        if (response.ok) {
          const data = await response.json();
          // API gibt success: true zurück wenn Admin eingeloggt
          setIsAdmin(data.success === true || data.valid === true);
        }
      } catch {
        // Not an admin or error checking permissions
        setIsAdmin(false);
      }
    }
    checkAdminPermissions();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        buttonRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className={cn('relative', className)}>
      {/* Grid Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-3 rounded-full transition-colors',
          isOpen ? (isDark ? 'bg-white/10' : 'bg-gray-200') : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200/60')
        )}
        aria-label="Taskilo-Apps"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Grid3X3 className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-[#5f6368]'}`} />
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* App Grid Modal */}
          <div
            ref={modalRef}
            className={cn(
              'absolute right-0 top-full mt-2 z-50',
              'w-[300px] max-h-[500px] overflow-y-auto',
              isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-gray-200',
              'rounded-2xl shadow-xl border',
              'animate-in fade-in-0 zoom-in-95 duration-150'
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-100'}`}>
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Taskilo Apps</h3>
            </div>

            {/* Webmail Apps */}
            <div className="p-3 grid grid-cols-3 gap-1">
              {apps.map((app) => (
                <Link
                  key={app.name}
                  href={app.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'p-3 rounded-lg',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                    'transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
                  )}
                  role="menuitem"
                >
                  <div className="mb-1">
                    {app.icon}
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} text-center leading-tight`}>
                    {app.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Admin Apps - Only shown if user has admin rights */}
            {isAdmin && (
              <>
                <div className={`px-4 py-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-100'}`}>
                  <h4 className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Admin
                  </h4>
                </div>
                <div className="p-3 grid grid-cols-3 gap-1">
                  {adminApps.map((app) => {
                    const IconComponent = app.icon;
                    return (
                      <Link
                        key={app.name}
                        href={app.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex flex-col items-center justify-center',
                          'p-3 rounded-lg',
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                          'transition-colors',
                          'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
                        )}
                        role="menuitem"
                      >
                        <div className="mb-1 w-12 h-12 flex items-center justify-center bg-teal-500/10 rounded-xl">
                          <IconComponent className="w-6 h-6 text-teal-600" />
                        </div>
                        <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} text-center leading-tight`}>
                          {app.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {/* Footer */}
            <div className={`px-4 py-3 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-100'} text-center`}>
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="text-sm text-teal-500 hover:text-teal-400 hover:underline"
              >
                Alle Taskilo Apps
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

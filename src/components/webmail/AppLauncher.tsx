'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Grid3X3, LayoutDashboard, Calendar, Users, Ticket, Building2, Settings, FileText, CreditCard, BarChart3, MessageSquare, XCircle, Bell, Shield, Mail, Briefcase, HardDrive, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

// Debug-Logging für Hydration
const appLauncherLog = (step: string, data?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    console.log(`[HYDRATION-DEBUG][AppLauncher] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  } else {
    console.log(`[HYDRATION-DEBUG][AppLauncher-SERVER] ${step}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Pfad-basierte URLs (keine Subdomains mehr)
function getAppUrl(path: string): string {
  appLauncherLog('getAppUrl_CALLED', { path });
  // Einfach den Pfad zurueckgeben - keine Subdomain-Umwandlung
  return path;
}

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
const TEAL_300 = '#5eead4';
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
    name: 'Drive',
    href: '/dashboard/admin/drive',
    icon: HardDrive,
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
    href: '/webmail/contacts',
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
  hasTheme?: boolean;
  companyId?: string; // Wenn gesetzt, zeige Company-Dashboard Apps
  isDarkMode?: boolean; // Expliziter Dark Mode Wert vom Parent
}

// Company Dashboard Apps - alle wichtigen Apps aus CompanySidebar (ohne E-Mail, da in Taskilo Apps)
const getCompanyApps = (companyId: string): AppItem[] => [
  {
    name: 'Übersicht',
    href: `/dashboard/company/${companyId}`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="4" y="4" width="18" height="18" rx="3" fill={TEAL_600}/>
        <rect x="26" y="4" width="18" height="18" rx="3" fill={TEAL_500}/>
        <rect x="4" y="26" width="18" height="18" rx="3" fill={TEAL_500}/>
        <rect x="26" y="26" width="18" height="18" rx="3" fill={TEAL_400}/>
      </svg>
    ),
  },
  {
    name: 'Tasker',
    href: `/dashboard/company/${companyId}/orders/overview`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="6" y="8" width="36" height="32" rx="4" fill={TEAL_600}/>
        <rect x="12" y="16" width="24" height="3" rx="1.5" fill={TEAL_100}/>
        <rect x="12" y="23" width="18" height="3" rx="1.5" fill={TEAL_200}/>
        <rect x="12" y="30" width="20" height="3" rx="1.5" fill={TEAL_100}/>
      </svg>
    ),
  },
  {
    name: 'Kalender',
    href: `/dashboard/company/${companyId}/calendar`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="6" y="10" width="36" height="32" rx="4" fill={TEAL_600}/>
        <rect x="6" y="10" width="36" height="10" rx="4" fill={TEAL_800}/>
        <rect x="6" y="16" width="36" height="4" fill={TEAL_800}/>
        <rect x="14" y="6" width="4" height="10" rx="2" fill={TEAL_700}/>
        <rect x="30" y="6" width="4" height="10" rx="2" fill={TEAL_700}/>
        <text x="24" y="34" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">
          {new Date().getDate()}
        </text>
      </svg>
    ),
  },
  {
    name: 'Buchhaltung',
    href: `/dashboard/company/${companyId}/finance/invoices`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="8" y="6" width="32" height="36" rx="4" fill={TEAL_600}/>
        <rect x="14" y="14" width="20" height="2" rx="1" fill={TEAL_100}/>
        <rect x="14" y="20" width="16" height="2" rx="1" fill={TEAL_200}/>
        <rect x="14" y="26" width="18" height="2" rx="1" fill={TEAL_100}/>
        <circle cx="34" cy="34" r="8" fill={TEAL_400}/>
        <text x="34" y="38" textAnchor="middle" fill={TEAL_800} fontSize="10" fontWeight="bold">$</text>
      </svg>
    ),
  },
  {
    name: 'Geschäftspartner',
    href: `/dashboard/company/${companyId}/customers`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="18" cy="14" r="8" fill={TEAL_600}/>
        <path d="M6 38c0-7 5.4-12 12-12s12 5 12 12" fill={TEAL_500}/>
        <circle cx="32" cy="18" r="6" fill={TEAL_500}/>
        <path d="M24 42c0-5 4-9 8-9s8 4 8 9" fill={TEAL_400}/>
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    href: `/dashboard/company/${companyId}/whatsapp`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill={TEAL_600}/>
        <path d="M24 8c-8.8 0-16 7.2-16 16 0 2.8.7 5.5 2.1 7.9l-2.2 8.1 8.3-2.2c2.3 1.2 4.9 1.9 7.8 1.9 8.8 0 16-7.2 16-16s-7.2-16-16-16zm0 28c-2.3 0-4.5-.6-6.4-1.7l-.5-.3-4.8 1.3 1.3-4.7-.3-.5c-1.2-2-1.8-4.3-1.8-6.6 0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12z" fill={TEAL_100}/>
      </svg>
    ),
  },
  {
    name: 'Banking',
    href: `/dashboard/company/${companyId}/banking`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <path d="M24 4L4 16v4h40v-4L24 4z" fill={TEAL_700}/>
        <rect x="8" y="20" width="4" height="16" fill={TEAL_600}/>
        <rect x="16" y="20" width="4" height="16" fill={TEAL_500}/>
        <rect x="24" y="20" width="4" height="16" fill={TEAL_600}/>
        <rect x="32" y="20" width="4" height="16" fill={TEAL_500}/>
        <rect x="4" y="36" width="40" height="6" rx="2" fill={TEAL_700}/>
      </svg>
    ),
  },
  {
    name: 'Lagerbestand',
    href: `/dashboard/company/${companyId}/finance/inventory`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="4" y="20" width="16" height="24" rx="2" fill={TEAL_600}/>
        <rect x="16" y="12" width="16" height="32" rx="2" fill={TEAL_500}/>
        <rect x="28" y="4" width="16" height="40" rx="2" fill={TEAL_400}/>
        <rect x="8" y="24" width="8" height="2" fill={TEAL_100}/>
        <rect x="20" y="16" width="8" height="2" fill={TEAL_100}/>
        <rect x="32" y="8" width="8" height="2" fill={TEAL_100}/>
      </svg>
    ),
  },
  {
    name: 'Advertising',
    href: `/dashboard/company/${companyId}/taskilo-advertising`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="4" y="8" width="40" height="28" rx="4" fill={TEAL_600}/>
        <path d="M12 28l8-10 6 6 10-12" stroke={TEAL_100} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <circle cx="36" cy="12" r="3" fill={TEAL_300}/>
        <rect x="8" y="38" width="8" height="4" rx="1" fill={TEAL_500}/>
        <rect x="20" y="38" width="8" height="4" rx="1" fill={TEAL_500}/>
        <rect x="32" y="38" width="8" height="4" rx="1" fill={TEAL_500}/>
      </svg>
    ),
  },
  {
    name: 'Personal',
    href: `/dashboard/company/${companyId}/personal/employees`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="16" cy="12" r="7" fill={TEAL_600}/>
        <circle cx="32" cy="12" r="7" fill={TEAL_500}/>
        <path d="M4 36c0-6 5-10 12-10s12 4 12 10" fill={TEAL_600}/>
        <path d="M20 40c0-6 5-10 12-10s12 4 12 10" fill={TEAL_500}/>
        <circle cx="24" cy="26" r="5" fill={TEAL_400}/>
      </svg>
    ),
  },
  {
    name: 'Recruiting',
    href: `/dashboard/company/${companyId}/recruiting`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="20" cy="16" r="10" fill={TEAL_600}/>
        <path d="M4 42c0-8 6.5-14 16-14s16 6 16 14" fill={TEAL_500}/>
        <circle cx="36" cy="20" r="8" fill="none" stroke={TEAL_400} strokeWidth="4"/>
        <path d="M42 26l6 6" stroke={TEAL_400} strokeWidth="4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: 'Workspace',
    href: `/dashboard/company/${companyId}/workspace`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <rect x="4" y="10" width="40" height="28" rx="4" fill={TEAL_600}/>
        <rect x="8" y="14" width="16" height="10" rx="2" fill={TEAL_100}/>
        <rect x="8" y="26" width="16" height="8" rx="2" fill={TEAL_200}/>
        <rect x="26" y="14" width="14" height="20" rx="2" fill={TEAL_300}/>
      </svg>
    ),
  },
  {
    name: 'Support',
    href: `/dashboard/company/${companyId}/support`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <circle cx="24" cy="24" r="20" fill={TEAL_600}/>
        <circle cx="24" cy="24" r="12" fill={TEAL_100}/>
        <circle cx="24" cy="24" r="6" fill={TEAL_700}/>
        <rect x="22" y="4" width="4" height="8" fill={TEAL_700}/>
        <rect x="22" y="36" width="4" height="8" fill={TEAL_700}/>
        <rect x="4" y="22" width="8" height="4" fill={TEAL_700}/>
        <rect x="36" y="22" width="8" height="4" fill={TEAL_700}/>
      </svg>
    ),
  },
  {
    name: 'Einstellungen',
    href: `/dashboard/company/${companyId}/settings`,
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <path d="M24 4l4 4 6-2 2 6 6 2-2 6 4 4-4 4 2 6-6 2-2 6-6-2-4 4-4-4-6 2-2-6-6-2 2-6-4-4 4-4-2-6 6-2 2-6 6 2z" fill={TEAL_600}/>
        <circle cx="24" cy="24" r="8" fill={TEAL_100}/>
        <circle cx="24" cy="24" r="4" fill={TEAL_700}/>
      </svg>
    ),
  },
];

export function AppLauncher({ className, hasTheme = false, companyId, isDarkMode }: AppLauncherProps) {
  appLauncherLog('RENDER_START', { 
    hasTheme, 
    hasCompanyId: !!companyId, 
    isDarkMode,
    isServer: typeof window === 'undefined'
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isDark: themeIsDark } = useWebmailTheme();
  
  // isDarkMode Prop hat Priorität, sonst Theme-Context
  const isDark = isDarkMode !== undefined ? isDarkMode : themeIsDark;
  
  appLauncherLog('STATE_INITIALIZED', { isOpen, isAdmin, isDark });
  
  // Wenn ein Hintergrundbild-Theme aktiv ist, verwende helle Farben
  const useWhiteIcons = hasTheme;

  // Webmail-Session aus Cookie lesen
  function getWebmailEmail(): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'webmail_session' && value) {
        try {
          const binString = atob(value);
          const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
          const jsonStr = new TextDecoder().decode(bytes);
          const data = JSON.parse(jsonStr);
          return data.email || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // Check admin permissions on mount
  // Admin-Apps werden nur angezeigt wenn:
  // 1. Ein Admin-Token existiert UND
  // 2. Die aktuelle Webmail-Email mit der Admin-Email übereinstimmt
  useEffect(() => {
    async function checkAdminPermissions() {
      try {
        // Hole die aktuelle Webmail-Email aus dem Cookie
        const currentWebmailEmail = getWebmailEmail();
        
        // DEBUG: Logge die Webmail-Email
        // eslint-disable-next-line no-console
        console.log('[AppLauncher] Current Webmail Email:', currentWebmailEmail);
        
        // Wenn ein Webmail-Login aktiv ist, muss die Email mit der Admin-Email übereinstimmen
        if (currentWebmailEmail) {
          // Hole Admin-Daten
          const adminResponse = await fetch('/api/admin/auth/verify');
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            const adminEmail = adminData.user?.email;
            
            // DEBUG: Logge Admin-Daten
            // eslint-disable-next-line no-console
            console.log('[AppLauncher] Admin Email:', adminEmail, 'Admin Success:', adminData.success);
            // eslint-disable-next-line no-console
            console.log('[AppLauncher] Full Admin Data:', JSON.stringify(adminData, null, 2));
            
            // Admin-Apps nur anzeigen wenn Admin-Email existiert UND mit Webmail-Email übereinstimmt
            if (adminData.success && adminEmail) {
              const isMatch = adminEmail.toLowerCase() === currentWebmailEmail.toLowerCase();
              // eslint-disable-next-line no-console
              console.log('[AppLauncher] Email Match Check:', isMatch, `(${adminEmail} vs ${currentWebmailEmail})`);
              setIsAdmin(isMatch);
            } else {
              // eslint-disable-next-line no-console
              console.log('[AppLauncher] No admin or no admin email - hiding admin apps');
              setIsAdmin(false);
            }
          } else {
            // eslint-disable-next-line no-console
            console.log('[AppLauncher] Admin verify failed with status:', adminResponse.status);
            setIsAdmin(false);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log('[AppLauncher] No Webmail login - checking admin token only');
          // Kein Webmail-Login - prüfe nur ob Admin-Token gültig ist
          const adminResponse = await fetch('/api/admin/auth/verify');
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            // eslint-disable-next-line no-console
            console.log('[AppLauncher] Admin token valid:', adminData.success);
            setIsAdmin(adminData.success === true);
          } else {
            setIsAdmin(false);
          }
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
          isOpen 
            ? (useWhiteIcons ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-200') 
            : (useWhiteIcons ? 'hover:bg-white/20' : isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200/60')
        )}
        aria-label="Taskilo-Apps"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Grid3X3 className={cn('h-6 w-6', useWhiteIcons ? 'text-white' : isDark ? 'text-white' : 'text-[#5f6368]')} />
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
              'fixed right-4 top-16 z-9999',
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
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>Taskilo Apps</h3>
            </div>

            {/* Webmail Apps - immer anzeigen */}
            <div className="p-3 grid grid-cols-3 gap-1">
              {apps.map((app) => {
                const url = getAppUrl(app.href);
                const isExternal = url.startsWith('http');
                const linkProps = {
                  onClick: () => setIsOpen(false),
                  className: cn(
                    'flex flex-col items-center justify-center',
                    'p-3 rounded-lg',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                    'transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
                  ),
                  role: 'menuitem' as const,
                };
                
                return isExternal ? (
                  <a
                    key={app.name}
                    href={url}
                    {...linkProps}
                  >
                    <div className="mb-1">
                      {app.icon}
                    </div>
                    <span className={`text-xs ${isDark ? 'text-white' : 'text-gray-700'} text-center leading-tight`}>
                      {app.name}
                    </span>
                  </a>
                ) : (
                  <Link
                    key={app.name}
                    href={url}
                    {...linkProps}
                  >
                    <div className="mb-1">
                      {app.icon}
                    </div>
                    <span className={`text-xs ${isDark ? 'text-white' : 'text-gray-700'} text-center leading-tight`}>
                      {app.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Admin Apps - Only shown if user has admin rights */}
            {companyId && (
              <>
                <div className={`px-4 py-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-100'}`}>
                  <h4 className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-white' : 'text-gray-500'}`}>
                    Company Apps
                  </h4>
                </div>
                <div className="p-3 grid grid-cols-3 gap-1">
                  {getCompanyApps(companyId).map((app) => {
                    const url = app.href;
                    return (
                      <Link
                        key={app.name}
                        href={url}
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
                        <span className={`text-xs ${isDark ? 'text-white' : 'text-gray-700'} text-center leading-tight`}>
                          {app.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {/* Admin Apps - Only shown if user has admin rights */}
            {isAdmin && (
              <>
                <div className={`px-4 py-2 border-t ${isDark ? 'border-[#5f6368]' : 'border-gray-100'}`}>
                  <h4 className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-white' : 'text-gray-500'}`}>
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
                        <span className={`text-xs ${isDark ? 'text-white' : 'text-gray-700'} text-center leading-tight`}>
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  ShieldCheck,
  Bot,
  MessageSquare,
  Briefcase,
  Shield,
  UserCheck,
  Mail,
  Send,
  Activity,
  DollarSign,
  CreditCard,
  Bug,
  BarChart,
  UserPlus,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard/admin', label: 'Übersicht', icon: Home },
    { href: '/dashboard/admin/companies', label: 'Unternehmen', icon: Users },
    { href: '/dashboard/admin/company-onboarding', label: 'Company Onboarding', icon: UserPlus },
    { href: '/dashboard/admin/legacy-migration', label: 'Legacy Migration', icon: Database },
    { href: '/dashboard/admin/invites', label: 'Einladungen', icon: ShieldCheck },

    // Monitoring & Analytics Section
    { href: '/dashboard/admin/payments', label: 'Real-Time Payment Monitor', icon: CreditCard },
    { href: '/dashboard/admin/payment-monitoring', label: 'Payment Analytics', icon: BarChart },
    { href: '/dashboard/admin/transfer-debug', label: 'Transfer Debug & Retry', icon: Bug },
    { href: '/dashboard/admin/b2b-debug', label: 'B2B Payment Debug', icon: DollarSign },
    { href: '/dashboard/admin/finapi-debug', label: 'finAPI & DATEV Debug', icon: Activity },

    // Support & Communication
    { href: '/dashboard/admin/tickets', label: 'Ticket-System', icon: MessageSquare },
    { href: '/dashboard/admin/support', label: 'Support', icon: MessageSquare },
    { href: '/dashboard/admin/orders', label: 'Aufträge', icon: Briefcase },
    { href: '/dashboard/admin/chats', label: 'Nachrichten', icon: Bot },

    // Administration
    { href: '/dashboard/admin/staff-management', label: 'Mitarbeiter-Verwaltung', icon: UserCheck },
    { href: '/dashboard/admin/email-management', label: 'E-Mail-Verwaltung', icon: Mail },
    { href: '/dashboard/admin/newsletter', label: 'Newsletter', icon: Send },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen border-r bg-gray-100/40 dark:bg-gray-800/40 transition-all duration-300 lg:relative lg:translate-x-0",
      collapsed ? "w-16" : "w-[280px]"
    )}>
      <div className="flex h-full max-h-screen flex-col gap-2">
        {/* Header with Toggle */}
        <div className="flex h-14 items-center border-b px-3 justify-between">
          <Link href="/dashboard/admin" className={cn(
            "flex items-center gap-2 font-semibold transition-all duration-300",
            collapsed ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"
          )}>
            <Shield className="h-6 w-6 text-[#14ad9f] flex-shrink-0" />
            <span className="whitespace-nowrap">Taskilo Admin</span>
          </Link>
          
          {/* Logo für eingeklappte Sidebar */}
          {collapsed && (
            <Link href="/dashboard/admin" className="flex items-center justify-center w-full">
              <Shield className="h-6 w-6 text-[#14ad9f]" />
            </Link>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={() => onToggle?.(!collapsed)}
            className={cn(
              "p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0",
              collapsed && "ml-auto"
            )}
            title={collapsed ? "Sidebar erweitern" : "Sidebar einklappen"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-50 dark:hover:bg-gray-700 relative group',
                  pathname === item.href &&
                    'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-50',
                  collapsed ? 'justify-center' : ''
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  collapsed ? "opacity-0 w-0 overflow-hidden ml-0" : "opacity-100 ml-3"
                )}>
                  {item.label}
                </span>
                
                {/* Tooltip für eingeklappte Sidebar */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

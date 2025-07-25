'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Grid as FiGrid,
  Calendar as FiCalendar,
  User as FiUser,
  Settings as FiSettings,
  MessageSquare as FiMessageSquare,
  DollarSign as FiDollarSign,
  Inbox,
  Package,
  Users,
  CreditCard,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  href?: string;
  badge?: number;
}

interface CompanySidebarProps {
  companyUid: string;
  activeView: string;
  onViewChange: (view: string) => void;
  companyName?: string;
}

export default function CompanySidebar({
  companyUid,
  activeView,
  onViewChange,
  companyName = 'Dashboard',
}: CompanySidebarProps) {
  const pathname = usePathname();

  const sidebarItems: SidebarItem[] = [
    {
      title: 'Übersicht',
      icon: FiGrid,
      value: 'dashboard',
    },
    {
      title: 'Aufträge',
      icon: Package,
      value: 'orders',
      href: `/dashboard/company/${companyUid}/orders/overview`,
    },
    {
      title: 'Posteingang',
      icon: Inbox,
      value: 'inbox',
      href: `/dashboard/company/${companyUid}/inbox`,
    },
    {
      title: 'Kalender',
      icon: FiCalendar,
      value: 'calendar',
    },
    {
      title: 'Finanzen',
      icon: FiDollarSign,
      value: 'finance',
    },
    {
      title: 'Kunden',
      icon: Users,
      value: 'customers',
    },
    {
      title: 'Bewertungen',
      icon: FiMessageSquare,
      value: 'reviews',
    },
    {
      title: 'Analytik',
      icon: BarChart3,
      value: 'analytics',
    },
    {
      title: 'Auszahlungen',
      icon: CreditCard,
      value: 'payouts',
      href: `/dashboard/company/${companyUid}/payouts`,
    },
    {
      title: 'Profil',
      icon: FiUser,
      value: 'profile',
      href: `/dashboard/company/${companyUid}/profile`,
    },
    {
      title: 'Einstellungen',
      icon: FiSettings,
      value: 'settings',
    },
  ];

  const handleItemClick = (item: SidebarItem) => {
    if (item.href) {
      // Für externe Links (andere Routen)
      window.location.href = item.href;
    } else {
      // Für interne Views
      onViewChange(item.value);
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#14ad9f] text-white font-bold text-sm">
            {companyName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 truncate">{companyName}</h1>
            <p className="text-xs text-gray-500">Unternehmen Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {sidebarItems.map(item => {
          const isActive = activeView === item.value;
          const Icon = item.icon;

          return (
            <button
              key={item.value}
              onClick={() => handleItemClick(item)}
              className={cn(
                'flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#14ad9f] text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400'
                )}
              />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-xs font-medium',
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <div className="h-2 w-2 rounded-full bg-green-400"></div>
          <span>Online</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden fixed top-4 left-4 z-40 h-10 w-10 p-0"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Navigation öffnen</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

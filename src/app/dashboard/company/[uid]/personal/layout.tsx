'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Clock,
  Plane,
  BarChart3,
  DollarSign,
  Settings,
  ChevronDown,
  FileText,
  Smartphone,
  Brain,
  MapPin,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PersonalLayoutProps {
  children: React.ReactNode;
}

export default function PersonalLayout({ children }: PersonalLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const companyId = params.uid as string;

  const basePath = `/dashboard/company/${companyId}/personal`;

  const mainNavItems = [
    { href: basePath, label: 'Übersicht', icon: Users },
    { href: `${basePath}/schedule`, label: 'Dienstplan', icon: Calendar },
    { href: `${basePath}/timesheet`, label: 'Zeiterfassung', icon: Clock },
    { href: `${basePath}/absence`, label: 'Abwesenheiten', icon: Plane },
    { href: `${basePath}/analytics`, label: 'Auswertungen', icon: BarChart3 },
  ];

  const moreNavItems = [
    { href: `${basePath}/gps-check`, label: 'GPS-Stempeluhr', icon: MapPin },
    { href: `${basePath}/eau`, label: 'eAU', icon: Shield },
    { href: `${basePath}/costs`, label: 'Personalkosten', icon: DollarSign },
    { href: `${basePath}/payroll`, label: 'Lohnvorbereitung', icon: FileText },
    { href: `${basePath}/ai-planning`, label: 'KI-Planung', icon: Brain },
    { href: `${basePath}/mobile`, label: 'App-Zugang', icon: Smartphone },
    { href: `${basePath}/integrations`, label: 'Integrationen', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === basePath) {
      return pathname === basePath;
    }
    return pathname?.startsWith(href);
  };

  const isMoreActive = moreNavItems.some(item => pathname?.startsWith(item.href));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="px-4 py-2">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    active
                      ? 'bg-[#14ad9f] text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* More Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  isMoreActive
                    ? 'bg-[#14ad9f] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                Mehr
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer',
                          isActive(item.href) && 'bg-[#14ad9f]/10 text-[#14ad9f]'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50">
        {children}
      </div>
    </div>
  );
}

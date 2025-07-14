'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  ShieldCheck,
  Bot,
  MessageSquare,
  Briefcase,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/dashboard/admin', label: t('admin.overview'), icon: Home },
    { href: '/dashboard/admin/companies', label: t('admin.companies'), icon: Users },
    { href: '/dashboard/admin/invites', label: t('admin.invites'), icon: ShieldCheck },
    { href: '/dashboard/admin/support', label: t('admin.support'), icon: MessageSquare },
    { href: '/dashboard/admin/orders', label: t('admin.orders'), icon: Briefcase },
    { href: '/dashboard/admin/chats', label: t('admin.messages'), icon: Bot },
  ];

  return (
    <aside className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 font-semibold">
            <Shield className="h-6 w-6" />
            <span>Taskilo Admin</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
                  pathname === item.href &&
                  'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, FileText, Link2, User, Settings, Zap, Users, BarChart3 } from 'lucide-react';

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const tabs = [
    {
      name: 'Nachrichten',
      href: `/dashboard/company/${uid}/whatsapp`,
      icon: MessageCircle,
      current: pathname === `/dashboard/company/${uid}/whatsapp`,
    },
    {
      name: 'Kontakte',
      href: `/dashboard/company/${uid}/whatsapp/contacts`,
      icon: Users,
      current: pathname?.startsWith(`/dashboard/company/${uid}/whatsapp/contacts`),
    },
    {
      name: 'Vorlagen',
      href: `/dashboard/company/${uid}/whatsapp/templates`,
      icon: FileText,
      current: pathname?.startsWith(`/dashboard/company/${uid}/whatsapp/templates`),
    },
    {
      name: 'Automatisierung',
      href: `/dashboard/company/${uid}/whatsapp/automation`,
      icon: Zap,
      current: pathname?.startsWith(`/dashboard/company/${uid}/whatsapp/automation`),
    },
    {
      name: 'Analytics',
      href: `/dashboard/company/${uid}/whatsapp/analytics`,
      icon: BarChart3,
      current: pathname === `/dashboard/company/${uid}/whatsapp/analytics`,
    },
    {
      name: 'Profil',
      href: `/dashboard/company/${uid}/whatsapp/profile`,
      icon: User,
      current: pathname === `/dashboard/company/${uid}/whatsapp/profile`,
    },
    {
      name: 'Verbindungen',
      href: `/dashboard/company/${uid}/whatsapp/connections`,
      icon: Link2,
      current: pathname === `/dashboard/company/${uid}/whatsapp/connections`,
    },
    {
      name: 'Einstellungen',
      href: `/dashboard/company/${uid}/whatsapp/settings`,
      icon: Settings,
      current: pathname === `/dashboard/company/${uid}/whatsapp/settings`,
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden bg-gray-50">
      {/* Navigation Tabs */}
      <div className="shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-6 py-2">
          {/* WhatsApp Logo */}
          <div className="flex items-center gap-3 pr-6 mr-6 border-r border-gray-200">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-sm">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">WhatsApp Business</span>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                  ${
                    tab.current
                      ? 'bg-[#25D366]/10 text-[#128C7E] shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <tab.icon className={`h-4 w-4 ${tab.current ? 'text-[#25D366]' : ''}`} />
                {tab.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

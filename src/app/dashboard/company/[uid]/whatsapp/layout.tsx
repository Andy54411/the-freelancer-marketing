'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, FileText, Link2 } from 'lucide-react';

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
      name: 'Vorlagen',
      href: `/dashboard/company/${uid}/whatsapp/templates`,
      icon: FileText,
      current: pathname === `/dashboard/company/${uid}/whatsapp/templates`,
    },
    {
      name: 'Verbindungen',
      href: `/dashboard/company/${uid}/whatsapp/connections`,
      icon: Link2,
      current: pathname === `/dashboard/company/${uid}/whatsapp/connections`,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {tabs.map(tab => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  tab.current
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

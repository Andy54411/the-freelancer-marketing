'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Briefcase, FileText, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { use } from 'react';

export default function CareerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ uid: string }>;
}) {
  const pathname = usePathname();
  const { uid } = use(params);

  const tabs = [
    {
      name: 'Jobbörse',
      href: `/dashboard/user/${uid}/career/jobs`,
      icon: Briefcase,
    },
    {
      name: 'Jobfinder',
      href: `/dashboard/user/${uid}/career/jobfinder`,
      icon: Search,
    },
    {
      name: 'Mein Profil',
      href: `/dashboard/user/${uid}/career/profile`,
      icon: User,
    },
    {
      name: 'Meine Bewerbungen',
      href: `/dashboard/user/${uid}/career/applications`,
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Karriere & Jobs</h1>
        <p className="text-muted-foreground">
          Finden Sie Ihren Traumjob oder lassen Sie sich von Unternehmen finden.
        </p>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  isActive
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium'
                )}
              >
                <tab.icon
                  className={cn(
                    isActive ? 'text-teal-500' : 'text-gray-400 group-hover:text-gray-500',
                    '-ml-0.5 mr-2 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}

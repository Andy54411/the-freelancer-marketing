'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLauncher } from './AppLauncher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface SubPageHeaderProps {
  userEmail: string;
  onLogout?: () => void;
  title: string;
  icon: React.ReactNode;
}

export function SubPageHeader({
  userEmail,
  onLogout,
  title,
  icon,
}: SubPageHeaderProps) {
  const pathname = usePathname();
  const userInitial = userEmail?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 sticky top-0 z-50">
      {/* Left Section - Logo & Title */}
      <div className="flex items-center gap-4">
        {/* Back to Mail */}
        <Link 
          href="/webmail" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {/* Taskilo Logo */}
          <Image
            src="/images/taskilo-logo-transparent.png"
            alt="Taskilo"
            width={120}
            height={34}
            className="h-8 w-auto"
          />
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Current Page Icon & Title */}
        <div className="flex items-center gap-2">
          <div className="text-teal-600">
            {icon}
          </div>
          <span className="text-xl font-medium text-gray-700">{title}</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Section - Apps & Profile */}
      <div className="flex items-center gap-2">
        {/* Apps Grid Button */}
        <AppLauncher />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-2 p-0.5 rounded-full hover:bg-gray-200/60 transition-colors"
              aria-label={`Konto: ${userEmail}`}
            >
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center ring-2 ring-transparent hover:ring-teal-200 transition-all">
                <span className="text-white font-medium text-sm">
                  {userInitial}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {userInitial}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userEmail.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
              </div>
            </div>
            <div className="py-2">
              <DropdownMenuItem asChild>
                <Link 
                  href="/webmail" 
                  className={cn(
                    'flex items-center gap-2',
                    pathname === '/webmail' && 'bg-teal-50 text-teal-700'
                  )}
                >
                  Zurueck zu E-Mail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

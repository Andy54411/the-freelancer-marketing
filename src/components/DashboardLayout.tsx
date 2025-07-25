'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

export default function DashboardLayout({ children, sidebar, className }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content */}
      <div className="lg:pl-72">
        <div className={cn('min-h-screen', className)}>
          {/* Mobile Header Spacer */}
          <div className="lg:hidden h-16" />

          {/* Content */}
          <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

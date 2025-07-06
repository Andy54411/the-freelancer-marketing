'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconLayoutDashboard,
    IconClipboardList,
    IconBuilding,
    IconMessageCircle,
} from '@tabler/icons-react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard/admin', icon: IconLayoutDashboard },
    { name: 'Aufträge', href: '/dashboard/admin/orders', icon: IconClipboardList },
    { name: 'Firmen', href: '/dashboard/admin/companies', icon: IconBuilding },
    { name: 'Support', href: '/dashboard/admin/support', icon: IconMessageCircle },
];

function classNames(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white shadow-md">
                <div className="flex h-full flex-col">
                    <div className="flex h-16 flex-shrink-0 items-center border-b px-6">
                        <h1 className="text-xl font-bold text-gray-800">Tasko Admin</h1>
                    </div>
                    <nav className="flex-1 space-y-1 p-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={classNames(
                                    pathname === item.href || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href))
                                        ? 'bg-teal-50 text-[#14ad9f]'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                                    'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                                )}
                            >
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
    );
}

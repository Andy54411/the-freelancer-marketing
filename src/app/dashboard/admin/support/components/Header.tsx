'use client';

import React from 'react';
import NotificationBell from './NotificationBell';
import { FiUser } from 'react-icons/fi';

export default function Header() {
    return (
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
            <div className="w-full flex-1">
                {/* Platz für zukünftige Elemente wie eine Suchleiste */}
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700" title="Admin-Profil">
                    <FiUser className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
            </div>
        </header>
    );
}
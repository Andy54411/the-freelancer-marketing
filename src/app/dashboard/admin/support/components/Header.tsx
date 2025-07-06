'use client';

import React from 'react';
import NotificationBell from './NotificationBell';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Header() {
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Fehler beim Abmelden: ', error);
        }
    };

    return (
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
            <div className="w-full flex-1">
                {/* Platz für zukünftige Elemente wie eine Suchleiste */}
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="overflow-hidden rounded-full"
                        >
                            <FiUser className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Einstellungen</DropdownMenuItem>
                        <DropdownMenuItem>Support</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <FiLogOut className="mr-2 h-4 w-4" />
                            <span>Abmelden</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
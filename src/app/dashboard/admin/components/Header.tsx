'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CircleUserRound, LogOut } from 'lucide-react';

export default function Header() {
    const { user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Nach dem Logout zur Login-Seite weiterleiten.
            router.push('/login');
        } catch (error) {
            console.error("Fehler beim Logout:", error);
        }
    };

    return (
        <header className="flex h-14 items-center justify-end gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <CircleUserRound className="h-5 w-5" />
                        <span className="sr-only">Benutzermenü umschalten</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user ? user.firstName || user.email : 'Mein Account'}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
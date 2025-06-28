// src/components/BaseHeader.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { getAuth, onAuthStateChanged, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { app } from '@/firebase/clients';

const auth = getAuth(app);

interface BaseHeaderProps {
    currentUid?: string;
    menuItems?: { name: string; href: string }[];
    children?: React.ReactNode; // Add children prop
}

export function BaseHeader({ currentUid, menuItems = [], children }: BaseHeaderProps) {
    const [menuState, setMenuState] = useState(false);
    const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout fehlgeschlagen:', error);
        }
    };

    const dynamicMenuItems = menuItems.map(item => ({
        ...item,
        href: item.href.replace('[uid]', currentUid || '')
    }));

    return (
        <header className="w-full">
            <nav
                data-state={menuState && 'active'}
                className="bg-background/50 fixed z-20 w-full border-b backdrop-blur-3xl"
            >
                <div className="mx-auto max-w-6xl px-6">
                    <div className="flex flex-wrap items-center justify-between py-4">
                        <div className="flex items-center justify-between w-full lg:w-auto gap-8">
                            <Link href={currentUid ? `/dashboard/user/${currentUid}` : '/'} className="flex items-center space-x-2" aria-label="Dashboard Home">
                                <Logo />
                            </Link>
                        </div>
                        <div
                            className={cn(
                                'w-full lg:w-fit flex-col lg:flex-row items-end lg:items-center justify-end gap-6 lg:flex'
                            )}
                        >
                            {children} {/* Render children here */}
                            <ModeToggle />
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
}
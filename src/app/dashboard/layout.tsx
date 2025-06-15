// /Users/andystaudinger/Tasko/src/app/dashboard/layout.tsx
import React from 'react';
import { Providers } from '../providers'; // Importiere die Providers aus dem Root-Layout
import Header from '@/components/Header'; // Importiere den Haupt-Header


const DashboardFooter: React.FC = () => {
    // Hier könntest du später den spezifischen Dashboard-Footer-Code einfügen
    // Fürs Erste ein einfacher Platzhalter:
    return (
        <footer className="bg-gray-100 text-gray-600 py-4 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Tasko Dashboard - Alle Rechte vorbehalten.</p>
        </footer>
    );
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers> {/* Stelle sicher, dass Context Provider auch im Dashboard verfügbar sind */}
            <Header /> {/* Verwende den importierten Haupt-Header */}
            <main className="flex-grow container mx-auto px-4 py-8"> {/* flex-grow, damit der Footer unten bleibt */}
                {children}
            </main>
            <DashboardFooter />
        </Providers>
    );
}
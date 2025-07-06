'use client';

export const dynamic = "force-dynamic";

import React from 'react';
import AdminLayout from './support/components/AdminLayout'; // NEU: Importiere das schützende Layout

export default function RootAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Das AdminLayout übernimmt jetzt die gesamte Struktur und die Zugriffsprüfung.
    // Die untergeordneten Seiten (z.B. die Support-Seite, Firmen-Seite etc.)
    // werden als 'children' an das Layout übergeben und somit geschützt.
    return <AdminLayout>{children}</AdminLayout>;
}
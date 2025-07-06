'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { CompanyListData as CompanyData } from '@/lib/companies-list-data';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import Link from 'next/link';

export const columns: ColumnDef<CompanyData>[] = [
    {
        accessorKey: 'companyName',
        header: 'Firma',
    },
    {
        accessorKey: 'email',
        header: 'Kontakt E-Mail',
    },
    {
        accessorKey: 'createdAt',
        header: 'Registriert am',
        cell: ({ row }) => {
            const date = new Date(row.getValue('createdAt'));
            return date.toLocaleDateString('de-DE');
        },
    },
    {
        accessorKey: 'stripeAccountId',
        header: 'Stripe Status',
        cell: ({ row }) => {
            const hasStripeId = !!row.getValue('stripeAccountId');
            return hasStripeId ? (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">Verbunden</Badge>
            ) : (
                <Badge variant="destructive">Nicht verbunden</Badge>
            );
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const company = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Menü öffnen</span>
                            <IconDotsVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/admin/companies/${company.id}`}>Details ansehen</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Account deaktivieren
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
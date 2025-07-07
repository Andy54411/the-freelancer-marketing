'use client';

import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import type { CompanyListData as CompanyData } from '@/lib/companies-list-data';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { IconDotsVertical } from '@tabler/icons-react';
import { deactivateCompany } from '../lib/actions'; // Import the server action

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
            const router = useRouter();
            const company = row.original;

            const handleViewDetails = () => {
                router.push(`/dashboard/admin/companies/${company.id}`);
            };

            const handleDeactivate = async () => {
                if (confirm(`Möchten Sie das Konto für "${company.companyName}" wirklich deaktivieren?`)) {
                    const result = await deactivateCompany(company.id);
                    if (result.error) {
                        alert(`Fehler: ${result.error}`);
                    } else {
                        alert('Konto erfolgreich deaktiviert.');
                    }
                }
            };

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Menü öffnen</span>
                            <IconDotsVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleViewDetails}>
                            Details ansehen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeactivate} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            Account deaktivieren
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
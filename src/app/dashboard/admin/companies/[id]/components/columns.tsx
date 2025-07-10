'use client';

import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import type { CompanyListData as CompanyData } from '@/lib/companies-list-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
            return <ActionCell company={company} />;
        },
    },
];

function ActionCell({ company }: { company: any }) {
    const router = useRouter();

    const handleViewDetails = () => {
        router.push(`/dashboard/admin/companies/${company.id}`);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleViewDetails}>
            Details ansehen
        </Button>
    );
}
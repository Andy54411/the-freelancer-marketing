'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react';

export interface PaymentAccount {
  id: string;
  name: string;
  iban: string;
  bic: string;
  bankName: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT';
  active: boolean;
}

interface PaymentAccountsTabProps {
  accounts: PaymentAccount[];
  onEdit: (account: PaymentAccount) => void;
  onDelete: (account: PaymentAccount) => void;
}

export default function PaymentAccountsTab({
  accounts,
  onEdit,
  onDelete,
}: PaymentAccountsTabProps) {
  const getPaymentAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'CHECKING':
        return 'Girokonto';
      case 'SAVINGS':
        return 'Sparkonto';
      case 'CREDIT':
        return 'Kreditkonto';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zahlungskonten</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kontoname</TableHead>
              <TableHead>IBAN</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell>
                <TableCell className="font-mono">{account.iban}</TableCell>
                <TableCell>{account.bankName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{getPaymentAccountTypeLabel(account.type)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={account.active ? 'default' : 'secondary'}>
                    {account.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(account)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(account)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

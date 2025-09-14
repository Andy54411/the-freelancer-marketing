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

export interface BookingAccount {
  id: string;
  number: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
  automaticBooking: boolean;
}

interface BookingAccountsTabProps {
  accounts: BookingAccount[];
  onEdit: (account: BookingAccount) => void;
  onDelete: (account: BookingAccount) => void;
}

export default function BookingAccountsTab({
  accounts,
  onEdit,
  onDelete,
}: BookingAccountsTabProps) {
  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'Aktiva';
      case 'LIABILITY':
        return 'Passiva';
      case 'INCOME':
        return 'Ertrag';
      case 'EXPENSE':
        return 'Aufwand';
      default:
        return type;
    }
  };

  const getAccountTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'default';
      case 'LIABILITY':
        return 'secondary';
      case 'INCOME':
        return 'default';
      case 'EXPENSE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buchungskonten</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kontonummer</TableHead>
              <TableHead>Kontoname</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Automatische Buchung</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => (
              <TableRow key={account.id}>
                <TableCell className="font-mono">{account.number}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell>
                  <Badge variant={getAccountTypeBadgeVariant(account.type) as any}>
                    {getAccountTypeLabel(account.type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={account.automaticBooking ? 'default' : 'secondary'}>
                    {account.automaticBooking ? 'Ja' : 'Nein'}
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

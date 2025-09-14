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
import { Pencil, MoreHorizontal } from 'lucide-react';

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'PAYPAL' | 'OTHER';
  active: boolean;
  defaultAccount?: string;
}

interface PaymentMethodsTabProps {
  methods: PaymentMethod[];
  onEdit: (method: PaymentMethod) => void;
  onToggleActive: (method: PaymentMethod) => void;
}

export default function PaymentMethodsTab({
  methods,
  onEdit,
  onToggleActive,
}: PaymentMethodsTabProps) {
  const getPaymentMethodLabel = (type: string) => {
    switch (type) {
      case 'BANK_TRANSFER':
        return 'Überweisung';
      case 'CASH':
        return 'Bar';
      case 'CARD':
        return 'Karte';
      case 'PAYPAL':
        return 'PayPal';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zahlungsmethoden</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Standard-Konto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map(method => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{getPaymentMethodLabel(method.type)}</Badge>
                </TableCell>
                <TableCell className="font-mono">{method.defaultAccount || '-'}</TableCell>
                <TableCell>
                  <Badge variant={method.active ? 'default' : 'secondary'}>
                    {method.active ? 'Aktiv' : 'Inaktiv'}
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
                      <DropdownMenuItem onClick={() => onEdit(method)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleActive(method)}>
                        {method.active ? 'Deaktivieren' : 'Aktivieren'}
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

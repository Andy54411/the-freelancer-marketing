'use client';

import React, { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';

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
  onAdd?: (account: Omit<PaymentAccount, 'id'>) => Promise<void>;
  companyId: string;
}

export default function PaymentAccountsTab({
  accounts,
  onEdit,
  onDelete,
  onAdd,
  companyId: _companyId,
}: PaymentAccountsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    iban: '',
    bic: '',
    bankName: '',
    type: 'CHECKING' as 'CHECKING' | 'SAVINGS' | 'CREDIT',
    active: true,
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.iban || !formData.bankName) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd?.(formData);
      toast.success('Zahlungskonto erfolgreich hinzugefügt');
      setShowAddDialog(false);
      setFormData({
        name: '',
        iban: '',
        bic: '',
        bankName: '',
        type: 'CHECKING',
        active: true,
      });
    } catch (error) {
      console.error('Error adding payment account:', error);
      toast.error('Fehler beim Hinzufügen des Zahlungskontos');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Zahlungskonten</CardTitle>
          <Button onClick={() => setShowAddDialog(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Konto hinzufügen
          </Button>
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

      {/* Add Payment Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zahlungskonto hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Bankkonto für Ihre Zahlungen hinzu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Kontoname *</Label>
                <Input
                  id="name"
                  placeholder="z.B. Geschäftskonto"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Kontotyp *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'CHECKING' | 'SAVINGS' | 'CREDIT') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Girokonto</SelectItem>
                    <SelectItem value="SAVINGS">Sparkonto</SelectItem>
                    <SelectItem value="CREDIT">Kreditkonto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bankname *</Label>
              <Input
                id="bankName"
                placeholder="z.B. Sparkasse"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN *</Label>
                <Input
                  id="iban"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  value={formData.iban}
                  onChange={e => setFormData({ ...formData, iban: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bic">BIC</Label>
                <Input
                  id="bic"
                  placeholder="COBADEFFXXX"
                  value={formData.bic}
                  onChange={e => setFormData({ ...formData, bic: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting ? 'Wird gespeichert...' : 'Konto hinzufügen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

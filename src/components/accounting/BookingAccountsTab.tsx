'use client';

import React, { useState, useEffect } from 'react';
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
import { Pencil, Trash2, MoreHorizontal, Plus } from 'lucide-react';
import {
  BookingAccountService,
  BookingAccount,
  BookingAccountData,
} from '@/services/bookingAccountService';
import { toast } from 'sonner';
import BookingAccountModal from './BookingAccountModal';

interface BookingAccountsTabProps {
  companyUid: string;
}

export default function BookingAccountsTab({ companyUid }: BookingAccountsTabProps) {
  const [accounts, setAccounts] = useState<BookingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BookingAccount | null>(null);

  // Lade Buchungskonten aus Firebase
  useEffect(() => {
    const loadBookingAccounts = async () => {
      if (!companyUid) return;

      try {
        setLoading(true);
        const bookingAccounts = await BookingAccountService.getBookingAccounts(companyUid);
        setAccounts(bookingAccounts);

        // DEAKTIVIERT: Keine automatische Erstellung von Standard-Konten mehr
        // if (bookingAccounts.length === 0) {
        //   console.log('Erstelle Standard-Buchungskonten für Company:', companyUid);
        //   const defaultAccounts = await BookingAccountService.createDefaultBookingAccounts(companyUid);
        //   setAccounts(defaultAccounts);
        //   toast.success('Standard-Buchungskonten wurden erstellt');
        // }
      } catch (error) {
        console.error('Fehler beim Laden der Buchungskonten:', error);
        toast.error('Fehler beim Laden der Buchungskonten');
      } finally {
        setLoading(false);
      }
    };

    loadBookingAccounts();
  }, [companyUid]);

  const handleAdd = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (account: BookingAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleModalSave = async (accountData: BookingAccountData) => {
    try {
      if (editingAccount) {
        // Bearbeiten
        await BookingAccountService.updateBookingAccount(
          companyUid,
          editingAccount.id,
          accountData
        );

        // Lokalen State aktualisieren
        setAccounts(prev =>
          prev.map(acc => (acc.id === editingAccount.id ? { ...acc, ...accountData } : acc))
        );

        toast.success('Buchungskonto wurde aktualisiert');
      } else {
        // Neu erstellen
        const newAccount = await BookingAccountService.createBookingAccount(
          companyUid,
          accountData
        );

        // Lokalen State aktualisieren
        setAccounts(prev => [...prev, newAccount]);

        toast.success('Buchungskonto wurde erstellt');
      }

      handleModalClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern des Buchungskontos');
    }
  };

  const handleDelete = async (account: BookingAccount) => {
    if (
      !confirm(
        `Möchten Sie das Buchungskonto "${account.number} - ${account.name}" wirklich löschen?`
      )
    ) {
      return;
    }

    try {
      await BookingAccountService.deleteBookingAccount(companyUid, account.id);

      // Lokalen State aktualisieren
      setAccounts(prev => prev.filter(acc => acc.id !== account.id));

      toast.success('Buchungskonto wurde gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen des Buchungskontos');
    }
  };

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        'Möchtest du wirklich ALLE Buchungskonten löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
      )
    ) {
      return;
    }

    try {
      await BookingAccountService.deleteAllBookingAccounts(companyUid);
      setAccounts([]);
      toast.success('Alle Buchungskonten wurden gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen aller Konten:', error);
      toast.error('Fehler beim Löschen aller Buchungskonten');
    }
  };

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Buchungskonten werden geladen...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Buchungskonten</CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleDeleteAll} variant="destructive" size="sm">
              Alle löschen
            </Button>
            <Button onClick={handleAdd} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
              <Plus className="h-4 w-4 mr-2" />
              Buchungskonto hinzufügen
            </Button>
          </div>
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
                    <Badge
                      className={`${
                        account.type === 'ASSET'
                          ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white'
                          : account.type === 'LIABILITY'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : account.type === 'INCOME'
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : account.type === 'EXPENSE'
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {getAccountTypeLabel(account.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${
                        account.automaticBooking
                          ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white'
                          : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                    >
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
                        <DropdownMenuItem onClick={() => handleEdit(account)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(account)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Noch keine Buchungskonten vorhanden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BookingAccountModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        account={editingAccount}
        companyUid={companyUid}
      />
    </>
  );
}

// Export BookingAccount interface für andere Components
export type { BookingAccount };

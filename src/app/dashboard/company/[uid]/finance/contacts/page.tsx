'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerService } from '@/services/customerService';
import { Customer } from '@/components/finance/AddCustomerModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  Download,
  Plus,
  Check,
  Edit,
  Eye,
  Mail,
  Phone,
  MapPin,
  Trash2,
  FileText,
  Receipt,
  Archive,
  History,
  CheckCircle,
  AlertCircle,
  User,
  FileIcon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface ContactsPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function ContactsPage({ params }: ContactsPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [contacts, setContacts] = useState<(Customer & { type: 'customer' | 'supplier' })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'customers' | 'suppliers'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'customerNumber' | 'totalAmount' | 'createdAt'>(
    'name'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Kontakte laden
  useEffect(() => {
    loadContacts();
  }, [resolvedParams.uid]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      // Lade sowohl Kunden als auch Lieferanten
      const [customers, suppliers] = await Promise.all([
        CustomerService.getCustomers(resolvedParams.uid),
        CustomerService.getSuppliers(resolvedParams.uid),
      ]);

      // Kombiniere und markiere den Typ
      const allContacts = [
        ...customers.map(c => ({ ...c, type: 'customer' as const })),
        ...suppliers.map(s => ({ ...s, type: 'supplier' as const })),
      ];

      setContacts(allContacts);
    } catch (error) {
      console.error('Fehler beim Laden der Kontakte:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  };

  // Kontakte filtern und sortieren
  const filteredAndSortedContacts = contacts
    .filter(contact => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'customers' && contact.type === 'customer') ||
        (statusFilter === 'suppliers' && contact.type === 'supplier');

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'customerNumber':
          comparison = a.customerNumber.localeCompare(b.customerNumber);
          break;
        case 'totalAmount':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Statistiken berechnen
  const stats = {
    total: contacts.length,
    customers: contacts.filter(c => c.type === 'customer').length,
    suppliers: contacts.filter(c => c.type === 'supplier').length,
    totalRevenue: contacts
      .filter(c => c.type === 'customer')
      .reduce((sum, c) => sum + (c.totalAmount || 0), 0),
  };

  // Kontakt löschen
  const handleDeleteContact = async (contact: Customer & { type: 'customer' | 'supplier' }) => {
    if (!confirm(`Möchten Sie "${contact.name}" wirklich löschen?`)) return;

    try {
      await CustomerService.deleteCustomer(resolvedParams.uid, contact.id);
      toast.success(`${contact.name} wurde gelöscht`);
      loadContacts();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen des Kontakts');
    }
  };

  // Export-Funktionen
  const handleExportContacts = async () => {
    try {
      const csvData = await CustomerService.exportCustomersCSV(resolvedParams.uid);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `kontakte-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Kontakte erfolgreich exportiert');
    } catch (error) {
      console.error('Export-Fehler:', error);
      toast.error('Fehler beim Exportieren der Kontakte');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kontakte verwalten</h1>
            <p className="text-gray-600 mt-1">
              Verwalten Sie Ihre Kunden und Lieferanten an einem Ort
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportContacts}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportieren
            </Button>
            <Button
              onClick={() =>
                router.push(`/dashboard/company/${resolvedParams.uid}/finance/contacts/new`)
              }
              className="flex items-center gap-2 bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Plus className="h-4 w-4" />
              Neuer Kontakt
            </Button>
          </div>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gesamt</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kunden</p>
                  <p className="text-2xl font-bold">{stats.customers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lieferanten</p>
                  <p className="text-2xl font-bold">{stats.suppliers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#14ad9f]/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-[#14ad9f]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gesamtumsatz</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter und Suche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Nach Name, Kundennummer oder E-Mail suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kontakte</SelectItem>
                  <SelectItem value="customers">Nur Kunden</SelectItem>
                  <SelectItem value="suppliers">Nur Lieferanten</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nach Name</SelectItem>
                  <SelectItem value="customerNumber">Nach Nummer</SelectItem>
                  <SelectItem value="totalAmount">Nach Umsatz</SelectItem>
                  <SelectItem value="createdAt">Nach Datum</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kontakte Tabelle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kontakte ({filteredAndSortedContacts.length})
            </CardTitle>
            <CardDescription>Übersicht aller Ihrer Geschäftskontakte</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAndSortedContacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Keine Kontakte gefunden' : 'Noch keine Kontakte'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? 'Versuchen Sie einen anderen Suchbegriff.'
                    : 'Erstellen Sie Ihren ersten Kontakt, um zu beginnen.'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() =>
                      router.push(`/dashboard/company/${resolvedParams.uid}/finance/contacts/new`)
                    }
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ersten Kontakt erstellen
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Kontaktdaten</TableHead>
                      <TableHead className="text-right">Umsatz/Ausgaben</TableHead>
                      <TableHead className="text-right">Rechnungen</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedContacts.map(contact => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                contact.type === 'customer' ? 'bg-green-100' : 'bg-orange-100'
                              }`}
                            >
                              {contact.type === 'customer' ? (
                                <User
                                  className={`h-4 w-4 ${
                                    contact.type === 'customer'
                                      ? 'text-green-600'
                                      : 'text-orange-600'
                                  }`}
                                />
                              ) : (
                                <Building2 className="h-4 w-4 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{contact.name}</p>
                              <p className="text-sm text-gray-500">{contact.customerNumber}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={contact.type === 'customer' ? 'default' : 'secondary'}
                            className={
                              contact.type === 'customer'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : 'bg-orange-100 text-orange-800 hover:bg-orange-100'
                            }
                          >
                            {contact.type === 'customer' ? 'Kunde' : 'Lieferant'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(contact.totalAmount || 0)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="text-sm text-gray-600">{contact.totalInvoices || 0}</div>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                •••
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/company/${resolvedParams.uid}/finance/contacts/${contact.id}`
                                  )
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ansehen
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/company/${resolvedParams.uid}/finance/contacts/${contact.id}/edit`
                                  )
                                }
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/company/${resolvedParams.uid}/finance/invoices/create?customerId=${contact.id}`
                                  )
                                }
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Rechnung erstellen
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/company/${resolvedParams.uid}/finance/quotes/create?customerId=${contact.id}`
                                  )
                                }
                              >
                                <FileIcon className="h-4 w-4 mr-2" />
                                Angebot erstellen
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteContact(contact)}
                                className="text-red-600 hover:text-red-700"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

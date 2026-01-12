'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileCheck,
  Plus,
  Search,
  Edit,
  Eye,
  Send,
  MoreHorizontal,
  Download,
  Loader2,
  Calendar,
  FileText,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, where, orderBy as fbOrderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface OrderConfirmation {
  id: string;
  confirmationNumber: string;
  quoteId?: string;
  quoteNumber?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  date: Date;
  validUntil?: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

const STATUS_CONFIG = {
  draft: { label: 'Entwurf', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Gesendet', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Bestätigt', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Storniert', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
};

export default function OrderConfirmationsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [confirmations, setConfirmations] = useState<OrderConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return format(d, 'dd.MM.yyyy', { locale: de });
  };

  // Auftragsbestätigungen laden
  const loadConfirmations = async () => {
    try {
      setLoading(true);
      const confirmationsRef = collection(db, 'companies', uid, 'orderConfirmations');
      const q = query(confirmationsRef);
      const snapshot = await getDocs(q);

      const data: OrderConfirmation[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          confirmationNumber: d.confirmationNumber || '',
          quoteId: d.quoteId,
          quoteNumber: d.quoteNumber,
          customerId: d.customerId || '',
          customerName: d.customerName || d.customer?.name || '',
          customerEmail: d.customerEmail || d.customer?.email,
          date: d.date?.toDate ? d.date.toDate() : new Date(d.date),
          validUntil: d.validUntil?.toDate ? d.validUntil.toDate() : d.validUntil ? new Date(d.validUntil) : undefined,
          status: d.status || 'draft',
          items: d.items || [],
          subtotal: d.subtotal || 0,
          vatAmount: d.vatAmount || 0,
          total: d.total || d.grandTotal || 0,
          notes: d.notes,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : undefined,
        };
      });

      // Sortierung im Client
      data.sort((a, b) => {
        const dateA = a.createdAt.getTime();
        const dateB = b.createdAt.getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });

      setConfirmations(data);
    } catch (error) {
      toast.error('Fehler beim Laden der Auftragsbestätigungen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid && user) {
      loadConfirmations();
    }
  }, [uid, user, sortOrder]);

  // Filtern
  const filteredConfirmations = confirmations.filter(c => {
    const matchesSearch =
      c.confirmationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.quoteNumber && c.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistiken
  const stats = {
    total: confirmations.length,
    confirmed: confirmations.filter(c => c.status === 'confirmed').length,
    pending: confirmations.filter(c => c.status === 'sent').length,
    totalValue: confirmations
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + c.total, 0),
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500">Keine Berechtigung</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-[#14ad9f]" />
            Auftragsbestätigungen
          </h1>
          <p className="text-gray-500 mt-1">
            Verwalten Sie Ihre Auftragsbestätigungen
          </p>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/company/${uid}/finance/order-confirmations/create`)}
          className="bg-[#14ad9f] hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Auftragsbestätigung
        </Button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Bestätigt</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FileCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ausstehend</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gesamtwert (bestätigt)</p>
                <p className="text-2xl font-bold text-[#14ad9f]">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <Calendar className="h-6 w-6 text-[#14ad9f]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter und Suche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Suche nach Nummer, Kunde..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="sent">Gesendet</SelectItem>
                <SelectItem value="confirmed">Bestätigt</SelectItem>
                <SelectItem value="cancelled">Storniert</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'desc' ? 'Neueste zuerst' : 'Älteste zuerst'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
            </div>
          ) : filteredConfirmations.length === 0 ? (
            <div className="text-center py-20">
              <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Auftragsbestätigungen
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Keine Ergebnisse für Ihre Suche'
                  : 'Erstellen Sie Ihre erste Auftragsbestätigung'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button
                  onClick={() => router.push(`/dashboard/company/${uid}/finance/order-confirmations/create`)}
                  className="bg-[#14ad9f] hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Auftragsbestätigung
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Angebot</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfirmations.map(confirmation => (
                  <TableRow
                    key={confirmation.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      router.push(`/dashboard/company/${uid}/finance/order-confirmations/${confirmation.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      {confirmation.confirmationNumber}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {confirmation.quoteNumber || '-'}
                    </TableCell>
                    <TableCell>{confirmation.customerName}</TableCell>
                    <TableCell>{formatDate(confirmation.date)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[confirmation.status].color}>
                        {STATUS_CONFIG[confirmation.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(confirmation.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/dashboard/company/${uid}/finance/order-confirmations/${confirmation.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ansehen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              router.push(`/dashboard/company/${uid}/finance/order-confirmations/${confirmation.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              toast.info('PDF-Download wird vorbereitet...');
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            PDF herunterladen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              toast.info('E-Mail-Versand wird geöffnet...');
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Per E-Mail senden
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

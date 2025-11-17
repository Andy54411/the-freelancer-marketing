'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  Eye,
  Edit,
  Trash2,
  X,
  Mail,
  Download,
  MoreHorizontal,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Copy } from
'lucide-react';
import { Quote } from '@/services/quoteService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface QuoteListViewProps {
  quotes: Quote[];
  onRefresh?: () => void;
  companyId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

export function QuoteListView({
  quotes: initialQuotes,
  onRefresh,
  companyId,
  activeTab,
  setActiveTab,
  showFilters,
  setShowFilters
}: QuoteListViewProps) {
  const [quotes, _setQuotes] = useState<Quote[]>(initialQuotes);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'validUntil' | 'number' | 'date' | 'total'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  // Debug: Log incoming quotes and fix any with empty IDs
  useEffect(() => {








    // CRITICAL FIX: If we still receive quotes with empty IDs, warn the user
    const quotesWithEmptyId = initialQuotes.filter((q) => !q.id || q.id.trim() === '');
    if (quotesWithEmptyId.length > 0) {
      console.error('❌ Still receiving quotes with empty IDs:', quotesWithEmptyId);
      toast.error(`⚠️ ${quotesWithEmptyId.length} Angebote haben keine gültige ID. Bitte kontaktieren Sie den Support.`);
    }
  }, [initialQuotes]);

  const handleSort = (field: 'validUntil' | 'number' | 'date' | 'total') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const isExpired = (quote: Quote) => {
    const validUntil = new Date(quote.validUntil || quote.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validUntil.setHours(0, 0, 0, 0);
    return validUntil < today && quote.status !== 'accepted';
  };

  const getStatusColor = (status: string, quote: Quote) => {
    if (isExpired(quote) && status !== 'accepted') {
      return 'bg-red-100 text-red-800 border-red-200';
    }

    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string, quote: Quote) => {
    if (isExpired(quote) && status !== 'accepted') {
      return 'Abgelaufen';
    }

    switch (status) {
      case 'draft':
        return 'Entwurf';
      case 'sent':
        return 'Versendet';
      case 'accepted':
        return 'Angenommen';
      case 'rejected':
        return 'Abgelehnt';
      case 'cancelled':
        return 'Storniert';
      case 'expired':
        return 'Abgelaufen';
      default:
        return status;
    }
  };

  // Filter quotes based on active tab
  const getFilteredQuotes = (tab: string) => {
    let filtered = quotes;

    // Tab-based filtering
    switch (tab) {
      case 'draft':
        filtered = quotes.filter((q) => q.status === 'draft');
        break;
      case 'sent':
        filtered = quotes.filter((q) => q.status === 'sent');
        break;
      case 'accepted':
        filtered = quotes.filter((q) => q.status === 'accepted');
        break;
      case 'expired':
        filtered = quotes.filter((q) => isExpired(q));
        break;
      case 'cancelled':
        filtered = quotes.filter((q) => q.status === 'cancelled');
        break;
      default:
        // 'all' tab shows all quotes
        break;
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (quote) =>
        quote.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Amount filter
    if (minAmount) {
      filtered = filtered.filter((quote) => quote.total >= parseFloat(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter((quote) => quote.total <= parseFloat(maxAmount));
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter((quote) => new Date(quote.date) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((quote) => new Date(quote.date) <= new Date(endDate));
    }

    // Contact filter
    if (selectedContact) {
      filtered = filtered.filter((quote) =>
      quote.customerName?.toLowerCase().includes(selectedContact.toLowerCase())
      );
    }

    // Sort
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'number':
          aValue = a.number || '';
          bValue = b.number || '';
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'validUntil':
          aValue = new Date(a.validUntil || a.date);
          bValue = new Date(b.validUntil || b.date);
          break;
        case 'total':
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleEdit = (quote: Quote, index?: number) => {
    const reliableId = getReliableQuoteId(quote, index || 0);
    if (!reliableId) {
      toast.error('Fehler: Angebot hat keine gültige ID. Kann nicht bearbeitet werden.');
      return;
    }
    router.push(`/dashboard/company/${companyId}/finance/quotes/${reliableId}/edit`);
  };

  // Helper function to get a reliable quote ID
  const getReliableQuoteId = (quote: Quote, index: number): string | null => {
    // First try the quote.id
    if (quote.id && quote.id.trim() !== '') {
      return quote.id;
    }

    // If quote has a number, try to find it by number in the company's quotes
    // This is a fallback for when we know the quote exists but has empty ID
    if (quote.number) {
      console.warn('🔧 Quote has empty ID, but has number:', quote.number);
      // For now, return null to trigger error - we need the actual Firestore doc ID
      return null;
    }

    return null;
  };

  const handleView = (quote: Quote, index?: number) => {
    const reliableId = getReliableQuoteId(quote, index || 0);











    if (!reliableId) {
      console.error('❌ Quote has no reliable ID!', {
        quote,
        allQuotes: initialQuotes.map((q) => ({ id: q.id, number: q.number, customerName: q.customerName }))
      });
      toast.error('Fehler: Angebot hat keine gültige ID. Das ist ein Datenintegritätsproblem. Bitte kontaktieren Sie den Support.');
      return;
    }

    router.push(`/dashboard/company/${companyId}/finance/quotes/${reliableId}`);
  };

  const handleConvertToInvoice = (quote: Quote, index?: number) => {
    const reliableId = getReliableQuoteId(quote, index || 0);
    if (!reliableId) {
      toast.error('Fehler: Angebot hat keine gültige ID. Kann nicht zu Rechnung umgewandelt werden.');
      return;
    }
    router.push(`/dashboard/company/${companyId}/finance/invoices/create?quoteId=${reliableId}`);
  };

  const handleDuplicate = (quote: Quote, index?: number) => {
    const reliableId = getReliableQuoteId(quote, index || 0);
    if (!reliableId) {
      toast.error('Fehler: Angebot hat keine gültige ID. Kann nicht dupliziert werden.');
      return;
    }
    router.push(`/dashboard/company/${companyId}/finance/quotes/create?duplicateId=${reliableId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedContact('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
  };

  const getTabCounts = () => {
    const all = quotes.length;
    const draft = quotes.filter((q) => q.status === 'draft').length;
    const sent = quotes.filter((q) => q.status === 'sent').length;
    const accepted = quotes.filter((q) => q.status === 'accepted').length;
    const expired = quotes.filter((q) => isExpired(q)).length;
    const cancelled = quotes.filter((q) => q.status === 'cancelled').length;

    return { all, draft, sent, accepted, expired, cancelled };
  };

  const tabCounts = getTabCounts();
  const filteredQuotes = getFilteredQuotes(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Angebote</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Angebote und wandeln Sie sie in Rechnungen um.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2">

            <Filter className="h-4 w-4" />
            Filter
            {showFilters && <X className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/company/${companyId}/finance/quotes/create`)}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">

            <FileText className="h-4 w-4 mr-2" />
            Neues Angebot
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters &&
      <div className="bg-white p-4 rounded-lg border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Filter</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Alle Filter zurücksetzen
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                placeholder="Angebotsnummer, Kunde..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10" />

              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
              <Input
              placeholder="Kundenname"
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)} />

            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betrag von</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                type="number"
                placeholder="0,00"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="pl-10" />

              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betrag bis</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                type="number"
                placeholder="0,00"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="pl-10" />

              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum von</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10" />

              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum bis</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10" />

              </div>
            </div>
          </div>
        </div>
      }

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            Alle ({tabCounts.all})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Entwürfe ({tabCounts.draft})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Versendet ({tabCounts.sent})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Angenommen ({tabCounts.accepted})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Abgelaufen ({tabCounts.expired})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Storniert ({tabCounts.cancelled})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Table */}
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('number')}>

                    <div className="flex items-center gap-2">
                      Angebotsnummer
                      {sortField === 'number' &&
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      }
                    </div>
                  </TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('date')}>

                    <div className="flex items-center gap-2">
                      Angebotsdatum
                      {sortField === 'date' &&
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      }
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('validUntil')}>

                    <div className="flex items-center gap-2">
                      Gültig bis
                      {sortField === 'validUntil' &&
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      }
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('total')}>

                    <div className="flex items-center justify-end gap-2">
                      Gesamtbetrag
                      {sortField === 'total' &&
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      }
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 ?
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Keine Angebote gefunden
                    </TableCell>
                  </TableRow> :

                filteredQuotes.map((quote, index) =>
                <TableRow
                  key={quote.id || `quote-${index}-${quote.number || ''}`}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleView(quote, index)}>

                      <TableCell className="font-medium">
                        {quote.number || 'Ohne Nummer'}
                      </TableCell>
                      <TableCell>{quote.customerName || 'Unbekannter Kunde'}</TableCell>
                      <TableCell>{formatDate(quote.date.toISOString())}</TableCell>
                      <TableCell>
                        <span className={isExpired(quote) ? 'text-red-600 font-medium' : ''}>
                          {formatDate((quote.validUntil || quote.date).toISOString())}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.total || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge
                      variant="outline"
                      className={getStatusColor(quote.status || 'draft', quote)}>

                          {getStatusText(quote.status || 'draft', quote)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleView(quote, index);
                        }}>
                              <Eye className="mr-2 h-4 w-4" />
                              Anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(quote, index);
                        }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(quote, index);
                        }}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplizieren
                            </DropdownMenuItem>
                            {quote.status === 'accepted' &&
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToInvoice(quote, index);
                        }}>
                                <FileText className="mr-2 h-4 w-4" />
                                Zu Rechnung umwandeln
                              </DropdownMenuItem>
                        }
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                )
                }
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>);

}
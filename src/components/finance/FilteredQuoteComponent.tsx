'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Euro,
  Loader2,
  Search,
  Send,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType } from '@/services/quoteService';

interface FilteredQuoteComponentProps {
  companyId: string;
  statusFilter: 'draft' | 'sent' | 'accepted' | 'rejected';
  title: string;
  description: string;
}

export function FilteredQuoteComponent({ 
  companyId, 
  statusFilter, 
  title, 
  description 
}: FilteredQuoteComponentProps) {
  const [quotes, setQuotes] = useState<QuoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Status-Konfiguration
  const statusConfig = {
    draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
    sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
    accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
    expired: { label: 'Abgelaufen', className: 'bg-orange-100 text-orange-800' },
  };

  // Laden der Angebote
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        setLoading(true);
        const quotesData = await QuoteService.getQuotes(companyId);
        // Filtere nach Status
        const filteredQuotes = quotesData.filter(quote => quote.status === statusFilter);
        setQuotes(filteredQuotes);
      } catch (error) {
        console.error('Error loading quotes:', error);
        toast.error('Angebote konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    loadQuotes();

    // Real-time Updates
    const unsubscribe = QuoteService.subscribeToQuotes(companyId, (quotesData) => {
      const filteredQuotes = quotesData.filter(quote => quote.status === statusFilter);
      setQuotes(filteredQuotes);
    });

    return () => unsubscribe();
  }, [companyId, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | { seconds: number, nanoseconds: number }) => {
    const dateObj = date instanceof Date ? date : new Date(date.seconds * 1000);
    return dateObj.toLocaleDateString('de-DE');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredQuotes = quotes.filter(
    quote =>
      quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewQuote = (quote: QuoteType) => {
    window.location.href = `/dashboard/company/${companyId}/finance/quotes/${quote.id}`;
  };

  const handleEditQuote = (quote: QuoteType) => {
    window.location.href = `/dashboard/company/${companyId}/finance/quotes/${quote.id}/edit`;
  };

  const handleDeleteQuote = async (quote: QuoteType) => {
    if (confirm(`Möchten Sie das Angebot ${quote.number} wirklich löschen?`)) {
      try {
        await QuoteService.deleteQuote(companyId, quote.id);
        toast.success(`Angebot ${quote.number} wurde gelöscht`);
      } catch (error) {
        console.error('Error deleting quote:', error);
        toast.error('Fehler beim Löschen des Angebots');
      }
    }
  };

  const handleSendQuote = async (quote: QuoteType) => {
    try {
      await QuoteService.updateQuote(companyId, quote.id, { status: 'sent' });
      toast.success(`Angebot ${quote.number} wurde versendet`);
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Fehler beim Versenden des Angebots');
    }
  };

  const handleConvertToInvoice = async (quote: QuoteType) => {
    try {
      await QuoteService.convertToInvoice(companyId, quote.id);
      toast.success(`Angebot ${quote.number} wird in Rechnung umgewandelt`);
    } catch (error) {
      console.error('Error converting quote:', error);
      toast.error('Fehler beim Umwandeln in Rechnung');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <Button 
          onClick={() => window.location.href = `/dashboard/company/${companyId}/finance/quotes/create`}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Angebot
        </Button>
      </div>

      {/* Suchleiste */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Angebote durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Angebotsliste */}
      <Card>
        <CardHeader>
          <CardTitle>Angebote ({filteredQuotes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Angebote gefunden
              </h3>
              <p className="text-gray-600 mb-4">
                {statusFilter === 'draft' && 'Es gibt noch keine Entwürfe.'}
                {statusFilter === 'sent' && 'Es wurden noch keine Angebote versendet.'}
                {statusFilter === 'accepted' && 'Es wurden noch keine Angebote angenommen.'}
                {statusFilter === 'rejected' && 'Es wurden noch keine Angebote abgelehnt.'}
              </p>
              <Button 
                onClick={() => window.location.href = `/dashboard/company/${companyId}/finance/quotes/create`}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Erstes Angebot erstellen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map(quote => (
                <div key={quote.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{quote.number}</h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <p className="text-gray-600 mb-1">
                        <strong>Kunde:</strong> {quote.customerName}
                      </p>
                      <p className="text-gray-600 mb-1">
                        <strong>Datum:</strong> {formatDate(quote.date)}
                      </p>
                      <p className="text-gray-600">
                        <strong>Betrag:</strong> {formatCurrency(quote.total)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewQuote(quote)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditQuote(quote)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {quote.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleSendQuote(quote)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      {quote.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToInvoice(quote)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteQuote(quote)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
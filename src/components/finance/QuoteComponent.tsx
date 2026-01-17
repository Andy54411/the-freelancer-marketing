'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
// Tabs entfernt: Übersicht-Tab wird nicht mehr benötigt
import {
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Search,
  Send,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuoteService, Quote as QuoteType } from '@/services/quoteService';

interface QuoteComponentProps {
  companyId: string;
}

export function QuoteComponent({ companyId }: QuoteComponentProps) {
  const [quotes, setQuotes] = useState<QuoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [_selectedQuote, _setSelectedQuote] = useState<QuoteType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    draft: 0,
    expired: 0,
    totalValue: 0,
    acceptedValue: 0,
  });

  // Laden der Angebote
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        setLoading(true);
        const quotesData = await QuoteService.getQuotes(companyId);
        const statsData = await QuoteService.getQuoteStatistics(companyId);

        setQuotes(quotesData);
        setStats(statsData);
      } catch {
        toast.error('Angebote konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    loadQuotes();

    // Real-time Updates
    const unsubscribe = QuoteService.subscribeToQuotes(companyId, quotesData => {
      setQuotes(quotesData);
    });

    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, [companyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: QuoteType['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Abgelaufen', className: 'bg-orange-100 text-orange-800' },
      cancelled: { label: 'Storniert', className: 'bg-zinc-200 text-zinc-800' },
    };

    const config = statusConfig[status];
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

  const handleConvertToInvoice = async (quote: QuoteType) => {
    try {
      await QuoteService.convertToInvoice(companyId, quote.id);
      toast.success(`Angebot ${quote.number} wird in Rechnung umgewandelt`);
    } catch {
      toast.error('Fehler beim Umwandeln in Rechnung');
    }
  };

  const handleSendQuote = async (quote: QuoteType) => {
    try {
      await QuoteService.sendQuote(companyId, quote.id);
      toast.success(`Angebot ${quote.number} wurde versendet`);
    } catch {
      toast.error('Fehler beim Versenden des Angebots');
    }
  };

  const handleDeleteQuote = async (quote: QuoteType) => {
    try {
      await QuoteService.deleteQuote(companyId, quote.id);
      toast.success(`Angebot ${quote.number} wurde gelöscht`);
    } catch {
      toast.error('Fehler beim Löschen des Angebots');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Angebote...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Angebote</h2>
          <p className="text-gray-600 mt-1">Professionelle Angebote erstellen und verwalten</p>
        </div>
        <Button
          onClick={() =>
            (window.location.href = `/dashboard/company/${companyId}/finance/quotes/create`)
          }
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Angebot
        </Button>
      </div>

      <div className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-[#14ad9f]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gesamt</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Versendet</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Check className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Angenommen</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <X className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Abgelehnt</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Angebote suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quotes List */}
        <Card>
          <CardHeader>
            <CardTitle>Angebote</CardTitle>
            <CardDescription>Alle erstellten Angebote im Überblick</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Keine Angebote gefunden' : 'Keine Angebote vorhanden'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? 'Versuchen Sie andere Suchbegriffe'
                    : 'Erstellen Sie Ihr erstes professionelles Angebot'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() =>
                      (window.location.href = `/dashboard/company/${companyId}/finance/quotes/create`)
                    }
                    className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                  >
                    Erstes Angebot erstellen
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuotes.map(quote => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="shrink-0">
                        <FileText className="h-8 w-8 text-[#14ad9f]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{quote.number}</h4>
                        <p className="text-sm text-gray-600">{quote.customerName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusBadge(quote.status)}
                          <span className="text-xs text-gray-500">
                            Gültig bis: {new Date(quote.validUntil).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(quote.total)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(quote.date).toLocaleDateString('de-DE')}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewQuote(quote)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ansehen
                        </Button>

                        {quote.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendQuote(quote)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Versenden
                          </Button>
                        )}

                        {quote.status === 'accepted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToInvoice(quote)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            In Rechnung
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            (window.location.href = `/dashboard/company/${companyId}/finance/quotes/${quote.id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>

                        {quote.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuote(quote)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

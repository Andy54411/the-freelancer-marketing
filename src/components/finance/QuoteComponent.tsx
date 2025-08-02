'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface Quote {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  date: string;
  validUntil: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface QuoteComponentProps {
  companyId: string;
}

export function QuoteComponent({ companyId }: QuoteComponentProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - in real app this would come from Firestore
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockQuotes: Quote[] = [
          {
            id: '1',
            number: 'A-2025-001',
            customerName: 'Mustermann GmbH',
            customerEmail: 'info@mustermann.de',
            date: '2025-01-15',
            validUntil: '2025-02-15',
            amount: 5000,
            tax: 950,
            total: 5950,
            status: 'sent',
            items: [
              { description: 'Beratungsleistung', quantity: 20, unitPrice: 150, total: 3000 },
              { description: 'Projektmanagement', quantity: 40, unitPrice: 50, total: 2000 },
            ],
          },
          {
            id: '2',
            number: 'A-2025-002',
            customerName: 'Tech Solutions AG',
            customerEmail: 'kontakt@techsolutions.de',
            date: '2025-01-20',
            validUntil: '2025-02-20',
            amount: 8500,
            tax: 1615,
            total: 10115,
            status: 'accepted',
            items: [
              { description: 'Software-Entwicklung', quantity: 50, unitPrice: 120, total: 6000 },
              { description: 'Testing & QA', quantity: 25, unitPrice: 100, total: 2500 },
            ],
          },
        ];

        setQuotes(mockQuotes);
      } catch (error) {
        console.error('Fehler beim Laden der Angebote:', error);
        toast.error('Angebote konnten nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    loadQuotes();
  }, [companyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: Quote['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Abgelaufen', className: 'bg-orange-100 text-orange-800' },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredQuotes = quotes.filter(
    quote =>
      quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateQuote = () => {
    toast.success('Angebot erstellt - Weiterleitung zur Bearbeitung');
    setShowCreateModal(false);
  };

  const handleConvertToInvoice = (quote: Quote) => {
    toast.success(`Angebot ${quote.number} wird in Rechnung umgewandelt`);
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
          onClick={() => setShowCreateModal(true)}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Angebot
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-[#14ad9f]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gesamt</p>
                    <p className="text-2xl font-bold text-gray-900">{quotes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Versendet</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {quotes.filter(q => q.status === 'sent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Angenommen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {quotes.filter(q => q.status === 'accepted').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Trash2 className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Abgelehnt</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {quotes.filter(q => q.status === 'rejected').length}
                    </p>
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
                      onClick={() => setShowCreateModal(true)}
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
                        <div className="flex-shrink-0">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedQuote(quote)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ansehen
                          </Button>

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

                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Bearbeiten
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Angebots-Vorlagen</CardTitle>
              <CardDescription>
                Vorgefertigte Vorlagen für häufig verwendete Angebote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Vorlagen erstellen</h3>
                <p className="text-gray-600 mb-4">
                  Sparen Sie Zeit mit wiederverwendbaren Angebots-Vorlagen
                </p>
                <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Vorlage erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Quote Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neues Angebot erstellen</DialogTitle>
            <DialogDescription>Erstellen Sie ein neues professionelles Angebot</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kunde</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kunde1">Mustermann GmbH</SelectItem>
                    <SelectItem value="kunde2">Tech Solutions AG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gültig bis</Label>
                <Input type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea placeholder="Beschreibung des Angebots..." rows={3} />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateQuote}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                Angebot erstellen
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Angebot: {selectedQuote.number}</DialogTitle>
              <DialogDescription>
                Detailansicht des Angebots für {selectedQuote.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedQuote.status)}
                  <span className="text-sm text-gray-600">
                    Erstellt am: {new Date(selectedQuote.date).toLocaleDateString('de-DE')}
                  </span>
                  <span className="text-sm text-gray-600">
                    Gültig bis: {new Date(selectedQuote.validUntil).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF Download
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Positionen</h4>
                <div className="space-y-2">
                  {selectedQuote.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.description}</span>
                      <span>
                        {item.quantity} × {formatCurrency(item.unitPrice)} ={' '}
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-4 pt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Netto:</span>
                    <span>{formatCurrency(selectedQuote.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>MwSt. (19%):</span>
                    <span>{formatCurrency(selectedQuote.tax)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Gesamt:</span>
                    <span>{formatCurrency(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

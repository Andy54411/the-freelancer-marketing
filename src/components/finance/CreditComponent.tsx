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
  Search,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Euro,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreditNote {
  id: string;
  number: string;
  originalInvoiceNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  amount: number;
  tax: number;
  total: number;
  reason: string;
  status: 'draft' | 'sent' | 'processed';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface CreditComponentProps {
  companyId: string;
}

export function CreditComponent({ companyId }: CreditComponentProps) {
  const [credits, setCredits] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for new credit note
  const [newCredit, setNewCredit] = useState({
    originalInvoiceNumber: '',
    reason: '',
    amount: '',
    items: [] as Array<{ description: string; quantity: number; unitPrice: number }>,
  });

  useEffect(() => {
    loadCredits();
  }, [companyId]);

  const loadCredits = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockCredits: CreditNote[] = [
        {
          id: '1',
          number: 'GS-2025-001',
          originalInvoiceNumber: 'R-2025-015',
          customerName: 'Mustermann GmbH',
          customerEmail: 'info@mustermann.de',
          date: '2025-02-01',
          amount: 500.0,
          tax: 95.0,
          total: 595.0,
          reason: 'Teilstornierung - fehlerhafte Position',
          status: 'processed',
          items: [
            {
              description: 'Stornierte Beratungsleistung',
              quantity: 5,
              unitPrice: 100,
              total: 500,
            },
          ],
        },
        {
          id: '2',
          number: 'GS-2025-002',
          originalInvoiceNumber: 'R-2025-018',
          customerName: 'Tech Solutions AG',
          customerEmail: 'kontakt@techsolutions.de',
          date: '2025-02-02',
          amount: 1200.0,
          tax: 228.0,
          total: 1428.0,
          reason: 'Vollstornierung - Auftrag storniert',
          status: 'sent',
          items: [
            {
              description: 'Vollständige Stornierung Software-Entwicklung',
              quantity: 1,
              unitPrice: 1200,
              total: 1200,
            },
          ],
        },
      ];

      setCredits(mockCredits);
    } catch (error) {
      toast.error('Gutschriften konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: CreditNote['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      processed: { label: 'Verarbeitet', className: 'bg-green-100 text-green-800' },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredCredits = credits.filter(
    credit =>
      credit.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.originalInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCredit = async () => {
    try {
      if (!newCredit.originalInvoiceNumber || !newCredit.reason) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      // Mock creation
      const creditNote: CreditNote = {
        id: Date.now().toString(),
        number: `GS-${new Date().getFullYear()}-${String(credits.length + 1).padStart(3, '0')}`,
        originalInvoiceNumber: newCredit.originalInvoiceNumber,
        customerName: 'Test Kunde',
        customerEmail: 'test@kunde.de',
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(newCredit.amount) || 0,
        tax: (parseFloat(newCredit.amount) || 0) * 0.19,
        total: (parseFloat(newCredit.amount) || 0) * 1.19,
        reason: newCredit.reason,
        status: 'draft',
        items: newCredit.items.map(item => ({
          ...item,
          total: item.quantity * item.unitPrice,
        })),
      };

      setCredits(prev => [creditNote, ...prev]);
      setShowCreateModal(false);

      // Reset form
      setNewCredit({
        originalInvoiceNumber: '',
        reason: '',
        amount: '',
        items: [],
      });

      toast.success('Gutschrift wurde erstellt');
    } catch (error) {
      toast.error('Gutschrift konnte nicht erstellt werden');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Gutschriften...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gutschriften</h2>
          <p className="text-gray-600 mt-1">Gutschriften und Stornierungen verwalten</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Gutschrift
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
                    <p className="text-2xl font-bold text-gray-900">{credits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <RotateCcw className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Versendet</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {credits.filter(c => c.status === 'sent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Verarbeitet</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {credits.filter(c => c.status === 'processed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gesamtbetrag</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(credits.reduce((sum, c) => sum + c.total, 0))}
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
                placeholder="Gutschriften suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Credits List */}
          <Card>
            <CardHeader>
              <CardTitle>Gutschriften</CardTitle>
              <CardDescription>
                Alle erstellten Gutschriften und Stornierungen im Überblick
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCredits.length === 0 ? (
                <div className="text-center py-8">
                  <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Keine Gutschriften gefunden' : 'Keine Gutschriften vorhanden'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? 'Versuchen Sie andere Suchbegriffe'
                      : 'Erstellen Sie Ihre erste Gutschrift oder Stornierung'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    >
                      Erste Gutschrift erstellen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCredits.map(credit => (
                    <div
                      key={credit.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <RotateCcw className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{credit.number}</h4>
                          <p className="text-sm text-gray-600">
                            Urspr. Rechnung: {credit.originalInvoiceNumber}
                          </p>
                          <p className="text-sm text-gray-600">{credit.customerName}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(credit.status)}
                            <span className="text-xs text-gray-500">
                              {new Date(credit.date).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-red-600">
                            -{formatCurrency(credit.total)}
                          </p>
                          <p className="text-sm text-gray-600">{credit.reason}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCredit(credit)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ansehen
                          </Button>

                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            PDF
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
              <CardTitle>Gutschrift-Vorlagen</CardTitle>
              <CardDescription>
                Vorgefertigte Vorlagen für häufige Stornierungsgründe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Vorlagen erstellen</h3>
                <p className="text-gray-600 mb-4">
                  Sparen Sie Zeit mit wiederverwendbaren Gutschrift-Vorlagen
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

      {/* Create Credit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neue Gutschrift erstellen</DialogTitle>
            <DialogDescription>Erstellen Sie eine Gutschrift oder Stornierung</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ursprüngliche Rechnungsnummer *</Label>
              <Input
                value={newCredit.originalInvoiceNumber}
                onChange={e =>
                  setNewCredit(prev => ({ ...prev, originalInvoiceNumber: e.target.value }))
                }
                placeholder="z.B. R-2025-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Grund für Gutschrift *</Label>
              <Textarea
                value={newCredit.reason}
                onChange={e => setNewCredit(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Beschreibung des Stornierungsgrundes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Gutschriftbetrag (netto)</Label>
              <Input
                type="number"
                step="0.01"
                value={newCredit.amount}
                onChange={e => setNewCredit(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateCredit}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                Gutschrift erstellen
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Detail Modal */}
      {selectedCredit && (
        <Dialog open={!!selectedCredit} onOpenChange={() => setSelectedCredit(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Gutschrift: {selectedCredit.number}</DialogTitle>
              <DialogDescription>
                Detailansicht der Gutschrift für {selectedCredit.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedCredit.status)}
                  <span className="text-sm text-gray-600">
                    Erstellt am: {new Date(selectedCredit.date).toLocaleDateString('de-DE')}
                  </span>
                  <span className="text-sm text-gray-600">
                    Urspr. Rechnung: {selectedCredit.originalInvoiceNumber}
                  </span>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF Download
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Grund</h4>
                <p className="text-sm text-gray-600 mb-4">{selectedCredit.reason}</p>

                <h4 className="font-medium text-gray-900 mb-2">Positionen</h4>
                <div className="space-y-2">
                  {selectedCredit.items.map((item, index) => (
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
                    <span className="text-red-600">-{formatCurrency(selectedCredit.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>MwSt. (19%):</span>
                    <span className="text-red-600">-{formatCurrency(selectedCredit.tax)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Gesamt:</span>
                    <span className="text-red-600">-{formatCurrency(selectedCredit.total)}</span>
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

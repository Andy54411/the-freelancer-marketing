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
  Wallet,
  Plus,
  Minus,
  Eye,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface CashEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  reference?: string;
  createdAt: string;
}

interface CashbookComponentProps {
  companyId: string;
}

export function CashbookComponent({ companyId }: CashbookComponentProps) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [cashBalance, setCashBalance] = useState(0);

  // Form state for new entry
  const [newEntry, setNewEntry] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: '',
    reference: '',
  });

  const categories = {
    income: [
      'Barverkäufe',
      'Dienstleistungen',
      'Trinkgelder',
      'Rückerstattungen',
      'Sonstige Einnahmen',
    ],
    expense: [
      'Büromaterial',
      'Porto',
      'Bewirtung',
      'Fahrtkosten',
      'Kleinbeträge',
      'Sonstige Ausgaben',
    ],
  };

  useEffect(() => {
    loadCashEntries();
  }, [companyId, selectedPeriod]);

  const loadCashEntries = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockEntries: CashEntry[] = [
        {
          id: '1',
          date: '2025-02-01',
          type: 'income',
          amount: 45.5,
          description: 'Barverkauf - Beratung',
          category: 'Barverkäufe',
          reference: 'BAR-001',
          createdAt: '2025-02-01T10:30:00Z',
        },
        {
          id: '2',
          date: '2025-02-01',
          type: 'expense',
          amount: 12.9,
          description: 'Büromaterial - Stifte',
          category: 'Büromaterial',
          reference: 'REI-001',
          createdAt: '2025-02-01T14:15:00Z',
        },
        {
          id: '3',
          date: '2025-02-02',
          type: 'income',
          amount: 120.0,
          description: 'Trinkgeld Kunde Meyer',
          category: 'Trinkgelder',
          createdAt: '2025-02-02T16:45:00Z',
        },
        {
          id: '4',
          date: '2025-02-02',
          type: 'expense',
          amount: 8.5,
          description: 'Porto - Einschreiben',
          category: 'Porto',
          reference: 'POST-123',
          createdAt: '2025-02-02T11:20:00Z',
        },
      ];

      setEntries(mockEntries);

      // Calculate balance
      const balance = mockEntries.reduce((acc, entry) => {
        return entry.type === 'income' ? acc + entry.amount : acc - entry.amount;
      }, 0);
      setCashBalance(balance);
    } catch (error) {
      toast.error('Kassenbuch-Einträge konnten nicht geladen werden');
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

  const filteredEntries = entries.filter(
    entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddEntry = async () => {
    try {
      if (!newEntry.amount || !newEntry.description || !newEntry.category) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const entry: CashEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        type: newEntry.type,
        amount: parseFloat(newEntry.amount),
        description: newEntry.description,
        category: newEntry.category,
        reference: newEntry.reference || undefined,
        createdAt: new Date().toISOString(),
      };

      setEntries(prev => [entry, ...prev]);

      // Update balance
      setCashBalance(prev => (entry.type === 'income' ? prev + entry.amount : prev - entry.amount));

      // Reset form
      setNewEntry({
        type: 'income',
        amount: '',
        description: '',
        category: '',
        reference: '',
      });

      setShowAddModal(false);
      toast.success('Kassenbuch-Eintrag wurde hinzugefügt');
    } catch (error) {
      toast.error('Eintrag konnte nicht hinzugefügt werden');
    }
  };

  const totalIncome = entries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = entries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Kassenbuch...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kassenbuch</h2>
          <p className="text-gray-600 mt-1">
            Bargeld-Einnahmen und -Ausgaben dokumentieren und verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Aktueller Monat</SelectItem>
              <SelectItem value="current-quarter">Aktuelles Quartal</SelectItem>
              <SelectItem value="current-year">Aktuelles Jahr</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Eintrag hinzufügen
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="entries">Einträge</TabsTrigger>
          <TabsTrigger value="reports">Berichte</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Cash Balance and Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wallet className="h-12 w-12 text-[#14ad9f]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Kassenbestand</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(cashBalance)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Stand: {new Date().toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Einnahmen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ausgaben</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Einträge</CardTitle>
              <CardDescription>Die neuesten Kassenbuch-Einträge im Überblick</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.slice(0, 5).map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-full ${
                        entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {entry.type === 'income' ? (
                        <Plus
                          className={`h-4 w-4 ${
                            entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                        />
                      ) : (
                        <Minus className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.description}</p>
                      <p className="text-sm text-gray-600">{entry.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {entry.type === 'income' ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(entry.date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Einträge suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Entries List */}
          <Card>
            <CardHeader>
              <CardTitle>Alle Einträge</CardTitle>
              <CardDescription>Vollständige Liste aller Kassenbuch-Einträge</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Keine Einträge gefunden' : 'Keine Kassenbuch-Einträge vorhanden'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? 'Versuchen Sie andere Suchbegriffe'
                      : 'Fügen Sie Ihren ersten Kassenbuch-Eintrag hinzu'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    >
                      Ersten Eintrag hinzufügen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          {entry.type === 'income' ? (
                            <Plus className="h-4 w-4 text-green-600" />
                          ) : (
                            <Minus className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.description}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>{entry.category}</span>
                            {entry.reference && (
                              <>
                                <span>•</span>
                                <span>Ref: {entry.reference}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(entry.date).toLocaleDateString('de-DE')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {entry.type === 'income' ? '+' : '-'}
                          {formatCurrency(entry.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kassenbuch-Berichte</CardTitle>
              <CardDescription>
                Exportieren Sie Ihre Kassenbuch-Daten für Buchhaltung und Steuerberater
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex flex-col">
                <Download className="h-6 w-6 mb-2" />
                Kassenbuch Export (Excel)
              </Button>

              <Button variant="outline" className="h-20 flex flex-col">
                <Receipt className="h-6 w-6 mb-2" />
                Kassenbericht (PDF)
              </Button>

              <Button variant="outline" className="h-20 flex flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                Monatsabschluss
              </Button>

              <Button variant="outline" className="h-20 flex flex-col">
                <Upload className="h-6 w-6 mb-2" />
                DATEV Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neuer Kassenbuch-Eintrag</DialogTitle>
            <DialogDescription>Fügen Sie eine neue Bargeld-Transaktion hinzu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Art</Label>
              <Select
                value={newEntry.type}
                onValueChange={(value: 'income' | 'expense') =>
                  setNewEntry(prev => ({ ...prev, type: value, category: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Einnahme</SelectItem>
                  <SelectItem value="expense">Ausgabe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={e => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={newEntry.category}
                  onValueChange={value => setNewEntry(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories[newEntry.type].map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={newEntry.description}
                onChange={e => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreibung der Transaktion"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Referenz (optional)</Label>
              <Input
                value={newEntry.reference}
                onChange={e => setNewEntry(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="z.B. Belegnummer, Quittung"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddEntry}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                Eintrag hinzufügen
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

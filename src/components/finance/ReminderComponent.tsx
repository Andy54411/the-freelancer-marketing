'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReminderSettings } from './ReminderSettings';
import { NumberSequenceService } from '@/services/numberSequenceService';
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
  Bell,
  Download,
  Plus,
  Eye,
  Search,
  AlertTriangle,
  Clock,
  Euro,
  Calendar,
  Send,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  number: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  originalAmount: number;
  outstandingAmount: number;
  dueDate: string;
  reminderDate: string;
  reminderLevel: 1 | 2 | 3;
  reminderFee: number;
  status: 'draft' | 'sent' | 'paid' | 'escalated';
  daysPastDue: number;
}

interface ReminderComponentProps {
  companyId: string;
}

export function ReminderComponent({ companyId }: ReminderComponentProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for new reminder
  const [newReminder, setNewReminder] = useState({
    invoiceNumber: '',
    reminderLevel: 1 as 1 | 2 | 3,
    customMessage: '',
  });

  // Reminder settings
  const reminderSettings = {
    1: { fee: 5.0, days: 7, title: '1. Mahnung' },
    2: { fee: 10.0, days: 14, title: '2. Mahnung' },
    3: { fee: 15.0, days: 21, title: '3. Mahnung / Inkasso-Androhung' },
  };

  useEffect(() => {
    loadReminders();
  }, [companyId]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockReminders: Reminder[] = [
        {
          id: '1',
          number: 'M1-MOCK-001',
          invoiceNumber: 'R-2025-012',
          customerName: 'Müller & Co KG',
          customerEmail: 'buchhaltung@mueller-co.de',
          originalAmount: 2450.0,
          outstandingAmount: 2450.0,
          dueDate: '2025-01-15',
          reminderDate: '2025-01-22',
          reminderLevel: 1,
          reminderFee: 5.0,
          status: 'sent',
          daysPastDue: 18,
        },
        {
          id: '2',
          number: 'M2-MOCK-001',
          invoiceNumber: 'R-2025-008',
          customerName: 'Schmidt GmbH',
          customerEmail: 'info@schmidt.de',
          originalAmount: 1800.0,
          outstandingAmount: 1815.0, // Including first reminder fee
          dueDate: '2025-01-01',
          reminderDate: '2025-01-25',
          reminderLevel: 2,
          reminderFee: 10.0,
          status: 'sent',
          daysPastDue: 32,
        },
        {
          id: '3',
          number: 'M3-MOCK-001',
          invoiceNumber: 'R-2024-156',
          customerName: 'Weber AG',
          customerEmail: 'finanzen@weber.de',
          originalAmount: 5200.0,
          outstandingAmount: 5230.0, // Including previous reminder fees
          dueDate: '2024-12-15',
          reminderDate: '2025-01-28',
          reminderLevel: 3,
          reminderFee: 15.0,
          status: 'escalated',
          daysPastDue: 48,
        },
      ];

      setReminders(mockReminders);
    } catch (error) {
      toast.error('Mahnungen konnten nicht geladen werden');
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

  const getStatusBadge = (status: Reminder['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      escalated: { label: 'Eskaliert', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getReminderLevelBadge = (level: number) => {
    const colors = {
      1: 'bg-yellow-100 text-yellow-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {reminderSettings[level as keyof typeof reminderSettings].title}
      </Badge>
    );
  };

  const filteredReminders = reminders.filter(
    reminder =>
      reminder.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateReminder = async () => {
    try {
      if (!newReminder.invoiceNumber) {
        toast.error('Bitte geben Sie eine Rechnungsnummer an');
        return;
      }

      const reminderConfig = reminderSettings[newReminder.reminderLevel];

      // ✅ Use NumberSequenceService for reminder numbers
      let reminderNumber = `M${newReminder.reminderLevel}-TEMP`;
      try {
        const result = await NumberSequenceService.getNextNumberForType(companyId || '', 'Mahnung');
        reminderNumber = `M${newReminder.reminderLevel}-${result.formattedNumber}`;
      } catch (error) {
        console.error('Error generating reminder number:', error);
        reminderNumber = `M${newReminder.reminderLevel}-${Date.now()}`; // Emergency fallback
      }

      const reminder: Reminder = {
        id: Date.now().toString(),
        number: reminderNumber,
        invoiceNumber: newReminder.invoiceNumber,
        customerName: 'Test Kunde',
        customerEmail: 'test@kunde.de',
        originalAmount: 1000.0,
        outstandingAmount: 1000.0 + reminderConfig.fee,
        dueDate: '2025-01-15',
        reminderDate: new Date().toISOString().split('T')[0],
        reminderLevel: newReminder.reminderLevel,
        reminderFee: reminderConfig.fee,
        status: 'draft',
        daysPastDue: 10,
      };

      setReminders(prev => [reminder, ...prev]);
      setShowCreateModal(false);

      // Reset form
      setNewReminder({
        invoiceNumber: '',
        reminderLevel: 1,
        customMessage: '',
      });

      toast.success('Mahnung wurde erstellt');
    } catch (error) {
      toast.error('Mahnung konnte nicht erstellt werden');
    }
  };

  const handleSendReminder = (reminder: Reminder) => {
    toast.success(`Mahnung ${reminder.number} wird versendet`);
    // Update status to sent
    setReminders(prev =>
      prev.map(r => (r.id === reminder.id ? { ...r, status: 'sent' as const } : r))
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Mahnungen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mahnungen</h2>
          <p className="text-gray-600 mt-1">Automatisches Mahnwesen für überfällige Rechnungen</p>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/company/${companyId}/finance/reminders/create`)}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Mahnung
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Bell className="h-8 w-8 text-[#14ad9f]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gesamt</p>
                    <p className="text-2xl font-bold text-gray-900">{reminders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Offen</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reminders.filter(r => r.status === 'sent').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Eskaliert</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reminders.filter(r => r.status === 'escalated').length}
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
                    <p className="text-sm font-medium text-gray-600">Offener Betrag</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        reminders
                          .filter(r => r.status !== 'paid')
                          .reduce((sum, r) => sum + r.outstandingAmount, 0)
                      )}
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
                placeholder="Mahnungen suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Reminders List */}
          <Card>
            <CardHeader>
              <CardTitle>Mahnungen</CardTitle>
              <CardDescription>Alle erstellten Mahnungen im Überblick</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Keine Mahnungen gefunden' : 'Keine Mahnungen vorhanden'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm
                      ? 'Versuchen Sie andere Suchbegriffe'
                      : 'Erstellen Sie Ihre erste Mahnung für überfällige Rechnungen'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() =>
                        router.push(`/dashboard/company/${companyId}/finance/reminders/create`)
                      }
                      className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                    >
                      Erste Mahnung erstellen
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="shrink-0">
                          <Bell className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{reminder.number}</h4>
                          <p className="text-sm text-gray-600">
                            Rechnung: {reminder.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-600">{reminder.customerName}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getReminderLevelBadge(reminder.reminderLevel)}
                            {getStatusBadge(reminder.status)}
                            <span className="text-xs text-gray-500">
                              {reminder.daysPastDue} Tage überfällig
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium text-red-600">
                            {formatCurrency(reminder.outstandingAmount)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Fällig: {new Date(reminder.dueDate).toLocaleDateString('de-DE')}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReminder(reminder)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ansehen
                          </Button>

                          {reminder.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(reminder)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Senden
                            </Button>
                          )}

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

        <TabsContent value="settings" className="space-y-4">
          <ReminderSettings uid={companyId} />
        </TabsContent>
      </Tabs>

      {/* Create Reminder Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Mahnung erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine Mahnung für eine überfällige Rechnung
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rechnungsnummer *</Label>
              <Input
                value={newReminder.invoiceNumber}
                onChange={e => setNewReminder(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="z.B. R-2025-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Mahnstufe</Label>
              <Select
                value={newReminder.reminderLevel.toString()}
                onValueChange={value =>
                  setNewReminder(prev => ({ ...prev, reminderLevel: parseInt(value) as 1 | 2 | 3 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reminderSettings).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      {config.title} - {formatCurrency(config.fee)} Gebühr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zusätzliche Nachricht (optional)</Label>
              <Textarea
                value={newReminder.customMessage}
                onChange={e => setNewReminder(prev => ({ ...prev, customMessage: e.target.value }))}
                placeholder="Persönliche Nachricht an den Kunden..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateReminder}
                className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
              >
                Mahnung erstellen
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Detail Modal */}
      {selectedReminder && (
        <Dialog open={!!selectedReminder} onOpenChange={() => setSelectedReminder(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Mahnung: {selectedReminder.number}</DialogTitle>
              <DialogDescription>
                Detailansicht der Mahnung für {selectedReminder.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getReminderLevelBadge(selectedReminder.reminderLevel)}
                  {getStatusBadge(selectedReminder.status)}
                  <span className="text-sm text-gray-600">
                    Mahnung vom:{' '}
                    {new Date(selectedReminder.reminderDate).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF Download
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Ursprüngliche Rechnung:</p>
                    <p className="text-gray-600">{selectedReminder.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Fälligkeitsdatum:</p>
                    <p className="text-gray-600">
                      {new Date(selectedReminder.dueDate).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Tage überfällig:</p>
                    <p className="text-red-600 font-medium">{selectedReminder.daysPastDue} Tage</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Mahngebühr:</p>
                    <p className="text-gray-900">{formatCurrency(selectedReminder.reminderFee)}</p>
                  </div>
                </div>

                <div className="border-t mt-4 pt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Ursprünglicher Betrag:</span>
                    <span>{formatCurrency(selectedReminder.originalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mahngebühr:</span>
                    <span>{formatCurrency(selectedReminder.reminderFee)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-red-600">
                    <span>Gesamtforderung:</span>
                    <span>{formatCurrency(selectedReminder.outstandingAmount)}</span>
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

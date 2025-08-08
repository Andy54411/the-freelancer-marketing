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
  Package,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Send,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DeliveryNoteService,
  DeliveryNote,
  DeliveryNoteItem,
  DeliveryNoteSettings,
} from '@/services/deliveryNoteService';
import { Customer } from '@/components/finance/AddCustomerModal';
import { CustomerSelect } from '@/components/finance/CustomerSelect';
import { WarehouseService } from '@/services/warehouseService';
import { UserPreferencesService } from '@/lib/userPreferences';
import { InvoiceTemplate, DEFAULT_INVOICE_TEMPLATE } from '@/components/finance/InvoiceTemplates';
import { useAuth } from '@/contexts/AuthContext';

interface DeliveryNoteComponentProps {
  companyId: string;
}

export function DeliveryNoteComponent({ companyId }: DeliveryNoteComponentProps) {
  const { user } = useAuth();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    pending: 0,
    thisMonth: 0,
  });

  // Customer States (Phase 1)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

  // Template States (NEU für Phase 2)
  const [userTemplate, setUserTemplate] = useState<InvoiceTemplate>(DEFAULT_INVOICE_TEMPLATE);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Warehouse States (NEU für Phase 6)
  const [warehouseEnabled, setWarehouseEnabled] = useState(true);
  const [stockValidation, setStockValidation] = useState<{
    [key: string]: { available: number; needed: number };
  }>({});

  // Form State für neuen/bearbeiteten Lieferschein
  const [formData, setFormData] = useState<Partial<DeliveryNote>>({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    orderNumber: '',
    customerOrderNumber: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    date: new Date().toISOString().split('T')[0],
    showPrices: false,
    status: 'draft',
    items: [],
    notes: '',
    shippingMethod: 'standard',
    warehouseUpdated: false,
    template: DEFAULT_INVOICE_TEMPLATE, // NEU für Phase 2
  });

  const [newItem, setNewItem] = useState<Partial<DeliveryNoteItem>>({
    description: '',
    quantity: 1,
    unit: 'Stk',
    unitPrice: 0,
  });

  useEffect(() => {
    loadDeliveryNotes();
    loadStats();
    loadUserTemplate(); // NEU für Phase 2
  }, [companyId]);

  // Template Loading (NEU für Phase 2)
  const loadUserTemplate = async () => {
    if (!user?.uid) return;

    try {
      setTemplateLoading(true);
      const template = await UserPreferencesService.getPreferredTemplate(user.uid);
      setUserTemplate(template);
      setFormData(prev => ({ ...prev, template }));
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error);
      // Fallback zu Default Template
      setUserTemplate(DEFAULT_INVOICE_TEMPLATE);
      setFormData(prev => ({ ...prev, template: DEFAULT_INVOICE_TEMPLATE }));
    } finally {
      setTemplateLoading(false);
    }
  };

  const loadDeliveryNotes = async () => {
    try {
      setLoading(true);
      const notes = await DeliveryNoteService.getDeliveryNotesByCompany(companyId);
      setDeliveryNotes(notes);
    } catch (error) {
      console.error('Fehler beim Laden der Lieferscheine:', error);
      toast.error('Lieferscheine konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await DeliveryNoteService.getDeliveryNoteStats(companyId);
      setStats(statistics);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const handleCreateDeliveryNote = async () => {
    try {
      if (!formData.customerName || !formData.customerAddress || !formData.items?.length) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      // Phase 6: Warehouse-Integration - Lagerbestand prüfen vor Erstellung
      if (warehouseEnabled && formData.items) {
        const stockCheckResults = await Promise.all(
          formData.items.map(async item => {
            const warehouseItem = await WarehouseService.getWarehouseItemBySku(item.description); // Annahme: SKU in description
            return {
              item,
              available: warehouseItem?.currentStock || 0,
              sufficient: !warehouseItem || warehouseItem.currentStock >= item.quantity,
            };
          })
        );

        const insufficientStock = stockCheckResults.filter(result => !result.sufficient);
        if (insufficientStock.length > 0) {
          const stockMessage = insufficientStock
            .map(
              result =>
                `${result.item.description}: Verfügbar ${result.available}, benötigt ${result.item.quantity}`
            )
            .join(', ');
          toast.error(`Nicht genügend Lagerbestand: ${stockMessage}`);
          return;
        }
      }

      const deliveryNoteId = await DeliveryNoteService.createDeliveryNote({
        companyId,
        customerId: formData.customerId || '',
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        deliveryNoteNumber: '', // Wird automatisch generiert
        sequentialNumber: 0, // Wird automatisch generiert
        date: formData.date || new Date().toISOString().split('T')[0],
        deliveryDate: formData.deliveryDate || new Date().toISOString().split('T')[0],
        orderNumber: formData.orderNumber,
        customerOrderNumber: formData.customerOrderNumber,
        items: formData.items as DeliveryNoteItem[],
        showPrices: formData.showPrices || false,
        status: 'draft',
        warehouseUpdated: false,
        stockValidated: warehouseEnabled,
        shippingMethod: formData.shippingMethod,
        notes: formData.notes,
        template: typeof userTemplate === 'string' ? userTemplate : 'professional',
        createdBy: companyId,
      });

      toast.success('Lieferschein erfolgreich erstellt');
      setShowCreateModal(false);
      resetForm();
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      console.error('Fehler beim Erstellen des Lieferscheins:', error);
      toast.error('Lieferschein konnte nicht erstellt werden');
    }
  };

  const handleUpdateDeliveryNote = async () => {
    try {
      if (!selectedNote?.id) return;

      await DeliveryNoteService.updateDeliveryNote(selectedNote.id, formData);
      toast.success('Lieferschein erfolgreich aktualisiert');
      setShowEditModal(false);
      setSelectedNote(null);
      resetForm();
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Lieferscheins:', error);
      toast.error('Lieferschein konnte nicht aktualisiert werden');
    }
  };

  const handleMarkAsSent = async (id: string) => {
    try {
      const trackingNumber = prompt('Sendungsnummer (optional):');
      await DeliveryNoteService.markAsSent(id, trackingNumber || undefined);
      toast.success('Lieferschein als versendet markiert');
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      console.error('Fehler beim Markieren als versendet:', error);
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleMarkAsDelivered = async (id: string) => {
    try {
      await DeliveryNoteService.markAsDelivered(id);
      toast.success('Lieferschein als zugestellt markiert');
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      console.error('Fehler beim Markieren als zugestellt:', error);
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleCreateInvoice = async (id: string) => {
    try {
      const invoiceId = await DeliveryNoteService.createInvoiceFromDeliveryNote(id);
      toast.success(`Rechnung ${invoiceId} erfolgreich erstellt`);
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      toast.error('Rechnung konnte nicht erstellt werden');
    }
  };

  const handleUpdateInventory = async (id: string) => {
    try {
      await DeliveryNoteService.updateInventoryFromDeliveryNote(id);
      toast.success('Lagerbestand erfolgreich aktualisiert');
      await loadDeliveryNotes();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Lagerbestands:', error);
      toast.error('Lagerbestand konnte nicht aktualisiert werden');
    }
  };

  const handleDeleteDeliveryNote = async (id: string) => {
    try {
      if (!confirm('Möchten Sie diesen Lieferschein wirklich löschen?')) {
        return;
      }

      await DeliveryNoteService.deleteDeliveryNote(id);
      toast.success('Lieferschein erfolgreich gelöscht');
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      console.error('Fehler beim Löschen des Lieferscheins:', error);
      toast.error('Lieferschein konnte nicht gelöscht werden');
    }
  };

  const addItem = () => {
    if (!newItem.description || !newItem.quantity) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    const item: DeliveryNoteItem = {
      id: Date.now().toString(),
      description: newItem.description,
      quantity: newItem.quantity,
      unit: newItem.unit || 'Stk',
      unitPrice: newItem.unitPrice || 0,
      total: (newItem.quantity || 0) * (newItem.unitPrice || 0),
      stockReduced: false,
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), item],
    }));

    setNewItem({
      description: '',
      quantity: 1,
      unit: 'Stk',
      unitPrice: 0,
    });
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || [],
    }));
  };

  // Customer Selection Handler (NEU für Phase 1)
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAddress:
        customer.street && customer.city && customer.postalCode
          ? `${customer.street}\n${customer.postalCode} ${customer.city}\n${customer.country || 'Deutschland'}`
          : customer.address || '',
    }));
    setShowCustomerSelect(false);
    toast.success(`Kunde ${customer.name} ausgewählt`);
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      orderNumber: '',
      customerOrderNumber: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      showPrices: false,
      status: 'draft',
      items: [],
      notes: '',
      shippingMethod: 'standard',
      warehouseUpdated: false,
      template: userTemplate, // Use user's preferred template
    });
    setNewItem({
      description: '',
      quantity: 1,
      unit: 'Stk',
      unitPrice: 0,
    });
    setSelectedCustomer(null);
  };

  // E-Mail-Versand Funktion (Phase 5)
  const handleSendEmail = async (deliveryNote: DeliveryNote) => {
    try {
      const recipientEmail = deliveryNote.customerEmail || prompt('E-Mail-Adresse des Empfängers:');
      if (!recipientEmail) return;

      const response = await fetch('/api/send-delivery-note-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryNoteId: deliveryNote.id,
          recipientEmail,
          recipientName: deliveryNote.customerName,
          subject: `Lieferschein ${deliveryNote.deliveryNoteNumber} - Taskilo`,
        }),
      });

      if (response.ok) {
        toast.success('Lieferschein wurde per E-Mail versendet');
        await loadDeliveryNotes(); // Reload to update email status
      } else {
        const error = await response.json();
        toast.error(`E-Mail-Versand fehlgeschlagen: ${error.error}`);
      }
    } catch (error) {
      console.error('Fehler beim E-Mail-Versand:', error);
      toast.error('E-Mail konnte nicht gesendet werden');
    }
  };

  // Warehouse-Bestand aktualisieren (Phase 6)
  const handleProcessWarehouseStock = async (deliveryNote: DeliveryNote) => {
    try {
      const items = deliveryNote.items.map(item => ({
        sku: item.description, // Annahme: SKU in description
        name: item.description,
        quantity: item.quantity,
      }));

      const result = await WarehouseService.processDeliveryNoteStock(
        deliveryNote.id,
        deliveryNote.deliveryNoteNumber,
        items,
        companyId
      );

      if (result.success) {
        toast.success('Lagerbestand wurde aktualisiert');
        await DeliveryNoteService.updateDeliveryNote(deliveryNote.id, {
          ...deliveryNote,
          warehouseUpdated: true,
        });
        await loadDeliveryNotes();
      } else {
        toast.error(`Lagerbestand konnte nicht aktualisiert werden: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Lagerbestands:', error);
      toast.error('Lagerbestand konnte nicht aktualisiert werden');
    }
  };

  const openEditModal = (note: DeliveryNote) => {
    setSelectedNote(note);
    setFormData({
      customerName: note.customerName,
      customerEmail: note.customerEmail,
      customerAddress: note.customerAddress,
      orderNumber: note.orderNumber,
      customerOrderNumber: note.customerOrderNumber,
      deliveryDate: note.deliveryDate,
      date: note.date,
      showPrices: note.showPrices,
      items: note.items,
      notes: note.notes,
      shippingMethod: note.shippingMethod,
      trackingNumber: note.trackingNumber,
      specialInstructions: note.specialInstructions,
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Entwurf
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Send className="h-3 w-3 mr-1" />
            Versendet
          </Badge>
        );
      case 'delivered':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Truck className="h-3 w-3 mr-1" />
            Zugestellt
          </Badge>
        );
      case 'invoiced':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            <FileText className="h-3 w-3 mr-1" />
            Fakturiert
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="destructive">Storniert</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        <span className="ml-2 text-gray-600">Lade Lieferscheine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lieferscheine</h2>
          <p className="text-gray-600 mt-1">
            Erstellen und verwalten Sie Lieferscheine mit automatischer Lageraktualisierung
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Lieferschein
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistiken */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-[#14ad9f]" />
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
                  <Truck className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Zugestellt</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ausstehend</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <RefreshCw className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Diesen Monat</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lieferschein-Liste */}
          <Card>
            <CardHeader>
              <CardTitle>Lieferscheine</CardTitle>
              <CardDescription>Alle erstellten Lieferscheine im Überblick</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryNotes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Lieferscheine vorhanden
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Erstellen Sie Ihren ersten Lieferschein mit automatischer Lageraktualisierung.
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                  >
                    Ersten Lieferschein erstellen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {deliveryNotes.map(note => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Package className="h-8 w-8 text-[#14ad9f]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{note.deliveryNoteNumber}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">{note.customerName}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{note.deliveryDate}</span>
                            {getStatusBadge(note.status)}
                          </div>
                          {note.trackingNumber && (
                            <div className="text-xs text-gray-500 mt-1">
                              Sendung: {note.trackingNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedNote(note)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Anzeigen
                        </Button>

                        {note.status === 'draft' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEditModal(note)}>
                              <Edit3 className="h-4 w-4 mr-1" />
                              Bearbeiten
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsSent(note.id!)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Versenden
                            </Button>
                          </>
                        )}

                        {note.status === 'sent' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsDelivered(note.id!)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Zugestellt
                          </Button>
                        )}

                        {note.status === 'delivered' && !note.invoiceId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateInvoice(note.id!)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Rechnung
                          </Button>
                        )}

                        {!note.warehouseUpdated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessWarehouseStock(note)}
                            className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Lager aktualisieren
                          </Button>
                        )}

                        {note.customerEmail && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(note)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            E-Mail senden
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/print/delivery-note/${note.id}`, '_blank')}
                          className="text-gray-600 hover:bg-gray-100"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Drucken
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDeliveryNote(note.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lieferschein-Einstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie Nummerierung, Templates und Automatisierung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Einstellungen</h3>
                <p className="text-gray-600">
                  Hier können Sie Ihre Lieferschein-Einstellungen verwalten.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal für neuen Lieferschein */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Neuer Lieferschein</DialogTitle>
              <DialogDescription>
                Erstellen Sie einen neuen Lieferschein mit automatischer Lageraktualisierung
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Kundendaten */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kunde auswählen *</Label>
                  {selectedCustomer ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
                          <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {selectedCustomer.street && selectedCustomer.city
                              ? `${selectedCustomer.street}, ${selectedCustomer.postalCode} ${selectedCustomer.city}`
                              : selectedCustomer.address}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCustomerSelect(true)}
                          className="text-[#14ad9f] border-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                        >
                          Ändern
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowCustomerSelect(true)}
                      variant="outline"
                      className="w-full h-20 border-dashed border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Kunde aus Datenbank auswählen
                    </Button>
                  )}
                </div>

                {/* Zusätzliche Kundendaten-Anpassung (optional) */}
                {selectedCustomer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">E-Mail (anpassen)</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, customerEmail: e.target.value }))
                        }
                        placeholder="kunde@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerAddress">Adresse (anpassen)</Label>
                      <Textarea
                        id="customerAddress"
                        value={formData.customerAddress}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, customerAddress: e.target.value }))
                        }
                        placeholder="Straße&#10;PLZ Ort&#10;Land"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lieferschein-Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Lieferdatum</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Bestellnummer</Label>
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={e => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Artikel hinzufügen */}
              <div className="space-y-4">
                <Label>Artikel hinzufügen</Label>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <Input
                    placeholder="Beschreibung"
                    value={newItem.description}
                    onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Menge"
                    value={newItem.quantity}
                    onChange={e =>
                      setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                    }
                  />
                  <Input
                    placeholder="Einheit"
                    value={newItem.unit}
                    onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Preis"
                    value={newItem.unitPrice}
                    onChange={e =>
                      setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <Button onClick={addItem} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Artikel-Liste */}
                {formData.items && formData.items.length > 0 && (
                  <div className="space-y-2">
                    <Label>Artikel</Label>
                    {formData.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex-1">
                          <span className="font-medium">{item.description}</span>
                          <span className="text-gray-600 ml-2">
                            {item.quantity} {item.unit}
                            {formData.showPrices && ` × ${item.unitPrice?.toFixed(2)}€`}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zusätzliche Optionen */}
              <div className="space-y-2">
                <Label htmlFor="notes">Bemerkungen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optionale Bemerkungen zum Lieferschein"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateDeliveryNote}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  Lieferschein erstellen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal für Bearbeitung */}
      {showEditModal && selectedNote && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Lieferschein bearbeiten: {selectedNote.deliveryNoteNumber}</DialogTitle>
              <DialogDescription>Bearbeiten Sie die Lieferschein-Details</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Ähnlicher Inhalt wie Create Modal */}
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateDeliveryNote}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  Änderungen speichern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedNote(null);
                    resetForm();
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail-Ansicht Modal */}
      {selectedNote && !showEditModal && (
        <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Lieferschein: {selectedNote.deliveryNoteNumber}</DialogTitle>
              <DialogDescription>
                Kunde: {selectedNote.customerName} • Status: {selectedNote.status}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kunde</Label>
                  <p className="text-sm text-gray-900">{selectedNote.customerName}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {selectedNote.customerAddress}
                  </p>
                </div>
                <div>
                  <Label>Lieferdetails</Label>
                  <p className="text-sm text-gray-900">Datum: {selectedNote.date}</p>
                  <p className="text-sm text-gray-900">Lieferdatum: {selectedNote.deliveryDate}</p>
                  {selectedNote.orderNumber && (
                    <p className="text-sm text-gray-900">Bestellung: {selectedNote.orderNumber}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Artikel ({selectedNote.items.length})</Label>
                <div className="space-y-2 mt-2">
                  {selectedNote.items.map(item => (
                    <div key={item.id} className="flex justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{item.description}</span>
                        <span className="text-gray-600 ml-2">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      {selectedNote.showPrices && item.unitPrice && (
                        <span className="text-gray-900">
                          {(item.quantity * item.unitPrice).toFixed(2)}€
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedNote.notes && (
                <div>
                  <Label>Bemerkungen</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedNote.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedNote(null)}>
                  Schließen
                </Button>
                <Button className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
                  <Download className="h-4 w-4 mr-2" />
                  PDF Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Selection Modal (NEU für Phase 1) */}
      {showCustomerSelect && (
        <Dialog open={showCustomerSelect} onOpenChange={setShowCustomerSelect}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Kunde auswählen</DialogTitle>
              <DialogDescription>Wählen Sie einen Kunden aus Ihrer Datenbank aus</DialogDescription>
            </DialogHeader>
            <CustomerSelect
              companyId={companyId}
              onCustomerSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

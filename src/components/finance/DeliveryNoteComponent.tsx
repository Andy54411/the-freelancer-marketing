'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from '@/services/deliveryNoteService';
import { InventoryService, InventoryItem } from '@/services/inventoryService';
import { InventorySelector } from './InventorySelector';
import { DeliveryNoteSettingsComponent } from './DeliveryNoteSettings';
import { Customer } from '@/components/finance/AddCustomerModal';
import { CustomerSelect } from '@/components/finance/CustomerSelect';
import { WarehouseService } from '@/services/warehouseService';
import { UserPreferencesService } from '@/lib/userPreferences';
import {
  DeliveryNoteTemplate,
  AVAILABLE_DELIVERY_NOTE_TEMPLATES,
} from '@/components/finance/delivery-note-templates';
import { useAuth } from '@/contexts/AuthContext';

interface DeliveryNoteComponentProps {
  companyId: string;
  showCreateModal?: boolean;
  setShowCreateModal?: (show: boolean) => void;
}

export function DeliveryNoteComponent({
  companyId,
  showCreateModal: externalShowCreateModal,
  setShowCreateModal: externalSetShowCreateModal,
}: DeliveryNoteComponentProps) {
  const { user } = useAuth();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [internalShowCreateModal, setInternalShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showCreateModal = externalShowCreateModal ?? internalShowCreateModal;
  const setShowCreateModal = externalSetShowCreateModal ?? setInternalShowCreateModal;
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

  // Inventory States (NEU)
  const [showInventorySelector, setShowInventorySelector] = useState(false);

  // Template States (NEU für Phase 2)
  const [userTemplate, setUserTemplate] = useState<DeliveryNoteTemplate | null>(null); // null = nicht ausgewählt
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false); // Modal für Template-Auswahl

  // Warehouse enabled by default

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
    template: 'german-standard' as DeliveryNoteTemplate, // Temporärer Fallback, wird beim Load aktualisiert
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
      const template = await UserPreferencesService.getPreferredDeliveryNoteTemplate(
        user.uid,
        companyId
      );

      if (template) {
        // Template ist ausgewählt
        setUserTemplate(template);
        setFormData(prev => ({ ...prev, template }));
      } else {
        // Kein Template ausgewählt - Modal zeigen
        setUserTemplate(null);
        setShowTemplateSelect(true);
      }
    } catch (error) {
      // Bei Fehler auch Template-Auswahl anzeigen
      setUserTemplate(null);
      setShowTemplateSelect(true);
    } finally {
      setTemplateLoading(false);
    }
  };

  // Template Selection Handler (NEU für Phase 2)
  const handleTemplateSelect = async (templateObject: any) => {
    try {
      const templateId = templateObject.id as DeliveryNoteTemplate;

      // Speichere Template in User Preferences
      if (user?.uid) {
        await UserPreferencesService.updateUserPreferences(user.uid, {
          preferredDeliveryNoteTemplate: templateId,
        });
      }

      // Update states
      setUserTemplate(templateId);
      setFormData(prev => ({ ...prev, template: templateId }));
      setShowTemplateSelect(false);

      toast.success(`Template &quot;${templateObject.name}&quot; ausgewählt und gespeichert`);
    } catch (error) {
      toast.error('Fehler beim Speichern der Template-Auswahl');
    }
  };

  const loadDeliveryNotes = async () => {
    try {
      setLoading(true);
      const notes = await DeliveryNoteService.getDeliveryNotesByCompany(companyId);
      setDeliveryNotes(notes);
    } catch (_error) {
      toast.error('Lieferscheine konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await DeliveryNoteService.getDeliveryNoteStats(companyId);
      setStats(statistics);
    } catch (error) {}
  };

  const handleCreateDeliveryNote = async () => {
    try {
      // Template-Auswahl - verwende Standard wenn kein Template ausgewählt
      let templateToUse = userTemplate;
      if (!templateToUse) {
        // Default Template setzen - German Standard
        templateToUse = 'german-standard';
      }

      if (!formData.customerName || !formData.customerAddress) {
        toast.error('Bitte wählen Sie einen Kunden aus');
        return;
      }

      if (!formData.items?.length) {
        toast.error('Bitte fügen Sie mindestens einen Artikel hinzu');
        return;
      }

      // Verwende die companyId aus den Props (sollte vom AuthContext/Layout kommen)
      const effectiveCompanyId = companyId || user?.uid;
      if (!effectiveCompanyId) throw new Error('Keine Firma gefunden');

      // Lagerbestand-Integration - Prüfung vor Erstellung
      if (formData.items && formData.items.length > 0) {
        try {
          const stockCheckResults = await Promise.all(
            formData.items.map(async item => {
              try {
                // Erst nach SKU suchen (falls vorhanden), dann nach Name
                let inventoryItem: InventoryItem | null = null;
                if (item.description.includes('-') || item.description.includes('_')) {
                  // Könnte eine SKU sein
                  inventoryItem = await InventoryService.getInventoryItemBySku(
                    effectiveCompanyId,
                    item.description
                  );
                }

                if (!inventoryItem) {
                  // Nach Name suchen
                  inventoryItem = await InventoryService.getInventoryItemByName(
                    effectiveCompanyId,
                    item.description
                  );
                }

                if (!inventoryItem) {
                  return {
                    item,
                    inventoryItem: null,
                    available: 0,
                    sufficient: false,
                    error: `Artikel &quot;${item.description}&quot; nicht im Lager gefunden`,
                  };
                }

                const available = inventoryItem.availableStock;
                const sufficient = available >= item.quantity;

                return {
                  item,
                  inventoryItem,
                  available,
                  sufficient,
                  error: sufficient
                    ? null
                    : `Nicht genügend Bestand: ${available} verfügbar, ${item.quantity} benötigt`,
                };
              } catch (itemError) {
                return {
                  item,
                  inventoryItem: null,
                  available: 0,
                  sufficient: false,
                  error: `Fehler beim Prüfen des Bestands für &quot;${item.description}&quot;`,
                };
              }
            })
          );

          // Prüfen ob alle Artikel ausreichend verfügbar sind
          const insufficientStock = stockCheckResults.filter(result => !result.sufficient);
          if (insufficientStock.length > 0) {
            const errorMessages = insufficientStock.map(result => result.error).join('\n');
            toast.error(`Lagerbestand-Probleme:\n${errorMessages}`);
            return;
          }
        } catch (inventoryError) {
          toast.warning(
            'Warnung: Lagerbestand konnte nicht geprüft werden. Lieferschein wird trotzdem erstellt.'
          );
        }
      }
      const deliveryNoteId = await DeliveryNoteService.createDeliveryNote({
        companyId: effectiveCompanyId,
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
        stockValidated: true,
        shippingMethod: formData.shippingMethod,
        notes: formData.notes,
        template: templateToUse, // Verwende das ausgewählte oder Standard-Template
        createdBy: effectiveCompanyId,
      });

      // Automatische Lagerbestand-Reduzierung
      if (formData.items && formData.items.length > 0) {
        try {
          const inventoryItems = formData.items.map(item => ({
            name: item.description,
            sku:
              item.description.includes('-') || item.description.includes('_')
                ? item.description
                : undefined,
            quantity: item.quantity,
            unit: item.unit,
          }));

          const stockResult = await InventoryService.reduceStockForDeliveryNote(
            effectiveCompanyId,
            inventoryItems,
            deliveryNoteId
          );

          if (stockResult.success) {
            toast.success('Lieferschein erfolgreich erstellt und Lagerbestand aktualisiert');
          } else {
            toast.warning(
              `Lieferschein erstellt, aber Lagerbestand-Update fehlgeschlagen: ${stockResult.errors.join(', ')}`
            );
          }
        } catch (stockError) {
          toast.warning(
            'Lieferschein erstellt, aber Lagerbestand konnte nicht automatisch reduziert werden'
          );
        }
      } else {
        toast.success('Lieferschein erfolgreich erstellt');
      }

      setShowCreateModal(false);
      resetForm();
      await loadDeliveryNotes();
      await loadStats();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('permissions')) {
          toast.error(
            'Keine Berechtigung zum Erstellen von Lieferscheinen. Bitte kontaktieren Sie den Support.'
          );
        } else if (error.message.includes('network')) {
          toast.error('Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.');
        } else {
          toast.error(`Fehler: ${error.message}`);
        }
      } else {
        toast.error('Lieferschein konnte nicht erstellt werden');
      }
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
    } catch (_error) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleMarkAsDelivered = async (id: string) => {
    try {
      await DeliveryNoteService.markAsDelivered(id);
      toast.success('Lieferschein als zugestellt markiert');
      await loadDeliveryNotes();
      await loadStats();
    } catch (_error) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  };

  const handleCreateInvoice = async (id: string) => {
    try {
      const invoiceId = await DeliveryNoteService.createInvoiceFromDeliveryNote(id);
      toast.success(`Rechnung ${invoiceId} erfolgreich erstellt`);
      await loadDeliveryNotes();
      await loadStats();
    } catch (_error) {
      toast.error('Rechnung konnte nicht erstellt werden');
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
    } catch (_error) {
      toast.error('Lieferschein konnte nicht gelöscht werden');
    }
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || [],
    }));
  };

  // Inventory Selection Handler (NEU)
  const handleInventoryItemsSelected = (items: DeliveryNoteItem[]) => {
    setFormData(prev => ({
      ...prev,
      items: items,
    }));

    // Berechne Gesamtsumme wenn Preise angezeigt werden
    if (formData.showPrices) {
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);
      const vatRate = 0.19; // 19% MwSt
      const tax = subtotal * vatRate;
      const total = subtotal + tax;

      setFormData(prev => ({
        ...prev,
        subtotal,
        tax,
        total,
        vatRate,
      }));
    }
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
      template: userTemplate || undefined, // Use user's preferred template (undefined if not selected)
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
    } catch (_error) {
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
    } catch (_error) {
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
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
                    >
                      {/* Header: Nummer, Status und wichtige Infos in einer Zeile */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Package className="h-5 w-5 text-[#14ad9f]" />
                          <div className="flex items-center space-x-3">
                            <h3 className="text-base font-semibold text-gray-900">
                              {note.deliveryNoteNumber}
                            </h3>
                            {getStatusBadge(note.status)}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600">{note.deliveryDate}</div>
                      </div>

                      {/* Kunde und Details in einer kompakten Zeile */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{note.customerName}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>{note.items.length} Artikel</span>
                            {note.showPrices && note.total && (
                              <span className="font-medium text-gray-900">
                                {note.total.toFixed(2)} €
                              </span>
                            )}
                            {note.orderNumber && <span>Bestellung: {note.orderNumber}</span>}
                            {note.trackingNumber && <span>Sendung: {note.trackingNumber}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Aktions-Buttons kompakt */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedNote(note)}
                          className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                        >
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
                              className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
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
                            className="border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600"
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
                            className="border-purple-500 text-purple-600 hover:bg-purple-50 hover:border-purple-600"
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
                            className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:border-orange-600"
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
                            className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            E-Mail senden
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/print/delivery-note/${note.id}`, '_blank')}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Drucken
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDeliveryNote(note.id!)}
                          className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Löschen
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
          <DeliveryNoteSettingsComponent companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Modal für neuen Lieferschein */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-none w-[98vw] max-h-[80vh] overflow-auto">
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
                      Kunde aus Datenbank auswählen (KD-Nummer)
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

              {/* Artikel aus Inventar auswählen */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Artikel</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInventorySelector(true)}
                    className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Aus Inventar auswählen
                  </Button>
                </div>

                {/* Artikel-Liste */}
                {formData.items && formData.items.length > 0 && (
                  <div className="space-y-2">
                    {formData.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.description}</span>
                            {item.productId && (
                              <Badge variant="outline" className="text-xs">
                                Inventar
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span>
                              Menge: {item.quantity} {item.unit}
                            </span>
                            {formData.showPrices && item.unitPrice && (
                              <span className="ml-4">
                                Preis: {item.unitPrice.toFixed(2)}€ × {item.quantity} ={' '}
                                {(item.unitPrice * item.quantity).toFixed(2)}€
                              </span>
                            )}
                            {item.warehouseLocation && (
                              <span className="ml-4">Lager: {item.warehouseLocation}</span>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {formData.showPrices && (
                      <div className="border-t pt-2 mt-4">
                        <div className="text-right font-medium">
                          Gesamt:{' '}
                          {formData.items
                            .reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)
                            .toFixed(2)}
                          €
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(!formData.items || formData.items.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Keine Artikel ausgewählt</p>
                    <p className="text-sm">
                      {' '}
                      <p>
                        Klicken Sie auf &quot;Aus Inventar auswählen&quot;, um Artikel hinzuzufügen
                      </p>
                    </p>
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
          <DialogContent className="max-w-none w-[98vw] max-h-[80vh] overflow-auto">
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
          <DialogContent className="max-w-none w-[98vw] max-h-[80vh] overflow-auto">
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
      <CustomerSelect
        companyId={companyId}
        onCustomerSelect={handleCustomerSelect}
        selectedCustomer={selectedCustomer}
        isOpen={showCustomerSelect}
        onClose={() => setShowCustomerSelect(false)}
        onOpenRequest={() => setShowCustomerSelect(true)}
      />

      {/* Template Selection Modal (NEU für Phase 2) */}
      {showTemplateSelect && (
        <Dialog open={showTemplateSelect} onOpenChange={setShowTemplateSelect}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Template auswählen</DialogTitle>
              <DialogDescription>
                Wählen Sie ein Template für Ihre Lieferscheine. Diese Auswahl wird für alle
                zukünftigen Lieferscheine gespeichert.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {templateLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {AVAILABLE_DELIVERY_NOTE_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 cursor-pointer hover:border-[#14ad9f] transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                        <Button size="sm" className="bg-[#14ad9f] hover:bg-[#129488] text-white">
                          Auswählen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowTemplateSelect(false)}>
                Abbrechen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Inventory Selector */}
      <InventorySelector
        isOpen={showInventorySelector}
        onClose={() => setShowInventorySelector(false)}
        companyId={companyId}
        onItemSelected={handleInventoryItemsSelected}
        selectedItems={formData.items || []}
      />
    </div>
  );
}

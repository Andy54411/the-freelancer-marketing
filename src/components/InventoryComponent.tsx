'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  addDoc,
  serverTimestamp,
  getDocs,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  FieldValue,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';
import type { InventoryItem, InventoryStats, StockMovement } from '@/services/inventoryService';
import type { InventoryCategoryExtended } from '@/services/types';
import { InventoryService } from '@/services/inventoryService';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle,
  ChevronsUpDown,
  Edit,
  Eye,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Download,
  Box as BoxIcon,
  Folder as FolderIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  //
  InventoryCategory,
} from '@/services/inventoryService';

interface InventoryComponentProps {
  companyId: string;
}

export default function InventoryComponent({ companyId }: InventoryComponentProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [serviceCount, setServiceCount] = useState<number>(0);
  const [services, setServices] = useState<any[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  // Inline-Dienstleistungen
  const [inlineServices, setInlineServices] = useState<any[]>([]);
  const [newInlineService, setNewInlineService] = useState('');
  const [savingInlineService, setSavingInlineService] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Form-States für neuen Artikel
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    unit: 'Stück',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    supplierName: '',
    location: '',
    status: 'active' as const,
  });

  // Stock-Adjustment States
  const [stockAdjustment, setStockAdjustment] = useState<{
    newStock: number;
    reason: string;
    type: 'in' | 'out' | 'adjustment';
  }>({
    newStock: 0,
    reason: '',
    type: 'adjustment',
  });

  const loadData = useCallback(async (): Promise<void> => {
    try {
      if (!companyId) return; // Früher Return wenn keine companyId

      setLoading(true);
      // Lade Daten aus beiden Collections parallel
      const [itemsData, statsData, movementsData, categoriesData, inlineServicesSnap] =
        await Promise.all([
          InventoryService.getInventoryItems(companyId),
          InventoryService.getInventoryStats(companyId),
          InventoryService.getStockMovements(companyId),
          InventoryService.getCategories(companyId),
          getDocs(collection(db, 'companies', companyId, 'inlineInvoiceServices')),
        ]);

      // Konvertiere inline Services zu ServiceItem Format
      const inlineServicesData = inlineServicesSnap.docs.map(doc => {
        const data = doc.data();
        const price =
          typeof data.price === 'number'
            ? data.price
            : typeof data.price === 'string'
              ? parseFloat(data.price)
              : 0;

        return {
          id: doc.id,
          name: data.name || 'Unbenannte Dienstleistung',
          description: data.description || '',
          category: 'Dienstleistung',
          sellingPrice: price,
          unit: data.unit || 'Std',
          status: 'active' as const,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          companyId,
          sku: `SRV-${doc.id.slice(0, 8)}`, // Generiere eine Service-SKU
          currentStock: 1, // Dienstleistungen sind immer verfügbar
          minStock: 0,
          maxStock: 999999,
          reservedStock: 0,
          availableStock: 1,
          purchasePrice: price, // Für Dienstleistungen setzen wir den gleichen Preis
          stockValue: price,
          isLowStock: false,
          isOutOfStock: false,
        } satisfies InventoryItem;
      });

      // Kombiniere beide Datensätze - Deduplizierung nach ID
      const combinedItems: InventoryItem[] = [
        ...itemsData,
        ...inlineServicesData.filter(service => !itemsData.some(item => item.id === service.id)),
      ];

      // Aktualisiere Stats mit deduplizierten Daten
      const updatedStats = {
        ...statsData,
        totalItems: combinedItems.length,
        totalValue: combinedItems.reduce((sum, item) => sum + (item.sellingPrice || 0), 0),
        serviceItems: inlineServicesData.length,
        inventoryItems: itemsData.length,
      };

      setItems(combinedItems);
      setStats(updatedStats);
      setMovements(movementsData);
      setCategories([
        {
          id: 'dienstleistung',
          name: 'Dienstleistung',
          description: 'Dienstleistungen und Services',
          companyId,
          itemCount: inlineServicesData.length,
          totalValue: inlineServicesData.reduce((sum, item) => sum + (item.sellingPrice || 0), 0),
          lastUpdate: getMaxTimestamp(inlineServicesData),
        } as InventoryCategoryExtended,
        {
          id: 'artikel',
          name: 'Artikel',
          description: 'Physische Artikel und Produkte',
          companyId,
          itemCount: itemsData.filter(i => i.category === 'Artikel').length,
          totalValue: itemsData
            .filter(i => i.category === 'Artikel')
            .reduce((sum, item) => sum + (item.sellingPrice || 0), 0),
          lastUpdate: getMaxTimestamp(itemsData.filter(i => i.category === 'Artikel')),
        } as InventoryCategoryExtended,
        ...categoriesData
          .filter(cat => cat.name !== 'Dienstleistung' && cat.name !== 'Artikel')
          .map(
            cat =>
              ({
                ...cat,
                itemCount: items.filter(i => i.category === cat.name).length,
                totalValue: items
                  .filter(i => i.category === cat.name)
                  .reduce((sum, item) => sum + (item.sellingPrice || 0), 0),
                lastUpdate: getMaxTimestamp(items.filter(i => i.category === cat.name)),
              }) as InventoryCategoryExtended
          ),
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]); // Entferne items aus den Dependencies

  // Services aus Subcollection mitzählen
  useEffect(() => {
    loadData();
    // Rechnungsdienstleistungen und existierende Services laden
    const fetchAllServices = async () => {
      try {
        // Rechnungsdienstleistungen
        const invoiceCol = collection(db, 'companies', companyId, 'invoiceServices');
        const invoiceSnap = await getDocs(invoiceCol);
        const invoiceServices = invoiceSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'invoiceServices',
        }));
        setServiceCount(invoiceSnap.size);
        setServices(invoiceServices);

        // Inline-Dienstleistungen
        const inlineCol = collection(db, 'companies', companyId, 'inlineInvoiceServices');
        const inlineSnap = await getDocs(inlineCol);
        const inlineServices = inlineSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'inlineServices',
        }));
        setInlineServices(inlineServices);

        // Alle Services für Autocomplete kombinieren
        setExistingServices([...invoiceServices, ...inlineServices]);
      } catch (e) {
        console.error('Fehler beim Laden der Dienstleistungen:', e);
        setServiceCount(0);
        setServices([]);
        setInlineServices([]);
        setExistingServices([]);
      }
    };
    fetchAllServices();
  }, [loadData, companyId]);

  // State für Inline-Service Dialog und Autocomplete
  const [inlineServiceDialogOpen, setInlineServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [isCreatingNewService, setIsCreatingNewService] = useState(false);
  const [existingServices, setExistingServices] = useState<any[]>([]);
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'Stk',
  });

  // Neue/Bearbeite Inline-Dienstleistung speichern
  async function handleSaveInlineService() {
    if (!companyId || !newServiceForm.name.trim()) return;
    setSavingInlineService(true);
    try {
      // Prüfen ob die Dienstleistung bereits existiert
      const existingService = existingServices.find(
        service => service.name.toLowerCase() === newServiceForm.name.trim().toLowerCase()
      );

      if (existingService && !isCreatingNewService) {
        // Existierende Dienstleistung auswählen
        setSelectedService(existingService.name);
        setInlineServiceDialogOpen(false);
        toast.success('Dienstleistung ausgewählt');
      } else {
        // Neue Dienstleistung erstellen
        const data: {
          name: string;
          description: string;
          price: number;
          unit: string;
          updatedAt: FieldValue;
          createdAt?: FieldValue;
        } = {
          name: newServiceForm.name.trim(),
          description: newServiceForm.description?.trim(),
          price: newServiceForm.price ? parseFloat(newServiceForm.price) : 0,
          unit: newServiceForm.unit || 'Stk',
          updatedAt: serverTimestamp(),
        };

        if (editingService) {
          // Aktualisieren
          const docRef = doc(
            db,
            'companies',
            companyId,
            'inlineInvoiceServices',
            editingService.id
          );
          await updateDoc(docRef, { ...data });
        } else {
          // Neu erstellen
          data.createdAt = serverTimestamp();
          await addDoc(collection(db, 'companies', companyId, 'inlineInvoiceServices'), data);
        }

        // UI zurücksetzen
        setNewServiceForm({
          name: '',
          description: '',
          price: '',
          unit: 'Stk',
        });
        setEditingService(null);
        setSelectedService('');
        setIsCreatingNewService(false);
        setInlineServiceDialogOpen(false);

        // Nach dem Speichern neu laden
        const col = collection(db, 'companies', companyId, 'inlineInvoiceServices');
        const snap = await getDocs(col);
        const updatedServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInlineServices(updatedServices);
        // Aktualisiere auch die existingServices Liste
        setExistingServices([...services, ...updatedServices]);
        toast.success(
          editingService ? 'Dienstleistung aktualisiert' : 'Dienstleistung gespeichert'
        );
      }
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      toast.error('Fehler beim Speichern der Dienstleistung');
    } finally {
      setSavingInlineService(false);
    }
  }

  // Inline-Service löschen
  async function handleDeleteInlineService(serviceId: string) {
    if (!companyId || !serviceId) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'inlineInvoiceServices', serviceId));
      // Nach dem Löschen neu laden
      const col = collection(db, 'companies', companyId, 'inlineInvoiceServices');
      const snap = await getDocs(col);
      setInlineServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      toast.success('Dienstleistung gelöscht');
    } catch (e) {
      console.error('Fehler beim Löschen:', e);
      toast.error('Fehler beim Löschen der Dienstleistung');
    }
  }

  const handleAddItem = async () => {
    try {
      await InventoryService.addInventoryItem(companyId, {
        ...newItem,
        reservedStock: 0,
        availableStock: newItem.currentStock,
      });
      await loadData();
      setShowAddDialog(false);
      setNewItem({
        name: '',
        description: '',
        sku: '',
        category: '',
        unit: 'Stück',
        currentStock: 0,
        minStock: 0,
        maxStock: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        supplierName: '',
        location: '',
        status: 'active',
      });
    } catch (error) {}
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem) return;

    try {
      await InventoryService.adjustStock(
        companyId,
        selectedItem?.id || '',
        selectedItem?.name || '',
        stockAdjustment.newStock,
        selectedItem?.unit || '',
        stockAdjustment.reason,
        stockAdjustment.type
      );
      await loadData();
      setShowStockDialog(false);
      setStockAdjustment({ newStock: 0, reason: '', type: 'adjustment' });
      setSelectedItem(null);
    } catch (error) {}
  };

  // Handler für Detail-Ansicht
  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  // Handler für Artikel löschen
  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      await InventoryService.deleteInventoryItem(companyId, selectedItem?.id || '');
      await loadData();
      setShowDeleteDialog(false);
      setSelectedItem(null);
    } catch (error) {}
  };

  const handleConfirmDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Nie';
    if (timestamp instanceof Date) return timestamp.toLocaleDateString('de-DE');
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('de-DE');
    return 'Ungültiges Datum';
  };

  const getMaxTimestamp = (items: any[]) => {
    const timestamps = items.map(i => i.updatedAt?.seconds || 0).filter(s => s > 0);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps) * 1000) : null;
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.isOutOfStock) {
      return { color: 'bg-red-500', text: 'Nicht verfügbar', icon: AlertCircle };
    } else if (item.isLowStock) {
      return { color: 'bg-yellow-500', text: 'Niedrig', icon: AlertTriangle };
    } else {
      return { color: 'bg-green-500', text: 'Verfügbar', icon: CheckCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiken */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamte Artikel</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">{stats.totalCategories} Kategorien</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamtwert</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Ø {formatCurrency(stats.averageValue)} pro Artikel
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Niedriger Bestand</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Benötigen Aufstockung</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nicht verfügbar</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">Ausverkaufte Artikel</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab-Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="movements">Bewegungen</TabsTrigger>
          <TabsTrigger value="categories">Kategorien</TabsTrigger>
          <TabsTrigger value="services">Dienstleistungen</TabsTrigger>
        </TabsList>
        {/* Dienstleistungen Tab */}
        <TabsContent value="services" className="space-y-4">
          {/* Service Dialog */}
          <Dialog open={inlineServiceDialogOpen} onOpenChange={setInlineServiceDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Dienstleistung bearbeiten' : 'Neue Dienstleistung'}
                </DialogTitle>
                <DialogDescription>
                  {editingService
                    ? 'Bearbeiten Sie die Details der ausgewählten Dienstleistung.'
                    : 'Fügen Sie eine neue Dienstleistung zu Ihrer Sammlung hinzu.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newServiceForm.name}
                    onChange={e => setNewServiceForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Beratung, Installation, Support"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={newServiceForm.description}
                    onChange={e =>
                      setNewServiceForm(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Detaillierte Beschreibung der Dienstleistung..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Preis</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newServiceForm.price}
                      onChange={e =>
                        setNewServiceForm(prev => ({ ...prev, price: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Einheit</Label>
                    <Select
                      value={newServiceForm.unit}
                      onValueChange={value => setNewServiceForm(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stk">Stück</SelectItem>
                        <SelectItem value="Std">Stunde</SelectItem>
                        <SelectItem value="Tag">Tag</SelectItem>
                        <SelectItem value="Monat">Monat</SelectItem>
                        <SelectItem value="Pauschale">Pauschale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInlineServiceDialogOpen(false);
                    setEditingService(null);
                    setNewServiceForm({
                      name: '',
                      description: '',
                      price: '',
                      unit: 'Stk',
                    });
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={async () => {
                    await handleSaveInlineService();
                    // Nach dem Speichern direkt zur Rechnungserstellung weiterleiten
                    const serviceData = {
                      name: newServiceForm.name,
                      description: newServiceForm.description,
                      price: parseFloat(newServiceForm.price),
                      unit: newServiceForm.unit,
                      quantity: 1,
                    };
                    // Service-Daten im localStorage zwischenspeichern
                    localStorage.setItem('newInvoiceService', JSON.stringify(serviceData));
                    // Zur Rechnungserstellung navigieren
                    window.location.href = `/dashboard/company/${companyId}/finance/invoices/create?addService=true`;
                  }}
                  disabled={savingInlineService || !newServiceForm.name.trim()}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  {savingInlineService ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2"></span>
                      Speichern...
                    </>
                  ) : (
                    <>{editingService ? 'Aktualisieren' : 'Speichern & zur Rechnung'}</>
                  )}
                </Button>
                <Button
                  onClick={handleSaveInlineService}
                  disabled={savingInlineService || !newServiceForm.name.trim()}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  {savingInlineService ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2"></span>
                      Speichern...
                    </>
                  ) : (
                    <>Nur speichern</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Aktionen */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Gespeicherte Dienstleistungen</h3>
              <p className="text-sm text-muted-foreground">
                Verwalten Sie hier Ihre häufig verwendeten Dienstleistungen für Rechnungen und
                Angebote.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Neue Dienstleistung oder Auswahl */}
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="min-w-[280px] justify-between"
                    >
                      {selectedService
                        ? existingServices.find(service => service.name === selectedService)?.name
                        : 'Dienstleistung auswählen oder neu erstellen...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <Command>
                      <CommandInput placeholder="Dienstleistung suchen..." />
                      <CommandEmpty>
                        <div className="p-2 text-sm">
                          Keine Dienstleistung gefunden.
                          <Button
                            variant="ghost"
                            className="w-full mt-2 text-[#14ad9f]"
                            onClick={() => {
                              setIsCreatingNewService(true);
                              setNewServiceForm({
                                ...newServiceForm,
                                name: selectedService,
                              });
                              setInlineServiceDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Neue Dienstleistung erstellen
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {existingServices.map(service => (
                          <CommandItem
                            key={service.id}
                            onSelect={() => {
                              setSelectedService(service.name);
                              setNewServiceForm({
                                name: service.name,
                                description: service.description || '',
                                price: service.price?.toString() || '',
                                unit: service.unit || 'Stk',
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedService === service.name ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {service.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={() => {
                    setEditingService(null);
                    setNewServiceForm({
                      name: '',
                      description: '',
                      price: '',
                      unit: 'Stk',
                    });
                    setIsCreatingNewService(true);
                    setInlineServiceDialogOpen(true);
                  }}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Dienstleistung
                </Button>
              </div>
            </div>
          </div>

          {/* Dienstleistungen Tabelle */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead className="w-[300px]">Beschreibung</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead className="text-right">Preis</TableHead>
                  <TableHead className="text-right">Zuletzt geändert</TableHead>
                  <TableHead className="w-[100px] text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inlineServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <Package className="h-8 w-8 text-[#14ad9f]" />
                        <div className="text-lg font-medium">Keine Dienstleistungen</div>
                        <div className="text-sm text-muted-foreground">
                          Fügen Sie Ihre erste Dienstleistung hinzu, um sie in Rechnungen und
                          Angeboten schnell auswählen zu können.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inlineServices.map(service => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">
                        {service.name || 'Unbenannte Dienstleistung'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {service.description || '-'}
                      </TableCell>
                      <TableCell>{service.unit || 'Stk'}</TableCell>
                      <TableCell className="text-right">
                        {service.price
                          ? new Intl.NumberFormat('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(service.price)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatTimestamp(service.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-[#14ad9f] hover:text-[#129488] p-1"
                            title="Bearbeiten"
                            onClick={() => {
                              setEditingService(service);
                              setNewServiceForm({
                                name: service.name || '',
                                description: service.description || '',
                                price: service.price?.toString() || '',
                                unit: service.unit || 'Stk',
                              });
                              setInlineServiceDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-500 hover:text-red-600 p-1"
                            title="Löschen"
                            onClick={() => {
                              if (
                                window.confirm('Möchten Sie diese Dienstleistung wirklich löschen?')
                              ) {
                                handleDeleteInlineService(service.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Übersicht Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filter und Aktionen */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Artikel suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name} ({category.itemCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                  <SelectItem value="discontinued">Eingestellt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#14ad9f] hover:bg-[#129488]">
                    <Plus className="h-4 w-4 mr-2" />
                    Artikel hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Neuen Artikel hinzufügen</DialogTitle>
                    <DialogDescription>
                      Fügen Sie einen neuen Artikel zu Ihrem Lagerbestand hinzu.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Artikelname *</Label>
                      <Input
                        id="name"
                        value={newItem.name}
                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="z.B. Schrauben M8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">Artikelnummer (SKU)</Label>
                      <Input
                        id="sku"
                        value={newItem.sku}
                        onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                        placeholder="z.B. SCR-M8-100"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="description">Beschreibung</Label>
                      <Textarea
                        id="description"
                        value={newItem.description}
                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Detaillierte Beschreibung des Artikels..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategorie</Label>
                      <Select
                        value={newItem.category}
                        onValueChange={value => setNewItem({ ...newItem, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Kategorie wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dienstleistung">Dienstleistung</SelectItem>
                          <SelectItem value="Artikel">Artikel</SelectItem>
                          <SelectItem value="">Keine Kategorie</SelectItem>
                          {/* Dynamische Kategorien aus bestehenden Kategorien */}
                          {categories
                            .filter(cat => cat.name !== 'Dienstleistung' && cat.name !== 'Artikel')
                            .map(category => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name} ({category.itemCount})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Einheit</Label>
                      <Select
                        value={newItem.unit}
                        onValueChange={value => setNewItem({ ...newItem, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stück">Stück</SelectItem>
                          <SelectItem value="kg">Kilogramm</SelectItem>
                          <SelectItem value="g">Gramm</SelectItem>
                          <SelectItem value="Liter">Liter</SelectItem>
                          <SelectItem value="m">Meter</SelectItem>
                          <SelectItem value="m²">Quadratmeter</SelectItem>
                          <SelectItem value="m³">Kubikmeter</SelectItem>
                          <SelectItem value="Paket">Paket</SelectItem>
                          <SelectItem value="Box">Box</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentStock">Aktueller Bestand</Label>
                      <Input
                        id="currentStock"
                        type="number"
                        value={newItem.currentStock}
                        onChange={e =>
                          setNewItem({ ...newItem, currentStock: Number(e.target.value) })
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Mindestbestand</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={newItem.minStock}
                        onChange={e => setNewItem({ ...newItem, minStock: Number(e.target.value) })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">Einkaufspreis (€)</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        value={newItem.purchasePrice}
                        onChange={e =>
                          setNewItem({ ...newItem, purchasePrice: Number(e.target.value) })
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sellingPrice">Verkaufspreis (€)</Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        value={newItem.sellingPrice}
                        onChange={e =>
                          setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Lieferant</Label>
                      <Input
                        id="supplier"
                        value={newItem.supplierName}
                        onChange={e => setNewItem({ ...newItem, supplierName: e.target.value })}
                        placeholder="Name des Lieferanten"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Lagerort</Label>
                      <Input
                        id="location"
                        value={newItem.location}
                        onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                        placeholder="z.B. Regal A3"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleAddItem}
                      className="bg-[#14ad9f] hover:bg-[#129488]"
                      disabled={!newItem.name}
                    >
                      Artikel hinzufügen
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Artikel-Tabelle */}
          <Card>
            <CardHeader>
              <CardTitle>Lagerbestand</CardTitle>
              <CardDescription>
                {filteredItems.length} von {items.length} Artikeln angezeigt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artikel</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Bestand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wert</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => {
                    const status = getStockStatus(item);
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">
                                {item.description.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {item.sku || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.currentStock} {item.unit}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Min: {item.minStock} {item.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 text-${status.color.replace('bg-', '').replace('-500', '-600')}`}
                            />
                            <span className="text-sm">{status.text}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatCurrency(item.stockValue)}</div>
                            <div className="text-xs text-muted-foreground">
                              EK: {formatCurrency(item.purchasePrice)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setStockAdjustment({
                                  newStock: item.currentStock,
                                  reason: '',
                                  type: 'adjustment',
                                });
                                setShowStockDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(item)}
                              title="Details anzeigen"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmDelete(item)}
                              className="text-red-600 hover:text-red-800"
                              title="Artikel löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bewegungen Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lagerbewegungen</CardTitle>
              <CardDescription>Chronologie aller Bestandsänderungen</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Artikel</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Menge</TableHead>
                    <TableHead>Grund</TableHead>
                    <TableHead>Bestand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 10).map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>{movement.createdAt.toLocaleDateString('de-DE')}</TableCell>
                      <TableCell>{movement.itemName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movement.type === 'in'
                              ? 'default'
                              : movement.type === 'out'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {movement.type === 'in'
                            ? 'Zugang'
                            : movement.type === 'out'
                              ? 'Abgang'
                              : 'Anpassung'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.type === 'out' ? '-' : '+'}
                        {movement.quantity} {movement.unit}
                      </TableCell>
                      <TableCell>{movement.reason || '-'}</TableCell>
                      <TableCell>
                        {movement.previousStock} → {movement.newStock} {movement.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kategorien Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Kategorien Übersicht</h3>
              <p className="text-sm text-muted-foreground">
                Ihre Artikel und Dienstleistungen nach Kategorien
              </p>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Kategorie</TableHead>
                  <TableHead>Anzahl Artikel</TableHead>
                  <TableHead className="text-right">Gesamtwert</TableHead>
                  <TableHead>Letzter Eintrag</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Feste Kategorien */}
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#14ad9f]" />
                      Dienstleistungen
                    </div>
                  </TableCell>
                  <TableCell>
                    {items.filter(i => i.category === 'Dienstleistung').length + serviceCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      items
                        .filter(i => i.category === 'Dienstleistung')
                        .reduce((sum, item) => sum + (item.sellingPrice || 0), 0)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {items.filter(i => i.category === 'Dienstleistung').length > 0
                      ? formatTimestamp(
                          getMaxTimestamp(items.filter(i => i.category === 'Dienstleistung'))
                        )
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Aktiv
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <BoxIcon className="h-4 w-4 text-[#14ad9f]" />
                      Artikel
                    </div>
                  </TableCell>
                  <TableCell>{items.filter(i => i.category === 'Artikel').length}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      items
                        .filter(i => i.category === 'Artikel')
                        .reduce((sum, item) => sum + (item.sellingPrice || 0), 0)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {items.filter(i => i.category === 'Artikel').length > 0
                      ? formatTimestamp(
                          getMaxTimestamp(items.filter(i => i.category === 'Artikel'))
                        )
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Aktiv
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Dynamische Kategorien */}
                {categories
                  .filter(
                    category => category.name !== 'Dienstleistung' && category.name !== 'Artikel'
                  )
                  .map(category => {
                    const categoryItems = items.filter(i => i.category === category.name);
                    const categoryValue = categoryItems.reduce(
                      (sum, item) => sum + (item.sellingPrice || 0),
                      0
                    );
                    const lastUpdate =
                      categoryItems.length > 0
                        ? formatTimestamp(getMaxTimestamp(categoryItems))
                        : '-';

                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 text-[#14ad9f]" />
                            {category.name}
                          </div>
                        </TableCell>
                        <TableCell>{category.itemCount}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(categoryValue)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{lastUpdate}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Aktiv
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {/* Zusammenfassung */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">Gesamt</TableCell>
                  <TableCell>{items.length + serviceCount}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(items.reduce((sum, item) => sum + (item.sellingPrice || 0), 0))}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stock-Adjustment Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestand anpassen</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} - Aktueller Bestand: {selectedItem?.currentStock}{' '}
              {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">Typ der Anpassung</Label>
              <Select
                value={stockAdjustment.type}
                onValueChange={value =>
                  setStockAdjustment({
                    ...stockAdjustment,
                    type: value as 'in' | 'out' | 'adjustment',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Zugang</SelectItem>
                  <SelectItem value="out">Abgang</SelectItem>
                  <SelectItem value="adjustment">Korrektur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newStock">Neuer Bestand</Label>
              <Input
                id="newStock"
                type="number"
                value={stockAdjustment.newStock}
                onChange={e =>
                  setStockAdjustment({
                    ...stockAdjustment,
                    newStock: Number(e.target.value),
                  })
                }
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Grund der Anpassung</Label>
              <Textarea
                id="reason"
                value={stockAdjustment.reason}
                onChange={e =>
                  setStockAdjustment({
                    ...stockAdjustment,
                    reason: e.target.value,
                  })
                }
                placeholder="Grund für die Bestandsänderung..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleStockAdjustment}
              className="bg-[#14ad9f] hover:bg-[#129488]"
              disabled={!stockAdjustment.reason}
            >
              Bestand anpassen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail-Ansicht Modal */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-none w-95vw max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Artikel-Details: {selectedItem?.name}</DialogTitle>
            <DialogDescription>Vollständige Informationen zum Artikel</DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Grunddaten</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="font-medium">Name:</Label>
                      <p className="text-gray-900">{selectedItem.name}</p>
                    </div>
                    <div>
                      <Label className="font-medium">SKU/Artikelnummer:</Label>
                      <p className="text-gray-900">{selectedItem.sku}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Beschreibung:</Label>
                      <p className="text-gray-900">
                        {selectedItem.description || 'Keine Beschreibung'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Kategorie:</Label>
                      <p className="text-gray-900">{selectedItem.category}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Status:</Label>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedItem.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : selectedItem.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {selectedItem.status === 'active'
                          ? 'Aktiv'
                          : selectedItem.status === 'inactive'
                            ? 'Inaktiv'
                            : 'Eingestellt'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Bestand & Preise</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="font-medium">Aktueller Bestand:</Label>
                      <p className="text-gray-900">
                        {selectedItem.currentStock} {selectedItem.unit}
                        <span
                          className={`ml-2 px-2 py-1 rounded text-xs ${getStockStatus(selectedItem).color}`}
                        >
                          {getStockStatus(selectedItem).text}
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Mindestbestand:</Label>
                      <p className="text-gray-900">
                        {selectedItem.minStock} {selectedItem.unit}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Maximalbestand:</Label>
                      <p className="text-gray-900">
                        {selectedItem.maxStock || 'Nicht festgelegt'} {selectedItem.unit}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Einkaufspreis:</Label>
                      <p className="text-gray-900">{formatCurrency(selectedItem.purchasePrice)}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Verkaufspreis:</Label>
                      <p className="text-gray-900">{formatCurrency(selectedItem.sellingPrice)}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Lagerwert:</Label>
                      <p className="text-gray-900 font-semibold">
                        {formatCurrency(selectedItem.stockValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Lieferant</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="font-medium">Lieferant:</Label>
                      <p className="text-gray-900">
                        {selectedItem.supplierName || 'Nicht angegeben'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Kontakt:</Label>
                      <p className="text-gray-900">
                        {selectedItem.supplierContact || 'Nicht angegeben'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Lager & Zusätzliches</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="font-medium">Lagerort:</Label>
                      <p className="text-gray-900">{selectedItem.location || 'Nicht angegeben'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Barcode:</Label>
                      <p className="text-gray-900">{selectedItem.barcode || 'Nicht angegeben'}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Gewicht:</Label>
                      <p className="text-gray-900">
                        {selectedItem.weight ? `${selectedItem.weight} kg` : 'Nicht angegeben'}
                      </p>
                    </div>
                    {selectedItem.notes && (
                      <div>
                        <Label className="font-medium">Notizen:</Label>
                        <p className="text-gray-900">{selectedItem.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Zeitstempel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Erstellt:</Label>
                    <p className="text-gray-900">
                      {new Date(selectedItem.createdAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Zuletzt geändert:</Label>
                    <p className="text-gray-900">
                      {new Date(selectedItem.updatedAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lösch-Bestätigung Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie den Artikel &quot;{selectedItem?.name}&quot; löschen
              möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Artikel löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { InventoryService, WEIGHT_VOLUME_UNITS, SALES_UNITS } from '@/services/inventoryService';
import { CustomerService } from '@/services/customerService';
import type { Customer } from '@/components/finance/AddCustomerModal';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle,
  ChevronsUpDown,
  Edit,
  Eye,
  Mail,
  Package,
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
  const [_newInlineService, _setNewInlineService] = useState('');
  const [savingInlineService, setSavingInlineService] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<InventoryCategoryExtended[]>([]);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});

  // Form-States für Artikel bearbeiten
  const [editItem, setEditItem] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    unit: 'Flasche',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    supplierName: '',
    supplierId: '',
    supplierEmail: '',
    location: '',
    barcode: '',
    // Inhalt pro Einheit (z.B. 0,33L Flasche)
    contentAmount: 0,
    contentUnit: 'L' as 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück',
    // Gewicht der Einheit inkl. Verpackung
    unitWeight: 0,
    weightUnit: 'g' as 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück',
    images: [] as string[],
    batchNumber: '',
    // Zusätzliche Inventur-Felder
    manufacturer: '',
    taxRate: 19,
    status: 'active' as 'active' | 'inactive' | 'discontinued',
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
      // Lade Daten aus allen Collections parallel inkl. Lieferanten
      const [itemsData, statsData, movementsData, categoriesData, inlineServicesSnap, suppliersData] =
        await Promise.all([
          InventoryService.getInventoryItems(companyId),
          InventoryService.getInventoryStats(companyId),
          InventoryService.getStockMovements(companyId),
          InventoryService.getCategories(companyId),
          getDocs(collection(db, 'companies', companyId, 'inlineInvoiceServices')),
          CustomerService.getSuppliers(companyId).catch(() => []),
        ]);

      // Setze Lieferanten
      setSuppliers(suppliersData);

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
      // stockValue = currentStock * purchasePrice (Bestandswert)
      const updatedStats = {
        ...statsData,
        totalItems: combinedItems.length,
        totalValue: combinedItems.reduce((sum, item) => sum + (item.stockValue || 0), 0),
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
          totalValue: inlineServicesData.reduce((sum, item) => sum + (item.stockValue || 0), 0),
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
            .reduce((sum, item) => sum + (item.stockValue || 0), 0),
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
                  .reduce((sum, item) => sum + (item.stockValue || 0), 0),
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
      toast.error('Fehler beim Löschen der Dienstleistung');
    }
  }

  // Bild-Upload-Handler für bearbeiteten Artikel
  const handleEditItemImageUpload = async (file: File, index: number) => {
    if (!selectedItem) return;
    
    try {
      setUploadingImages(prev => ({ ...prev, [index]: true }));
      
      const imageUrl = await InventoryService.uploadItemImage(companyId, selectedItem.id, file, index);
      
      setEditItem(prev => {
        const updatedImages = [...prev.images];
        updatedImages[index] = imageUrl;
        return { ...prev, images: updatedImages };
      });
      
      toast.success('Bild erfolgreich hochgeladen');
    } catch (error) {
      toast.error((error as Error).message || 'Fehler beim Hochladen des Bildes');
    } finally {
      setUploadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  // Bild löschen Handler für bearbeiteten Artikel
  const handleEditItemImageDelete = async (index: number) => {
    const imageUrl = editItem.images[index];
    if (imageUrl) {
      try {
        await InventoryService.deleteItemImage(imageUrl);
      } catch {
        // Ignoriere Fehler beim Löschen, falls Bild nicht existiert
      }
    }
    
    setEditItem(prev => {
      const updatedImages = [...prev.images];
      updatedImages[index] = '';
      return { ...prev, images: updatedImages.filter(img => img !== '') };
    });
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
    } catch {
      // Error handling - user sees UI feedback
    }
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
    } catch {
      // Error handling - user sees UI feedback
    }
  };

  const handleConfirmDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  // Handler für Artikel bearbeiten - öffnet das Edit-Modal mit vorausgefüllten Daten
  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditItem({
      name: item.name,
      description: item.description || '',
      sku: item.sku || '',
      category: item.category || '',
      unit: item.unit || 'Stück',
      currentStock: item.currentStock,
      minStock: item.minStock,
      maxStock: item.maxStock || 0,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      supplierName: item.supplierName || '',
      supplierId: item.supplierId || '',
      supplierEmail: item.supplierEmail || '',
      location: item.location || '',
      barcode: item.barcode || '',
      contentAmount: (item as any).contentAmount || 0,
      contentUnit: (item as any).contentUnit || 'L',
      unitWeight: item.unitWeight || 0,
      weightUnit: item.weightUnit || 'kg',
      images: item.images || [],
      batchNumber: (item as any).batchNumber || '',
      manufacturer: (item as any).manufacturer || '',
      taxRate: (item as any).taxRate || 19,
      status: item.status || 'active',
    });
    setShowEditDialog(true);
  };

  // Handler für Speichern der Bearbeitung
  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const itemRef = doc(db, 'companies', companyId, 'inventory', selectedItem.id);
      
      // Berechne die Bestandsdifferenz für die Historie
      const stockDifference = editItem.currentStock - selectedItem.currentStock;
      
      // Berechne Gesamtgewicht
      const totalWeight = InventoryService.calculateTotalWeight(editItem.unitWeight, editItem.currentStock);
      
      await updateDoc(itemRef, {
        name: editItem.name,
        description: editItem.description,
        sku: editItem.sku,
        category: editItem.category,
        unit: editItem.unit,
        currentStock: editItem.currentStock,
        minStock: editItem.minStock,
        maxStock: editItem.maxStock,
        purchasePrice: editItem.purchasePrice,
        sellingPrice: editItem.sellingPrice,
        supplierName: editItem.supplierName,
        supplierId: editItem.supplierId,
        supplierEmail: editItem.supplierEmail,
        location: editItem.location,
        barcode: editItem.barcode,
        unitWeight: editItem.unitWeight,
        weightUnit: editItem.weightUnit,
        totalWeight: totalWeight,
        batchNumber: editItem.batchNumber,
        images: editItem.images,
        status: editItem.status,
        availableStock: editItem.currentStock,
        stockValue: editItem.currentStock * editItem.purchasePrice,
        updatedAt: serverTimestamp(),
      });

      // Falls Bestand geändert wurde, füge einen Eintrag zur Historie hinzu
      if (stockDifference !== 0) {
        await InventoryService.adjustStock(
          companyId,
          selectedItem.id,
          editItem.name,
          editItem.currentStock,
          editItem.unit,
          'Bestandsanpassung durch Artikelbearbeitung',
          stockDifference > 0 ? 'in' : 'out'
        );
      }

      await loadData();
      setShowEditDialog(false);
      setSelectedItem(null);
      toast.success('Artikel erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Speichern der Änderungen');
    }
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
                  className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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
                  className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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
                  className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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
                            className="text-[#14ad9f] hover:text-taskilo-hover p-1"
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
                  {categories.filter(cat => cat.name).map(category => (
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

              <Link href={`/dashboard/company/${companyId}/inventory/new`}>
                <Button className="bg-[#14ad9f] hover:bg-teal-700 transition-colors">
                  <Plus className="h-4 w-4 mr-2" />
                  Artikel hinzufügen
                </Button>
              </Link>

              {/* Edit-Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl font-semibold text-gray-900">Artikel bearbeiten</DialogTitle>
                    <DialogDescription className="text-gray-500">
                      Bearbeiten Sie die Artikeldaten. Änderungen am Bestand werden protokolliert.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Grunddaten */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#14ad9f]" />
                        Grunddaten
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Artikelname *</Label>
                          <Input
                            value={editItem.name}
                            onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                            placeholder="z.B. Schrauben M8"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Artikelnummer (SKU)</Label>
                          <Input
                            value={editItem.sku}
                            onChange={e => setEditItem({ ...editItem, sku: e.target.value })}
                            placeholder="z.B. SCR-M8-100"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Beschreibung</Label>
                          <Textarea
                            value={editItem.description}
                            onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                            placeholder="Detaillierte Beschreibung des Artikels..."
                            rows={2}
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Kategorie</Label>
                          <Select
                            value={editItem.category}
                            onValueChange={value => setEditItem({ ...editItem, category: value })}
                          >
                            <SelectTrigger className="border-gray-200">
                              <SelectValue placeholder="Kategorie wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dienstleistung">Dienstleistung</SelectItem>
                              <SelectItem value="Artikel">Artikel</SelectItem>
                              <SelectItem value="none">Keine Kategorie</SelectItem>
                              {categories
                                .filter(cat => cat.name && cat.name !== 'Dienstleistung' && cat.name !== 'Artikel')
                                .map(category => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name} ({category.itemCount})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Einheit</Label>
                          <Select
                            value={editItem.unit}
                            onValueChange={value => setEditItem({ ...editItem, unit: value })}
                          >
                            <SelectTrigger className="border-gray-200">
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
                          <Label className="text-sm font-medium text-gray-700">Status</Label>
                          <Select
                            value={editItem.status}
                            onValueChange={(value: 'active' | 'inactive' | 'discontinued') => setEditItem({ ...editItem, status: value })}
                          >
                            <SelectTrigger className="border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Aktiv</SelectItem>
                              <SelectItem value="inactive">Inaktiv</SelectItem>
                              <SelectItem value="discontinued">Eingestellt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Bestand & Preise */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[#14ad9f]" />
                        Bestand & Preise
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Aktueller Bestand</Label>
                          <Input
                            type="number"
                            value={editItem.currentStock}
                            onChange={e => setEditItem({ ...editItem, currentStock: Number(e.target.value) })}
                            min="0"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                          {selectedItem && editItem.currentStock !== selectedItem.currentStock && (
                            <p className={`text-xs font-medium ${editItem.currentStock > selectedItem.currentStock ? 'text-green-600' : 'text-red-600'}`}>
                              {editItem.currentStock > selectedItem.currentStock ? '+' : ''}
                              {editItem.currentStock - selectedItem.currentStock} {editItem.unit}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Mindestbestand</Label>
                          <Input
                            type="number"
                            value={editItem.minStock}
                            onChange={e => setEditItem({ ...editItem, minStock: Number(e.target.value) })}
                            min="0"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Maximalbestand</Label>
                          <Input
                            type="number"
                            value={editItem.maxStock}
                            onChange={e => setEditItem({ ...editItem, maxStock: Number(e.target.value) })}
                            min="0"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Lagerort</Label>
                          <Input
                            value={editItem.location}
                            onChange={e => setEditItem({ ...editItem, location: e.target.value })}
                            placeholder="z.B. Regal A3"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Einkaufspreis (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editItem.purchasePrice}
                            onChange={e => setEditItem({ ...editItem, purchasePrice: Number(e.target.value) })}
                            min="0"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Verkaufspreis (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editItem.sellingPrice}
                            onChange={e => setEditItem({ ...editItem, sellingPrice: Number(e.target.value) })}
                            min="0"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Inventur & Maße */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <BoxIcon className="h-4 w-4 text-[#14ad9f]" />
                        Inventur & Maße
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Einzelgewicht/-volumen</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editItem.unitWeight}
                            onChange={e => setEditItem({ ...editItem, unitWeight: Number(e.target.value) })}
                            min="0"
                            placeholder="0.000"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Einheit</Label>
                          <Select
                            value={editItem.weightUnit}
                            onValueChange={(value: any) => setEditItem({ ...editItem, weightUnit: value })}
                          >
                            <SelectTrigger className="border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WEIGHT_VOLUME_UNITS.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Gesamtgewicht/-volumen</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={InventoryService.calculateTotalWeight(editItem.unitWeight, editItem.currentStock).toFixed(3)}
                              readOnly
                              className="border-gray-200 bg-gray-100 text-gray-600"
                            />
                            <span className="text-sm text-gray-500 min-w-10">{editItem.weightUnit}</span>
                          </div>
                          <p className="text-xs text-gray-400">Automatisch berechnet</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Barcode / EAN</Label>
                          <Input
                            value={editItem.barcode}
                            onChange={e => setEditItem({ ...editItem, barcode: e.target.value })}
                            placeholder="z.B. 4001234567890"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-medium text-gray-700">Chargennummer / Lot</Label>
                          <Input
                            value={editItem.batchNumber}
                            onChange={e => setEditItem({ ...editItem, batchNumber: e.target.value })}
                            placeholder="z.B. LOT-2026-001"
                            className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lieferant */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#14ad9f]" />
                        Lieferant
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Lieferant auswählen</Label>
                          <Select
                            value={editItem.supplierId || 'none'}
                            onValueChange={value => {
                              if (value === 'none') {
                                setEditItem({ ...editItem, supplierId: '', supplierName: '', supplierEmail: '' });
                              } else {
                                const supplier = suppliers.find(s => s.id === value);
                                if (supplier) {
                                  setEditItem({
                                    ...editItem,
                                    supplierId: supplier.id,
                                    supplierName: supplier.name,
                                    supplierEmail: supplier.email,
                                  });
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="border-gray-200">
                              <SelectValue placeholder="Lieferant auswählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Kein Lieferant</SelectItem>
                              {suppliers.map(supplier => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name} {supplier.customerNumber ? `(${supplier.customerNumber})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {editItem.supplierName && (
                            <p className="text-xs text-gray-500 mt-2">
                              Aktuell verknüpft: <span className="font-medium text-[#14ad9f]">{editItem.supplierName}</span>
                              {editItem.supplierEmail && <span className="ml-1">({editItem.supplierEmail})</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bilder */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <FolderIcon className="h-4 w-4 text-[#14ad9f]" />
                        Artikelbilder (max. 3)
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4">
                          {[0, 1, 2].map((index) => (
                            <div key={index} className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white hover:border-[#14ad9f] transition-colors group relative overflow-hidden">
                              {uploadingImages[index] ? (
                                <div className="flex flex-col items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
                                  <p className="text-xs text-gray-500 mt-2">Hochladen...</p>
                                </div>
                              ) : editItem.images[index] ? (
                                <div className="relative w-full h-full">
                                  <img src={editItem.images[index]} alt={`Bild ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                  <button
                                    type="button"
                                    onClick={() => handleEditItemImageDelete(index)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer w-full h-full flex items-center justify-center">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleEditItemImageUpload(file, index);
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                  <div className="text-center p-4">
                                    <Plus className="h-8 w-8 text-gray-400 mx-auto group-hover:text-[#14ad9f] transition-colors" />
                                    <p className="text-xs text-gray-500 mt-2">Bild {index + 1}</p>
                                    <p className="text-xs text-gray-400">Max. 5 MB</p>
                                  </div>
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          Erlaubte Formate: JPEG, PNG, WebP, GIF (max. 5 MB pro Bild)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={() => setShowEditDialog(false)} className="px-6">
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      className="bg-[#14ad9f] hover:bg-teal-700 transition-colors px-6"
                      disabled={!editItem.name}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Änderungen speichern
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
                    <TableHead>Lieferant</TableHead>
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
                          {item.supplierName ? (
                            <div className="text-sm">
                              <div className="font-medium">{item.supplierName}</div>
                              {item.supplierEmail && (
                                <div className="text-xs text-muted-foreground">
                                  {item.supplierEmail}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
                            <Link href={`/dashboard/company/${companyId}/inventory/${item.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Artikel bearbeiten"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/company/${companyId}/inventory/${item.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Details anzeigen"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bestand anpassen</DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4 py-2">
              {/* Artikelinformationen */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">SKU:</span>
                    <span className="ml-2 font-medium">{selectedItem.sku || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Kategorie:</span>
                    <span className="ml-2 font-medium">{selectedItem.category || '-'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-gray-500">Aktuell:</span>
                    <span className="ml-2 font-bold text-[#14ad9f]">{selectedItem.currentStock} {selectedItem.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Min:</span>
                    <span className="ml-2 font-medium">{selectedItem.minStock} {selectedItem.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max:</span>
                    <span className="ml-2 font-medium">{selectedItem.maxStock || '-'} {selectedItem.unit}</span>
                  </div>
                </div>
                {selectedItem.supplierName && (
                  <div>
                    <span className="text-gray-500">Lieferant:</span>
                    <span className="ml-2 font-medium">{selectedItem.supplierName}</span>
                  </div>
                )}
              </div>

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
                {stockAdjustment.newStock !== selectedItem.currentStock && (
                  <p className={`text-sm ${stockAdjustment.newStock > selectedItem.currentStock ? 'text-green-600' : 'text-red-600'}`}>
                    {stockAdjustment.newStock > selectedItem.currentStock ? '+' : ''}
                    {stockAdjustment.newStock - selectedItem.currentStock} {selectedItem.unit} Differenz
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Grund der Anpassung *</Label>
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
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleStockAdjustment}
              className="bg-[#14ad9f] hover:bg-taskilo-hover"
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
                      <Label className="font-medium">E-Mail:</Label>
                      <p className="text-gray-900">
                        {selectedItem.supplierEmail || 'Nicht angegeben'}
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Kontakt:</Label>
                      <p className="text-gray-900">
                        {selectedItem.supplierContact || 'Nicht angegeben'}
                      </p>
                    </div>
                    {selectedItem.supplierEmail && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const subject = encodeURIComponent(`Nachbestellung: ${selectedItem.name}`);
                          const body = encodeURIComponent(
                            `Sehr geehrte Damen und Herren,\n\nhiermit möchten wir folgende Artikel nachbestellen:\n\n` +
                            `Artikel: ${selectedItem.name}\n` +
                            `SKU: ${selectedItem.sku || '-'}\n` +
                            `Aktueller Bestand: ${selectedItem.currentStock} ${selectedItem.unit}\n` +
                            `Mindestbestand: ${selectedItem.minStock} ${selectedItem.unit}\n\n` +
                            `Bitte senden Sie uns ein Angebot.\n\n` +
                            `Mit freundlichen Grüßen`
                          );
                          window.open(`mailto:${selectedItem.supplierEmail}?subject=${subject}&body=${body}`);
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Nachbestellung anfragen
                      </Button>
                    )}
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
                        {selectedItem.unitWeight ? `${selectedItem.unitWeight} ${selectedItem.weightUnit || 'kg'}` : 'Nicht angegeben'}
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

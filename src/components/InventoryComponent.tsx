'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  History,
  Download,
  Upload,
} from 'lucide-react';

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
  InventoryService,
  InventoryItem,
  InventoryStats,
  StockMovement,
  InventoryCategory,
} from '@/services/inventoryService';

interface InventoryComponentProps {
  companyId: string;
}

export default function InventoryComponent({ companyId }: InventoryComponentProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
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

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, statsData, movementsData, categoriesData] = await Promise.all([
        InventoryService.getInventoryItems(companyId),
        InventoryService.getInventoryStats(companyId),
        InventoryService.getStockMovements(companyId),
        InventoryService.getCategories(companyId),
      ]);

      setItems(itemsData);
      setStats(statsData);
      setMovements(movementsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Fehler beim Laden der Inventardaten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      await InventoryService.addInventoryItem(companyId, newItem);
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
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Artikels:', error);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem) return;

    try {
      await InventoryService.adjustStock(
        companyId,
        selectedItem.id,
        selectedItem.name,
        stockAdjustment.newStock,
        selectedItem.unit,
        stockAdjustment.reason,
        stockAdjustment.type
      );
      await loadData();
      setShowStockDialog(false);
      setStockAdjustment({ newStock: 0, reason: '', type: 'adjustment' });
      setSelectedItem(null);
    } catch (error) {
      console.error('Fehler beim Anpassen des Bestands:', error);
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="movements">Bewegungen</TabsTrigger>
          <TabsTrigger value="categories">Kategorien</TabsTrigger>
        </TabsList>

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
                      <Input
                        id="category"
                        value={newItem.category}
                        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                        placeholder="z.B. Befestigungsmaterial"
                      />
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
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{category.itemCount}</div>
                      <div className="text-sm text-muted-foreground">Artikel</div>
                    </div>
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
}

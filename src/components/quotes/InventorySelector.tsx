'use client';

import React, { useState, useEffect } from 'react';
import { Search, Package, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InventoryService, InventoryItem } from '@/services/inventoryService';

interface InventorySelectorProps {
  companyId: string;
  onSelectItem: (item: InventoryItem, quantity: number) => void;
  selectedItems?: string[]; // IDs bereits ausgewählter Items
  quickAddOnClick?: boolean; // optional: beim Klick sofort ersten verfügbaren Artikel hinzufügen
}

export default function InventorySelector({
  companyId,
  onSelectItem,
  selectedItems = [],
  quickAddOnClick = false,
}: InventorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuantities, setSelectedQuantities] = useState<{ [key: string]: number }>({});

  // Inventar-Items laden
  const loadInventoryItems = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const items = await InventoryService.getInventoryItems(companyId);
      // Debug-Log
      // Alle Items anzeigen, nur discontinued ausschließen
      const availableItems = items.filter(item => item.status !== 'discontinued');
      // Debug-Log
      setInventoryItems(availableItems);
      setFilteredItems(availableItems);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // Items filtern basierend auf Suchbegriff
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(inventoryItems);
      return;
    }

    const filtered = inventoryItems.filter(
      item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, inventoryItems]);

  // Items laden wenn Modal geöffnet wird
  useEffect(() => {
    if (isOpen && inventoryItems.length === 0) {
      loadInventoryItems();
    }
  }, [isOpen, companyId]);

  // Item zur Auswahl hinzufügen
  const handleSelectItem = (item: InventoryItem) => {
    const quantity = selectedQuantities[item.id] || 1;
    onSelectItem(item, quantity);
    setIsOpen(false);

    // Menge zurücksetzen
    setSelectedQuantities(prev => ({
      ...prev,
      [item.id]: 1,
    }));
  };

  // Menge für Item ändern
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, quantity),
    }));
  };

  // Quick-Add-Logik: beim Klick auf den Trigger direkt ersten verfügbaren Artikel hinzufügen
  const handleTriggerClick = async () => {
    if (!quickAddOnClick) {
      setIsOpen(true);
      return;
    }
    // Quick-Add: optional, nur wenn explizit gesetzt
    let items: InventoryItem[] = inventoryItems;
    if (items.length === 0) {
      try {
        items = await InventoryService.getInventoryItems(companyId);
      } catch {
        setIsOpen(true);
        return;
      }
    }
    const candidate = items.find(it => {
      const availableStock = it.currentStock - (it.reservedStock || 0);
      return it.status !== 'discontinued' && availableStock > 0;
    });
    if (candidate) {
      onSelectItem(candidate, 1);
      return;
    }
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          onClick={handleTriggerClick}
          className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
        >
          <Package className="w-4 h-4 mr-2" />
          Aus Inventar hinzufügen
        </Button>
      </DialogTrigger>

      <DialogContent
        className="w-[95vw] max-w-none max-h-[90vh] overflow-hidden"
        style={{ minWidth: '1200px', width: '95vw' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#14ad9f]" />
            Artikel aus Inventar auswählen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Suchfeld */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Artikel suchen (Name, SKU, Beschreibung...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#14ad9f]" />
              <span className="ml-2 text-gray-600">Lade Inventar...</span>
            </div>
          )}

          {/* Keine Items gefunden */}
          {!loading && filteredItems.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchTerm ? 'Keine Artikel gefunden' : 'Keine Artikel im Inventar'}
              </p>
              {searchTerm && (
                <p className="text-sm text-gray-500 mt-1">
                  Versuchen Sie einen anderen Suchbegriff
                </p>
              )}
              {!searchTerm && (
                <p className="text-sm text-gray-500 mt-1">
                  Fügen Sie Artikel in Ihrem Inventar hinzu, um sie hier auszuwählen
                </p>
              )}
            </div>
          )}

          {/* Inventar-Tabelle */}
          {!loading && filteredItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                <Table className="min-w-[1140px]">
                  <TableHeader className="sticky top-0 bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[300px] min-w-[300px]">Artikel</TableHead>
                      <TableHead className="w-[140px] min-w-[140px]">SKU</TableHead>
                      <TableHead className="w-[150px] min-w-[150px]">Kategorie</TableHead>
                      <TableHead className="w-[180px] min-w-[180px]">Verfügbar</TableHead>
                      <TableHead className="w-[120px] min-w-[120px]">Preis (€)</TableHead>
                      <TableHead className="w-[100px] min-w-[100px]">Menge</TableHead>
                      <TableHead className="w-[150px] min-w-[150px]">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => {
                      const availableStock = item.currentStock - (item.reservedStock || 0);

                      return (
                        <TableRow
                          key={item.id}
                          className={selectedItems.includes(item.id) ? 'bg-green-50' : ''}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-500 mt-1 break-words">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {item.sku}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`font-medium ${
                                    availableStock <= 0
                                      ? 'text-red-600'
                                      : availableStock <= item.minStock
                                        ? 'text-orange-600'
                                        : 'text-green-600'
                                  }`}
                                >
                                  {availableStock}
                                </span>
                                <span className="text-xs text-gray-500">verfügbar</span>
                                {availableStock <= 0 && (
                                  <AlertCircle
                                    className="w-3 h-3 text-red-500"
                                    aria-label="Nicht verfügbar"
                                  />
                                )}
                                {availableStock > 0 && availableStock <= item.minStock && (
                                  <AlertCircle
                                    className="w-3 h-3 text-orange-500"
                                    aria-label="Niedriger Lagerbestand"
                                  />
                                )}
                              </div>
                              {item.reservedStock && item.reservedStock > 0 && (
                                <div className="text-xs text-gray-500">
                                  {item.reservedStock} reserviert
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                Gesamt: {item.currentStock} {item.unit}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {item.sellingPrice.toLocaleString('de-DE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={selectedQuantities[item.id] || 1}
                              onChange={e =>
                                handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 text-center text-sm"
                              disabled={availableStock <= 0}
                            />
                          </TableCell>
                          <TableCell>
                            {selectedItems.includes(item.id) ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <Check className="w-4 h-4" />
                                <span className="text-xs">Hinzugefügt</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleSelectItem(item)}
                                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                                disabled={availableStock <= 0}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                {availableStock <= 0 ? 'Nicht verfügbar' : 'Hinzufügen'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Info-Text */}
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-blue-800">Hinweise:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Alle Artikel aus Ihrem Inventar werden angezeigt</li>
                  <li>Artikel ohne verfügbaren Lagerbestand sind deaktiviert</li>
                  <li>Der Verkaufspreis wird automatisch als Einzelpreis übernommen</li>
                  <li>Die Menge kann nach dem Hinzufügen noch angepasst werden</li>
                  <li>Reservierte Mengen werden bei Angeboten berücksichtigt</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

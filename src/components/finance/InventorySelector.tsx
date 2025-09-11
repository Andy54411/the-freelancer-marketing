'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Plus, CheckCircle } from 'lucide-react';
import { InventoryService, InventoryItem } from '@/services/inventoryService';
import { toast } from 'sonner';

interface DeliveryNoteItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  total?: number;
  stockReduced?: boolean;
  warehouseLocation?: string;
  serialNumbers?: string[];
  notes?: string;
}

interface InventorySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onItemSelected: (items: DeliveryNoteItem[]) => void;
  selectedItems?: DeliveryNoteItem[];
}

export function InventorySelector({
  isOpen,
  onClose,
  companyId,
  onItemSelected,
  selectedItems = [],
}: InventorySelectorProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  // Lade Inventar-Artikel
  useEffect(() => {
    if (isOpen && companyId) {
      loadInventoryItems();
    }
  }, [isOpen, companyId]);

  // Filter Artikel basierend auf Suchbegriff
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(inventoryItems);
    } else {
      const filtered = inventoryItems.filter(
        item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, inventoryItems]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      const items = await InventoryService.getInventoryItems(companyId);
      
      // Nur aktive Artikel mit verfügbarem Bestand anzeigen
      const activeItems = items.filter(
        item => item.status === 'active' && item.availableStock > 0
      );
      
      setInventoryItems(activeItems);
      setFilteredItems(activeItems);
    } catch (error) {
      console.error('Fehler beim Laden der Inventar-Artikel:', error);
      toast.error('Inventar-Artikel konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity),
    }));
  };

  const getSelectedQuantity = (itemId: string): number => {
    return quantities[itemId] || 0;
  };

  const isItemSelected = (itemId: string): boolean => {
    return getSelectedQuantity(itemId) > 0;
  };

  const canAddMoreItems = (item: InventoryItem): boolean => {
    const currentQuantity = getSelectedQuantity(item.id);
    return currentQuantity < item.availableStock;
  };

  const handleAddItems = () => {
    const newItems: DeliveryNoteItem[] = [];

    Object.entries(quantities).forEach(([itemId, quantity]) => {
      if (quantity > 0) {
        const inventoryItem = inventoryItems.find(item => item.id === itemId);
        if (inventoryItem) {
          newItems.push({
            id: `${itemId}-${Date.now()}`,
            productId: inventoryItem.id,
            description: `${inventoryItem.name} (${inventoryItem.sku})`,
            quantity: quantity,
            unit: inventoryItem.unit,
            unitPrice: inventoryItem.sellingPrice,
            total: quantity * inventoryItem.sellingPrice,
            warehouseLocation: inventoryItem.location,
            notes: inventoryItem.description,
          });
        }
      }
    });

    if (newItems.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Artikel aus');
      return;
    }

    // Kombiniere mit bereits ausgewählten Artikeln
    const allItems = [...selectedItems, ...newItems];
    onItemSelected(allItems);
    
    // Reset state
    setQuantities({});
    setSearchTerm('');
    onClose();
    
    toast.success(`${newItems.length} Artikel hinzugefügt`);
  };

  const getTotalSelectedItems = (): number => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalValue = (): number => {
    return Object.entries(quantities).reduce((total, [itemId, quantity]) => {
      const item = inventoryItems.find(i => i.id === itemId);
      return total + (item ? quantity * item.sellingPrice : 0);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-[95vw] h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#14ad9f]" />
            Artikel aus Inventar auswählen
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full gap-4">
          {/* Suchbereich */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Artikel suchen (Name, SKU, Beschreibung, Kategorie...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{filteredItems.length} von {inventoryItems.length} Artikeln</span>
            </div>
          </div>

          {/* Artikel-Liste */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <Package className="h-12 w-12 mb-2" />
                <p>Keine Artikel gefunden</p>
                {searchTerm && (
                  <p className="text-sm">Versuchen Sie einen anderen Suchbegriff</p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.map(item => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      {/* Artikel-Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Verfügbar: <span className="font-medium">{item.availableStock} {item.unit}</span>
                          </span>
                          <span className="text-sm text-gray-600">
                            Preis: <span className="font-medium">{item.sellingPrice.toFixed(2)}€</span>
                          </span>
                          {item.location && (
                            <span className="text-sm text-gray-600">
                              Lager: <span className="font-medium">{item.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mengen-Auswahl */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${item.id}`} className="text-sm whitespace-nowrap">
                            Menge:
                          </Label>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min="0"
                            max={item.availableStock}
                            value={getSelectedQuantity(item.id)}
                            onChange={e => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                        
                        {isItemSelected(item.id) && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer mit Zusammenfassung */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {getTotalSelectedItems() > 0 && (
                  <>
                    <span className="font-medium">{getTotalSelectedItems()} Artikel ausgewählt</span>
                    <span className="ml-2">
                      Gesamtwert: <span className="font-medium">{getTotalValue().toFixed(2)}€</span>
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleAddItems}
                  disabled={getTotalSelectedItems() === 0}
                  className="bg-[#14ad9f] hover:bg-[#0f9d84] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {getTotalSelectedItems()} Artikel hinzufügen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { InventoryService, WEIGHT_VOLUME_UNITS, SALES_UNITS, InventoryCategory, InventoryItem } from '@/services/inventoryService';
import { CustomerService } from '@/services/customerService';
import type { Customer } from '@/components/finance/AddCustomerModal';
import {
  ArrowLeft,
  Package,
  BarChart3,
  Box as BoxIcon,
  Folder as FolderIcon,
  Plus,
  Trash2,
  Save,
  Building2,
  Droplets,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function EditInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  const itemId = typeof params?.itemId === 'string' ? params.itemId : '';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  
  const [formData, setFormData] = useState({
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
    supplierId: '',
    supplierEmail: '',
    location: '',
    barcode: '',
    contentAmount: 0,
    contentUnit: 'L' as 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück',
    unitWeight: 0,
    weightUnit: 'g' as 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück',
    images: [] as string[],
    batchNumber: '',
    manufacturer: '',
    taxRate: 19,
    status: 'active' as 'active' | 'inactive' | 'discontinued',
  });

  const loadData = useCallback(async () => {
    if (!companyId || !itemId) return;
    
    setLoading(true);
    try {
      const [itemData, categoriesData, suppliersData] = await Promise.all([
        InventoryService.getInventoryItemById(companyId, itemId),
        InventoryService.getCategories(companyId),
        CustomerService.getSuppliers(companyId).catch(() => []),
      ]);
      
      if (itemData) {
        setFormData({
          name: itemData.name || '',
          description: itemData.description || '',
          sku: itemData.sku || '',
          category: itemData.category || '',
          unit: itemData.unit || 'Stück',
          currentStock: itemData.currentStock || 0,
          minStock: itemData.minStock || 0,
          maxStock: itemData.maxStock || 0,
          purchasePrice: itemData.purchasePrice || 0,
          sellingPrice: itemData.sellingPrice || 0,
          supplierName: itemData.supplierName || '',
          supplierId: itemData.supplierId || '',
          supplierEmail: itemData.supplierEmail || '',
          location: itemData.location || '',
          barcode: itemData.barcode || '',
          contentAmount: itemData.contentAmount || 0,
          contentUnit: (itemData.contentUnit as typeof formData.contentUnit) || 'L',
          unitWeight: itemData.unitWeight || 0,
          weightUnit: (itemData.weightUnit as typeof formData.weightUnit) || 'g',
          images: itemData.images || [],
          batchNumber: itemData.batchNumber || '',
          manufacturer: itemData.manufacturer || '',
          taxRate: itemData.taxRate || 19,
          status: itemData.status || 'active',
        });
      }
      
      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (error) {
      toast.error('Fehler beim Laden des Artikels');
    } finally {
      setLoading(false);
    }
  }, [companyId, itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImageUpload = async (file: File, index: number) => {
    try {
      setUploadingImages(prev => ({ ...prev, [index]: true }));
      
      const imageUrl = await InventoryService.uploadItemImage(companyId, itemId, file, index);
      
      setFormData(prev => {
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

  const handleImageDelete = async (index: number) => {
    const imageUrl = formData.images[index];
    if (imageUrl) {
      try {
        await InventoryService.deleteItemImage(imageUrl);
      } catch {
        // Ignoriere Fehler beim Löschen
      }
    }
    
    setFormData(prev => {
      const updatedImages = [...prev.images];
      updatedImages[index] = '';
      return { ...prev, images: updatedImages.filter(img => img !== '') };
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Artikelnamen ein');
      return;
    }

    setSaving(true);
    try {
      const totalWeight = InventoryService.calculateTotalWeight(formData.unitWeight, formData.currentStock);
      const totalContent = InventoryService.calculateTotalContent(formData.contentAmount, formData.currentStock);
      
      await InventoryService.updateInventoryItem(companyId, itemId, {
        ...formData,
        totalWeight,
        totalContent,
        availableStock: formData.currentStock,
      });
      
      toast.success('Artikel wurde aktualisiert');
      router.push(`/dashboard/company/${companyId}/inventory/${itemId}`);
    } catch (error) {
      toast.error('Fehler beim Speichern des Artikels');
    } finally {
      setSaving(false);
    }
  };

  // Berechnete Werte
  const totalContent = InventoryService.calculateTotalContent(formData.contentAmount, formData.currentStock);
  const totalWeight = InventoryService.calculateTotalWeight(formData.unitWeight, formData.currentStock);
  const totalValue = formData.currentStock * formData.sellingPrice;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/company/${companyId}/inventory/${itemId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Artikel bearbeiten</h1>
                <p className="text-sm text-gray-500">{formData.name || 'Neuer Artikel'}</p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name.trim()}
              className="bg-[#14ad9f] hover:bg-teal-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grunddaten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-[#14ad9f]" />
                  Grunddaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Artikelname *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="z.B. Schrauben M8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">Artikelnummer (SKU)</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="z.B. SCR-M8-100"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detaillierte Beschreibung des Artikels..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategorie</Label>
                    <Select
                      value={formData.category || 'none'}
                      onValueChange={value => setFormData({ ...formData, category: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Kategorie</SelectItem>
                        <SelectItem value="Dienstleistung">Dienstleistung</SelectItem>
                        <SelectItem value="Artikel">Artikel</SelectItem>
                        {categories
                          .filter(cat => cat.name && cat.name !== 'Dienstleistung' && cat.name !== 'Artikel')
                          .map(category => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Verkaufseinheit</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={value => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALES_UNITS.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'active' | 'inactive' | 'discontinued') => 
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="inactive">Inaktiv</SelectItem>
                        <SelectItem value="discontinued">Eingestellt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Steuersatz</Label>
                    <Select
                      value={formData.taxRate.toString()}
                      onValueChange={value => setFormData({ ...formData, taxRate: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="19">19% (Standard)</SelectItem>
                        <SelectItem value="7">7% (Ermäßigt)</SelectItem>
                        <SelectItem value="0">0% (Steuerfrei)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inhalt & Gewicht */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-[#14ad9f]" />
                  Inhalt & Gewicht
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Inhalt */}
                  <div className="col-span-2 bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Inhalt pro Einheit</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-700">Menge</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.contentAmount}
                          onChange={e => setFormData({ ...formData, contentAmount: Number(e.target.value) })}
                          min="0"
                          placeholder="0.00"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-700">Einheit</Label>
                        <Select
                          value={formData.contentUnit}
                          onValueChange={(value: typeof formData.contentUnit) => 
                            setFormData({ ...formData, contentUnit: value })
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHT_VOLUME_UNITS.filter(u => u.type === 'volume').map(unit => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-600">Gesamtinhalt (berechnet)</p>
                      <p className="text-lg font-bold text-blue-900">
                        {totalContent.toFixed(2)} {formData.contentUnit}
                      </p>
                    </div>
                  </div>

                  {/* Gewicht */}
                  <div className="col-span-2 bg-amber-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Gewicht pro Einheit</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-amber-700">Gewicht</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formData.unitWeight}
                          onChange={e => setFormData({ ...formData, unitWeight: Number(e.target.value) })}
                          min="0"
                          placeholder="0.000"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-amber-700">Einheit</Label>
                        <Select
                          value={formData.weightUnit}
                          onValueChange={(value: typeof formData.weightUnit) => 
                            setFormData({ ...formData, weightUnit: value })
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHT_VOLUME_UNITS.filter(u => u.type === 'weight').map(unit => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <p className="text-xs text-amber-600">Gesamtgewicht (berechnet)</p>
                      <p className="text-lg font-bold text-amber-900">
                        {totalWeight.toFixed(3)} {formData.weightUnit}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bestand & Preise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
                  Bestand & Preise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Aktueller Bestand</Label>
                    <Input
                      type="number"
                      value={formData.currentStock}
                      onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mindestbestand</Label>
                    <Input
                      type="number"
                      value={formData.minStock}
                      onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximalbestand</Label>
                    <Input
                      type="number"
                      value={formData.maxStock}
                      onChange={e => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Einkaufspreis (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verkaufspreis (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lagerort</Label>
                    <Input
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="z.B. Regal A3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BoxIcon className="h-5 w-5 text-[#14ad9f]" />
                  Inventurdaten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Barcode / EAN</Label>
                    <Input
                      value={formData.barcode}
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="z.B. 4001234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chargennummer / Lot</Label>
                    <Input
                      value={formData.batchNumber}
                      onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="z.B. LOT-2026-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hersteller</Label>
                    <Input
                      value={formData.manufacturer}
                      onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="z.B. Musterhersteller GmbH"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lieferant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-[#14ad9f]" />
                  Lieferant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Lieferant auswählen</Label>
                  <Select
                    value={formData.supplierId || 'none'}
                    onValueChange={value => {
                      if (value === 'none') {
                        setFormData({ ...formData, supplierId: '', supplierName: '', supplierEmail: '' });
                      } else {
                        const supplier = suppliers.find(s => s.id === value);
                        if (supplier) {
                          setFormData({
                            ...formData,
                            supplierId: supplier.id,
                            supplierName: supplier.name,
                            supplierEmail: supplier.email || '',
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
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
                  {suppliers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Noch keine Lieferanten angelegt.
                      <a href={`/dashboard/company/${companyId}/finance/contacts`} className="text-[#14ad9f] hover:underline ml-1">
                        Lieferanten verwalten
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bilder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderIcon className="h-5 w-5 text-[#14ad9f]" />
                  Artikelbilder (max. 3)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={index} 
                      className="aspect-video rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-[#14ad9f] transition-colors group relative overflow-hidden"
                    >
                      {uploadingImages[index] ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
                          <p className="text-xs text-gray-500 mt-2">Hochladen...</p>
                        </div>
                      ) : formData.images[index] ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={formData.images[index]} 
                            alt={`Bild ${index + 1}`} 
                            className="w-full h-full object-cover rounded-lg" 
                          />
                          <button
                            type="button"
                            onClick={() => handleImageDelete(index)}
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
                                handleImageUpload(file, index);
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
                  Erlaubte Formate: JPEG, PNG, WebP, GIF
                </p>
              </CardContent>
            </Card>

            {/* Vorschau */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vorschau</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Bestand</span>
                  <span className="font-semibold">{formData.currentStock} {formData.unit}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">VK-Preis</span>
                  <span className="font-semibold">{formatCurrency(formData.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Gesamtinhalt</span>
                  <span className="font-semibold">{totalContent.toFixed(2)} {formData.contentUnit}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Gesamtgewicht</span>
                  <span className="font-semibold">{totalWeight.toFixed(3)} {formData.weightUnit}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">Lagerwert</span>
                  <span className="font-semibold text-[#14ad9f]">{formatCurrency(totalValue)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

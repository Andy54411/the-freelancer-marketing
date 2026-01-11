'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { InventoryService, WEIGHT_VOLUME_UNITS, SALES_UNITS, InventoryCategory } from '@/services/inventoryService';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function NewInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});

  // Form-State
  const [formData, setFormData] = useState({
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
    // Inhalt pro Einheit (z.B. 0,33L pro Flasche)
    contentAmount: 0,
    contentUnit: 'L' as 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück',
    // Gewicht der Einheit inkl. Verpackung
    unitWeight: 0,
    weightUnit: 'g' as 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück',
    images: [] as string[],
    batchNumber: '',
    manufacturer: '',
    taxRate: 19,
    status: 'active' as 'active' | 'inactive' | 'discontinued',
  });

  // Daten laden
  const loadData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const [categoriesData, suppliersData] = await Promise.all([
        InventoryService.getCategories(companyId),
        CustomerService.getSuppliers(companyId).catch(() => []),
      ]);
      
      setCategories(categoriesData);
      setSuppliers(suppliersData);
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bild-Upload
  const handleImageUpload = async (file: File, index: number) => {
    try {
      setUploadingImages(prev => ({ ...prev, [index]: true }));
      
      const tempId = `temp_${Date.now()}`;
      const imageUrl = await InventoryService.uploadItemImage(companyId, tempId, file, index);
      
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

  // Bild löschen
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

  // Artikel speichern
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Artikelnamen ein');
      return;
    }

    setSaving(true);
    try {
      // Berechne Gesamtwerte
      const totalContent = InventoryService.calculateTotalContent(formData.contentAmount, formData.currentStock);
      const totalWeight = InventoryService.calculateTotalWeight(formData.unitWeight, formData.currentStock);
      
      await InventoryService.addInventoryItem(companyId, {
        ...formData,
        totalContent,
        totalWeight,
        reservedStock: 0,
        availableStock: formData.currentStock,
      });
      
      toast.success('Artikel erfolgreich angelegt');
      router.push(`/dashboard/company/${companyId}/inventory`);
    } catch (error) {
      toast.error('Fehler beim Speichern des Artikels');
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Keine Firma ausgewählt</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/company/${companyId}/inventory`}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Zurück zur Übersicht</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Neuen Artikel anlegen</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/company/${companyId}/inventory`)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="bg-[#14ad9f] hover:bg-teal-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Artikel speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Linke Spalte - Hauptformular */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grunddaten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#14ad9f]" />
                  Grunddaten
                </CardTitle>
                <CardDescription>
                  Grundlegende Informationen zum Artikel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Artikelname *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="z.B. Cola 0,33L Glasflasche"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">Artikelnummer (SKU)</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="z.B. COLA-033-GLAS"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detaillierte Beschreibung des Artikels..."
                    rows={3}
                    className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Kategorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={value => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Getränke">Getränke</SelectItem>
                        <SelectItem value="Lebensmittel">Lebensmittel</SelectItem>
                        <SelectItem value="Artikel">Artikel</SelectItem>
                        <SelectItem value="Dienstleistung">Dienstleistung</SelectItem>
                        <SelectItem value="none">Keine Kategorie</SelectItem>
                        {categories
                          .filter(cat => cat.name && !['Getränke', 'Lebensmittel', 'Artikel', 'Dienstleistung'].includes(cat.name))
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
                      <SelectTrigger className="border-gray-200">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode / EAN</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="z.B. 4001234567890"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Hersteller</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="z.B. Coca-Cola Company"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inhalt & Gewicht */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BoxIcon className="h-5 w-5 text-[#14ad9f]" />
                  Inhalt & Gewicht pro Einheit
                </CardTitle>
                <CardDescription>
                  Definieren Sie Inhaltsmenge und Gewicht pro Verkaufseinheit (z.B. pro Flasche)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inhalt */}
                  <div className="bg-blue-50 rounded-xl p-4 space-y-4">
                    <h4 className="font-medium text-blue-900">Inhalt pro {formData.unit}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-blue-800">Menge</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.contentAmount}
                          onChange={e => setFormData({ ...formData, contentAmount: Number(e.target.value) })}
                          min="0"
                          placeholder="z.B. 0,33"
                          className="border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-blue-800">Einheit</Label>
                        <Select
                          value={formData.contentUnit}
                          onValueChange={(value: any) => setFormData({ ...formData, contentUnit: value })}
                        >
                          <SelectTrigger className="border-blue-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHT_VOLUME_UNITS.filter(u => u.type === 'volume' || u.type === 'weight').map(unit => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Gesamtinhalt:</span>{' '}
                        {InventoryService.calculateTotalContent(formData.contentAmount, formData.currentStock).toFixed(2)} {formData.contentUnit}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        ({formData.contentAmount} {formData.contentUnit} × {formData.currentStock} {formData.unit})
                      </p>
                    </div>
                  </div>

                  {/* Gewicht */}
                  <div className="bg-amber-50 rounded-xl p-4 space-y-4">
                    <h4 className="font-medium text-amber-900">Gewicht pro {formData.unit}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-amber-800">Gewicht</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.unitWeight}
                          onChange={e => setFormData({ ...formData, unitWeight: Number(e.target.value) })}
                          min="0"
                          placeholder="z.B. 450"
                          className="border-amber-200 focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-amber-800">Einheit</Label>
                        <Select
                          value={formData.weightUnit}
                          onValueChange={(value: any) => setFormData({ ...formData, weightUnit: value })}
                        >
                          <SelectTrigger className="border-amber-200">
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
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-amber-700">
                        <span className="font-medium">Gesamtgewicht:</span>{' '}
                        {InventoryService.calculateTotalWeight(formData.unitWeight, formData.currentStock).toFixed(2)} {formData.weightUnit}
                      </p>
                      <p className="text-xs text-amber-500 mt-1">
                        ({formData.unitWeight} {formData.weightUnit} × {formData.currentStock} {formData.unit})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bestand & Preise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
                  Bestand & Preise
                </CardTitle>
                <CardDescription>
                  Bestandsinformationen und Preisgestaltung
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Aktueller Bestand</Label>
                    <Input
                      type="number"
                      value={formData.currentStock}
                      onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                      min="0"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mindestbestand</Label>
                    <Input
                      type="number"
                      value={formData.minStock}
                      onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                      min="0"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximalbestand</Label>
                    <Input
                      type="number"
                      value={formData.maxStock}
                      onChange={e => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                      min="0"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lagerort</Label>
                    <Input
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="z.B. Regal A3"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <Label>Einkaufspreis (€ netto)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                      min="0"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verkaufspreis (€ netto)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                      min="0"
                      className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MwSt.-Satz (%)</Label>
                    <Select
                      value={String(formData.taxRate)}
                      onValueChange={value => setFormData({ ...formData, taxRate: Number(value) })}
                    >
                      <SelectTrigger className="border-gray-200">
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

                {/* Berechnete Werte */}
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Lagerwert (EK)</p>
                      <p className="font-semibold text-gray-900">
                        {(formData.currentStock * formData.purchasePrice).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lagerwert (VK)</p>
                      <p className="font-semibold text-gray-900">
                        {(formData.currentStock * formData.sellingPrice).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Marge pro Einheit</p>
                      <p className="font-semibold text-green-600">
                        {(formData.sellingPrice - formData.purchasePrice).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">VK brutto</p>
                      <p className="font-semibold text-gray-900">
                        {(formData.sellingPrice * (1 + formData.taxRate / 100)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chargennummer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderIcon className="h-5 w-5 text-[#14ad9f]" />
                  Inventur & Rückverfolgbarkeit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Chargennummer / Lot</Label>
                  <Input
                    id="batchNumber"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="z.B. LOT-2026-001"
                    className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                  />
                  <p className="text-xs text-gray-500">
                    Optional: Für Rückverfolgbarkeit bei Lebensmitteln oder chargenbasierter Lagerhaltung
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte - Lieferant & Bilder */}
          <div className="space-y-6">
            {/* Lieferant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                  {suppliers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Noch keine Lieferanten angelegt.{' '}
                      <Link 
                        href={`/dashboard/company/${companyId}/finance/contacts`} 
                        className="text-[#14ad9f] hover:underline"
                      >
                        Lieferanten verwalten
                      </Link>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Artikelbilder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderIcon className="h-5 w-5 text-[#14ad9f]" />
                  Artikelbilder
                </CardTitle>
                <CardDescription>
                  Max. 3 Bilder (JPEG, PNG, WebP, GIF - max. 5 MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((index) => (
                    <div 
                      key={index} 
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-[#14ad9f] transition-colors group relative overflow-hidden"
                    >
                      {uploadingImages[index] ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#14ad9f]" />
                          <p className="text-xs text-gray-500 mt-2">Laden...</p>
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
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                          >
                            <Trash2 className="h-3 w-3" />
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
                          <div className="text-center p-2">
                            <Plus className="h-6 w-6 text-gray-400 mx-auto group-hover:text-[#14ad9f] transition-colors" />
                            <p className="text-xs text-gray-400 mt-1">Bild {index + 1}</p>
                          </div>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Schnellinfo */}
            <Card className="bg-teal-50 border-teal-200">
              <CardHeader>
                <CardTitle className="text-teal-900 text-sm">Artikelvorschau</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-teal-700">Name:</span>
                  <span className="font-medium text-teal-900">{formData.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">SKU:</span>
                  <span className="font-medium text-teal-900">{formData.sku || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">Einheit:</span>
                  <span className="font-medium text-teal-900">{formData.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">Inhalt:</span>
                  <span className="font-medium text-teal-900">
                    {formData.contentAmount > 0 ? `${formData.contentAmount} ${formData.contentUnit}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">Bestand:</span>
                  <span className="font-medium text-teal-900">{formData.currentStock} {formData.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700">VK brutto:</span>
                  <span className="font-medium text-teal-900">
                    {(formData.sellingPrice * (1 + formData.taxRate / 100)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

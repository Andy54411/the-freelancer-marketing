'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { InventoryService, WEIGHT_VOLUME_UNITS, InventoryItem } from '@/services/inventoryService';
import {
  ArrowLeft,
  Package,
  BarChart3,
  Box as BoxIcon,
  Folder as FolderIcon,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Scale,
  Droplets,
  Barcode,
  Tag,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function InventoryItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  const itemId = typeof params?.itemId === 'string' ? params.itemId : '';
  
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId || !itemId) return;
    
    setLoading(true);
    try {
      const itemData = await InventoryService.getInventoryItemById(companyId, itemId);
      setItem(itemData);
    } catch (error) {
      toast.error('Fehler beim Laden des Artikels');
    } finally {
      setLoading(false);
    }
  }, [companyId, itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (date: Date | { toDate: () => Date } | undefined) => {
    if (!date) return '-';
    const d = typeof (date as { toDate?: () => Date }).toDate === 'function' 
      ? (date as { toDate: () => Date }).toDate() 
      : date as Date;
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktiv</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inaktiv</Badge>;
      case 'discontinued':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Eingestellt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockStatus = () => {
    if (!item) return null;
    
    if (item.currentStock <= 0) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Nicht auf Lager</span>
        </div>
      );
    } else if (item.currentStock <= item.minStock) {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <TrendingDown className="h-5 w-5" />
          <span className="font-medium">Niedriger Bestand</span>
        </div>
      );
    } else if (item.maxStock && item.currentStock >= item.maxStock) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <TrendingUp className="h-5 w-5" />
          <span className="font-medium">Maximaler Bestand</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Verfügbar</span>
      </div>
    );
  };

  const handleDelete = async () => {
    if (!item) return;
    
    setDeleting(true);
    try {
      await InventoryService.deleteInventoryItem(companyId, item.id);
      toast.success('Artikel wurde gelöscht');
      router.push(`/dashboard/company/${companyId}/inventory`);
    } catch (error) {
      toast.error('Fehler beim Löschen des Artikels');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getUnitLabel = (unitValue: string) => {
    const unit = WEIGHT_VOLUME_UNITS.find(u => u.value === unitValue);
    return unit?.label || unitValue;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Package className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">Artikel nicht gefunden</h2>
        <Link href={`/dashboard/company/${companyId}/inventory`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  const totalValue = item.currentStock * item.sellingPrice;
  const totalContent = InventoryService.calculateTotalContent(item.contentAmount, item.currentStock);
  const totalWeight = InventoryService.calculateTotalWeight(item.unitWeight, item.currentStock);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/company/${companyId}/inventory`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{item.name}</h1>
                {item.sku && <p className="text-sm text-gray-500">SKU: {item.sku}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/company/${companyId}/inventory/${item.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Artikelname</p>
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">SKU / Artikelnummer</p>
                    <p className="font-medium">{item.sku || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kategorie</p>
                    <p className="font-medium">{item.category || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Verkaufseinheit</p>
                    <p className="font-medium">{item.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(item.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Steuersatz</p>
                    <p className="font-medium">{item.taxRate || 19}%</p>
                  </div>
                </div>
                {item.description && (
                  <div>
                    <p className="text-sm text-gray-500">Beschreibung</p>
                    <p className="mt-1 text-gray-700">{item.description}</p>
                  </div>
                )}
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
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">Inhalt pro Einheit</p>
                    </div>
                    <p className="text-xl font-bold text-blue-900">
                      {item.contentAmount ? `${item.contentAmount} ${getUnitLabel(item.contentUnit || 'L')}` : '-'}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">Gesamtinhalt</p>
                    </div>
                    <p className="text-xl font-bold text-blue-900">
                      {totalContent ? `${totalContent.toFixed(2)} ${getUnitLabel(item.contentUnit || 'L')}` : '-'}
                    </p>
                  </div>
                  {/* Gewicht */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">Gewicht pro Einheit</p>
                    </div>
                    <p className="text-xl font-bold text-amber-900">
                      {item.unitWeight ? `${item.unitWeight} ${getUnitLabel(item.weightUnit || 'g')}` : '-'}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">Gesamtgewicht</p>
                    </div>
                    <p className="text-xl font-bold text-amber-900">
                      {totalWeight ? `${totalWeight.toFixed(2)} ${getUnitLabel(item.weightUnit || 'g')}` : '-'}
                    </p>
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
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Aktueller Bestand</p>
                    <p className="text-2xl font-bold text-gray-900">{item.currentStock} {item.unit}</p>
                    <div className="mt-2">{getStockStatus()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Mindestbestand</p>
                    <p className="text-2xl font-bold text-gray-900">{item.minStock} {item.unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Maximalbestand</p>
                    <p className="text-2xl font-bold text-gray-900">{item.maxStock || '-'} {item.unit}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Einkaufspreis</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(item.purchasePrice)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Verkaufspreis</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(item.sellingPrice)}</p>
                  </div>
                  <div className="bg-[#14ad9f]/10 rounded-lg p-4">
                    <p className="text-sm text-[#14ad9f]">Gesamtwert</p>
                    <p className="text-2xl font-bold text-[#14ad9f]">{formatCurrency(totalValue)}</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <Barcode className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Barcode / EAN</p>
                      <p className="font-medium">{item.barcode || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Chargennummer</p>
                      <p className="font-medium">{item.batchNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Lagerort</p>
                      <p className="font-medium">{item.location || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Hersteller</p>
                      <p className="font-medium">{item.manufacturer || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Erstellt am</p>
                      <p className="font-medium">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Letzte Änderung</p>
                      <p className="font-medium">{formatDate(item.updatedAt)}</p>
                    </div>
                  </div>
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
                  Artikelbilder
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.images && item.images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {item.images.filter(img => img).map((imageUrl, index) => (
                      <div key={index} className="aspect-square rounded-xl overflow-hidden border border-gray-200">
                        <img 
                          src={imageUrl} 
                          alt={`${item.name} - Bild ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                    <Package className="h-12 w-12 mb-2" />
                    <p className="text-sm">Keine Bilder vorhanden</p>
                  </div>
                )}
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
                {item.supplierName ? (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">{item.supplierName}</p>
                    {item.supplierEmail && (
                      <a 
                        href={`mailto:${item.supplierEmail}`}
                        className="text-sm text-[#14ad9f] hover:underline"
                      >
                        {item.supplierEmail}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Kein Lieferant zugeordnet</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Schnellübersicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Bestand</span>
                  <span className="font-semibold">{item.currentStock} {item.unit}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">VK-Preis</span>
                  <span className="font-semibold">{formatCurrency(item.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">EK-Preis</span>
                  <span className="font-semibold">{formatCurrency(item.purchasePrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Gewinnmarge</span>
                  <span className="font-semibold text-green-600">
                    {item.sellingPrice > 0 
                      ? `${(((item.sellingPrice - item.purchasePrice) / item.sellingPrice) * 100).toFixed(1)}%`
                      : '-'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Aufschlag</span>
                  <span className="font-semibold text-blue-600">
                    {item.purchasePrice > 0 
                      ? `${(((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(1)}%`
                      : '-'
                    }
                  </span>
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

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Artikel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Artikel &quot;{item.name}&quot; wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Wird gelöscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

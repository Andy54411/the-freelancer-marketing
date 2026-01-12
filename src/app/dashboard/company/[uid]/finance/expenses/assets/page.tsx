'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Landmark,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  Calendar,
  Filter,
  TrendingDown,
  Euro,
  Building2,
  Car,
  Monitor,
  Sofa,
  Package,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { collection, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { format, differenceInYears, addYears } from 'date-fns';
import { de } from 'date-fns/locale';

interface Asset {
  id: string;
  name: string;
  description?: string;
  category: string;
  acquisitionDate: Date;
  acquisitionCost: number;
  currentValue: number;
  depreciationMethod: 'linear' | 'degressive' | 'none';
  usefulLifeYears: number;
  residualValue: number;
  serialNumber?: string;
  location?: string;
  supplier?: string;
  invoiceNumber?: string;
  status: 'active' | 'disposed' | 'sold';
  disposalDate?: Date;
  disposalValue?: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface FormData {
  name: string;
  description: string;
  category: string;
  acquisitionDate: string;
  acquisitionCost: string;
  depreciationMethod: Asset['depreciationMethod'];
  usefulLifeYears: string;
  residualValue: string;
  serialNumber: string;
  location: string;
  supplier: string;
  invoiceNumber: string;
  notes: string;
}

const CATEGORIES = [
  { value: 'buildings', label: 'Gebäude & Grundstücke', icon: Building2 },
  { value: 'vehicles', label: 'Fahrzeuge', icon: Car },
  { value: 'it', label: 'IT & EDV', icon: Monitor },
  { value: 'furniture', label: 'Büroausstattung & Möbel', icon: Sofa },
  { value: 'machinery', label: 'Maschinen & Anlagen', icon: Package },
  { value: 'other', label: 'Sonstiges', icon: Package },
];

const DEPRECIATION_METHODS = {
  linear: 'Linear (AfA)',
  degressive: 'Degressiv',
  none: 'Keine Abschreibung',
};

const STATUS_CONFIG = {
  active: { label: 'Aktiv', color: 'bg-green-100 text-green-800' },
  disposed: { label: 'Ausgeschieden', color: 'bg-gray-100 text-gray-800' },
  sold: { label: 'Verkauft', color: 'bg-blue-100 text-blue-800' },
};

// Berechnet den aktuellen Buchwert basierend auf Abschreibung
const calculateCurrentValue = (asset: {
  acquisitionCost: number;
  acquisitionDate: Date;
  depreciationMethod: Asset['depreciationMethod'];
  usefulLifeYears: number;
  residualValue: number;
}): number => {
  if (asset.depreciationMethod === 'none') {
    return asset.acquisitionCost;
  }

  const now = new Date();
  const yearsElapsed = differenceInYears(now, asset.acquisitionDate);

  if (yearsElapsed >= asset.usefulLifeYears) {
    return asset.residualValue;
  }

  if (asset.depreciationMethod === 'linear') {
    const annualDepreciation = (asset.acquisitionCost - asset.residualValue) / asset.usefulLifeYears;
    const totalDepreciation = annualDepreciation * yearsElapsed;
    return Math.max(asset.acquisitionCost - totalDepreciation, asset.residualValue);
  }

  // Degressive Abschreibung (20% pro Jahr, mindestens AfA-Tabelle)
  if (asset.depreciationMethod === 'degressive') {
    let currentValue = asset.acquisitionCost;
    const rate = 0.2; // 20% degressiv
    for (let i = 0; i < yearsElapsed; i++) {
      currentValue = currentValue * (1 - rate);
      if (currentValue <= asset.residualValue) {
        return asset.residualValue;
      }
    }
    return Math.max(currentValue, asset.residualValue);
  }

  return asset.acquisitionCost;
};

export default function AssetsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog-States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDisposeOpen, setIsDisposeOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);

  // Dispose Dialog Daten
  const [disposeType, setDisposeType] = useState<'disposed' | 'sold'>('disposed');
  const [disposeValue, setDisposeValue] = useState('');

  const initialFormData: FormData = {
    name: '',
    description: '',
    category: 'it',
    acquisitionDate: format(new Date(), 'yyyy-MM-dd'),
    acquisitionCost: '',
    depreciationMethod: 'linear',
    usefulLifeYears: '3',
    residualValue: '1',
    serialNumber: '',
    location: '',
    supplier: '',
    invoiceNumber: '',
    notes: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return format(d, 'dd.MM.yyyy', { locale: de });
  };

  // Anlagen laden
  const loadAssets = async () => {
    try {
      setLoading(true);
      const assetsRef = collection(db, 'companies', uid, 'fixedAssets');
      const snapshot = await getDocs(assetsRef);

      const data: Asset[] = snapshot.docs.map(doc => {
        const d = doc.data();
        const acquisitionDate = d.acquisitionDate?.toDate ? d.acquisitionDate.toDate() : new Date(d.acquisitionDate);
        const asset = {
          id: doc.id,
          name: d.name || '',
          description: d.description,
          category: d.category || 'other',
          acquisitionDate,
          acquisitionCost: d.acquisitionCost || 0,
          depreciationMethod: d.depreciationMethod || 'linear',
          usefulLifeYears: d.usefulLifeYears || 3,
          residualValue: d.residualValue || 1,
          serialNumber: d.serialNumber,
          location: d.location,
          supplier: d.supplier,
          invoiceNumber: d.invoiceNumber,
          status: d.status || 'active',
          disposalDate: d.disposalDate?.toDate ? d.disposalDate.toDate() : undefined,
          disposalValue: d.disposalValue,
          notes: d.notes,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : undefined,
        } as Asset;

        // Aktuellen Wert berechnen
        asset.currentValue = asset.status === 'active'
          ? calculateCurrentValue(asset)
          : (asset.disposalValue || 0);

        return asset;
      });

      // Sortierung nach Anschaffungsdatum (neueste zuerst)
      data.sort((a, b) => b.acquisitionDate.getTime() - a.acquisitionDate.getTime());

      setAssets(data);
    } catch (error) {
      toast.error('Fehler beim Laden der Anlagen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid && user) {
      loadAssets();
    }
  }, [uid, user]);

  // Filtern
  const filteredAssets = assets.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Statistiken
  const activeAssets = assets.filter(a => a.status === 'active');
  const totalAcquisitionCost = activeAssets.reduce((sum, a) => sum + a.acquisitionCost, 0);
  const totalCurrentValue = activeAssets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalDepreciation = totalAcquisitionCost - totalCurrentValue;

  // Speichern (nur für Bearbeitung - Erstellung erfolgt über /create Seite)
  const handleSave = async () => {
    if (!selectedAsset) {
      toast.error('Keine Anlage zum Bearbeiten ausgewählt');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }
    if (!formData.acquisitionCost || parseFloat(formData.acquisitionCost) <= 0) {
      toast.error('Bitte geben Sie einen gültigen Anschaffungswert ein');
      return;
    }

    try {
      setSaving(true);
      const acquisitionDate = new Date(formData.acquisitionDate);

      const assetData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        acquisitionDate: Timestamp.fromDate(acquisitionDate),
        acquisitionCost: parseFloat(formData.acquisitionCost),
        depreciationMethod: formData.depreciationMethod,
        usefulLifeYears: parseInt(formData.usefulLifeYears),
        residualValue: parseFloat(formData.residualValue) || 1,
        serialNumber: formData.serialNumber.trim() || null,
        location: formData.location.trim() || null,
        supplier: formData.supplier.trim() || null,
        invoiceNumber: formData.invoiceNumber.trim() || null,
        status: 'active' as const,
        notes: formData.notes.trim() || null,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'companies', uid, 'fixedAssets', selectedAsset.id), assetData);
      toast.success('Anlage aktualisiert');

      setIsEditOpen(false);
      setFormData(initialFormData);
      setSelectedAsset(null);
      loadAssets();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Ausscheiden/Verkaufen
  const handleDispose = async () => {
    if (!selectedAsset) return;

    try {
      await updateDoc(doc(db, 'companies', uid, 'fixedAssets', selectedAsset.id), {
        status: disposeType,
        disposalDate: Timestamp.now(),
        disposalValue: disposeType === 'sold' ? parseFloat(disposeValue) || 0 : 0,
        updatedAt: Timestamp.now(),
      });

      toast.success(
        disposeType === 'sold'
          ? `Anlage für ${formatCurrency(parseFloat(disposeValue) || 0)} verkauft`
          : 'Anlage ausgeschieden'
      );

      setIsDisposeOpen(false);
      setSelectedAsset(null);
      setDisposeValue('');
      loadAssets();
    } catch (error) {
      toast.error('Fehler beim Ausscheiden der Anlage');
    }
  };

  // Löschen
  const handleDelete = async () => {
    if (!selectedAsset) return;

    try {
      await deleteDoc(doc(db, 'companies', uid, 'fixedAssets', selectedAsset.id));
      toast.success('Anlage gelöscht');
      setIsDeleteOpen(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Bearbeiten öffnen
  const openEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description || '',
      category: asset.category,
      acquisitionDate: format(asset.acquisitionDate, 'yyyy-MM-dd'),
      acquisitionCost: asset.acquisitionCost.toString(),
      depreciationMethod: asset.depreciationMethod,
      usefulLifeYears: asset.usefulLifeYears.toString(),
      residualValue: asset.residualValue.toString(),
      serialNumber: asset.serialNumber || '',
      location: asset.location || '',
      supplier: asset.supplier || '',
      invoiceNumber: asset.invoiceNumber || '',
      notes: asset.notes || '',
    });
    setIsEditOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || Package;
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500">Keine Berechtigung</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-[#14ad9f]" />
            Anlagevermögen
          </h1>
          <p className="text-gray-500 mt-1">
            Verwalten Sie Ihre Anlagen und Abschreibungen (AfA)
          </p>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/company/${uid}/finance/expenses/create?type=anlage`)}
          className="bg-[#14ad9f] hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Anlage
        </Button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aktive Anlagen</p>
                <p className="text-2xl font-bold text-gray-900">{activeAssets.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Landmark className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Anschaffungswert</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAcquisitionCost)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Euro className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aktueller Buchwert</p>
                <p className="text-2xl font-bold text-[#14ad9f]">{formatCurrency(totalCurrentValue)}</p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <Calculator className="h-6 w-6 text-[#14ad9f]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Abschreibungen</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDepreciation)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter und Suche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Suche nach Name, Seriennummer, Standort..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="disposed">Ausgeschieden</SelectItem>
                <SelectItem value="sold">Verkauft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-20">
              <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Anlagen</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Keine Ergebnisse für Ihre Filter'
                  : 'Erfassen Sie Ihr Anlagevermögen'}
              </p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <Button
                  onClick={() => router.push(`/dashboard/company/${uid}/finance/expenses/create?type=anlage`)}
                  className="bg-[#14ad9f] hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Anlage erfassen
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anlage</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Anschaffung</TableHead>
                  <TableHead>AfA-Methode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Anschaffungswert</TableHead>
                  <TableHead className="text-right">Buchwert</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map(asset => {
                  const CategoryIcon = getCategoryIcon(asset.category);
                  return (
                    <TableRow key={asset.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <CategoryIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            {asset.serialNumber && (
                              <p className="text-sm text-gray-500">SN: {asset.serialNumber}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {CATEGORIES.find(c => c.value === asset.category)?.label || asset.category}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(asset.acquisitionDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {DEPRECIATION_METHODS[asset.depreciationMethod]}
                          {asset.depreciationMethod !== 'none' && (
                            <span className="text-gray-500 ml-1">
                              ({asset.usefulLifeYears} J.)
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[asset.status].color}>
                          {STATUS_CONFIG[asset.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(asset.acquisitionCost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(asset.currentValue)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(asset)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            {asset.status === 'active' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setDisposeType('sold');
                                    setDisposeValue('');
                                    setIsDisposeOpen(true);
                                  }}
                                >
                                  <Euro className="h-4 w-4 mr-2" />
                                  Verkaufen
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setDisposeType('disposed');
                                    setIsDisposeOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Ausscheiden
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAsset(asset);
                                setIsDeleteOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - nur für Bearbeitung, nicht für Erstellung */}
      <Dialog
        open={isEditOpen}
        onOpenChange={open => {
          if (!open) {
            setIsEditOpen(false);
            setSelectedAsset(null);
            setFormData(initialFormData);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Anlage bearbeiten
            </DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Anlagedaten für Ihre Buchhaltung und AfA-Berechnung
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Bezeichnung *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. MacBook Pro 16 Zoll"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="acquisitionDate">Anschaffungsdatum *</Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={formData.acquisitionDate}
                  onChange={e => setFormData(prev => ({ ...prev, acquisitionDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="acquisitionCost">Anschaffungswert (netto) *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="acquisitionCost"
                    type="number"
                    step="0.01"
                    value={formData.acquisitionCost}
                    onChange={e => setFormData(prev => ({ ...prev, acquisitionCost: e.target.value }))}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="depreciationMethod">Abschreibungsmethode</Label>
                <Select
                  value={formData.depreciationMethod}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      depreciationMethod: value as Asset['depreciationMethod'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear (AfA)</SelectItem>
                    <SelectItem value="degressive">Degressiv (20%)</SelectItem>
                    <SelectItem value="none">Keine Abschreibung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="usefulLifeYears">Nutzungsdauer (Jahre)</Label>
                <Select
                  value={formData.usefulLifeYears}
                  onValueChange={value => setFormData(prev => ({ ...prev, usefulLifeYears: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Jahr</SelectItem>
                    <SelectItem value="3">3 Jahre</SelectItem>
                    <SelectItem value="5">5 Jahre</SelectItem>
                    <SelectItem value="7">7 Jahre</SelectItem>
                    <SelectItem value="10">10 Jahre</SelectItem>
                    <SelectItem value="13">13 Jahre</SelectItem>
                    <SelectItem value="15">15 Jahre</SelectItem>
                    <SelectItem value="20">20 Jahre</SelectItem>
                    <SelectItem value="25">25 Jahre</SelectItem>
                    <SelectItem value="33">33 Jahre</SelectItem>
                    <SelectItem value="50">50 Jahre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="residualValue">Restwert</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="residualValue"
                    type="number"
                    step="0.01"
                    value={formData.residualValue}
                    onChange={e => setFormData(prev => ({ ...prev, residualValue: e.target.value }))}
                    placeholder="1,00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="serialNumber">Seriennummer</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={e => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="location">Standort</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="z.B. Büro Hauptsitz"
                />
              </div>

              <div>
                <Label htmlFor="supplier">Lieferant</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={e => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Beschreibung..."
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Interne Notizen..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedAsset(null);
                setFormData(initialFormData);
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispose Dialog */}
      <Dialog open={isDisposeOpen} onOpenChange={setIsDisposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {disposeType === 'sold' ? 'Anlage verkaufen' : 'Anlage ausscheiden'}
            </DialogTitle>
            <DialogDescription>
              {disposeType === 'sold'
                ? `Geben Sie den Verkaufserlös für "${selectedAsset?.name}" ein.`
                : `Möchten Sie die Anlage "${selectedAsset?.name}" wirklich ausscheiden?`}
            </DialogDescription>
          </DialogHeader>

          {disposeType === 'sold' && (
            <div className="py-4">
              <Label htmlFor="disposeValue">Verkaufserlös</Label>
              <div className="relative mt-2">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="disposeValue"
                  type="number"
                  step="0.01"
                  value={disposeValue}
                  onChange={e => setDisposeValue(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Aktueller Buchwert: {formatCurrency(selectedAsset?.currentValue || 0)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisposeOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleDispose}
              className={disposeType === 'sold' ? 'bg-[#14ad9f] hover:bg-teal-700' : ''}
              variant={disposeType === 'disposed' ? 'destructive' : 'default'}
            >
              {disposeType === 'sold' ? 'Verkaufen' : 'Ausscheiden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anlage löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie die Anlage &quot;{selectedAsset?.name}&quot; wirklich löschen? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

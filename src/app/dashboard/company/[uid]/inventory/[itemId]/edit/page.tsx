'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { InventoryService, WEIGHT_VOLUME_UNITS, SALES_UNITS, InventoryCategory } from '@/services/inventoryService';
import { CustomerService } from '@/services/customerService';
import type { Customer } from '@/components/finance/AddCustomerModal';
import {
  ArrowLeft,
  Package,
  Box as BoxIcon,
  Folder as FolderIcon,
  Plus,
  Trash2,
  Save,
  Building2,
  Copy,
  Calculator,
  Euro,
  Percent,
  Upload,
  Info,
  Barcode,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// BOM (Stückliste) Interfaces
interface BomMaterialItem {
  id: string;
  materialName: string;
  materialId?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  wastagePercent: number; // Verschnitt/Rabatt
  surchargePercent: number; // Aufschlag %
}

interface BomLaborItem {
  id: string;
  name: string;
  wageGroup: string;
  minutes: number;
  hourlyRate: number;
  surchargePercent: number;
}

interface BomEquipmentItem {
  id: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  surchargePercent: number;
}

interface BomOtherItem {
  id: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  surchargePercent: number;
}

interface BomExternalServiceItem {
  id: string;
  name: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  purchasePrice: number;
  surchargePercent: number;
}

// Helper-Funktion für deutsches Zahlenformat (Komma als Dezimaltrenner)
const parseGermanNumber = (value: string): number => {
  if (!value || value === '') return 0;
  // Ersetze deutsches Komma durch Punkt
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const formatGermanNumber = (value: number): string => {
  if (value === 0) return '0';
  return value.toString().replace('.', ',');
};

// Einheiten-Optionen wie bei das-programm.io
const UNIT_OPTIONS = [
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
  { value: 'rm', label: 'lfm' },
  { value: 'km', label: 'km' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'h', label: 'Std.' },
  { value: 'day', label: 'Tag' },
  { value: 'week', label: 'Woche' },
  { value: 'month', label: 'Monat' },
  { value: 'year', label: 'Jahr' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 't', label: 't' },
  { value: 'kWp', label: 'kWp' },
  { value: 'kWh', label: 'kWh' },
  { value: 'kW', label: 'kW' },
  { value: 'package', label: 'Packung' },
  { value: 'l', label: 'l' },
  { value: 'flat', label: 'psch' },
  { value: 'piece', label: 'Stück' },
  { value: 'pair', label: 'Paar' },
  { value: 'bucket', label: 'Eimer' },
  { value: 'sack', label: 'Sack' },
  { value: 'WE', label: 'WE' },
  { value: 'W', label: 'W' },
  { value: 'inch', label: 'inch' },
];

// Umsatzsteuer-Optionen
const TAX_OPTIONS = [
  { value: 'DE_HIGH', label: 'normal (19%)' },
  { value: 'DE_LOW', label: 'reduziert (7%)' },
  { value: 'DE_FOREST', label: 'Forstwirtschaft (5,5%)' },
  { value: 'DE_NO', label: 'befreit (0%)' },
];

export default function EditInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.uid === 'string' ? params.uid : '';
  const itemId = typeof params?.itemId === 'string' ? params.itemId : '';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // BOM (Stückliste) States
  const [bomMaterials, setBomMaterials] = useState<BomMaterialItem[]>([
    { id: '1', materialName: '', materialId: '', quantity: 0, unit: '', purchasePrice: 0, wastagePercent: 0, surchargePercent: 0 }
  ]);
  const [bomLabor, setBomLabor] = useState<BomLaborItem[]>([
    { id: '1', name: '', wageGroup: '', minutes: 0, hourlyRate: 0, surchargePercent: 0 }
  ]);
  const [bomEquipment, setBomEquipment] = useState<BomEquipmentItem[]>([
    { id: '1', name: '', quantity: 0, purchasePrice: 0, surchargePercent: 0 }
  ]);
  const [bomOther, setBomOther] = useState<BomOtherItem[]>([
    { id: '1', name: '', quantity: 0, purchasePrice: 0, surchargePercent: 0 }
  ]);
  const [bomExternalServices, setBomExternalServices] = useState<BomExternalServiceItem[]>([
    { id: '1', name: '', supplierId: '', supplierName: '', quantity: 0, purchasePrice: 0, surchargePercent: 0 }
  ]);
  
  const [formData, setFormData] = useState({
    // Basisinformationen
    sku: '',
    name: '',
    barcode: '',
    supplierId: '',
    supplierName: '',
    description: '',
    comment: '',
    images: [] as string[],
    
    // Kalkulation und Preis
    calculationType: 'simple' as 'simple' | 'calculated',
    productType: 'material' as 'material' | 'service' | 'mix' | 'bom',
    
    // Material-Kalkulation
    purchasePrice: 0,
    materialOverheadPercent: 0,
    
    // Lohn-Kalkulation (für Leistung)
    laborMinutes: 0,
    laborHourlyRate: 0,
    laborOverheadPercent: 0,
    laborProfitMarginOverride: null as number | null,
    
    // Gemeinsame Felder
    profitMarginPercent: 0,
    profitMarginOverride: null as number | null,
    wastagePercent: 0,
    offerPriceType: 'calculated' as 'calculated' | 'manual',
    offerPriceManual: 0,
    containerSize: 0,
    containerUnit: '',
    consumption: 0, // Verbrauch (für Mix-Typ)
    offerUnit: 'piece',
    taxType: 'DE_HIGH',
    
    // Bestand
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    location: '',
    
    // Sonstiges
    category: '',
    status: 'active' as 'active' | 'inactive' | 'discontinued',
    manufacturer: '',
    batchNumber: '',
  });

  // Kalkulierte Werte - Material
  const materialCalculatedValues = useMemo(() => {
    const materialCost = formData.purchasePrice;
    const materialOverhead = materialCost * (formData.materialOverheadPercent / 100);
    const selfCost = materialCost + materialOverhead;
    const profitPercent = formData.profitMarginOverride ?? formData.profitMarginPercent;
    const profit = selfCost * (profitPercent / 100);
    const offerPrice = selfCost + profit;
    
    return {
      materialCost,
      materialOverhead,
      selfCost,
      profit,
      offerPrice,
    };
  }, [formData.purchasePrice, formData.materialOverheadPercent, formData.profitMarginPercent, formData.profitMarginOverride]);

  // Kalkulierte Werte - Lohn/Leistung
  const laborCalculatedValues = useMemo(() => {
    const laborCost = (formData.laborMinutes / 60) * formData.laborHourlyRate;
    const laborOverhead = laborCost * (formData.laborOverheadPercent / 100);
    const selfCost = laborCost + laborOverhead;
    const profitPercent = formData.laborProfitMarginOverride ?? formData.profitMarginPercent;
    const profit = selfCost * (profitPercent / 100);
    const offerPrice = selfCost + profit;
    
    return {
      laborCost,
      laborOverhead,
      selfCost,
      profit,
      offerPrice,
    };
  }, [formData.laborMinutes, formData.laborHourlyRate, formData.laborOverheadPercent, formData.profitMarginPercent, formData.laborProfitMarginOverride]);

  // Kombinierte kalkulierte Werte basierend auf Produkttyp
  const calculatedValues = useMemo(() => {
    if (formData.productType === 'service') {
      return {
        materialCost: 0,
        materialOverhead: 0,
        selfCost: laborCalculatedValues.selfCost,
        profit: laborCalculatedValues.profit,
        offerPrice: formData.offerPriceType === 'manual' ? formData.offerPriceManual : laborCalculatedValues.offerPrice,
      };
    } else if (formData.productType === 'mix') {
      // Mix: Material + Lohn kombiniert
      const totalSelfCost = materialCalculatedValues.selfCost + laborCalculatedValues.selfCost;
      const totalProfit = materialCalculatedValues.profit + laborCalculatedValues.profit;
      const totalOfferPrice = materialCalculatedValues.offerPrice + laborCalculatedValues.offerPrice;
      return {
        materialCost: materialCalculatedValues.materialCost,
        materialOverhead: materialCalculatedValues.materialOverhead,
        selfCost: totalSelfCost,
        profit: totalProfit,
        offerPrice: formData.offerPriceType === 'manual' ? formData.offerPriceManual : totalOfferPrice,
      };
    } else {
      // Material oder Stückliste
      return {
        materialCost: materialCalculatedValues.materialCost,
        materialOverhead: materialCalculatedValues.materialOverhead,
        selfCost: materialCalculatedValues.selfCost,
        profit: materialCalculatedValues.profit,
        offerPrice: formData.offerPriceType === 'manual' ? formData.offerPriceManual : materialCalculatedValues.offerPrice,
      };
    }
  }, [formData.productType, formData.offerPriceType, formData.offerPriceManual, materialCalculatedValues, laborCalculatedValues]);

  // BOM Berechnungen
  const bomCalculations = useMemo(() => {
    // Material-Summen berechnen
    const materialItems = bomMaterials.map(item => {
      const basePrice = item.purchasePrice * (1 + (item.wastagePercent / 100));
      const unitPrice = basePrice * (1 + (item.surchargePercent / 100));
      const total = unitPrice * item.quantity;
      return { ...item, unitPrice, total, totalQuantity: item.quantity };
    });
    const materialSurchargeSum = materialItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity * (item.surchargePercent / 100)), 0);
    const materialTotalSum = materialItems.reduce((sum, item) => sum + item.total, 0);

    // Lohn-Summen berechnen
    const laborItems = bomLabor.map(item => {
      const baseCost = (item.minutes / 60) * item.hourlyRate;
      const unitPrice = baseCost * (1 + (item.surchargePercent / 100));
      const total = unitPrice;
      return { ...item, unitPrice, total, totalMinutes: item.minutes };
    });
    const laborSurchargeSum = laborItems.reduce((sum, item) => sum + ((item.minutes / 60) * item.hourlyRate * (item.surchargePercent / 100)), 0);
    const laborTotalSum = laborItems.reduce((sum, item) => sum + item.total, 0);

    // Geräte-Summen berechnen
    const equipmentItems = bomEquipment.map(item => {
      const unitPrice = item.purchasePrice * (1 + (item.surchargePercent / 100));
      const total = unitPrice * item.quantity;
      return { ...item, unitPrice, total, totalQuantity: item.quantity };
    });
    const equipmentSurchargeSum = equipmentItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity * (item.surchargePercent / 100)), 0);
    const equipmentTotalSum = equipmentItems.reduce((sum, item) => sum + item.total, 0);

    // Sonstiges-Summen berechnen
    const otherItems = bomOther.map(item => {
      const unitPrice = item.purchasePrice * (1 + (item.surchargePercent / 100));
      const total = unitPrice * item.quantity;
      return { ...item, unitPrice, total, totalQuantity: item.quantity };
    });
    const otherSurchargeSum = otherItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity * (item.surchargePercent / 100)), 0);
    const otherTotalSum = otherItems.reduce((sum, item) => sum + item.total, 0);

    // Fremdleistungen-Summen berechnen
    const externalItems = bomExternalServices.map(item => {
      const unitPrice = item.purchasePrice * (1 + (item.surchargePercent / 100));
      const total = unitPrice * item.quantity;
      return { ...item, unitPrice, total, totalQuantity: item.quantity };
    });
    const externalSurchargeSum = externalItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity * (item.surchargePercent / 100)), 0);
    const externalTotalSum = externalItems.reduce((sum, item) => sum + item.total, 0);

    // Gesamtsummen
    const totalSurcharge = materialSurchargeSum + laborSurchargeSum + equipmentSurchargeSum + otherSurchargeSum + externalSurchargeSum;
    const grandTotal = materialTotalSum + laborTotalSum + equipmentTotalSum + otherTotalSum + externalTotalSum;

    return {
      materials: { items: materialItems, surchargeSum: materialSurchargeSum, totalSum: materialTotalSum },
      labor: { items: laborItems, surchargeSum: laborSurchargeSum, totalSum: laborTotalSum },
      equipment: { items: equipmentItems, surchargeSum: equipmentSurchargeSum, totalSum: equipmentTotalSum },
      other: { items: otherItems, surchargeSum: otherSurchargeSum, totalSum: otherTotalSum },
      external: { items: externalItems, surchargeSum: externalSurchargeSum, totalSum: externalTotalSum },
      totalSurcharge,
      grandTotal,
    };
  }, [bomMaterials, bomLabor, bomEquipment, bomOther, bomExternalServices]);

  // BOM Helper Functions
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addBomMaterial = () => {
    setBomMaterials([...bomMaterials, { id: generateId(), materialName: '', materialId: '', quantity: 0, unit: '', purchasePrice: 0, wastagePercent: 0, surchargePercent: 0 }]);
  };

  const removeBomMaterial = (id: string) => {
    if (bomMaterials.length > 1) {
      setBomMaterials(bomMaterials.filter(item => item.id !== id));
    }
  };

  const updateBomMaterial = (id: string, field: keyof BomMaterialItem, value: string | number) => {
    setBomMaterials(bomMaterials.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addBomLabor = () => {
    setBomLabor([...bomLabor, { id: generateId(), name: '', wageGroup: '', minutes: 0, hourlyRate: 0, surchargePercent: 0 }]);
  };

  const removeBomLabor = (id: string) => {
    if (bomLabor.length > 1) {
      setBomLabor(bomLabor.filter(item => item.id !== id));
    }
  };

  const updateBomLabor = (id: string, field: keyof BomLaborItem, value: string | number) => {
    setBomLabor(bomLabor.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addBomEquipment = () => {
    setBomEquipment([...bomEquipment, { id: generateId(), name: '', quantity: 0, purchasePrice: 0, surchargePercent: 0 }]);
  };

  const removeBomEquipment = (id: string) => {
    if (bomEquipment.length > 1) {
      setBomEquipment(bomEquipment.filter(item => item.id !== id));
    }
  };

  const updateBomEquipment = (id: string, field: keyof BomEquipmentItem, value: string | number) => {
    setBomEquipment(bomEquipment.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addBomOther = () => {
    setBomOther([...bomOther, { id: generateId(), name: '', quantity: 0, purchasePrice: 0, surchargePercent: 0 }]);
  };

  const removeBomOther = (id: string) => {
    if (bomOther.length > 1) {
      setBomOther(bomOther.filter(item => item.id !== id));
    }
  };

  const updateBomOther = (id: string, field: keyof BomOtherItem, value: string | number) => {
    setBomOther(bomOther.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addBomExternalService = () => {
    setBomExternalServices([...bomExternalServices, { id: generateId(), name: '', supplierId: '', supplierName: '', quantity: 0, purchasePrice: 0, surchargePercent: 0 }]);
  };

  const removeBomExternalService = (id: string) => {
    if (bomExternalServices.length > 1) {
      setBomExternalServices(bomExternalServices.filter(item => item.id !== id));
    }
  };

  const updateBomExternalService = (id: string, field: keyof BomExternalServiceItem, value: string | number) => {
    setBomExternalServices(bomExternalServices.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

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
        // Erweiterte Felder aus itemData extrahieren (falls vorhanden)
        const extData = itemData as unknown as Record<string, unknown>;
        
        setFormData({
          sku: itemData.sku || '',
          name: itemData.name || '',
          barcode: itemData.barcode || '',
          supplierId: itemData.supplierId || '',
          supplierName: itemData.supplierName || '',
          description: itemData.description || '',
          comment: (extData.comment as string) || '',
          images: itemData.images || [],
          calculationType: (extData.calculationType as 'simple' | 'calculated') || 'simple',
          productType: (extData.productType as 'material' | 'service' | 'mix' | 'bom') || 'material',
          purchasePrice: itemData.purchasePrice || 0,
          materialOverheadPercent: (extData.materialOverheadPercent as number) || 0,
          laborMinutes: (extData.laborMinutes as number) || 0,
          laborHourlyRate: (extData.laborHourlyRate as number) || 0,
          laborOverheadPercent: (extData.laborOverheadPercent as number) || 0,
          laborProfitMarginOverride: (extData.laborProfitMarginOverride as number) || null,
          profitMarginPercent: (extData.profitMarginPercent as number) || 0,
          profitMarginOverride: (extData.profitMarginOverride as number) || null,
          wastagePercent: (extData.wastagePercent as number) || 0,
          offerPriceType: (extData.offerPriceType as 'calculated' | 'manual') || 'calculated',
          offerPriceManual: (extData.offerPriceManual as number) || 0,
          containerSize: (extData.containerSize as number) || 0,
          containerUnit: (extData.containerUnit as string) || '',
          consumption: (extData.consumption as number) || 0,
          offerUnit: itemData.unit || 'piece',
          taxType: (extData.taxType as string) || 'DE_HIGH',
          currentStock: itemData.currentStock || 0,
          minStock: itemData.minStock || 0,
          maxStock: itemData.maxStock || 0,
          location: itemData.location || '',
          category: itemData.category || '',
          status: itemData.status || 'active',
          manufacturer: itemData.manufacturer || '',
          batchNumber: itemData.batchNumber || '',
        });
        
        // BOM-Daten laden (falls vorhanden)
        if (extData.bomMaterials && Array.isArray(extData.bomMaterials)) {
          setBomMaterials(extData.bomMaterials as BomMaterialItem[]);
        }
        if (extData.bomLabor && Array.isArray(extData.bomLabor)) {
          setBomLabor(extData.bomLabor as BomLaborItem[]);
        }
        if (extData.bomEquipment && Array.isArray(extData.bomEquipment)) {
          setBomEquipment(extData.bomEquipment as BomEquipmentItem[]);
        }
        if (extData.bomOther && Array.isArray(extData.bomOther)) {
          setBomOther(extData.bomOther as BomOtherItem[]);
        }
        if (extData.bomExternalServices && Array.isArray(extData.bomExternalServices)) {
          setBomExternalServices(extData.bomExternalServices as BomExternalServiceItem[]);
        }
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

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const imageUrl = await InventoryService.uploadItemImage(companyId, itemId, file, formData.images.length);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl],
      }));
      toast.success('Bild erfolgreich hochgeladen');
    } catch (error) {
      toast.error((error as Error).message || 'Fehler beim Hochladen des Bildes');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie eine Bezeichnung ein');
      return;
    }

    setSaving(true);
    try {
      // Tax Rate aus taxType berechnen
      let taxRate = 19;
      if (formData.taxType === 'DE_LOW') taxRate = 7;
      else if (formData.taxType === 'DE_FOREST') taxRate = 5.5;
      else if (formData.taxType === 'DE_NO') taxRate = 0;
      
      // BOM-Daten für Stückliste
      const bomData = formData.productType === 'bom' ? {
        bomMaterials,
        bomLabor,
        bomEquipment,
        bomOther,
        bomExternalServices,
        bomTotals: {
          materialTotal: bomCalculations.materials.totalSum,
          laborTotal: bomCalculations.labor.totalSum,
          equipmentTotal: bomCalculations.equipment.totalSum,
          otherTotal: bomCalculations.other.totalSum,
          externalTotal: bomCalculations.external.totalSum,
          totalSurcharge: bomCalculations.totalSurcharge,
          grandTotal: bomCalculations.grandTotal,
        }
      } : {};
      
      await InventoryService.updateInventoryItem(companyId, itemId, {
        ...formData,
        ...bomData,
        unit: formData.offerUnit,
        sellingPrice: formData.productType === 'bom' ? bomCalculations.grandTotal : calculatedValues.offerPrice,
        taxRate,
      });
      
      toast.success('Artikel wurde aktualisiert');
      router.push(`/dashboard/company/${companyId}/inventory/${itemId}`);
    } catch (error) {
      toast.error('Fehler beim Speichern des Artikels');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' €';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Barcode className="w-5 h-5 text-gray-500" />
          <h1 className="text-xl font-semibold text-gray-900">Material</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title="Kopieren"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Material/Leistung löschen"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          
          {/* Basisinformationen */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basisinformationen</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Artikelnummer */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Artikelnummer</Label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                    <Barcode className="w-4 h-4 text-gray-500" />
                  </div>
                  <Input
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="pl-12"
                    maxLength={60}
                  />
                </div>
              </div>
              
              {/* Bezeichnung */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Bezeichnung</Label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="pl-12"
                    maxLength={200}
                    required
                  />
                </div>
              </div>
              
              {/* EAN */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">EAN</Label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                    <Barcode className="w-4 h-4 text-gray-500" />
                  </div>
                  <Input
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="pl-12"
                    maxLength={20}
                  />
                </div>
              </div>
              
              {/* Leer für Spacing */}
              <div></div>
              
              {/* Lieferant */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Lieferant</Label>
                <Select
                  value={formData.supplierId || 'none'}
                  onValueChange={value => {
                    if (value === 'none') {
                      setFormData({ ...formData, supplierId: '', supplierName: '' });
                    } else {
                      const supplier = suppliers.find(s => s.id === value);
                      if (supplier) {
                        setFormData({
                          ...formData,
                          supplierId: supplier.id,
                          supplierName: supplier.name,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lieferant wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Foto hochladen */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Foto hochladen</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.images[0] ? 'Bild vorhanden' : ''}
                    readOnly
                    className="flex-1"
                  />
                  <label className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer flex items-center">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            
            {/* Leistungstext */}
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Leistungstext</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="resize-none"
                maxLength={65535}
              />
            </div>
            
            {/* Kommentare */}
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Kommentare</Label>
              <Textarea
                value={formData.comment}
                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                className="resize-none"
                maxLength={65535}
              />
            </div>
          </section>

          {/* Kalkulation und Preis */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kalkulation und Preis</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kalkulation */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Kalkulation</Label>
                <Select
                  value={formData.calculationType}
                  onValueChange={(value: 'simple' | 'calculated') => setFormData({ ...formData, calculationType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">ohne Kalkulation</SelectItem>
                    <SelectItem value="calculated">mit Kalkulation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Typ */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Typ</Label>
                <Select
                  value={formData.productType}
                  onValueChange={(value: 'material' | 'service' | 'mix' | 'bom') => setFormData({ ...formData, productType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="service">Leistung</SelectItem>
                    <SelectItem value="mix">Mix</SelectItem>
                    <SelectItem value="bom">Stückliste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Mix-Layout: Lohn links, Material rechts - nur bei "mit Kalkulation" */}
            {formData.productType === 'mix' && formData.calculationType === 'calculated' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Linke Spalte - Lohn */}
                <div className="space-y-4">
                  {/* Lohnminuten */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Lohnminuten</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <span className="text-xs text-gray-500 font-medium">Min</span>
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formatGermanNumber(formData.laborMinutes)}
                        onChange={e => setFormData({ ...formData, laborMinutes: parseGermanNumber(e.target.value) })}
                        className="pl-12"
                      />
                    </div>
                  </div>
                  
                  {/* Lohn-Kalkulationstabelle */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Lohneinzelkosten</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(formData.laborHourlyRate)} / Stunde</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.laborCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Lohngemeinkosten</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.laborOverheadPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.laborOverhead)}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td className="px-4 py-2 text-gray-900 font-medium">Selbstkosten</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.selfCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Gewinnzuschlag</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.laborProfitMarginOverride ?? formData.profitMarginPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.profit)}</td>
                        </tr>
                        <tr className="bg-[#14ad9f]/10">
                          <td className="px-4 py-2 text-gray-900 font-semibold">Angebotspreis Lohn</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-bold text-[#14ad9f]">{formatCurrency(laborCalculatedValues.offerPrice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Gewinnzuschlag Lohn überschreiben */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Gewinnzuschlag Lohn überschreiben</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <Percent className="w-4 h-4 text-gray-500" />
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.laborProfitMarginOverride !== null ? formatGermanNumber(formData.laborProfitMarginOverride) : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setFormData({ ...formData, laborProfitMarginOverride: null });
                          } else {
                            setFormData({ ...formData, laborProfitMarginOverride: parseGermanNumber(val) });
                          }
                        }}
                        className="pl-12"
                        placeholder="Standard verwenden"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Rechte Spalte - Material */}
                <div className="space-y-4">
                  {/* Einkaufspreis */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Einkaufspreis (Nettopreis)</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <Euro className="w-4 h-4 text-gray-500" />
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formatGermanNumber(formData.purchasePrice)}
                        onChange={e => setFormData({ ...formData, purchasePrice: parseGermanNumber(e.target.value) })}
                        className="pl-12"
                      />
                    </div>
                  </div>
                  
                  {/* Material-Kalkulationstabelle */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Materialeinzelkosten</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.materialCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Materialgemeinkosten</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.materialOverheadPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.materialOverhead)}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td className="px-4 py-2 text-gray-900 font-medium">Selbstkosten</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.selfCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Gewinnzuschlag</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.profitMarginOverride ?? formData.profitMarginPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.profit)}</td>
                        </tr>
                        <tr className="bg-[#14ad9f]/10">
                          <td className="px-4 py-2 text-gray-900 font-semibold">Angebotspreis Material</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-bold text-[#14ad9f]">{formatCurrency(materialCalculatedValues.offerPrice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Gewinnzuschlag Material überschreiben */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Gewinnzuschlag Material überschreiben</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <Percent className="w-4 h-4 text-gray-500" />
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.profitMarginOverride !== null ? formatGermanNumber(formData.profitMarginOverride) : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setFormData({ ...formData, profitMarginOverride: null });
                          } else {
                            setFormData({ ...formData, profitMarginOverride: parseGermanNumber(val) });
                          }
                        }}
                        className="pl-12"
                        placeholder="Standard verwenden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Nur Material Layout - nur bei "mit Kalkulation" */}
            {formData.productType === 'material' && formData.calculationType === 'calculated' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div></div>
                <div className="space-y-4">
                  {/* Einkaufspreis */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Einkaufspreis (Nettopreis)</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <Euro className="w-4 h-4 text-gray-500" />
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formatGermanNumber(formData.purchasePrice)}
                        onChange={e => setFormData({ ...formData, purchasePrice: parseGermanNumber(e.target.value) })}
                        className="pl-12"
                      />
                    </div>
                  </div>
                  
                  {/* Material-Kalkulationstabelle */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Materialeinzelkosten</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.materialCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Materialgemeinkosten</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.materialOverheadPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.materialOverhead)}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td className="px-4 py-2 text-gray-900 font-medium">Selbstkosten</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.selfCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Gewinnzuschlag</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.profitMarginOverride ?? formData.profitMarginPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(materialCalculatedValues.profit)}</td>
                        </tr>
                        <tr className="bg-[#14ad9f]/10">
                          <td className="px-4 py-2 text-gray-900 font-semibold">Angebotspreis Material</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-bold text-[#14ad9f]">{formatCurrency(materialCalculatedValues.offerPrice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Gewinnzuschlag Material überschreiben */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Gewinnzuschlag Material überschreiben</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <Percent className="w-4 h-4 text-gray-500" />
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.profitMarginOverride !== null ? formatGermanNumber(formData.profitMarginOverride) : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setFormData({ ...formData, profitMarginOverride: null });
                          } else {
                            setFormData({ ...formData, profitMarginOverride: parseGermanNumber(val) });
                          }
                        }}
                        className="pl-12"
                        placeholder="Standard verwenden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Nur Leistung Layout - nur bei "mit Kalkulation" */}
            {formData.productType === 'service' && formData.calculationType === 'calculated' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div></div>
                <div className="space-y-4">
                  {/* Lohnminuten */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Lohnminuten</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <span className="text-xs text-gray-500 font-medium">Min</span>
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formatGermanNumber(formData.laborMinutes)}
                        onChange={e => setFormData({ ...formData, laborMinutes: parseGermanNumber(e.target.value) })}
                        className="pl-12"
                      />
                    </div>
                  </div>
                  
                  {/* Lohn-Kalkulationstabelle */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Lohneinzelkosten</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(formData.laborHourlyRate)} / Stunde</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.laborCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Lohngemeinkosten</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.laborOverheadPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.laborOverhead)}</td>
                        </tr>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td className="px-4 py-2 text-gray-900 font-medium">Selbstkosten</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.selfCost)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-700">Gewinnzuschlag</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formData.laborProfitMarginOverride ?? formData.profitMarginPercent} %</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(laborCalculatedValues.profit)}</td>
                        </tr>
                        <tr className="bg-[#14ad9f]/10">
                          <td className="px-4 py-2 text-gray-900 font-semibold">Angebotspreis Lohn</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2 text-right font-bold text-[#14ad9f]">{formatCurrency(laborCalculatedValues.offerPrice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Gewinnzuschlag Lohn überschreiben */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Gewinnzuschlag Lohn überschreiben</Label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                        <Percent className="w-4 h-4 text-gray-500" />
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.laborProfitMarginOverride !== null ? formatGermanNumber(formData.laborProfitMarginOverride) : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setFormData({ ...formData, laborProfitMarginOverride: null });
                          } else {
                            setFormData({ ...formData, laborProfitMarginOverride: parseGermanNumber(val) });
                          }
                        }}
                        className="pl-12"
                        placeholder="Standard verwenden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Stückliste (BOM) Layout - nur bei "mit Kalkulation" */}
            {formData.productType === 'bom' && formData.calculationType === 'calculated' && (
              <div className="mt-6 space-y-6">
                
                {/* Material-Sektion */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Material</h3>
                    <button
                      type="button"
                      onClick={addBomMaterial}
                      className="w-8 h-8 flex items-center justify-center bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
                      title="Materialposition hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-700 font-medium">Material</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-20">Menge</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-20">Einheit</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-28">Einkaufspreis</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-24" title="Verschnitt/Rabatt">Verschn./Ra.</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-24">Aufschlag %</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Einzelpreis</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Gesamt</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomMaterials.map((item, idx) => {
                          const calc = bomCalculations.materials.items[idx];
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <div className="relative">
                                  <Input
                                    value={item.materialName}
                                    onChange={e => updateBomMaterial(item.id, 'materialName', e.target.value)}
                                    placeholder="Material"
                                    className="pr-8"
                                  />
                                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.quantity}
                                  onChange={e => updateBomMaterial(item.id, 'quantity', Number(e.target.value))}
                                  placeholder="Menge"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select value={item.unit || 'none'} onValueChange={value => updateBomMaterial(item.id, 'unit', value === 'none' ? '' : value)}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {UNIT_OPTIONS.map(unit => (
                                      <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.purchasePrice}
                                  onChange={e => updateBomMaterial(item.id, 'purchasePrice', Number(e.target.value))}
                                  placeholder="Einkaufspreis"
                                  className="text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.wastagePercent}
                                  onChange={e => updateBomMaterial(item.id, 'wastagePercent', Number(e.target.value))}
                                  placeholder="Verschn./Ra."
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.surchargePercent}
                                  onChange={e => updateBomMaterial(item.id, 'surchargePercent', Number(e.target.value))}
                                  placeholder="0"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.unitPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.total || 0)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeBomMaterial(item.id)}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Stücklistenposition löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-3 py-2 text-gray-700">Summe Material</td>
                          <td colSpan={4}></td>
                          <td className="px-3 py-2 text-right">{formatCurrency(bomCalculations.materials.surchargeSum)}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(bomCalculations.materials.totalSum)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lohn-Sektion */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Lohn</h3>
                    <button
                      type="button"
                      onClick={addBomLabor}
                      className="w-8 h-8 flex items-center justify-center bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
                      title="Lohnposition hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-700 font-medium">Bezeichnung</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-32">Lohngruppe</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-20">Minuten</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-28">Stundenlohn</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-24">Aufschlag %</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Einzelpreis</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Gesamt</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomLabor.map((item, idx) => {
                          const calc = bomCalculations.labor.items[idx];
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <Input
                                  value={item.name}
                                  onChange={e => updateBomLabor(item.id, 'name', e.target.value)}
                                  placeholder="Bezeichnung"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select value={item.wageGroup || 'none'} onValueChange={value => updateBomLabor(item.id, 'wageGroup', value === 'none' ? '' : value)}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={item.minutes}
                                  onChange={e => updateBomLabor(item.id, 'minutes', Number(e.target.value))}
                                  placeholder="Menge"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.hourlyRate}
                                  onChange={e => updateBomLabor(item.id, 'hourlyRate', Number(e.target.value))}
                                  placeholder="Stundenlohn"
                                  className="text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.surchargePercent}
                                  onChange={e => updateBomLabor(item.id, 'surchargePercent', Number(e.target.value))}
                                  placeholder="0"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.unitPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.total || 0)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeBomLabor(item.id)}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Stücklistenposition löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-3 py-2 text-gray-700">Summe Lohn</td>
                          <td colSpan={3}></td>
                          <td className="px-3 py-2 text-right">{formatCurrency(bomCalculations.labor.surchargeSum)}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(bomCalculations.labor.totalSum)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Geräte-Sektion */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Geräte</h3>
                    <button
                      type="button"
                      onClick={addBomEquipment}
                      className="w-8 h-8 flex items-center justify-center bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
                      title="Gerätekosten hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-700 font-medium">Bezeichnung</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-20">Menge</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-28">Einkaufspreis</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-24">Aufschlag %</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Einzelpreis</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Gesamt</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomEquipment.map((item, idx) => {
                          const calc = bomCalculations.equipment.items[idx];
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <Input
                                  value={item.name}
                                  onChange={e => updateBomEquipment(item.id, 'name', e.target.value)}
                                  placeholder="Bezeichnung"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.quantity}
                                  onChange={e => updateBomEquipment(item.id, 'quantity', Number(e.target.value))}
                                  placeholder="Menge"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.purchasePrice}
                                  onChange={e => updateBomEquipment(item.id, 'purchasePrice', Number(e.target.value))}
                                  placeholder="Einkaufspreis"
                                  className="text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.surchargePercent}
                                  onChange={e => updateBomEquipment(item.id, 'surchargePercent', Number(e.target.value))}
                                  placeholder="0"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.unitPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.total || 0)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeBomEquipment(item.id)}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Stücklistenposition löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-3 py-2 text-gray-700">Summe Geräte</td>
                          <td colSpan={2}></td>
                          <td className="px-3 py-2 text-right">{formatCurrency(bomCalculations.equipment.surchargeSum)}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(bomCalculations.equipment.totalSum)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sonstiges-Sektion */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Sonstiges</h3>
                    <button
                      type="button"
                      onClick={addBomOther}
                      className="w-8 h-8 flex items-center justify-center bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
                      title="Sonstige Kosten hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-700 font-medium">Bezeichnung</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-20">Menge</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-28">Einkaufspreis</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-24">Aufschlag %</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Einzelpreis</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Gesamt</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomOther.map((item, idx) => {
                          const calc = bomCalculations.other.items[idx];
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <Input
                                  value={item.name}
                                  onChange={e => updateBomOther(item.id, 'name', e.target.value)}
                                  placeholder="Bezeichnung"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.quantity}
                                  onChange={e => updateBomOther(item.id, 'quantity', Number(e.target.value))}
                                  placeholder="Menge"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.purchasePrice}
                                  onChange={e => updateBomOther(item.id, 'purchasePrice', Number(e.target.value))}
                                  placeholder="Einkaufspreis"
                                  className="text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.surchargePercent}
                                  onChange={e => updateBomOther(item.id, 'surchargePercent', Number(e.target.value))}
                                  placeholder="0"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.unitPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.total || 0)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeBomOther(item.id)}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Stücklistenposition löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-3 py-2 text-gray-700">Summe Sonstiges</td>
                          <td colSpan={2}></td>
                          <td className="px-3 py-2 text-right">{formatCurrency(bomCalculations.other.surchargeSum)}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(bomCalculations.other.totalSum)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fremdleistungen-Sektion */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Fremdleistungen</h3>
                    <button
                      type="button"
                      onClick={addBomExternalService}
                      className="w-8 h-8 flex items-center justify-center bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
                      title="Fremdleistung hinzufügen"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-700 font-medium">Bezeichnung</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-32">Lieferant</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-20">Menge</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-28">Einkaufspreis</th>
                          <th className="px-3 py-2 text-center text-gray-700 font-medium w-24">Aufschlag %</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Einzelpreis</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium w-24">Gesamt</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomExternalServices.map((item, idx) => {
                          const calc = bomCalculations.external.items[idx];
                          return (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-3 py-2">
                                <Input
                                  value={item.name}
                                  onChange={e => updateBomExternalService(item.id, 'name', e.target.value)}
                                  placeholder="Bezeichnung"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select value={item.supplierId || 'none'} onValueChange={value => {
                                  const supplier = suppliers.find(s => s.id === value);
                                  updateBomExternalService(item.id, 'supplierId', value === 'none' ? '' : value);
                                  if (supplier) {
                                    setBomExternalServices(prev => prev.map(i => i.id === item.id ? { ...i, supplierName: supplier.name } : i));
                                  }
                                }}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {suppliers.map(s => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.quantity}
                                  onChange={e => updateBomExternalService(item.id, 'quantity', Number(e.target.value))}
                                  placeholder="Menge"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.purchasePrice}
                                  onChange={e => updateBomExternalService(item.id, 'purchasePrice', Number(e.target.value))}
                                  placeholder="Einkaufspreis"
                                  className="text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.surchargePercent}
                                  onChange={e => updateBomExternalService(item.id, 'surchargePercent', Number(e.target.value))}
                                  placeholder="0"
                                  className="text-center"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.unitPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700">
                                {formatCurrency(calc?.total || 0)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeBomExternalService(item.id)}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Stücklistenposition löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-3 py-2 text-gray-700">Summe Fremdleistungen</td>
                          <td colSpan={3}></td>
                          <td className="px-3 py-2 text-right">{formatCurrency(bomCalculations.external.surchargeSum)}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(bomCalculations.external.totalSum)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Gesamtsumme */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#14ad9f]/5">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="font-semibold">
                        <td className="px-4 py-3 text-gray-900 underline">Gesamt</td>
                        <td className="px-4 py-3 text-right underline w-28">{formatCurrency(bomCalculations.totalSurcharge)}</td>
                        <td className="w-24"></td>
                        <td className="px-4 py-3 text-right underline w-28 text-[#14ad9f]">{formatCurrency(bomCalculations.grandTotal)}</td>
                        <td className="w-10"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Angebotspreistyp und Angebotspreis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Angebotspreistyp</Label>
                <Select
                  value={formData.offerPriceType}
                  onValueChange={(value: 'calculated' | 'manual') => setFormData({ ...formData, offerPriceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calculated">kalkuliert</SelectItem>
                    <SelectItem value="manual">manuell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Angebotspreis</Label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                    <Euro className="w-4 h-4 text-gray-500" />
                  </div>
                  <Input
                    type={formData.offerPriceType === 'manual' ? 'number' : 'text'}
                    step="0.01"
                    value={formData.offerPriceType === 'manual' ? formData.offerPriceManual : formatCurrency(calculatedValues.offerPrice)}
                    onChange={e => formData.offerPriceType === 'manual' && setFormData({ ...formData, offerPriceManual: Number(e.target.value) })}
                    className="pl-12 text-right"
                    readOnly={formData.offerPriceType === 'calculated'}
                  />
                </div>
              </div>
            </div>
            
            {/* Gebinde und Einheiten */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Gebindegröße</Label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100000"
                    value={formData.containerSize}
                    onChange={e => setFormData({ ...formData, containerSize: Number(e.target.value) })}
                    className="pl-12"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Einheit Gebinde</Label>
                <Select
                  value={formData.containerUnit || 'none'}
                  onValueChange={value => setFormData({ ...formData, containerUnit: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {UNIT_OPTIONS.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Verbrauch - nur bei Mix */}
              {formData.productType === 'mix' ? (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Verbrauch</Label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500 font-medium">V</span>
                    </div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formatGermanNumber(formData.consumption)}
                      onChange={e => setFormData({ ...formData, consumption: parseGermanNumber(e.target.value) })}
                      className="pl-12"
                    />
                  </div>
                </div>
              ) : (
                <div></div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Angebotseinheit</Label>
                <Select
                  value={formData.offerUnit || 'none'}
                  onValueChange={value => setFormData({ ...formData, offerUnit: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {UNIT_OPTIONS.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Umsatzsteuer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Umsatzsteuer</Label>
                <Select
                  value={formData.taxType}
                  onValueChange={value => setFormData({ ...formData, taxType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href={`/dashboard/company/${companyId}/inventory/${itemId}`}>
              <Button variant="outline">Abbrechen</Button>
            </Link>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name.trim()}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

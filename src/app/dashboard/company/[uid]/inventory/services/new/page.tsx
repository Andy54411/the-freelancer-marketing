'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase, Euro, FileText, Save, Tag, X, Clock, Info, Calculator } from 'lucide-react';
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

interface ServiceFormData {
  name: string;
  description: string;
  price: number;
  unit: string;
  taxRate: number;
  sku: string;
  category: string;
  notes: string;
  isActive: boolean;
}

const INITIAL_FORM_DATA: ServiceFormData = {
  name: '',
  description: '',
  price: 0,
  unit: 'Std',
  taxRate: 19,
  sku: '',
  category: '',
  notes: '',
  isActive: true,
};

const SERVICE_UNITS = [
  { value: 'Std', label: 'Stunde', description: 'Für zeitbasierte Abrechnung' },
  { value: 'Tag', label: 'Tag', description: 'Tagesbasierte Abrechnung' },
  { value: 'Stk', label: 'Stück', description: 'Pro Einheit/Stück' },
  { value: 'Monat', label: 'Monat', description: 'Monatliche Abrechnung' },
  { value: 'Jahr', label: 'Jahr', description: 'Jährliche Abrechnung' },
  { value: 'Pauschale', label: 'Pauschale', description: 'Einmaliger Festpreis' },
  { value: 'km', label: 'Kilometer', description: 'Für Fahrtkosten' },
  { value: 'Projekt', label: 'Projekt', description: 'Projektbasierte Abrechnung' },
];

const SERVICE_CATEGORIES = [
  'Beratung',
  'Entwicklung',
  'Design',
  'Marketing',
  'Support',
  'Schulung',
  'Installation',
  'Wartung',
  'Reparatur',
  'Transport',
  'Sonstiges',
];

export default function NewServicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = params?.uid as string;
  const editId = searchParams?.get('edit');
  const isEditMode = !!editId;

  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // Beim Bearbeiten: Daten laden
  useEffect(() => {
    if (!isEditMode || !companyId || !editId) return;
    
    // Lokale Kopien für die async-Funktion
    const currentCompanyId = companyId;
    const currentEditId = editId;

    async function loadService() {
      setLoading(true);
      try {
        const docRef = doc(db, 'companies', currentCompanyId, 'inlineInvoiceServices', currentEditId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            unit: data.unit || 'Std',
            taxRate: data.taxRate ?? 19,
            sku: data.sku || '',
            category: data.category || '',
            notes: data.notes || '',
            isActive: data.isActive !== false,
          });
        } else {
          toast.error('Dienstleistung nicht gefunden');
          router.push(`/dashboard/company/${currentCompanyId}/inventory?tab=services`);
        }
      } catch (error) {
        toast.error('Fehler beim Laden der Dienstleistung');
        router.push(`/dashboard/company/${currentCompanyId}/inventory?tab=services`);
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [isEditMode, companyId, editId, router]);

  async function handleSave() {
    if (!companyId) {
      toast.error('Keine Firmen-ID vorhanden');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Dienstleistung ein');
      return;
    }

    setSaving(true);
    try {
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        unit: formData.unit,
        taxRate: formData.taxRate,
        sku: formData.sku.trim(),
        category: formData.category,
        notes: formData.notes.trim(),
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode && editId) {
        // Aktualisieren
        const docRef = doc(db, 'companies', companyId, 'inlineInvoiceServices', editId);
        await updateDoc(docRef, serviceData);
        toast.success('Dienstleistung erfolgreich aktualisiert');
      } else {
        // Neu erstellen
        await addDoc(collection(db, 'companies', companyId, 'inlineInvoiceServices'), {
          ...serviceData,
          createdAt: serverTimestamp(),
        });
        toast.success('Dienstleistung erfolgreich erstellt');
      }

      router.push(`/dashboard/company/${companyId}/inventory?tab=services`);
    } catch (error) {
      toast.error('Fehler beim Speichern der Dienstleistung');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(`/dashboard/company/${companyId}/inventory?tab=services`);
  }

  // Brutto-Preis berechnen
  const bruttoPrice = formData.price * (1 + formData.taxRate / 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/company/${companyId}/inventory?tab=services`}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {isEditMode ? 'Dienstleistung bearbeiten' : 'Neue Dienstleistung'}
                </h1>
                <p className="text-xs text-gray-500">
                  {isEditMode ? 'Ändern Sie die Details der Dienstleistung' : 'Erstellen Sie eine neue Dienstleistung für Ihre Rechnungen'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="bg-[#14ad9f] hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Speichern...' : isEditMode ? 'Aktualisieren' : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linke Spalte - Hauptformular */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grunddaten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-[#14ad9f]" />
                  Grunddaten
                </CardTitle>
                <CardDescription>
                  Erfassen Sie die grundlegenden Informationen zur Dienstleistung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">Name der Dienstleistung *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="z.B. IT-Beratung, Webdesign, Wartungsservice"
                      className="mt-1.5 border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">Artikelnummer / SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="z.B. DL-001"
                      className="mt-1.5 border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                    />
                  </div>
                  <div>
                    <Label>Kategorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={value => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-1.5 border-gray-200">
                        <SelectValue placeholder="Kategorie wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detaillierte Beschreibung der Dienstleistung, die auch auf Rechnungen erscheinen kann..."
                    rows={4}
                    className="mt-1.5 border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Diese Beschreibung kann auf Rechnungen und Angeboten verwendet werden.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preise & Einheiten */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-[#14ad9f]" />
                  Preise & Einheiten
                </CardTitle>
                <CardDescription>
                  Legen Sie den Preis und die Abrechnungseinheit fest
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Netto-Preis (EUR)</Label>
                    <div className="relative mt-1.5">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price || ''}
                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                        className="pl-10 border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Abrechnungseinheit</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={value => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger className="mt-1.5 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_UNITS.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            <div className="flex flex-col">
                              <span>{unit.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>MwSt.-Satz</Label>
                    <Select
                      value={String(formData.taxRate)}
                      onValueChange={value => setFormData({ ...formData, taxRate: Number(value) })}
                    >
                      <SelectTrigger className="mt-1.5 border-gray-200">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Netto-Preis</p>
                      <p className="font-semibold text-gray-900">
                        {formData.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        <span className="text-xs text-gray-500 ml-1">/ {formData.unit}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">MwSt. ({formData.taxRate}%)</p>
                      <p className="font-semibold text-gray-900">
                        {(formData.price * formData.taxRate / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Brutto-Preis</p>
                      <p className="font-semibold text-[#14ad9f]">
                        {bruttoPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        <span className="text-xs text-gray-500 ml-1">/ {formData.unit}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interne Notizen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#14ad9f]" />
                  Interne Notizen
                </CardTitle>
                <CardDescription>
                  Notizen, die nur intern sichtbar sind (nicht auf Rechnungen)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Interne Anmerkungen zur Dienstleistung..."
                  rows={3}
                  className="border-gray-200 focus:border-[#14ad9f] focus:ring-[#14ad9f]/20 resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte - Vorschau & Status */}
          <div className="space-y-6">
            {/* Schnellvorschau */}
            <Card className="bg-teal-50 border-teal-200">
              <CardHeader>
                <CardTitle className="text-teal-900 text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Dienstleistungsvorschau
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-teal-700">Name:</span>
                  <span className="font-medium text-teal-900 text-right max-w-[150px] truncate">
                    {formData.name || '-'}
                  </span>
                </div>
                {formData.sku && (
                  <div className="flex justify-between">
                    <span className="text-teal-700">SKU:</span>
                    <span className="font-medium text-teal-900">{formData.sku}</span>
                  </div>
                )}
                {formData.category && (
                  <div className="flex justify-between">
                    <span className="text-teal-700">Kategorie:</span>
                    <span className="font-medium text-teal-900">{formData.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-teal-700">Einheit:</span>
                  <span className="font-medium text-teal-900">
                    {SERVICE_UNITS.find(u => u.value === formData.unit)?.label || formData.unit}
                  </span>
                </div>
                <div className="border-t border-teal-200 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-teal-700">Netto:</span>
                    <span className="font-medium text-teal-900">
                      {formData.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-teal-700">Brutto:</span>
                    <span className="font-bold text-teal-900">
                      {bruttoPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hilfe-Karte: Einheiten */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#14ad9f]" />
                  Abrechnungseinheiten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {SERVICE_UNITS.slice(0, 5).map(unit => (
                  <div key={unit.value} className="flex items-start gap-2 text-xs">
                    <span className="font-medium text-gray-700 w-16">{unit.label}:</span>
                    <span className="text-gray-500">{unit.description}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Info-Karte */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-900 text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Tipps zur Preisgestaltung
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-blue-800 space-y-2">
                <p>
                  <strong>Stundensatz:</strong> Berücksichtigen Sie Ihre Kosten, Qualifikation und den Marktpreis. 
                  Ein guter Richtwert sind 2-3x Ihre gewünschten Netto-Einkünfte.
                </p>
                <p>
                  <strong>Pauschalen:</strong> Ideal für wiederkehrende Leistungen mit klarem Umfang - 
                  gibt Kunden Planungssicherheit.
                </p>
              </CardContent>
            </Card>

            {/* Kalkulationshilfe */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-[#14ad9f]" />
                  Beispielrechnung
                </CardTitle>
                <CardDescription className="text-xs">
                  Basierend auf Ihrem Stundenpreis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {formData.unit === 'Std' && formData.price > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">8 Stunden:</span>
                      <span className="font-medium">
                        {(formData.price * 8).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} netto
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">1 Tag (8h) brutto:</span>
                      <span className="font-medium text-[#14ad9f]">
                        {(formData.price * 8 * (1 + formData.taxRate / 100)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-gray-600">1 Woche (40h):</span>
                      <span className="font-medium">
                        {(formData.price * 40).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} netto
                      </span>
                    </div>
                  </>
                )}
                {formData.unit === 'Tag' && formData.price > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">5 Tage (1 Woche):</span>
                      <span className="font-medium">
                        {(formData.price * 5).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} netto
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">20 Tage (1 Monat):</span>
                      <span className="font-medium text-[#14ad9f]">
                        {(formData.price * 20 * (1 + formData.taxRate / 100)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} brutto
                      </span>
                    </div>
                  </>
                )}
                {!['Std', 'Tag'].includes(formData.unit) && (
                  <p className="text-gray-500 italic">
                    Beispielrechnungen sind für Stunden- und Tagessätze verfügbar.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

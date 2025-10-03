'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Trash2, Package, Euro, Clock, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { ServiceItem, PackageDataState, AddonItem } from '@/types/service';

interface ServiceEditProps {
  service: ServiceItem;
  editingPackageType: 'basic' | 'standard' | 'premium';
  onCancel: () => void;
}

export const ServiceEdit: React.FC<ServiceEditProps> = ({ service, editingPackageType, onCancel }) => {
  const { user } = useAuth();

  // State for package data
  const [packageData, setPackageData] = useState<PackageDataState>({
    basic: { tier: 'basic', price: 0, deliveryTime: 7, deliveryUnit: 'Tage', duration: 0, description: '', features: [], additionalServices: [] },
    standard: { tier: 'standard', price: 0, deliveryTime: 7, deliveryUnit: 'Tage', duration: 0, description: '', features: [], additionalServices: [] },
    premium: { tier: 'premium', price: 0, deliveryTime: 7, deliveryUnit: 'Tage', duration: 0, description: '', features: [], additionalServices: [] }
  });

  // State for addons
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load service data DIRECTLY from Firestore
  useEffect(() => {
    const loadServiceData = async () => {
      if (!service.id || !user?.uid) {

        return;
      }

      try {
        setIsLoading(true);






        // Get document directly from Firestore
        const serviceRef = doc(db, 'companies', user.uid, 'servicePackages', service.id);
        const docSnap = await getDoc(serviceRef);

        if (docSnap.exists()) {
          const data = docSnap.data();


          // Set the package data with loaded values
          const loadedPackageData = {
            tier: editingPackageType,
            price: data.price || 0,
            deliveryTime: data.deliveryTime || 7,
            deliveryUnit: data.deliveryUnit || 'Tage',
            duration: data.duration || 0,
            description: data.description || '',
            features: data.features || [],
            additionalServices: data.additionalServices || []
          };


          setPackageData((prev) => ({
            ...prev,
            [editingPackageType]: loadedPackageData
          }));

          // Set addons from additionalServices
          const loadedAddons = data.additionalServices || [];

          setAddons(loadedAddons);


        } else {

          toast.error('Service nicht gefunden');
        }

      } catch (error) {
        console.error('❌ Error loading service data:', error);
        toast.error('Fehler beim Laden der Service-Daten');
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceData();
  }, [service.id, user?.uid, editingPackageType]);

  const currentPackage = packageData[editingPackageType];

  // Calculate total price from addons
  const calculateAddonsTotal = () => {
    return addons.reduce((total, addon) => total + (addon.price || 0), 0);
  };

  // Calculate total price including package and addons
  const calculateTotalPrice = () => {
    const packagePrice = currentPackage?.price || 0;
    const addonsTotal = calculateAddonsTotal();
    return packagePrice + addonsTotal;
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setPackageData((prev) => ({
      ...prev,
      [editingPackageType]: {
        ...prev[editingPackageType],
        [field]: value
      }
    }));
  };

  // Handle features
  const handleFeatureChange = (index: number, value: string) => {
    const updatedFeatures = [...currentPackage.features];
    updatedFeatures[index] = value;
    handleFieldChange('features', updatedFeatures);
  };

  const addFeature = () => {
    handleFieldChange('features', [...currentPackage.features, '']);
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = currentPackage.features.filter((_, i) => i !== index);
    handleFieldChange('features', updatedFeatures);
  };

  // Handle addons
  const handleAddonChange = (index: number, field: string, value: any) => {
    const updatedAddons = [...addons];
    updatedAddons[index] = { ...updatedAddons[index], [field]: value };
    setAddons(updatedAddons);
  };

  const addAddon = () => {
    setAddons((prev) => [...prev, { name: '', description: '', price: 0 }]);
  };

  const removeAddon = (index: number) => {
    setAddons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.uid || !service.id) {
      toast.error('Fehler: Keine User ID oder Service ID');
      return;
    }

    try {







      // Update the document in Firestore
      const serviceRef = doc(db, 'companies', user.uid, 'servicePackages', service.id);

      const updateData = {
        // Update basic package data
        price: currentPackage?.price || 0,
        deliveryTime: currentPackage?.deliveryTime || 7,
        deliveryUnit: currentPackage?.deliveryUnit || 'Tage',
        description: currentPackage?.description || '',
        features: currentPackage?.features || [],
        additionalServices: addons,
        // Add calculated totals
        addonsTotal: calculateAddonsTotal(),
        totalPrice: calculateTotalPrice(),
        updatedAt: new Date()
      };

      await updateDoc(serviceRef, updateData);


      toast.success('Änderungen erfolgreich gespeichert!');

      // Go back after successful save
      onCancel();

    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Änderungen');
    }
  };

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex items-center gap-2 border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white">

            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{service.title}</h3>
            <p className="text-sm text-[#14ad9f] capitalize font-medium">{editingPackageType} Paket bearbeiten</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#14ad9f] hover:bg-[#129488] text-white border-0">

          <Save className="h-4 w-4" />
          Speichern
        </Button>
      </div>

      {/* Status */}
      {isLoading ?
      <div className="bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg p-3 mb-6">
          <p className="text-sm text-[#14ad9f]">
            ⏳ Lade Daten aus Firestore...
          </p>
        </div> :
      currentPackage ?
      <div className="bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg p-3 mb-6">
          <p className="text-sm text-[#14ad9f]">
            ✅ Daten geladen • Preis: {currentPackage.price}€ • {addons.length} Zusatzleistungen • Features: {currentPackage.features?.length || 0}
          </p>
        </div> :

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-800">
            ❌ Fehler beim Laden der Daten
          </p>
        </div>
      }

      {/* Package Details */}
      <div className="border rounded-lg p-6 bg-white shadow-sm mb-4 border-[#14ad9f]/20">
        <h4 className="text-lg font-semibold text-[#14ad9f] mb-4">
          Paket-Details
        </h4>
        
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price" className="text-sm font-medium text-[#14ad9f] mb-1 block">
                Preis
              </Label>
              <div className="relative">
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentPackage?.price || 0}
                  onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                  className="pr-8 border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                  placeholder="0.00" />

                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#14ad9f] text-sm font-medium">€</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="deliveryTime" className="text-sm font-medium text-[#14ad9f] mb-1 block flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Lieferzeit
              </Label>
              <Input
                id="deliveryTime"
                type="number"
                min="1"
                value={currentPackage?.deliveryTime || 7}
                onChange={(e) => handleFieldChange('deliveryTime', parseInt(e.target.value) || 7)}
                className="border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]"
                placeholder="7" />

            </div>

            <div>
              <Label className="text-sm font-medium text-[#14ad9f] mb-1 block">
                Einheit
              </Label>
              <Select
                value={currentPackage?.deliveryUnit || 'Tage'}
                onValueChange={(value) => handleFieldChange('deliveryUnit', value)}>

                <SelectTrigger className="border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Minuten">Minuten</SelectItem>
                  <SelectItem value="Stunden">Stunden</SelectItem>
                  <SelectItem value="Tage">Tage</SelectItem>
                  <SelectItem value="Wochen">Wochen</SelectItem>
                  <SelectItem value="Monate">Monate</SelectItem>
                  <SelectItem value="Haarschnitt">pro Haarschnitt</SelectItem>
                  <SelectItem value="Massage">pro Massage</SelectItem>
                  <SelectItem value="Projekt">pro Projekt</SelectItem>
                  <SelectItem value="Termin">pro Termin</SelectItem>
                  <SelectItem value="Pauschal">Pauschal</SelectItem>
                  <SelectItem value="Nach Vereinbarung">Nach Vereinbarung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-[#14ad9f] mb-1 block">
              Beschreibung
            </Label>
            <Textarea
              id="description"
              value={currentPackage?.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Beschreiben Sie, was in diesem Paket enthalten ist..."
              className="min-h-[100px] resize-none border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

          </div>
        </div>
      </div>

      {/* Features */}
      <div className="border rounded-lg p-6 bg-white shadow-sm mb-4 border-[#14ad9f]/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[#14ad9f]">
            Leistungen ({currentPackage?.features?.length || 0})
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addFeature}
            className="flex items-center gap-2 border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white">

            <Plus className="h-4 w-4" />
            Hinzufügen
          </Button>
        </div>
        
        <div className="space-y-3">
          {(currentPackage?.features || []).map((feature, index) =>
          <div key={index} className="flex items-center gap-3">
              <Input
              value={feature}
              onChange={(e) => handleFeatureChange(index, e.target.value)}
              placeholder="Leistung beschreiben..."
              className="flex-1 border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

              <Button
              variant="outline"
              size="sm"
              onClick={() => removeFeature(index)}
              className="text-red-600 hover:text-red-700 hover:border-red-300">

                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {(currentPackage?.features?.length || 0) === 0 &&
          <p className="text-[#14ad9f]/60 text-sm">Noch keine Leistungen hinzugefügt</p>
          }
        </div>
      </div>

      {/* Add-ons */}
      <div className="border rounded-lg p-6 bg-white shadow-sm border-[#14ad9f]/20 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-[#14ad9f]">
            Zusatzleistungen ({addons.length})
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addAddon}
            className="flex items-center gap-2 border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white">

            <Plus className="h-4 w-4" />
            Hinzufügen
          </Button>
        </div>
        
        <div className="space-y-4">
          {addons.map((addon, index) =>
          <div key={index} className="border rounded-lg p-4 bg-[#14ad9f]/5 border-[#14ad9f]/20">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-[#14ad9f]">Zusatzleistung {index + 1}</h5>
                <Button
                variant="outline"
                size="sm"
                onClick={() => removeAddon(index)}
                className="text-red-600 hover:text-red-700 hover:border-red-300">

                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`addon-name-${index}`} className="text-sm font-medium text-[#14ad9f] mb-1 block">Name</Label>
                    <Input
                    id={`addon-name-${index}`}
                    value={addon.name}
                    onChange={(e) => handleAddonChange(index, 'name', e.target.value)}
                    placeholder="z.B. Express-Lieferung"
                    className="border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                  </div>
                  <div>
                    <Label htmlFor={`addon-price-${index}`} className="text-sm font-medium text-[#14ad9f] mb-1 block">Preis</Label>
                    <div className="relative">
                      <Input
                      id={`addon-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={addon.price}
                      onChange={(e) => handleAddonChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className="pr-8 border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#14ad9f] text-sm font-medium">€</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`addon-description-${index}`} className="text-sm font-medium text-[#14ad9f] mb-1 block">Beschreibung</Label>
                  <Textarea
                  id={`addon-description-${index}`}
                  value={addon.description}
                  onChange={(e) => handleAddonChange(index, 'description', e.target.value)}
                  placeholder="Beschreibung der Zusatzleistung..."
                  rows={2}
                  className="resize-none border-[#14ad9f]/30 focus:border-[#14ad9f] focus:ring-[#14ad9f]" />

                </div>
              </div>
            </div>
          )}
          
          {addons.length === 0 &&
          <p className="text-[#14ad9f]/60 text-sm">Noch keine Zusatzleistungen hinzugefügt</p>
          }
        </div>
      </div>

      {/* Price Overview */}
      <Card className="mb-6 border-[#14ad9f]/20 bg-gradient-to-r from-[#14ad9f]/5 to-[#14ad9f]/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-[#14ad9f]" />
            <CardTitle className="text-[#14ad9f]">Preisübersicht</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 capitalize">{editingPackageType} Paket</span>
            <span className="font-medium text-gray-900">{(currentPackage?.price || 0).toFixed(2)}€</span>
          </div>
          {addons.length > 0 &&
          <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Zusatzleistungen ({addons.length})</span>
              <span className="font-medium text-gray-900">{calculateAddonsTotal().toFixed(2)}€</span>
            </div>
          }
          <div className="border-t border-[#14ad9f]/20 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#14ad9f]">Gesamtpreis</span>
              <span className="font-bold text-xl text-[#14ad9f]">{calculateTotalPrice().toFixed(2)}€</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

};
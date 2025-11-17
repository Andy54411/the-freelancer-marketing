'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import BasicPackage from './packages/BasicPackage';
import StandardPackage from './packages/StandardPackage';
import PremiumPackage from './packages/PremiumPackage';
import AiAddonGenerator from './addons/AiAddonGenerator';
import ManualAddonManager from './addons/ManualAddonManager';
import { categories } from '@/lib/categoriesData';
import { useServicePackages } from '@/hooks/useServicePackages';
import type { PackageFormData, AddonItem } from '@/types/service';

interface ServiceCreateProps {
  allowedSubcategories: string[];
  onServiceCreated: () => void;
}

export const ServiceCreate: React.FC<ServiceCreateProps> = ({
  allowedSubcategories,
  onServiceCreated,
}) => {
  const { user } = useAuth();
  // Hook immer aufrufen - React Hooks müssen in derselben Reihenfolge aufgerufen werden
  const servicePackagesHook = useServicePackages(user?.uid || '');

  // Form state
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [selectedPackageType, setSelectedPackageType] = useState<'basic' | 'standard' | 'premium'>(
    'basic'
  );
  const [activePackages, setActivePackages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Package data state
  const [packageData, setPackageData] = useState<{
    basic: PackageFormData;
    standard: PackageFormData;
    premium: PackageFormData;
  }>({
    basic: {
      tier: 'basic',
      price: 0,
      deliveryTime: 7,
      deliveryUnit: 'Tage',
      hasDuration: true,
      duration: 0,
      description: '',
      features: [],
      additionalServices: [],
    },
    standard: {
      tier: 'standard',
      price: 0,
      deliveryTime: 5,
      deliveryUnit: 'Tage',
      hasDuration: true,
      duration: 0,
      description: '',
      features: [],
      additionalServices: [],
    },
    premium: {
      tier: 'premium',
      price: 0,
      deliveryTime: 3,
      deliveryUnit: 'Tage',
      hasDuration: true,
      duration: 0,
      description: '',
      features: [],
      additionalServices: [],
    },
  });

  // Add-ons state
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [selectedAiAddons, setSelectedAiAddons] = useState<AddonItem[]>([]);
  const [useAiGenerator, setUseAiGenerator] = useState(false);

  // Package existence state
  const [existingPackageTypes, setExistingPackageTypes] = useState<{
    basic: boolean;
    standard: boolean;
    premium: boolean;
  }>({
    basic: false,
    standard: false,
    premium: false,
  });

  // Check existing package types on mount
  useEffect(() => {
    const checkExistingPackages = async () => {
      if (servicePackagesHook && user?.uid) {
        try {
          const basicExists = await servicePackagesHook.checkPackageTypeExists('basic');
          const standardExists = await servicePackagesHook.checkPackageTypeExists('standard');
          const premiumExists = await servicePackagesHook.checkPackageTypeExists('premium');

          setExistingPackageTypes({
            basic: basicExists,
            standard: standardExists,
            premium: premiumExists,
          });
        } catch (error) {
          console.error('Error checking existing packages:', error);
        }
      }
    };

    checkExistingPackages();
  }, [servicePackagesHook, user?.uid]);

  const updatePackageData = (
    packageType: 'basic' | 'standard' | 'premium',
    field: string,
    value: any
  ) => {
    setPackageData(prev => ({
      ...prev,
      [packageType]: {
        ...prev[packageType],
        [field]: value,
      },
    }));
  };

  // Handle package activation
  const togglePackageActive = (packageType: string) => {
    setActivePackages(prev =>
      prev.includes(packageType) ? prev.filter(p => p !== packageType) : [...prev, packageType]
    );
  };

  // Add addon
  const addAddon = () => {
    setAddons([...addons, { name: '', description: '', price: 0 }]);
  };

  // Update addon
  const updateAddon = (index: number, field: string, value: any) => {
    const updatedAddons = addons.map((addon, i) =>
      i === index ? { ...addon, [field]: value } : addon
    );
    setAddons(updatedAddons);
  };

  // Remove addon
  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  // Calculate total price for selected package + all add-ons
  const calculateTotalPrice = () => {
    const currentPackage = packageData[selectedPackageType];
    const packagePrice = currentPackage.price || 0;
    const manualAddonsTotal = addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    const aiAddonsTotal = selectedAiAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    return packagePrice + manualAddonsTotal + aiAddonsTotal;
  };

  // Get add-ons total for display
  const getAddonsTotal = () => {
    const manualAddonsTotal = addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    const aiAddonsTotal = selectedAiAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    return manualAddonsTotal + aiAddonsTotal;
  };

  // Add-on for AI generator callback
  const addAddonFromAi = (addon: any) => {
    setAddons([...addons, addon]);
    toast.success(`Add-on "${addon.name}" hinzugefügt!`);
  };

  // Toggle AI addon selection
  const toggleAiAddon = (addon: AddonItem, isSelected: boolean) => {
    if (isSelected) {
      setSelectedAiAddons([...selectedAiAddons, addon]);
    } else {
      setSelectedAiAddons(
        selectedAiAddons.filter(item => item.name !== addon.name || item.price !== addon.price)
      );
    }
  };

  // Create service function
  const handleCreateService = async () => {
    // Validierung der Unterkategorie
    if (!newServiceCategory) {
      toast.error('Bitte wählen Sie eine Unterkategorie aus');
      return;
    }

    // Validierung des ausgewählten Pakets
    if (!selectedPackageType) {
      toast.error('Bitte wählen Sie ein Paket aus');
      return;
    }

    // Validierung der Paket-Daten
    const currentPackage = packageData[selectedPackageType];
    if (!currentPackage.price || currentPackage.price <= 0) {
      toast.error('Bitte geben Sie einen gültigen Preis für das Paket ein');
      return;
    }

    if (!currentPackage.description || !currentPackage.description.trim()) {
      toast.error('Bitte geben Sie eine Beschreibung für das Paket ein');
      return;
    }

    if (!user?.uid) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }

    try {
      setIsLoading(true);

      // Check if package type already exists
      if (servicePackagesHook) {
        const packageExists = await servicePackagesHook.checkPackageTypeExists(selectedPackageType);
        if (packageExists) {
          toast.error(
            `Ein ${selectedPackageType.toUpperCase()} Service existiert bereits! Pro Typ ist nur ein Service erlaubt.`
          );
          return;
        }
      }

      // Save to Firebase
      if (servicePackagesHook && user?.uid) {
        // Combine manual addons and selected AI addons
        const allAddons = [...addons, ...selectedAiAddons];

        // Erstelle Package-Data nur für das ausgewählte Paket
        const selectedPackageData: any = {};
        selectedPackageData[selectedPackageType] = packageData[selectedPackageType];

        // Generiere Service-Titel basierend auf Kategorie und Paket-Typ
        const serviceTitle = `${newServiceCategory} - ${selectedPackageType.charAt(0).toUpperCase() + selectedPackageType.slice(1)} Paket`;

        // Generiere eine einzigartige Service-ID
        const serviceId = `${user.uid}_${Date.now()}`;

        await servicePackagesHook.saveServicePackages(
          serviceId,
          serviceTitle,
          newServiceCategory,
          selectedPackageData,
          allAddons
        );
      }

      const serviceTitle = `${newServiceCategory} - ${selectedPackageType.charAt(0).toUpperCase() + selectedPackageType.slice(1)} Paket`;
      toast.success(`Service "${serviceTitle}" erfolgreich erstellt!`);

      // Reset form
      resetForm();

      // Notify parent component
      onServiceCreated();
    } catch (error: any) {
      console.error('Service creation error:', error);
      toast.error(error.message || 'Fehler beim Erstellen des Services');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setNewServiceTitle('');
    setNewServiceDescription('');
    setNewServiceCategory('');
    setActivePackages([]);
    setPackageData({
      basic: {
        tier: 'basic',
        price: 0,
        deliveryTime: 7,
        deliveryUnit: 'Tage',
        hasDuration: true,
        duration: 0,
        description: '',
        features: [],
        additionalServices: [],
      },
      standard: {
        tier: 'standard',
        price: 0,
        deliveryTime: 5,
        deliveryUnit: 'Tage',
        hasDuration: true,
        duration: 0,
        description: '',
        features: [],
        additionalServices: [],
      },
      premium: {
        tier: 'premium',
        price: 0,
        deliveryTime: 3,
        deliveryUnit: 'Tage',
        hasDuration: true,
        duration: 0,
        description: '',
        features: [],
        additionalServices: [],
      },
    });
    setAddons([]);
    setSelectedAiAddons([]);
  };

  return (
    <div className="space-y-6">
      {/* Info-Hinweis */}
      <div className="bg-[#14ad9f]/10 border border-[#14ad9f]/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-[#14ad9f] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#14ad9f]">Service-Limit Information</h3>
            <p className="text-sm text-[#14ad9f]/80 mt-1">
              Pro Account ist nur <strong>ein Service pro Paket-Typ</strong> erlaubt. Sie können
              jeweils einen Basic-, Standard- und Premium-Service erstellen.
            </p>
          </div>
        </div>
      </div>

      {/* Package Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#14ad9f]">Pakete konfigurieren</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Unterkategorie und Paket-Typ nebeneinander */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="serviceSubcategory">Unterkategorie *</Label>
              <Select value={newServiceCategory} onValueChange={setNewServiceCategory}>
                <SelectTrigger className="focus:border-[#14ad9f] focus:ring-[#14ad9f]">
                  <SelectValue placeholder="Wählen Sie eine Unterkategorie" />
                </SelectTrigger>
                <SelectContent>
                  {allowedSubcategories.map(subcategory => (
                    <SelectItem key={subcategory} value={subcategory}>
                      {subcategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paket-Typ Auswahl */}
            <div>
              <Label htmlFor="packageType">Paket-Typ auswählen *</Label>
              <Select
                value={selectedPackageType}
                onValueChange={(value: 'basic' | 'standard' | 'premium') =>
                  setSelectedPackageType(value)
                }
              >
                <SelectTrigger className="focus:border-[#14ad9f] focus:ring-[#14ad9f]">
                  <SelectValue placeholder="Wählen Sie einen Paket-Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic" disabled={existingPackageTypes.basic}>
                    Basic Paket {existingPackageTypes.basic && '(bereits vorhanden)'}
                  </SelectItem>
                  <SelectItem value="standard" disabled={existingPackageTypes.standard}>
                    Standard Paket {existingPackageTypes.standard && '(bereits vorhanden)'}
                  </SelectItem>
                  <SelectItem value="premium" disabled={existingPackageTypes.premium}>
                    Premium Paket {existingPackageTypes.premium && '(bereits vorhanden)'}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Status-Anzeige welche Services bereits existieren */}
              {(existingPackageTypes.basic ||
                existingPackageTypes.standard ||
                existingPackageTypes.premium) && (
                <div className="mt-2 text-sm text-[#14ad9f]">
                  <p className="font-medium">Bereits erstellte Services:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-[#14ad9f]/80">
                    {existingPackageTypes.basic && <li>Basic Service ✓</li>}
                    {existingPackageTypes.standard && <li>Standard Service ✓</li>}
                    {existingPackageTypes.premium && <li>Premium Service ✓</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamische Paket-Komponenten - Zeige nur das ausgewählte Paket */}
      <div className="space-y-4">
        {selectedPackageType === 'basic' && (
          <BasicPackage
            isActive={activePackages.includes('basic')}
            onToggle={() => togglePackageActive('basic')}
            subcategory={newServiceCategory} // Übergebe die Kategorie
            formData={{
              price: packageData.basic.price,
              description: packageData.basic.description,
              deliveryTime: packageData.basic.deliveryTime,
              deliveryUnit: packageData.basic.deliveryUnit || 'Tage',
              hasDuration: packageData.basic.hasDuration !== false,
              features: packageData.basic.features || [],
              revisions: packageData.basic.revisions, // Füge Revisionen hinzu
            }}
            onUpdate={data => {
              if (data.price !== undefined) updatePackageData('basic', 'price', data.price);
              if (data.description !== undefined)
                updatePackageData('basic', 'description', data.description);
              if (data.deliveryTime !== undefined)
                updatePackageData('basic', 'deliveryTime', data.deliveryTime);
              if (data.deliveryUnit !== undefined)
                updatePackageData('basic', 'deliveryUnit', data.deliveryUnit);
              if (data.hasDuration !== undefined)
                updatePackageData('basic', 'hasDuration', data.hasDuration);
              if (data.features !== undefined)
                updatePackageData('basic', 'features', data.features);
              if (data.revisions !== undefined)
                updatePackageData('basic', 'revisions', data.revisions); // Handle Revisionen
            }}
          />
        )}

        {selectedPackageType === 'standard' && (
          <StandardPackage
            isActive={activePackages.includes('standard')}
            onToggle={() => togglePackageActive('standard')}
            subcategory={newServiceCategory} // Übergebe die Kategorie
            formData={{
              price: packageData.standard.price,
              description: packageData.standard.description,
              deliveryTime: packageData.standard.deliveryTime,
              deliveryUnit: packageData.standard.deliveryUnit || 'Tage',
              hasDuration: packageData.standard.hasDuration !== false,
              features: packageData.standard.features || [],
              revisions: packageData.standard.revisions, // Füge Revisionen hinzu
            }}
            onUpdate={data => {
              if (data.price !== undefined) updatePackageData('standard', 'price', data.price);
              if (data.description !== undefined)
                updatePackageData('standard', 'description', data.description);
              if (data.deliveryTime !== undefined)
                updatePackageData('standard', 'deliveryTime', data.deliveryTime);
              if (data.deliveryUnit !== undefined)
                updatePackageData('standard', 'deliveryUnit', data.deliveryUnit);
              if (data.hasDuration !== undefined)
                updatePackageData('standard', 'hasDuration', data.hasDuration);
              if (data.features !== undefined)
                updatePackageData('standard', 'features', data.features);
              if (data.revisions !== undefined)
                updatePackageData('standard', 'revisions', data.revisions); // Handle Revisionen
            }}
          />
        )}

        {selectedPackageType === 'premium' && (
          <PremiumPackage
            isActive={activePackages.includes('premium')}
            onToggle={() => togglePackageActive('premium')}
            subcategory={newServiceCategory} // Übergebe die Kategorie
            formData={{
              price: packageData.premium.price,
              description: packageData.premium.description,
              deliveryTime: packageData.premium.deliveryTime,
              deliveryUnit: packageData.premium.deliveryUnit || 'Tage',
              hasDuration: packageData.premium.hasDuration !== false,
              features: packageData.premium.features || [],
              revisions: packageData.premium.revisions, // Füge Revisionen hinzu
            }}
            onUpdate={data => {
              if (data.price !== undefined) updatePackageData('premium', 'price', data.price);
              if (data.description !== undefined)
                updatePackageData('premium', 'description', data.description);
              if (data.deliveryTime !== undefined)
                updatePackageData('premium', 'deliveryTime', data.deliveryTime);
              if (data.deliveryUnit !== undefined)
                updatePackageData('premium', 'deliveryUnit', data.deliveryUnit);
              if (data.hasDuration !== undefined)
                updatePackageData('premium', 'hasDuration', data.hasDuration);
              if (data.features !== undefined)
                updatePackageData('premium', 'features', data.features);
              if (data.revisions !== undefined)
                updatePackageData('premium', 'revisions', data.revisions); // Handle Revisionen
            }}
          />
        )}
      </div>

      {/* AI Generator Toggle */}
      <div
        className={`bg-white p-4 rounded-lg border mb-6 ${useAiGenerator ? 'border-[#14ad9f]' : 'border-gray-200'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-[#14ad9f]">KI Add-on Generator</h4>
            <p className="text-sm text-gray-600">Automatische Vorschläge für passende Add-ons</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useAiGenerator}
              onChange={e => setUseAiGenerator(e.target.checked)}
              className="sr-only peer"
            />

            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14ad9f]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#14ad9f]"></div>
          </label>
        </div>
      </div>

      {/* KI Add-on Generator Komponente (conditional) */}
      {useAiGenerator && (
        <AiAddonGenerator
          onAddAddon={addAddonFromAi}
          selectedAddons={selectedAiAddons}
          onToggleAddon={toggleAiAddon}
        />
      )}

      {/* Manuelle Add-ons Komponente */}
      <ManualAddonManager
        addons={addons}
        onAddAddon={addAddon}
        onUpdateAddon={updateAddon}
        onRemoveAddon={removeAddon}
      />

      {/* Submit Button */}

      {/* Gesamtpreis Anzeige */}
      <Card className="mb-6 border-[#14ad9f]">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-[#14ad9f]">Preisübersicht</h4>
              <p className="text-sm text-gray-600">
                {selectedPackageType.charAt(0).toUpperCase() + selectedPackageType.slice(1)} Paket +
                Add-ons
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                <div>Paket: {packageData[selectedPackageType].price || 0} €</div>
                <div>Add-ons: {getAddonsTotal()} €</div>
                <hr className="my-1" />
                <div className="font-bold text-[#14ad9f] text-lg">
                  Gesamt: {calculateTotalPrice()} €
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleCreateService}
          disabled={isLoading || !newServiceCategory || !selectedPackageType}
          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            'Service erstellen'
          )}
        </Button>
      </div>
    </div>
  );
};

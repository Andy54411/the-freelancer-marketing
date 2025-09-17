'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Clock, Euro, RotateCcw } from 'lucide-react';
import { categoryNeedsRevisions, getDefaultRevisions } from '@/lib/categoryHelpers';

interface BasicPackageProps {
  isActive: boolean;
  onToggle: () => void;
  subcategory?: string; // Neue Prop für Kategorie
  formData: {
    price: number;
    description: string;
    deliveryTime: number;
    deliveryUnit: string;
    hasDuration: boolean;
    features: string[];
    revisions?: number; // Optionales Revisionen-Feld
  };
  onUpdate: (data: Partial<BasicPackageProps['formData']>) => void;
}

export default function BasicPackage({ 
  isActive, 
  onToggle, 
  subcategory,
  formData, 
  onUpdate 
}: BasicPackageProps) {
  const needsRevisions = subcategory ? categoryNeedsRevisions(subcategory) : false;
  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    onUpdate({ features: newFeatures });
  };

  const addFeature = () => {
    onUpdate({ features: [...formData.features, ''] });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    onUpdate({ features: newFeatures });
  };

  return (
    <Card className={`transition-all duration-200 ${isActive ? 'ring-2 ring-[#14ad9f] border-[#14ad9f]' : 'border-gray-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Star className="h-5 w-5 text-[#14ad9f]" />
            <CardTitle className="text-[#14ad9f]">Basic Paket</CardTitle>
            <Badge variant="outline" className="border-green-500 text-green-700">
              Einsteiger
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {isActive ? 'Aktiviert' : 'Deaktiviert'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={onToggle}
              style={{
                backgroundColor: isActive ? '#14ad9f' : '#d1d5db'
              }}
            />
          </div>
        </div>
      </CardHeader>
      
      {isActive && (
        <CardContent className="space-y-4">
          {/* Dauer aktivieren/deaktivieren */}
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <Checkbox
              id="duration-enabled"
              checked={formData.hasDuration}
              onCheckedChange={(checked) => onUpdate({ hasDuration: !!checked })}
            />
            <label htmlFor="duration-enabled" className="text-sm font-medium text-gray-700">
              Dauer-Angabe verwenden
            </label>
            <span className="text-xs text-gray-500">
              (Optional: Manche Services haben keine feste Dauer)
            </span>
          </div>

          {/* Preis, optional Dauer, und optional Revisionen */}
          <div className={`grid gap-4 ${
            formData.hasDuration && needsRevisions ? 'grid-cols-4' : 
            formData.hasDuration || needsRevisions ? 'grid-cols-3' : 
            'grid-cols-1'
          }`}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Euro className="h-4 w-4 mr-1" />
                Preis (€) *
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => onUpdate({ price: Number(e.target.value) })}
                placeholder="0"
                className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
            </div>
            
            {formData.hasDuration && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Dauer
                  </label>
                  <Input
                    type="number"
                    value={formData.deliveryTime}
                    onChange={(e) => onUpdate({ deliveryTime: Number(e.target.value) })}
                    placeholder="1"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Einheit
                  </label>
                  <Select 
                    value={formData.deliveryUnit || 'Tage'} 
                    onValueChange={(value) => onUpdate({ deliveryUnit: value })}
                  >
                    <SelectTrigger className="focus:ring-[#14ad9f] focus:border-[#14ad9f]">
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
              </>
            )}

            {/* Revisionen-Feld nur bei bestimmten Kategorien */}
            {needsRevisions && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Revisionen
                </label>
                <Input
                  type="number"
                  value={formData.revisions || getDefaultRevisions('basic')}
                  onChange={(e) => onUpdate({ revisions: Number(e.target.value) })}
                  placeholder="1"
                  min="0"
                  max="10"
                  className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
                <span className="text-xs text-gray-500">
                  Anzahl kostenloser Überarbeitungen
                </span>
              </div>
            )}
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Paket-Beschreibung
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Beschreiben Sie was in diesem Basic-Paket enthalten ist..."
              rows={3}
              className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Leistungen (Features)
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder={`Leistung ${index + 1}`}
                    className="flex-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="w-full border-dashed border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
              >
                + Leistung hinzufügen
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
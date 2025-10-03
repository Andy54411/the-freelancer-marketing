'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Settings } from 'lucide-react';

interface AddonItem {
  name: string;
  description: string;
  price: number;
}

interface ManualAddonManagerProps {
  addons: AddonItem[];
  onAddAddon: () => void;
  onUpdateAddon: (index: number, field: keyof AddonItem, value: string | number) => void;
  onRemoveAddon: (index: number) => void;
}

export default function ManualAddonManager({
  addons,
  onAddAddon,
  onUpdateAddon,
  onRemoveAddon,
}: ManualAddonManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#14ad9f] flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Manuelle Add-ons
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Button */}
        <div className="flex items-center justify-between">
          <Label className="font-medium">Eigene Add-ons erstellen</Label>
          <Button
            onClick={onAddAddon}
            size="sm"
            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add-on hinzufügen
          </Button>
        </div>

        {/* Manual Addons List */}
        {addons.length > 0 ? (
          <div className="space-y-4">
            {addons.map((addon, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                <div className="grid gap-3">
                  {/* Name */}
                  <div>
                    <Label className="text-sm font-medium">Name *</Label>
                    <Input
                      value={addon.name}
                      onChange={e => onUpdateAddon(index, 'name', e.target.value)}
                      placeholder="z.B. Express-Service"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>

                  {/* Beschreibung */}
                  <div>
                    <Label className="text-sm font-medium">Beschreibung *</Label>
                    <Textarea
                      value={addon.description}
                      onChange={e => onUpdateAddon(index, 'description', e.target.value)}
                      placeholder="Beschreiben Sie das Add-on..."
                      rows={2}
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>

                  {/* Preis und Entfernen-Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Preis (€) *</Label>
                      <Input
                        type="number"
                        value={addon.price}
                        onChange={e => onUpdateAddon(index, 'price', Number(e.target.value))}
                        placeholder="0"
                        className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                      />
                    </div>
                    <div className="pt-6">
                      <Button
                        onClick={() => onRemoveAddon(index)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Noch keine manuellen Add-ons erstellt</p>
            <p className="text-sm">Klicken Sie auf &quot;Add-on hinzufügen&quot; um zu beginnen</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface CategoryValues {
  name: string;
  categoryType: string;
  contact: string;
  color: string;
  abbreviation: string;
  categoryKind: string;
}

export interface NewCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onSave?: (values: CategoryValues) => Promise<void>;
  companyId?: string;
  onSaved?: (categoryId: string, categoryData: CategoryValues) => void;
}

const DEFAULT_VALUES: CategoryValues = {
  name: '',
  categoryType: '',
  contact: '',
  color: '#000000',
  abbreviation: '',
  categoryKind: 'Verkauf',
};

export default function NewCategoryModal({
  open,
  onOpenChange,
  saving,
  onSave,
  companyId: _companyId,
  onSaved,
}: NewCategoryModalProps) {
  const [values, setValues] = useState<CategoryValues>(DEFAULT_VALUES);

  useEffect(() => {
    if (open) {
      setValues(DEFAULT_VALUES);
    }
  }, [open]);

  const isValid = () => {
    return values.name.trim() && values.categoryType.trim();
  };

  const handleSave = async () => {
    if (!isValid()) return;

    try {
      // Import API function dynamically
      const { createCategory } = await import('@/utils/api/companyApi');
      
      const response = await createCategory(values);
      if (response.success && response.categoryId) {
        if (onSaved) onSaved(response.categoryId, values);
        onOpenChange(false);
        return;
      }

      // Fallback: Eltern-Handler verwenden
      if (onSave) {
        await onSave(values);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Kategorie:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Kategorie erstellen</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={values.name}
              onChange={e => setValues(p => ({ ...p, name: e.target.value }))}
              placeholder="Kategoriename eingeben"
            />
          </div>

          <div className="space-y-2">
            <Label>Kategorieart *</Label>
            <Input
              value={values.categoryType}
              onChange={e => setValues(p => ({ ...p, categoryType: e.target.value }))}
              placeholder="z.B. VIP-Kunde, Neukunde, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Kontakt</Label>
            <Input
              value={values.contact}
              onChange={e => setValues(p => ({ ...p, contact: e.target.value }))}
              placeholder="Kontaktperson oder Beschreibung"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={values.color}
                  onChange={e => setValues(p => ({ ...p, color: e.target.value }))}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={values.color}
                  onChange={e => setValues(p => ({ ...p, color: e.target.value }))}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Abkürzung</Label>
              <Input
                value={values.abbreviation}
                onChange={e => setValues(p => ({ ...p, abbreviation: e.target.value }))}
                placeholder="z.B. VIP, NK"
                maxLength={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kategorieart</Label>
            <Select
              value={values.categoryKind}
              onValueChange={val => setValues(p => ({ ...p, categoryKind: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategorieart wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Verkauf">Verkauf (z.B. Kunde, Interessent)</SelectItem>
                <SelectItem value="Einkauf">Einkauf (z.B. Lieferant, Partner)</SelectItem>
                <SelectItem value="Service">Service (z.B. Support, Wartung)</SelectItem>
                <SelectItem value="Intern">Intern (z.B. Mitarbeiter, Abteilung)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              disabled={Boolean(saving) || !isValid()}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Kategorie erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
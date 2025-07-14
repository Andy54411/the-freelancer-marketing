// src/app/dashboard/user/[uid]/components/OrderDescriptionInput.tsx
'use client';

import React from 'react';
import { Label } from '@/components/ui/label'; // Ihre Label-Komponente
import { Textarea } from '@/components/ui/textarea'; // Ihre Textarea-Komponente

interface OrderDescriptionInputProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  // Hier könnten weitere Props für Validierungsmeldungen hinzugefügt werden
}

const OrderDescriptionInput: React.FC<OrderDescriptionInputProps> = ({
  description,
  onDescriptionChange,
}) => {
  return (
    <div>
      <Label htmlFor="description" className="block text-md font-medium text-gray-700 mb-2">
        Auftragsbeschreibung *
      </Label>
      <Textarea
        id="description"
        placeholder="Beschreiben Sie hier, was genau gemacht werden soll (z.B. Größe, Material, Besonderheiten)..."
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
        rows={4}
      />
    </div>
  );
};

export default OrderDescriptionInput;

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';

interface QuickAddServiceProps {
  companyId: string;
  onServiceAdded: (service: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    total: number;
    category: string;
    inventoryItemId: string;
  }) => void;
}

export function QuickAddService({ companyId, onServiceAdded }: QuickAddServiceProps) {
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddService = async () => {
    if (!companyId || !serviceName.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Dienstleistung ein');
      return;
    }
    
    setSaving(true);
    try {
      // 1. In inlineInvoiceServices speichern
      const serviceData = {
        name: serviceName.trim(),
        description: '',
        price: parseFloat(servicePrice) || 0,
        unit: 'Std',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const ref = collection(db, 'companies', companyId, 'inlineInvoiceServices');
      const result = await addDoc(ref, serviceData);
      
      // 2. Service-Item erstellen
      const newItem = {
        id: crypto.randomUUID(),
        description: serviceData.name,
        quantity: 1,
        unitPrice: serviceData.price,
        unit: serviceData.unit,
        total: serviceData.price,
        category: 'Dienstleistung',
        inventoryItemId: result.id,
      };
      
      // 3. Callback aufrufen
      onServiceAdded(newItem);
      
      // 4. UI zurücksetzen
      setServiceName('');
      setServicePrice('');
      toast.success('Dienstleistung hinzugefügt');
    } catch (e) {
      console.error('Fehler beim Hinzufügen der Dienstleistung:', e);
      toast.error('Fehler beim Speichern der Dienstleistung');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Neue Dienstleistung (z.B. Beratung)"
        value={serviceName}
        onChange={(e) => setServiceName(e.target.value)}
        className="min-w-[200px]"
      />
      <Input
        placeholder="Preis"
        type="number"
        step="0.01"
        value={servicePrice}
        onChange={(e) => setServicePrice(e.target.value)}
        className="w-24"
      />
      <Button 
        onClick={handleAddService}
        disabled={saving || !serviceName.trim()}
        className="bg-[#14ad9f] hover:bg-[#129488] text-white"
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⌛</span> Speichert...
          </span>
        ) : (
          'Hinzufügen'
        )}
      </Button>
    </div>
  );
}
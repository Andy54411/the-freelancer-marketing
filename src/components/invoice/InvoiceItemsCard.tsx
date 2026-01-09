import { Calculator, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickAddService } from '@/components/QuickAddService';
import { cn } from '@/lib/utils';

interface InvoiceItemsCardProps {
  uid: string;
  showNet: boolean;
  setShowNet: (value: boolean) => void;
  onAddItem: () => void;
  onAddInventoryItem: () => void;
  onAddDiscount: () => void;
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

export function InvoiceItemsCard({
  uid,
  showNet,
  setShowNet,
  onAddItem,
  onAddInventoryItem,
  onAddDiscount,
  onServiceAdded,
}: InvoiceItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-[#14ad9f]" />
          Produkte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Preisanzeige</div>
          <div className="flex gap-2">
            <Button
              className={cn(showNet ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white' : 'border')}
              onClick={() => setShowNet(true)}
            >
              Netto
            </Button>
            <Button
              className={cn(!showNet ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white' : 'border')}
              onClick={() => setShowNet(false)}
            >
              Brutto
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Button variant="link" className="text-[#14ad9f]" onClick={onAddItem}>
            + Position hinzufügen
          </Button>

          <Button
            variant="outline"
            className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            onClick={onAddInventoryItem}
          >
            <Package className="w-4 h-4 mr-2" />
            Aus Inventar hinzufügen
          </Button>

          <Button variant="link" className="text-[#14ad9f]" onClick={onAddDiscount}>
            + Gesamtrabatt hinzufügen
          </Button>

          <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
            <QuickAddService companyId={uid} onServiceAdded={onServiceAdded} />
          </div>
        </div>

        {/* Hier kommen die Rechnungspositionen */}
      </CardContent>
    </Card>
  );
}

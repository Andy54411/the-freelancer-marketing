/**
 * Beispiel-Integration: WhatsApp Button in Kunden-Detail-Modal
 *
 * Dieses Beispiel zeigt wie man den WhatsApp-Button in bestehende
 * Komponenten integriert.
 */

import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton';
import { Customer } from '@/components/finance/AddCustomerModal';

interface CustomerDetailExampleProps {
  customer: Customer;
  companyId: string;
}

export function CustomerDetailExample({ customer, companyId }: CustomerDetailExampleProps) {
  return (
    <div className="space-y-6">
      {/* Header mit Name */}
      <div>
        <h2 className="text-2xl font-bold">{customer.name}</h2>
        <p className="text-sm text-gray-500">Kunde #{customer.customerNumber}</p>
      </div>

      {/* Kontakt-Informationen */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Kontakt</h3>

        <div className="flex items-center gap-2">
          <span className="text-sm">📧</span>
          <a href={`mailto:${customer.email}`} className="text-sm text-teal-600 hover:underline">
            {customer.email}
          </a>
        </div>

        {customer.phone && (
          <div className="flex items-center gap-2">
            <span className="text-sm">📱</span>
            <span className="text-sm">{customer.phone}</span>

            {/* ✅ WhatsApp Button hier einfügen */}
            <WhatsAppButton
              customerPhone={customer.phone}
              customerName={customer.name}
              customerId={customer.id}
              companyId={companyId}
              variant="icon"
              className="ml-2"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <WhatsAppButton
          customerPhone={customer.phone}
          customerName={customer.name}
          customerId={customer.id}
          companyId={companyId}
          variant="button"
        />

        <button className="px-4 py-2 border rounded-md hover:bg-gray-50">E-Mail senden</button>

        <button className="px-4 py-2 border rounded-md hover:bg-gray-50">Anrufen</button>
      </div>
    </div>
  );
}

/**
 * Beispiel 2: In Dropdown-Menu (z.B. Kunden-Liste)
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Mail, Phone } from 'lucide-react';

export function CustomerListItemExample({ customer, companyId }: CustomerDetailExampleProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <p className="font-medium">{customer.name}</p>
        <p className="text-sm text-gray-500">{customer.email}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Mail className="h-4 w-4 mr-2" />
            E-Mail senden
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Phone className="h-4 w-4 mr-2" />
            Anrufen
          </DropdownMenuItem>

          {/* ✅ WhatsApp als Link-Variant */}
          <DropdownMenuItem asChild>
            <div>
              <WhatsAppButton
                customerPhone={customer.phone}
                customerName={customer.name}
                customerId={customer.id}
                companyId={companyId}
                variant="link"
              />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Beispiel 3: In Rechnungs-Detailseite
 */
export function InvoiceDetailExample({
  invoice,
  customer,
  companyId,
}: {
  invoice: any;
  customer: Customer;
  companyId: string;
}) {
  return (
    <div className="space-y-4">
      <h2>Rechnung {invoice.invoiceNumber}</h2>

      {/* Versand-Optionen */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Rechnung versenden</h3>

        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
            📧 Per E-Mail
          </button>

          {/* ✅ WhatsApp mit vorausgefüllter Nachricht */}
          <WhatsAppButton
            customerPhone={customer.phone}
            customerName={customer.name}
            customerId={customer.id}
            companyId={companyId}
            variant="button"
            defaultMessage={`Hallo ${customer.name},\n\nIhre Rechnung ${invoice.invoiceNumber} über ${invoice.total}€ ist verfügbar.\n\nMit freundlichen Grüßen`}
          />

          <button className="px-4 py-2 border rounded-md hover:bg-gray-50">📄 PDF Download</button>
        </div>
      </div>
    </div>
  );
}

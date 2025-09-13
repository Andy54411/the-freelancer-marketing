import React from 'react';

interface ReminderData {
  companyLogo?: string;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyZip: string;
  companyCountry: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerZip: string;
  customerCountry: string;
  reminderNumber: string;
  reminderDate: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  dueDate: string;
  reminderLevel: 1 | 2 | 3;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  reminderFee: number;
  total: number;
}

interface TemplateProps {
  data: ReminderData;
  preview?: boolean;
}

export const CreativeReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-sans text-sm leading-normal flex flex-col mx-auto">
      <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white p-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {data.companyLogo && (
              <div className="bg-white p-3 rounded-lg shadow-lg mb-4 inline-block">
                <img src={data.companyLogo} alt={data.companyName} className="h-12 w-auto" />
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2">MAHNUNG</h1>
            <p className="text-orange-100 text-lg">{data.companyName}</p>
          </div>
        </div>
      </div>
      <div className="px-8 mb-8 flex-1">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200 mb-8">
          <h3 className="text-xl font-bold mb-4 text-orange-700">Zahlungserinnerung</h3>
          <p className="text-gray-700">Ihre Rechnung ist überfällig. Bitte zahlen Sie <strong>€{data.total.toFixed(2)}</strong> umgehend.</p>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-80 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl p-6">
            <div className="font-bold text-xl">Gesamtbetrag: €{data.total.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-gray-900 via-orange-900 to-red-900 text-white p-6 mt-auto">
        <div className="text-center">
          <p className="text-yellow-300 font-bold">Sofortige Zahlung erforderlich!</p>
        </div>
      </div>
    </div>
  );
};
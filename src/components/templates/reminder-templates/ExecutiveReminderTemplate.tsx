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

export const ExecutiveReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-serif text-sm leading-normal flex flex-col mx-auto">
      <div className="relative bg-gradient-to-r from-amber-50 to-red-50 border-b-4 border-red-400 p-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {data.companyLogo && (
              <img src={data.companyLogo} alt={data.companyName} className="h-20 w-auto mb-4" />
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.companyName}</h1>
          </div>
          <div className="text-right bg-white p-6 rounded-lg shadow-sm border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-4">MAHNUNG</h1>
            <div className="text-gray-700">
              <p><span className="font-semibold">Nummer:</span> {data.reminderNumber}</p>
              <p><span className="font-semibold">Datum:</span> {data.reminderDate}</p>
              <p><span className="font-semibold">Stufe:</span> {data.reminderLevel}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 mb-8 flex-1">
        <div className="border-l-4 border-red-400 pl-6 py-4 mb-8">
          <h3 className="text-lg font-semibold mb-3 text-red-700">Zahlungsaufforderung</h3>
          <p className="text-gray-800">Bitte begleichen Sie umgehend den ausstehenden Betrag von <strong>€{data.total.toFixed(2)}</strong></p>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-80 bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="font-bold text-lg text-red-800">Fälliger Betrag: €{data.total.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-gray-800 to-red-900 text-white p-6 mt-auto">
        <div className="text-center">
          <p className="font-bold">Bei Nichtzahlung behalten wir uns rechtliche Schritte vor</p>
        </div>
      </div>
    </div>
  );
};
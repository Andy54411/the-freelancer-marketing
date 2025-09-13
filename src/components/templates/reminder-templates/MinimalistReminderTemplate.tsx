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

export const MinimalistReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-sans text-sm leading-relaxed flex flex-col mx-auto">
      <div className="px-8 pt-12 pb-8 mb-12">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {data.companyLogo && (
              <img src={data.companyLogo} alt={data.companyName} className="h-12 w-auto mb-8 opacity-80" />
            )}
            <h1 className="text-2xl font-light text-gray-800 mb-2">{data.companyName}</h1>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-thin text-red-600 mb-8 tracking-widest">MAHNUNG</h1>
            <div className="text-gray-600 space-y-2 text-xs">
              <p>{data.reminderNumber}</p>
              <p>{data.reminderDate}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 mb-12 flex-1">
        <div className="border-l border-red-200 pl-6 mb-12">
          <p className="text-xs text-red-400 mb-3 uppercase tracking-wider">Zahlungserinnerung</p>
          <p className="text-gray-700">Bitte begleichen Sie den ausstehenden Betrag umgehend.</p>
        </div>
        <div className="flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between py-4 text-red-800 border-b-2 border-red-300">
              <span className="font-medium">Fälliger Betrag</span>
              <span className="text-xl font-light">€{data.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 py-8 border-t border-gray-100 mt-auto">
        <div className="text-center text-xs text-gray-400">
          <p>Sofortige Zahlung erbeten</p>
        </div>
      </div>
    </div>
  );
};
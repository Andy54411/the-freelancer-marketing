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

export const CorporateReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-serif text-sm leading-normal flex flex-col mx-auto">
      <div className="border-b-4 border-gray-800 p-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {data.companyLogo && (
              <img src={data.companyLogo} alt={data.companyName} className="h-16 w-auto mb-6" />
            )}
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{data.companyName}</h1>
          </div>
          <div className="text-right border-2 border-gray-800 p-6 bg-gray-50">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">MAHNUNG</h1>
            <p>Nr: {data.reminderNumber}</p>
            <p>Datum: {data.reminderDate}</p>
          </div>
        </div>
      </div>
      <div className="px-8 mb-8 flex-1">
        <div className="border border-gray-300 p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 border-b border-gray-300 pb-2">Zahlungsaufforderung</h3>
          <p>Hiermit fordern wir Sie zur Zahlung des ausstehenden Betrags auf.</p>
        </div>
        <div className="mt-8 flex justify-end">
          <div className="w-96">
            <table className="w-full border-2 border-gray-800">
              <tr className="bg-gray-800 text-white">
                <td className="py-4 px-4 font-bold text-lg">Fälliger Betrag:</td>
                <td className="text-right py-4 px-4 font-bold text-lg">€{data.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
      <div className="border-t-4 border-gray-800 bg-gray-100 p-6 mt-auto">
        <div className="text-center text-gray-700">
          <p className="font-bold">Zahlbar sofort ohne Abzug</p>
        </div>
      </div>
    </div>
  );
};
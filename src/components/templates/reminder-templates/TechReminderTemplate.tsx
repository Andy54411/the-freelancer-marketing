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

export const TechReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-sans text-sm leading-normal flex flex-col mx-auto">
      <div className="relative bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center mb-4">
              {data.companyLogo && (
                <div className="bg-white p-2 rounded-lg shadow-lg mr-4">
                  <img src={data.companyLogo} alt={data.companyName} className="h-10 w-auto" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{data.companyName}</h1>
                <p className="text-red-100 text-sm">Payment • Reminder • Urgent</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6">
              <h1 className="text-2xl font-bold mb-4">REMINDER</h1>
              <p className="text-lg font-semibold">#{data.reminderNumber}</p>
              <p className="text-sm">Date: {data.reminderDate}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 mb-8 flex-1">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-2xl border border-red-200 mb-8">
          <h3 className="text-lg font-bold mb-4 text-red-700">Payment Overdue Notice</h3>
          <p className="text-gray-700">Your payment is overdue. Please pay <strong>€{data.total.toFixed(2)}</strong> immediately.</p>
        </div>
        <div className="mt-8 flex justify-end">
          <div className="w-80 bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="font-bold text-xl">Total Due: €{data.total.toFixed(2)}</div>
            <p className="text-red-100 text-sm mt-2">Payment required now</p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-gray-800 via-red-800 to-orange-800 text-white p-6 mt-auto">
        <div className="text-center">
          <p className="text-yellow-300 font-bold text-lg">Immediate Action Required!</p>
          <p className="text-gray-300 text-sm">Legal action may follow if payment is not received</p>
        </div>
      </div>
    </div>
  );
};
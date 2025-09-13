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

/**
 * Professional Reminder Template - Modern & Firm
 * Features: Professional reminder design, clear urgency indicators
 */
export const ProfessionalReminderTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  const getReminderLevelInfo = (level: number) => {
    switch (level) {
      case 1: return { title: '1. MAHNUNG', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
      case 2: return { title: '2. MAHNUNG', color: 'bg-orange-500', textColor: 'text-orange-700' };
      case 3: return { title: 'LETZTE MAHNUNG', color: 'bg-red-500', textColor: 'text-red-700' };
      default: return { title: 'MAHNUNG', color: 'bg-gray-500', textColor: 'text-gray-700' };
    }
  };

  const levelInfo = getReminderLevelInfo(data.reminderLevel);

  return (
    <div className="w-full max-w-full min-h-[842px] bg-white font-sans text-sm leading-normal flex flex-col mx-auto">
      {/* Header - Professional Reminder */}
      <div className={`${levelInfo.color} text-white p-8 mb-8`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{levelInfo.title}</h1>
            <div className="text-gray-100">
              <p className="text-lg">Nr: {data.reminderNumber}</p>
              <p>Datum: {data.reminderDate}</p>
              <p>Urspr. Rechnung: {data.originalInvoiceNumber}</p>
            </div>
          </div>
          <div className="text-right">
            {data.companyLogo && (
              <img src={data.companyLogo} alt={data.companyName} className="h-16 w-auto mb-4 ml-auto bg-white p-2 rounded" />
            )}
            <h2 className="text-2xl font-bold">{data.companyName}</h2>
            <div className="text-gray-100 mt-2">
              <p>{data.companyAddress}</p>
              <p>{data.companyZip} {data.companyCity}</p>
              <p>{data.companyEmail}</p>
              <p>{data.companyPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="px-8 mb-8">
        <div className={`bg-gray-50 border-l-4 ${levelInfo.color} p-6 rounded-r-lg`}>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Mahnungsempfänger</h3>
          <div className="text-gray-800">
            <p className="font-semibold">{data.customerName}</p>
            <p>{data.customerAddress}</p>
            <p>{data.customerZip} {data.customerCity}</p>
            <p>{data.customerCountry}</p>
          </div>
        </div>
      </div>

      {/* Reminder Notice */}
      <div className="px-8 mb-8">
        <div className={`border-2 ${data.reminderLevel === 3 ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'} p-6 rounded-lg`}>
          <h3 className={`text-lg font-bold mb-3 ${data.reminderLevel === 3 ? 'text-red-700' : 'text-yellow-700'}`}>
            Zahlungserinnerung
          </h3>
          <p className="text-gray-700">
            {data.reminderLevel === 1 && 
              `Unsere Rechnung Nr. ${data.originalInvoiceNumber} vom ${data.originalInvoiceDate} ist noch nicht beglichen. 
              Bitte begleichen Sie den ausstehenden Betrag bis zum ${data.dueDate}.`
            }
            {data.reminderLevel === 2 && 
              `Trotz unserer ersten Mahnung ist die Rechnung Nr. ${data.originalInvoiceNumber} noch immer nicht bezahlt. 
              Wir bitten Sie dringend um sofortige Begleichung.`
            }
            {data.reminderLevel === 3 && 
              `Dies ist unsere letzte Mahnung. Bei Nichtzahlung werden wir rechtliche Schritte einleiten. 
              Zahlung ist sofort fällig.`
            }
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-8 mb-8 flex-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left py-4 px-4 font-semibold">Beschreibung</th>
              <th className="text-right py-4 px-4 font-semibold w-20">Menge</th>
              <th className="text-right py-4 px-4 font-semibold w-24">Preis</th>
              <th className="text-right py-4 px-4 font-semibold w-24">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 px-4 border-b border-gray-200">{item.description}</td>
                <td className="text-right py-3 px-4 border-b border-gray-200">{item.quantity}</td>
                <td className="text-right py-3 px-4 border-b border-gray-200">€{item.price.toFixed(2)}</td>
                <td className="text-right py-3 px-4 border-b border-gray-200 font-semibold">€{item.total.toFixed(2)}</td>
              </tr>
            ))}
            {data.reminderFee > 0 && (
              <tr className="bg-yellow-50">
                <td className="py-3 px-4 border-b border-gray-200 font-semibold text-yellow-700">Mahngebühr</td>
                <td className="text-right py-3 px-4 border-b border-gray-200">1</td>
                <td className="text-right py-3 px-4 border-b border-gray-200">€{data.reminderFee.toFixed(2)}</td>
                <td className="text-right py-3 px-4 border-b border-gray-200 font-semibold text-yellow-700">€{data.reminderFee.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-80">
            <div className={`${levelInfo.color} text-white p-4 rounded-lg`}>
              <div className="flex justify-between py-2">
                <span>Ursprünglicher Betrag:</span>
                <span>€{data.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>MwSt ({data.taxRate}%):</span>
                <span>€{data.taxAmount.toFixed(2)}</span>
              </div>
              {data.reminderFee > 0 && (
                <div className="flex justify-between py-2">
                  <span>Mahngebühr:</span>
                  <span>€{data.reminderFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white border-opacity-30 mt-2 pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Fälliger Gesamtbetrag:</span>
                  <span>€{data.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-6 mt-auto">
        <div className="flex justify-between text-xs text-gray-600">
          <div>
            <p className="font-semibold">{data.companyName}</p>
            <p>{data.companyAddress} • {data.companyZip} {data.companyCity}</p>
          </div>
          <div className="text-right">
            <p>{data.companyEmail}</p>
            <p>{data.companyPhone}</p>
            {data.companyWebsite && <p>{data.companyWebsite}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
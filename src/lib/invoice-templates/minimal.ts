import { InvoiceData } from '@/types/invoiceTypes';

export function generateMinimalHTML(invoice: InvoiceData): string {
  const calculateTotal = () => {
    return invoice.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

  const subtotal = calculateTotal();
  const vatAmount = subtotal * (invoice.vatRate / 100);
  const total = subtotal + vatAmount;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechnung ${invoice.invoiceNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
            font-size: 14px;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            min-height: 297mm;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #14ad9f;
        }
        
        .company-info h1 {
            font-size: 28px;
            font-weight: 700;
            color: #14ad9f;
            margin-bottom: 5px;
        }
        
        .company-info p {
            color: #6b7280;
            font-size: 13px;
            margin: 2px 0;
        }
        
        .invoice-meta {
            text-align: right;
        }
        
        .invoice-meta h2 {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .invoice-meta p {
            font-size: 13px;
            color: #6b7280;
            margin: 3px 0;
        }
        
        .billing-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .billing-section h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
        }
        
        .billing-section p {
            font-size: 13px;
            color: #4b5563;
            margin: 2px 0;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .items-table thead {
            background: #14ad9f;
            color: white;
        }
        
        .items-table th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table tbody tr {
            border-bottom: 1px solid #f3f4f6;
        }
        
        .items-table tbody tr:hover {
            background: #f9fafb;
        }
        
        .items-table td {
            padding: 12px 15px;
            font-size: 13px;
            color: #4b5563;
        }
        
        .total-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        
        .total-table {
            min-width: 300px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .total-row.final {
            border-bottom: 2px solid #14ad9f;
            border-top: 2px solid #14ad9f;
            font-weight: 600;
            font-size: 16px;
            color: #1f2937;
            margin-top: 10px;
            padding: 12px 0;
        }
        
        .notes {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .notes h4 {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .notes p {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.5;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
        }
        
        @media print {
            .invoice-container {
                margin: 0;
                padding: 15mm;
                box-shadow: none;
            }
            
            .items-table {
                box-shadow: none;
            }
            
            .items-table tbody tr:hover {
                background: transparent;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <h1>${invoice.companyName || 'Unternehmen'}</h1>
                <p>${invoice.companyAddress || ''}</p>
                <p>${invoice.companyEmail || ''}</p>
                <p>${invoice.companyPhone || ''}</p>
            </div>
            <div class="invoice-meta">
                <h2>RECHNUNG</h2>
                <p><strong>Nr:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Datum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                <p><strong>Fällig:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
            </div>
        </div>

        <div class="billing-info">
            <div class="billing-section">
                <h3>Rechnungsadresse</h3>
                <p><strong>${invoice.customerName}</strong></p>
                <p>${invoice.customerAddress || ''}</p>
                <p>${invoice.customerEmail || ''}</p>
            </div>
            <div class="billing-section">
                <h3>Zahlungsinformationen</h3>
                <p><strong>Zahlungsziel:</strong> ${invoice.paymentTerms || '30 Tage'}</p>
                <p><strong>Status:</strong> ${invoice.status || 'Offen'}</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Beschreibung</th>
                    <th>Menge</th>
                    <th>Einzelpreis</th>
                    <th>Gesamt</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items
                  .map(
                    item => `
                    <tr>
                        <td>
                            <strong>${item.description}</strong>
                        </td>
                        <td>${item.quantity}</td>
                        <td>${item.unitPrice.toFixed(2)} €</td>
                        <td>${(item.unitPrice * item.quantity).toFixed(2)} €</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-table">
                <div class="total-row">
                    <span>Zwischensumme:</span>
                    <span>${subtotal.toFixed(2)} €</span>
                </div>
                <div class="total-row">
                    <span>MwSt. (${invoice.vatRate}%):</span>
                    <span>${vatAmount.toFixed(2)} €</span>
                </div>
                <div class="total-row final">
                    <span>Gesamtsumme:</span>
                    <span>${total.toFixed(2)} €</span>
                </div>
            </div>
        </div>

        ${
          invoice.notes
            ? `
        <div class="notes">
            <h4>Anmerkungen</h4>
            <p>${invoice.notes}</p>
        </div>
        `
            : ''
        }

        <div class="footer">
            <p>Vielen Dank für Ihr Vertrauen! • ${invoice.companyName || 'Unternehmen'}</p>
        </div>
    </div>
</body>
</html>`;
}

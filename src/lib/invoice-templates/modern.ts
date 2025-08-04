import { InvoiceData } from '@/types/invoiceTypes';

export function generateModernHTML(invoice: InvoiceData): string {
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-size: 14px;
            min-height: 100vh;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 20px auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            min-height: 297mm;
        }
        
        .header {
            background: linear-gradient(135deg, #14ad9f 0%, #129488 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
        }
        
        .header-content {
            position: relative;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .company-info h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .company-info p {
            opacity: 0.9;
            font-size: 14px;
            margin: 3px 0;
        }
        
        .invoice-meta {
            text-align: right;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .invoice-meta h2 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .invoice-meta p {
            font-size: 14px;
            opacity: 0.9;
            margin: 3px 0;
        }
        
        .content {
            padding: 40px;
        }
        
        .billing-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .billing-card {
            background: #f7fafc;
            padding: 25px;
            border-radius: 15px;
            border-left: 4px solid #14ad9f;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .billing-card h3 {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        
        .billing-card h3::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #14ad9f;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .billing-card p {
            color: #4a5568;
            margin: 5px 0;
            font-size: 14px;
        }
        
        .items-section {
            margin: 40px 0;
        }
        
        .items-section h3 {
            font-size: 22px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }
        
        .items-section h3::before {
            content: '📋';
            margin-right: 10px;
            font-size: 24px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .items-table thead {
            background: linear-gradient(135deg, #14ad9f 0%, #129488 100%);
            color: white;
        }
        
        .items-table th {
            padding: 18px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
            background: white;
        }
        
        .items-table tbody tr:hover {
            background: #f7fafc;
            transform: scale(1.005);
            transition: all 0.2s ease;
        }
        
        .total-section {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 30px;
            border-radius: 20px;
            margin: 30px 0;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            font-size: 16px;
            color: #4a5568;
        }
        
        .total-row.final {
            border-top: 2px solid #14ad9f;
            margin-top: 20px;
            padding-top: 20px;
            font-weight: 700;
            font-size: 22px;
            color: #2d3748;
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 12px rgba(20, 173, 159, 0.2);
        }
        
        .notes {
            background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
            padding: 25px;
            border-radius: 15px;
            border-left: 4px solid #f56565;
            margin: 30px 0;
        }
        
        .notes h4 {
            font-size: 18px;
            font-weight: 600;
            color: #c53030;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        
        .notes h4::before {
            content: '💡';
            margin-right: 10px;
        }
        
        .notes p {
            color: #742a2a;
            line-height: 1.6;
        }
        
        .footer {
            background: #2d3748;
            color: white;
            padding: 30px 40px;
            text-align: center;
            margin-top: 40px;
        }
        
        .footer p {
            margin: 5px 0;
            opacity: 0.9;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .invoice-container {
                margin: 0;
                border-radius: 0;
                box-shadow: none;
            }
            
            .items-table tbody tr:hover {
                background: white;
                transform: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="header-content">
                <div class="company-info">
                    <h1>${invoice.companyName || 'Unternehmen'}</h1>
                    <p>${invoice.companyAddress || ''}</p>
                    <p>${invoice.companyEmail || ''}</p>
                    <p>${invoice.companyPhone || ''}</p>
                    ${invoice.companyWebsite ? `<p>${invoice.companyWebsite}</p>` : ''}
                </div>
                <div class="invoice-meta">
                    <h2>RECHNUNG</h2>
                    <p><strong>Nr:</strong> ${invoice.invoiceNumber}</p>
                    <p><strong>Datum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                    <p><strong>Fällig:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
                </div>
            </div>
        </div>

        <div class="content">
            <div class="billing-info">
                <div class="billing-card">
                    <h3>Rechnungsempfänger</h3>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>${invoice.customerAddress || ''}</p>
                    <p>${invoice.customerEmail || ''}</p>
                </div>
                <div class="billing-card">
                    <h3>Zahlungskonditionen</h3>
                    <p><strong>Zahlungsziel:</strong> ${invoice.paymentTerms || '30 Tage'}</p>
                    <p><strong>Status:</strong> ${invoice.status || 'Offen'}</p>
                    <p><strong>Rechnungsdatum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                </div>
            </div>

            <div class="items-section">
                <h3>Leistungsübersicht</h3>
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
                                <td><strong>${item.description}</strong></td>
                                <td>${item.quantity}</td>
                                <td>${item.unitPrice.toFixed(2)} €</td>
                                <td>${(item.unitPrice * item.quantity).toFixed(2)} €</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

            <div class="total-section">
                <div class="total-row">
                    <span>Zwischensumme:</span>
                    <span>${subtotal.toFixed(2)} €</span>
                </div>
                <div class="total-row">
                    <span>MwSt. (${invoice.vatRate}%):</span>
                    <span>${vatAmount.toFixed(2)} €</span>
                </div>
                <div class="total-row final">
                    <span>💰 Gesamtsumme:</span>
                    <span>${total.toFixed(2)} €</span>
                </div>
            </div>

            ${
              invoice.notes
                ? `
            <div class="notes">
                <h4>Wichtige Hinweise</h4>
                <p>${invoice.notes}</p>
            </div>
            `
                : ''
            }
        </div>

        <div class="footer">
            <p><strong>Vielen Dank für Ihr Vertrauen!</strong></p>
            <p>${invoice.companyName || 'Unternehmen'} • ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>`;
}

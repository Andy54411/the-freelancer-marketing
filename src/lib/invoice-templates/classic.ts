import { InvoiceData } from '@/types/invoiceTypes';

export function generateClassicHTML(invoice: InvoiceData): string {
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
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #2c3e50;
            background: white;
            font-size: 14px;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 25mm;
            background: white;
            min-height: 297mm;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px double #2c3e50;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .header .subtitle {
            font-size: 18px;
            color: #7f8c8d;
            font-style: italic;
        }
        
        .company-section {
            margin-bottom: 30px;
            text-align: center;
        }
        
        .company-section h2 {
            font-size: 24px;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .company-section p {
            color: #34495e;
            margin: 3px 0;
        }
        
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 40px 0;
            padding: 20px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
        }
        
        .detail-section h3 {
            font-size: 16px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
            text-decoration: underline;
        }
        
        .detail-section p {
            margin: 5px 0;
            color: #495057;
        }
        
        .items-section {
            margin: 40px 0;
        }
        
        .items-section h3 {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
            text-decoration: underline;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 2px solid #2c3e50;
        }
        
        .items-table th {
            background: #2c3e50;
            color: white;
            padding: 15px 10px;
            text-align: left;
            font-weight: 700;
            font-size: 14px;
            border: 1px solid #2c3e50;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table td {
            padding: 12px 10px;
            border: 1px solid #dee2e6;
            color: #495057;
        }
        
        .items-table tbody tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .total-section {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border: 2px solid #2c3e50;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 15px;
        }
        
        .total-row.final {
            border-top: 2px solid #2c3e50;
            margin-top: 15px;
            padding-top: 15px;
            font-weight: 700;
            font-size: 18px;
            color: #2c3e50;
        }
        
        .notes {
            margin-top: 40px;
            padding: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 0;
        }
        
        .notes h4 {
            font-size: 16px;
            font-weight: 700;
            color: #856404;
            margin-bottom: 10px;
        }
        
        .notes p {
            color: #856404;
            line-height: 1.6;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            font-style: italic;
            color: #6c757d;
        }
        
        @media print {
            .invoice-container {
                margin: 0;
                padding: 20mm;
            }
            
            .items-table tbody tr:nth-child(even) {
                background: #f8f9fa !important;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>Rechnung</h1>
            <p class="subtitle">Nr. ${invoice.invoiceNumber}</p>
        </div>

        <div class="company-section">
            <h2>${invoice.companyName || 'Unternehmen'}</h2>
            <p>${invoice.companyAddress || ''}</p>
            <p>${invoice.companyEmail || ''} • ${invoice.companyPhone || ''}</p>
            ${invoice.companyWebsite ? `<p>${invoice.companyWebsite}</p>` : ''}
        </div>

        <div class="invoice-details">
            <div class="detail-section">
                <h3>Rechnungsempfänger</h3>
                <p><strong>${invoice.customerName}</strong></p>
                <p>${invoice.customerAddress || ''}</p>
                <p>${invoice.customerEmail || ''}</p>
            </div>
            <div class="detail-section">
                <h3>Rechnungsdetails</h3>
                <p><strong>Rechnungsdatum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                <p><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
                <p><strong>Zahlungsziel:</strong> ${invoice.paymentTerms || '30 Tage'}</p>
                <p><strong>Status:</strong> ${invoice.status || 'Offen'}</p>
            </div>
        </div>

        <div class="items-section">
            <h3>Leistungsverzeichnis</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Beschreibung</th>
                        <th>Menge</th>
                        <th>Einzelpreis</th>
                        <th>Gesamtpreis</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items
                      .map(
                        (item, index) => `
                        <tr>
                            <td>${index + 1}</td>
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
                <span>Mehrwertsteuer (${invoice.vatRate}%):</span>
                <span>${vatAmount.toFixed(2)} €</span>
            </div>
            <div class="total-row final">
                <span>Gesamtsumme:</span>
                <span>${total.toFixed(2)} €</span>
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
            <p>Vielen Dank für Ihr Vertrauen in unsere Dienstleistungen.</p>
            <p>${invoice.companyName || 'Unternehmen'} • ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>`;
}

import { InvoiceData } from '@/types/invoiceTypes';

export function generateCorporateHTML(invoice: InvoiceData): string {
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
        @import url('https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
            line-height: 1.4;
            color: #1a202c;
            background: white;
            font-size: 13px;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            min-height: 297mm;
        }
        
        .letterhead {
            border-bottom: 4px solid #2d3748;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .letterhead-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .company-logo {
            font-size: 28px;
            font-weight: 700;
            color: #2d3748;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .document-type {
            font-size: 24px;
            font-weight: 300;
            color: #4a5568;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .company-details {
            font-size: 11px;
            color: #718096;
            line-height: 1.3;
        }
        
        .invoice-header {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .recipient-section h3 {
            font-size: 12px;
            font-weight: 600;
            color: #2d3748;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
        }
        
        .recipient-address {
            font-size: 13px;
            color: #4a5568;
            line-height: 1.5;
        }
        
        .invoice-meta-box {
            background: #f7fafc;
            padding: 20px;
            border: 1px solid #e2e8f0;
        }
        
        .invoice-meta-box h3 {
            font-size: 12px;
            font-weight: 600;
            color: #2d3748;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
        }
        
        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
        }
        
        .meta-label {
            color: #718096;
            font-weight: 500;
        }
        
        .meta-value {
            color: #2d3748;
            font-weight: 600;
        }
        
        .services-section {
            margin: 40px 0;
        }
        
        .services-section h3 {
            font-size: 14px;
            font-weight: 600;
            color: #2d3748;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 20px;
            border-bottom: 2px solid #2d3748;
            padding-bottom: 8px;
        }
        
        .services-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 30px;
        }
        
        .services-table thead {
            background: #2d3748;
            color: white;
        }
        
        .services-table th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .services-table th:last-child,
        .services-table td:last-child {
            text-align: right;
        }
        
        .services-table td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
        }
        
        .services-table tbody tr:nth-child(even) {
            background: #f7fafc;
        }
        
        .financial-summary {
            display: flex;
            justify-content: flex-end;
            margin: 30px 0;
        }
        
        .summary-table {
            width: 350px;
            border: 1px solid #e2e8f0;
            background: white;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
        }
        
        .summary-row.subtotal {
            background: #f7fafc;
        }
        
        .summary-row.tax {
            background: #f7fafc;
        }
        
        .summary-row.total {
            background: #2d3748;
            color: white;
            font-weight: 700;
            font-size: 16px;
            border-bottom: none;
        }
        
        .terms-section {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        
        .terms-section h4 {
            font-size: 12px;
            font-weight: 600;
            color: #2d3748;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        
        .terms-section p {
            font-size: 11px;
            color: #718096;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        
        .footer-info {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #a0aec0;
        }
        
        @media print {
            .invoice-container {
                margin: 0;
                padding: 15mm;
            }
            
            .services-table tbody tr:nth-child(even) {
                background: #f7fafc !important;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="letterhead">
            <div class="letterhead-top">
                <div class="company-logo">${invoice.companyName || 'Corporation'}</div>
                <div class="document-type">Invoice</div>
            </div>
            <div class="company-details">
                ${invoice.companyAddress || ''} • ${invoice.companyEmail || ''} • ${invoice.companyPhone || ''}
                ${invoice.companyVatId ? ` • USt-IdNr: ${invoice.companyVatId}` : ''}
                ${invoice.companyTaxNumber ? ` • Steuernummer: ${invoice.companyTaxNumber}` : ''}
            </div>
        </div>

        <div class="invoice-header">
            <div class="recipient-section">
                <h3>Rechnungsempfänger</h3>
                <div class="recipient-address">
                    <strong>${invoice.customerName}</strong><br>
                    ${invoice.customerAddress || ''}<br>
                    ${invoice.customerEmail || ''}
                </div>
            </div>
            
            <div class="invoice-meta-box">
                <h3>Rechnungsinformationen</h3>
                <div class="meta-row">
                    <span class="meta-label">Rechnungsnummer:</span>
                    <span class="meta-value">${invoice.invoiceNumber}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Rechnungsdatum:</span>
                    <span class="meta-value">${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Fälligkeitsdatum:</span>
                    <span class="meta-value">${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Zahlungsziel:</span>
                    <span class="meta-value">${invoice.paymentTerms || '30 Tage'}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Status:</span>
                    <span class="meta-value">${invoice.status || 'Offen'}</span>
                </div>
            </div>
        </div>

        <div class="services-section">
            <h3>Leistungsübersicht</h3>
            <table class="services-table">
                <thead>
                    <tr>
                        <th style="width: 10%">Pos.</th>
                        <th style="width: 50%">Beschreibung</th>
                        <th style="width: 15%">Menge</th>
                        <th style="width: 15%">Einzelpreis</th>
                        <th style="width: 15%">Gesamtpreis</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items
                      .map(
                        (item, index) => `
                        <tr>
                            <td>${String(index + 1).padStart(2, '0')}</td>
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

        <div class="financial-summary">
            <div class="summary-table">
                <div class="summary-row subtotal">
                    <span>Zwischensumme:</span>
                    <span>${subtotal.toFixed(2)} €</span>
                </div>
                <div class="summary-row tax">
                    <span>Mehrwertsteuer (${invoice.vatRate}%):</span>
                    <span>${vatAmount.toFixed(2)} €</span>
                </div>
                <div class="summary-row total">
                    <span>GESAMTSUMME:</span>
                    <span>${total.toFixed(2)} €</span>
                </div>
            </div>
        </div>

        ${
          invoice.notes
            ? `
        <div class="terms-section">
            <h4>Anmerkungen</h4>
            <p>${invoice.notes}</p>
        </div>
        `
            : ''
        }

        <div class="terms-section">
            <h4>Zahlungsbedingungen</h4>
            <p>Der Rechnungsbetrag ist binnen ${invoice.paymentTerms || '30 Tagen'} ohne Abzug zur Zahlung fällig.</p>
            <p>Bei Verzug werden Zinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.</p>
        </div>

        <div class="footer-info">
            <p>${invoice.companyName || 'Corporation'} | Erstellt am ${new Date().toLocaleDateString('de-DE')}</p>
        </div>
    </div>
</body>
</html>`;
}

import { InvoiceData } from '@/types/invoiceTypes';

export function generateGermanStandardHTML(invoice: InvoiceData): string {
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: white;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 25mm 20mm;
            background: white;
            min-height: 297mm;
        }
        
        /* Absenderzeile (DIN 5008) */
        .sender-line {
            font-size: 8pt;
            color: #666;
            border-bottom: 1px solid #000;
            padding-bottom: 3pt;
            margin-bottom: 12pt;
        }
        
        /* Briefkopf */
        .letterhead {
            margin-bottom: 35mm;
        }
        
        .company-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 8pt;
        }
        
        .company-details {
            font-size: 9pt;
            line-height: 1.3;
            color: #333;
        }
        
        /* Empfängeradresse (nach DIN 5008) */
        .recipient-address {
            width: 85mm;
            margin-bottom: 12mm;
            margin-top: 27mm;
        }
        
        .recipient-address .sender-reference {
            font-size: 8pt;
            color: #666;
            margin-bottom: 3pt;
        }
        
        .recipient-address .recipient-details {
            font-size: 11pt;
            line-height: 1.2;
        }
        
        /* Info-Block rechts */
        .invoice-info {
            float: right;
            width: 60mm;
            margin-top: -40mm;
            font-size: 10pt;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3pt;
            border-bottom: 0.5pt dotted #ccc;
            padding-bottom: 1pt;
        }
        
        .info-label {
            font-weight: normal;
        }
        
        .info-value {
            font-weight: bold;
        }
        
        /* Betreffzeile */
        .subject-line {
            font-size: 12pt;
            font-weight: bold;
            margin: 24pt 0 12pt 0;
            clear: both;
        }
        
        /* Anrede */
        .salutation {
            margin-bottom: 12pt;
        }
        
        /* Rechnungstext */
        .invoice-text {
            margin-bottom: 20pt;
            line-height: 1.5;
        }
        
        /* Tabelle */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20pt;
            border: 1pt solid #000;
        }
        
        .items-table th {
            background: #f0f0f0;
            border: 1pt solid #000;
            padding: 8pt 6pt;
            text-align: left;
            font-weight: bold;
            font-size: 10pt;
        }
        
        .items-table td {
            border: 1pt solid #000;
            padding: 6pt;
            font-size: 10pt;
            vertical-align: top;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table .number-col {
            width: 8%;
            text-align: center;
        }
        
        .items-table .description-col {
            width: 52%;
        }
        
        .items-table .quantity-col {
            width: 10%;
            text-align: center;
        }
        
        .items-table .price-col {
            width: 15%;
            text-align: right;
        }
        
        .items-table .total-col {
            width: 15%;
            text-align: right;
        }
        
        /* Summenblock */
        .totals-section {
            float: right;
            width: 80mm;
            margin-top: 12pt;
            border: 1pt solid #000;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4pt 8pt;
            border-bottom: 0.5pt solid #ccc;
            font-size: 10pt;
        }
        
        .total-row:last-child {
            border-bottom: none;
            font-weight: bold;
            background: #f0f0f0;
            font-size: 11pt;
        }
        
        /* Zahlungshinweis */
        .payment-info {
            clear: both;
            margin-top: 30pt;
            padding-top: 12pt;
            border-top: 1pt solid #000;
        }
        
        .payment-info h4 {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 8pt;
        }
        
        .payment-info p {
            font-size: 10pt;
            margin-bottom: 6pt;
            line-height: 1.4;
        }
        
        /* Grußformel */
        .closing {
            margin-top: 20pt;
            margin-bottom: 30pt;
        }
        
        /* Fußzeile */
        .footer {
            margin-top: 40pt;
            padding-top: 12pt;
            border-top: 0.5pt solid #ccc;
            font-size: 8pt;
            color: #666;
            text-align: center;
        }
        
        /* Bankdaten */
        .bank-details {
            margin: 12pt 0;
            font-size: 10pt;
            line-height: 1.3;
        }
        
        @media print {
            .invoice-container {
                margin: 0;
                padding: 25mm 20mm;
            }
            
            body {
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Absenderzeile nach DIN 5008 -->
        <div class="sender-line">
            ${invoice.companyName || 'Unternehmen'} • ${invoice.companyAddress || ''} • ${invoice.companyEmail || ''}
        </div>
        
        <!-- Briefkopf -->
        <div class="letterhead">
            <div class="company-name">${invoice.companyName || 'Unternehmen'}</div>
            <div class="company-details">
                ${invoice.companyAddress || ''}<br>
                Telefon: ${invoice.companyPhone || ''}<br>
                E-Mail: ${invoice.companyEmail || ''}<br>
                ${invoice.companyWebsite ? `Internet: ${invoice.companyWebsite}<br>` : ''}
                ${invoice.companyVatId ? `USt-IdNr.: ${invoice.companyVatId}<br>` : ''}
                ${invoice.companyTaxNumber ? `Steuernummer: ${invoice.companyTaxNumber}` : ''}
            </div>
        </div>
        
        <!-- Empfängeradresse -->
        <div class="recipient-address">
            <div class="sender-reference">
                ${invoice.companyName || 'Unternehmen'}, ${invoice.companyAddress || ''}
            </div>
            <div class="recipient-details">
                <strong>${invoice.customerName}</strong><br>
                ${invoice.customerAddress || ''}<br>
                ${invoice.customerEmail || ''}
            </div>
        </div>
        
        <!-- Info-Block rechts -->
        <div class="invoice-info">
            <div class="info-row">
                <span class="info-label">Kundennummer:</span>
                <span class="info-value">${invoice.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Rechnungsnummer:</span>
                <span class="info-value">${invoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Rechnungsdatum:</span>
                <span class="info-value">${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Leistungsdatum:</span>
                <span class="info-value">${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Fälligkeitsdatum:</span>
                <span class="info-value">${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</span>
            </div>
        </div>
        
        <!-- Betreffzeile -->
        <div class="subject-line">
            Rechnung Nr. ${invoice.invoiceNumber}
        </div>
        
        <!-- Anrede -->
        <div class="salutation">
            Sehr geehrte Damen und Herren,
        </div>
        
        <!-- Rechnungstext -->
        <div class="invoice-text">
            hiermit stellen wir Ihnen die nachfolgend aufgeführten Leistungen in Rechnung:
        </div>
        
        <!-- Leistungstabelle -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="number-col">Pos.</th>
                    <th class="description-col">Bezeichnung der Leistung</th>
                    <th class="quantity-col">Menge</th>
                    <th class="price-col">Einzelpreis (€)</th>
                    <th class="total-col">Gesamtpreis (€)</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items
                  .map(
                    (item, index) => `
                    <tr>
                        <td class="number-col">${index + 1}</td>
                        <td class="description-col">
                            <strong>${item.description}</strong>
                        </td>
                        <td class="quantity-col">${item.quantity}</td>
                        <td class="price-col">${item.unitPrice.toFixed(2)}</td>
                        <td class="total-col">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
        
        <!-- Summenblock -->
        <div class="totals-section">
            <div class="total-row">
                <span>Zwischensumme:</span>
                <span>${subtotal.toFixed(2)} €</span>
            </div>
            <div class="total-row">
                <span>zzgl. ${invoice.vatRate}% MwSt.:</span>
                <span>${vatAmount.toFixed(2)} €</span>
            </div>
            <div class="total-row">
                <span>Rechnungsbetrag:</span>
                <span>${total.toFixed(2)} €</span>
            </div>
        </div>
        
        <!-- Zahlungshinweise -->
        <div class="payment-info">
            <h4>Zahlungshinweise</h4>
            <p>
                Der Rechnungsbetrag ist binnen ${invoice.paymentTerms || '30 Tagen'} ab Rechnungsdatum 
                ohne Abzug zur Zahlung fällig.
            </p>
            <p>
                Bei Überweisung bitte die Rechnungsnummer ${invoice.invoiceNumber} als Verwendungszweck angeben.
            </p>
            
            ${
              invoice.notes
                ? `
            <h4>Anmerkungen</h4>
            <p>${invoice.notes}</p>
            `
                : ''
            }
        </div>
        
        <!-- Grußformel -->
        <div class="closing">
            <p>Vielen Dank für Ihren Auftrag.</p>
            <p>Mit freundlichen Grüßen</p>
            <br><br>
            <p>${invoice.companyName || 'Unternehmen'}</p>
        </div>
        
        <!-- Fußzeile -->
        <div class="footer">
            <p>
                ${invoice.companyName || 'Unternehmen'} | 
                ${invoice.companyAddress || ''} | 
                ${invoice.companyPhone || ''} | 
                ${invoice.companyEmail || ''}
            </p>
            ${
              invoice.companyVatId || invoice.companyTaxNumber
                ? `
            <p>
                ${invoice.companyVatId ? `USt-IdNr.: ${invoice.companyVatId}` : ''} 
                ${invoice.companyVatId && invoice.companyTaxNumber ? ' | ' : ''}
                ${invoice.companyTaxNumber ? `Steuernummer: ${invoice.companyTaxNumber}` : ''}
            </p>
            `
                : ''
            }
        </div>
    </div>
</body>
</html>`;
}

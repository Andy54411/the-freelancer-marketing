import { InvoiceData } from '@/types/invoiceTypes';

export function generateCreativeHTML(invoice: InvoiceData): string {
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
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Open Sans', sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
            font-size: 14px;
            min-height: 100vh;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 20px auto;
            background: white;
            border-radius: 25px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            min-height: 297mm;
            position: relative;
        }
        
        .invoice-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
            z-index: 1;
        }
        
        .header {
            position: relative;
            z-index: 2;
            padding: 40px;
            color: white;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .company-info h1 {
            font-family: 'Comfortaa', cursive;
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .company-info p {
            font-size: 14px;
            opacity: 0.9;
            margin: 3px 0;
        }
        
        .invoice-badge {
            background: rgba(255,255,255,0.15);
            padding: 20px 25px;
            border-radius: 20px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .invoice-badge h2 {
            font-family: 'Comfortaa', cursive;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .invoice-badge .invoice-number {
            font-size: 18px;
            font-weight: 700;
            background: rgba(255,255,255,0.2);
            padding: 5px 15px;
            border-radius: 15px;
            display: inline-block;
        }
        
        .content {
            padding: 40px;
            position: relative;
            z-index: 2;
        }
        
        .info-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .info-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 25px;
            border-radius: 20px;
            color: white;
            box-shadow: 0 15px 35px rgba(240, 147, 251, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .info-card::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
        }
        
        .info-card.secondary {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            box-shadow: 0 15px 35px rgba(79, 172, 254, 0.3);
        }
        
        .info-card h3 {
            font-family: 'Comfortaa', cursive;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
        }
        
        .info-card p {
            position: relative;
            z-index: 2;
            margin: 5px 0;
            opacity: 0.95;
        }
        
        .items-section {
            margin: 40px 0;
        }
        
        .items-section h3 {
            font-family: 'Comfortaa', cursive;
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 25px;
            text-align: center;
            position: relative;
        }
        
        .items-section h3::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 4px;
            background: linear-gradient(45deg, #f093fb, #f5576c);
            border-radius: 2px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .items-table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .items-table th {
            padding: 20px 15px;
            text-align: left;
            font-family: 'Comfortaa', cursive;
            font-weight: 600;
            font-size: 14px;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
            text-align: right;
        }
        
        .items-table td {
            padding: 18px 15px;
            border-bottom: 1px solid #f1f3f4;
            color: #4a5568;
            background: white;
        }
        
        .items-table tbody tr:nth-child(even) {
            background: linear-gradient(90deg, #ffecd2 0%, #fcb69f 100%);
            background-size: 200% 100%;
            animation: gradient 3s ease infinite;
        }
        
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .total-section {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            padding: 30px;
            border-radius: 25px;
            margin: 30px 0;
            box-shadow: 0 15px 30px rgba(252, 182, 159, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .total-section::before {
            content: '💰';
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 40px;
            opacity: 0.3;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            font-size: 16px;
            color: #8b4513;
        }
        
        .total-row.final {
            border-top: 3px solid #d2691e;
            margin-top: 20px;
            padding-top: 20px;
            font-family: 'Comfortaa', cursive;
            font-weight: 700;
            font-size: 24px;
            color: #8b4513;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .notes {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            padding: 25px;
            border-radius: 20px;
            margin: 30px 0;
            box-shadow: 0 10px 25px rgba(168, 237, 234, 0.3);
            position: relative;
        }
        
        .notes::before {
            content: '✨';
            position: absolute;
            top: 20px;
            right: 25px;
            font-size: 24px;
        }
        
        .notes h4 {
            font-family: 'Comfortaa', cursive;
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .notes p {
            color: #34495e;
            line-height: 1.6;
        }
        
        .footer {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
            position: relative;
            margin-top: 40px;
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
            background-size: 50px 50px;
        }
        
        .footer p {
            position: relative;
            z-index: 2;
            margin: 5px 0;
            font-family: 'Comfortaa', cursive;
        }
        
        .footer .heart {
            color: #ff6b6b;
            animation: heartbeat 1.5s ease-in-out infinite;
        }
        
        @keyframes heartbeat {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
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
            
            .items-table tbody tr:nth-child(even) {
                background: #f8f9fa !important;
                animation: none;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="header-content">
                <div class="company-info">
                    <h1>${invoice.companyName || 'Creative Studio'}</h1>
                    <p>${invoice.companyAddress || ''}</p>
                    <p>${invoice.companyEmail || ''}</p>
                    <p>${invoice.companyPhone || ''}</p>
                </div>
                <div class="invoice-badge">
                    <h2>Rechnung</h2>
                    <div class="invoice-number">${invoice.invoiceNumber}</div>
                </div>
            </div>
        </div>

        <div class="content">
            <div class="info-cards">
                <div class="info-card">
                    <h3>💌 Rechnungsempfänger</h3>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>${invoice.customerAddress || ''}</p>
                    <p>${invoice.customerEmail || ''}</p>
                </div>
                <div class="info-card secondary">
                    <h3>📅 Rechnungsdetails</h3>
                    <p><strong>Datum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
                    <p><strong>Fällig:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
                    <p><strong>Zahlungsziel:</strong> ${invoice.paymentTerms || '30 Tage'}</p>
                    <p><strong>Status:</strong> ${invoice.status || 'Offen'}</p>
                </div>
            </div>

            <div class="items-section">
                <h3>🎨 Kreative Leistungen</h3>
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
                    <span>🌟 Gesamtsumme:</span>
                    <span>${total.toFixed(2)} €</span>
                </div>
            </div>

            ${
              invoice.notes
                ? `
            <div class="notes">
                <h4>Kreative Notizen</h4>
                <p>${invoice.notes}</p>
            </div>
            `
                : ''
            }
        </div>

        <div class="footer">
            <p><strong>Danke für dein Vertrauen in unsere Kreativität!</strong></p>
            <p>Made with <span class="heart">❤️</span> by ${invoice.companyName || 'Creative Studio'}</p>
        </div>
    </div>
</body>
</html>`;
}

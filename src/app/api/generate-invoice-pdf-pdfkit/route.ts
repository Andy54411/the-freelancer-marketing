import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { storage, db } from '@/firebase/server';
import { InvoiceData } from '@/types/invoiceTypes';
import fetch from 'node-fetch';

/**
 * Gibt den deutschen Text für eine Steuerregel zurück
 */
function getTaxRuleLabel(taxRule: string): string {
  switch (taxRule) {
    case 'DE_TAXABLE':
      return 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)';
    case 'DE_TAXABLE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)';
    case 'DE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 2 UStG)';
    case 'DE_EXEMPT':
    case 'DE_EXEMPT_4_USTG':
      return 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG';
    case 'DE_SMALL_BUSINESS':
      return 'Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung)';
    case 'DE_REVERSE_CHARGE':
    case 'DE_REVERSE_13B':
      return 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)';
    case 'EU_REVERSE_18B':
      return 'Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)';
    case 'EU_INTRACOMMUNITY_SUPPLY':
      return 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG';
    case 'EU_OSS':
      return 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)';
    case 'NON_EU_EXPORT':
      return 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)';
    case 'NON_EU_OUT_OF_SCOPE':
      return 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)';
    case 'DE_INTRACOMMUNITY':
      return 'Innergemeinschaftliche Lieferung (§ 4 Nr. 1b UStG)';
    case 'DE_EXPORT':
      return 'Ausfuhrlieferung (§ 4 Nr. 1a UStG)';
    default:
      return taxRule;
  }
}

/**
 * Lädt ein Logo von einer URL und gibt es als Buffer zurück
 */
async function loadLogoFromUrl(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to load logo from ${url}: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn(`Error loading logo from ${url}:`, error);
    return null;
  }
}

/**
 * Konvertiert Buffer zu Base64 Data URL
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string = 'image/jpeg'): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function generateInvoicePDF(invoice: InvoiceData, logoBuffer?: Buffer | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('[PDF-Generation] Starting jsPDF generation - Template Match');
      
      // jsPDF initialisieren mit genaueren A4-Abmessungen
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Deutsche Formatierungsfunktionen
      const formatDate = (input: string) => {
        const d = new Date(input);
        return isNaN(d.getTime()) ? input : d.toLocaleDateString('de-DE');
      };

      const formatCurrency = (value: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

      // Hilfsfunktion zum Bereinigen der Straße (exakt wie im Template)
      const cleanStreet = (street: string) => {
        if (!street) return '';
        return street
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/\r\n/g, ' ')
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Dokumenttitel bestimmen (wie im Template)
      const getDocumentTitle = (data: any): string => {
        if (data.documentTitle) return data.documentTitle;
        if (data.documentType) {
          switch (data.documentType) {
            case 'quote': return 'Angebot';
            case 'invoice': return 'Rechnung';
            case 'storno': return 'STORNO-RECHNUNG';
            case 'reminder': return 'Mahnung';
            case 'voucher':
            case 'gutschein': return 'Gutschein';
            case 'delivery_note':
            case 'lieferschein': return 'Lieferschein';
            case 'proforma': return 'Proforma-Rechnung';
            case 'credit_note':
            case 'gutschrift': return 'Gutschrift';
            default: return 'Dokument';
          }
        }
        if (data.isStorno) return 'STORNO-RECHNUNG';
        return 'Rechnung';
      };

      let yPosition = 20;

      // Logo oben zentriert (exakt wie im Template)
      const logoUrl = (invoice as any).companyLogo || (invoice as any).profilePictureURL;
      if (logoUrl && logoBuffer) {
        try {
          const logoDataUrl = bufferToDataUrl(logoBuffer);
          const logoWidth = 40; // Template: h-24 ≈ 24px ≈ 8.5mm, aber größer für PDF
          const logoHeight = 24; // Template: h-24
          const logoX = (210 - logoWidth) / 2; // A4 width is 210mm, zentriert
          
          doc.addImage(logoDataUrl, 'JPEG', logoX, yPosition, logoWidth, logoHeight);
          yPosition += logoHeight + 6; // mb-4 spacing
          console.log('[PDF-Generation] Logo added successfully - centered like template');
        } catch (error) {
          console.warn('Error adding logo to PDF:', error);
          yPosition += 6;
        }
      }

      // Header mit Trennlinie (exakt wie im Template)
      const headerStartY = yPosition;
      
      // Linke Spalte: Titel und Firmenadresse
      doc.setFontSize(18); // text-2xl
      doc.setFont('helvetica', 'bold');
      doc.text(getDocumentTitle(invoice), 20, yPosition);
      yPosition += 8; // mb-0.5

      // Firmenadresse in einer Zeile (text-xs, gray-600)
      if (invoice.company?.name && invoice.company?.address?.street) {
        const companyName = invoice.company.name;
        const companySuffix = (invoice as any).companySuffix || (invoice as any).step2?.companySuffix;
        const fullCompanyName = companySuffix ? `${companyName} ${companySuffix}` : companyName;
        const companyAddress = `${fullCompanyName} | ${cleanStreet(invoice.company.address.street)} | ${invoice.company.address.zipCode} ${invoice.company.address.city}`;

        doc.setFontSize(8); // text-xs
        doc.setFont('helvetica', 'normal');
        doc.text(companyAddress, 20, yPosition);
        yPosition += 6; // mb-3
      }

      // Kundendaten (text-sm)
      if (invoice.customer?.name) {
        yPosition += 3; // mb-2
        doc.setFontSize(11); // text-sm
        doc.setFont('helvetica', 'bold'); // font-semibold
        doc.text(invoice.customer.name, 20, yPosition);
        yPosition += 5;

        doc.setFont('helvetica', 'normal');
        if (invoice.customer.address?.street) {
          doc.text(cleanStreet(invoice.customer.address.street), 20, yPosition);
          yPosition += 4;
        }
        if (invoice.customer.address?.zipCode && invoice.customer.address?.city) {
          doc.text(`${invoice.customer.address.zipCode} ${invoice.customer.address.city}`, 20, yPosition);
          yPosition += 4;
        }
        doc.text('Deutschland', 20, yPosition);
        yPosition += 4;

        // Kunden-USt-IdNr und Steuernummer (text-xs, text-gray-600)
        const customerVatId = (invoice as any).customerVatId || invoice.customer?.vatId;
        const customerTaxNumber = (invoice as any).customerTaxNumber || invoice.customer?.taxNumber;
        if (customerVatId || customerTaxNumber) {
          doc.setFontSize(8); // text-xs
          let taxInfo = '';
          if (customerVatId) {
            taxInfo += `VAT: ${customerVatId}`;
          }
          if (customerTaxNumber) {
            if (taxInfo) taxInfo += ' / ';
            taxInfo += `Steuernummer: ${customerTaxNumber}`;
          }
          doc.text(taxInfo, 20, yPosition);
          yPosition += 4;
        }
      }

      // Rechte Spalte - Dokumentinformationen (absolut positioniert rechts)
      const rightColumnX = 120; // Rechte Spalte
      let rightY = headerStartY + 10; // Etwas unter dem Titel

      doc.setFontSize(9); // text-sm
      doc.setFont('helvetica', 'normal');
      
      // Rechnungsnummer
      doc.setFont('helvetica', 'bold');
      doc.text('Rechnungsnummer:', rightColumnX, rightY, { align: 'left' });
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.number || invoice.invoiceNumber || '', rightColumnX + 35, rightY);
      rightY += 5;

      // Rechnungsdatum
      doc.setFont('helvetica', 'bold');
      doc.text('Rechnungsdatum:', rightColumnX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(invoice.date || invoice.issueDate || ''), rightColumnX + 35, rightY);
      rightY += 5;

      // Fälligkeitsdatum
      if (invoice.dueDate) {
        doc.setFont('helvetica', 'bold');
        doc.text('Fälligkeitsdatum:', rightColumnX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(invoice.dueDate), rightColumnX + 35, rightY);
        rightY += 5;
      }

      // Service Period/Date (aus Template)
      const servicePeriod = (invoice as any).servicePeriod;
      const serviceDate = (invoice as any).serviceDate;
      if (servicePeriod || serviceDate) {
        const periodText = servicePeriod ? 'Lieferzeitraum:' : 'Lieferdatum:';
        const periodValue = servicePeriod || (serviceDate ? formatDate(serviceDate) : '');
        doc.setFont('helvetica', 'bold');
        doc.text(periodText, rightColumnX, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(periodValue, rightColumnX + 35, rightY);
        rightY += 5;
      }

      // Y-Position für Tabelle bestimmen
      yPosition = Math.max(yPosition, rightY) + 10;

      // Trennlinie (border-b-2 border-gray-300)
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 8;

      // Artikeltabelle (genau wie im Template)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      // Tabellenheader
      doc.text('Pos.', 20, yPosition);
      doc.text('Beschreibung', 35, yPosition);
      doc.text('Menge', 120, yPosition);
      doc.text('Einzelpreis', 140, yPosition);
      doc.text('Gesamtpreis', 170, yPosition);
      
      // Linie unter Header
      doc.setLineWidth(0.2);
      doc.line(20, yPosition + 2, 190, yPosition + 2);
      yPosition += 8;

      // Items
      let subtotal = 0;
      doc.setFont('helvetica', 'normal');

      (invoice.items || []).forEach((item: any, index: number) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
        const itemTotal = quantity * unitPrice;
        subtotal += itemTotal;

        doc.text(`${index + 1}`, 20, yPosition);
        
        // Beschreibung mit Zeilenumbruch
        const description = item.description || item.name || '';
        const maxWidth = 75;
        const lines = doc.splitTextToSize(description, maxWidth);
        doc.text(lines, 35, yPosition);
        
        doc.text(`${quantity} ${item.unit || 'Stk'}`, 120, yPosition);
        doc.text(formatCurrency(unitPrice), 140, yPosition, { align: 'right' });
        doc.text(formatCurrency(itemTotal), 190, yPosition, { align: 'right' });

        yPosition += Math.max(6, lines.length * 4);
      });

      // Summenbereich (rechts ausgerichtet wie im Template)
      yPosition += 8;
      const summaryX = 120;
      
      doc.setFont('helvetica', 'normal');
      doc.text('Zwischensumme:', summaryX, yPosition);
      doc.text(formatCurrency(subtotal), 190, yPosition, { align: 'right' });
      yPosition += 5;

      const taxRate = invoice.vatRate || (invoice as any).taxRate || 19;
      if (taxRate > 0) {
        const taxAmount = subtotal * (taxRate / 100);
        doc.text(`Umsatzsteuer (${taxRate}%):`, summaryX, yPosition);
        doc.text(formatCurrency(taxAmount), 190, yPosition, { align: 'right' });
        yPosition += 5;
      }

      // Linie vor Gesamtbetrag
      doc.setLineWidth(0.3);
      doc.line(summaryX, yPosition, 190, yPosition);
      yPosition += 6;

      const total = subtotal + (subtotal * (taxRate / 100));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Gesamtbetrag:', summaryX, yPosition);
      doc.text(formatCurrency(total), 190, yPosition, { align: 'right' });
      yPosition += 15;

      // Footer Text (falls vorhanden)
      const footerText = (invoice as any).footerText;
      if (footerText) {
        yPosition += 5;
        // Platzhalter ersetzen wie im Template
        let processedFooterText = footerText
          .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(total))
          .replace(/\[%RECHNUNGSNUMMER%\]/g, invoice.number || invoice.invoiceNumber || '')
          .replace(/\[%ZAHLUNGSZIEL%\]/g, (invoice as any).paymentTerms || '')
          .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(invoice.date || invoice.issueDate || ''))
          .replace(/\[%KONTAKTPERSON%\]/g, (invoice as any).contactPersonName || invoice.companyName || '');

        // HTML Tags entfernen und formatieren
        processedFooterText = processedFooterText
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .trim();

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const footerLines = doc.splitTextToSize(processedFooterText, 170);
        doc.text(footerLines, 20, yPosition);
        yPosition += footerLines.length * 3 + 5;
      }

      // Steuerregel (falls vorhanden)
      const taxRule = (invoice as any).taxRule || (invoice as any).taxRuleType;
      if (taxRule) {
        yPosition += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Steuerregel:', 20, yPosition);
        yPosition += 3;
        
        doc.setFont('helvetica', 'normal');
        const taxRuleLabel = getTaxRuleLabel(taxRule);
        const taxRuleLines = doc.splitTextToSize(taxRuleLabel, 170);
        doc.text(taxRuleLines, 20, yPosition);
        yPosition += taxRuleLines.length * 3 + 8;
      }

      // Footer mit Firmendaten (exakt wie im Template)
      // Position am Ende der Seite
      yPosition = Math.max(yPosition, 250); // Mindestens bei 250mm für Footer
      
      // Trennlinie vor Footer
      doc.setLineWidth(0.3);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5;

      const footerParts: string[] = [];

      // Firmenname + Suffix (exakt wie InvoiceFooter.tsx)
      const companyName = (invoice as any).companyName || invoice.company?.name;
      const companySuffix = (invoice as any).companySuffix || (invoice as any).step2?.companySuffix;
      if (companyName) {
        const fullCompanyName = companySuffix ? `${companyName} ${companySuffix}` : companyName;
        footerParts.push(fullCompanyName);
      }

      // Straße + Hausnummer
      const street = (invoice as any).companyStreet || invoice.company?.address?.street;
      const houseNumber = (invoice as any).companyHouseNumber || (invoice.company?.address as any)?.houseNumber;
      if (street) {
        const fullStreet = houseNumber ? `${street} ${houseNumber}` : street;
        footerParts.push(fullStreet);
      }

      // PLZ + Stadt
      const postalCode = (invoice as any).companyPostalCode || invoice.company?.address?.zipCode;
      const city = (invoice as any).companyCity || invoice.company?.address?.city;
      if (postalCode && city) {
        footerParts.push(`${postalCode} ${city}`);
      }

      footerParts.push('DE'); // Land

      // Telefon
      const phone = (invoice as any).phoneNumber || (invoice as any).companyPhone || invoice.company?.phone;
      if (phone) {
        footerParts.push(`Tel.: ${phone}`);
      }

      // E-Mail
      const email = (invoice as any).email || (invoice as any).companyEmail || invoice.company?.email;
      if (email) {
        footerParts.push(`E-Mail: ${email}`);
      }

      // Website
      const website = (invoice as any).website || (invoice as any).companyWebsite || invoice.company?.website;
      if (website) {
        footerParts.push(`Web: ${website}`);
      }

      // IBAN
      const iban = (invoice as any).iban || invoice.company?.bankDetails?.iban || (invoice as any).step4?.iban;
      if (iban) {
        footerParts.push(`IBAN: ${iban}`);
      }

      // BIC
      const bic = (invoice as any).bic || invoice.company?.bankDetails?.bic || (invoice as any).step4?.bic;
      if (bic) {
        footerParts.push(`BIC: ${bic}`);
      }

      // USt-IdNr
      const vatId = (invoice as any).vatId || invoice.company?.vatId || (invoice as any).step3?.vatId;
      if (vatId) {
        footerParts.push(`USt-IdNr.: ${vatId}`);
      }

      // Rechtsform
      const legalForm = (invoice as any).legalForm || (invoice as any).step2?.legalForm;
      if (legalForm) {
        footerParts.push(`Rechtsform: ${legalForm}`);
      }

      // Handelsregister
      const companyRegister = (invoice as any).companyRegister || (invoice as any).step3?.companyRegister;
      if (companyRegister) {
        footerParts.push(`HRB: ${companyRegister}`);
      }

      // Amtsgericht
      const districtCourt = (invoice as any).districtCourt || (invoice as any).step3?.districtCourt;
      if (districtCourt) {
        footerParts.push(`Amtsgericht: ${districtCourt}`);
      }

      // Steuernummer
      const taxNumber = (invoice as any).taxNumber || (invoice as any).step3?.taxNumber;
      if (taxNumber) {
        footerParts.push(`Steuernr.: ${taxNumber}`);
      }

      // Geschäftsführer/Inhaber (exakt wie im Template)
      let directorName = '';
      
      // 1. Prüfe managingDirectors Array (direkt)
      if ((invoice as any).managingDirectors && (invoice as any).managingDirectors.length > 0) {
        const mainDirector = (invoice as any).managingDirectors.find((dir: any) => dir.isMainDirector) || (invoice as any).managingDirectors[0];
        if (mainDirector && mainDirector.firstName && mainDirector.lastName) {
          directorName = `${mainDirector.firstName} ${mainDirector.lastName}`;
        } else if (mainDirector && mainDirector.name) {
          directorName = mainDirector.name;
        }
      }

      // 2. Prüfe step1.managingDirectors Array
      if (!directorName && (invoice as any).step1?.managingDirectors && (invoice as any).step1.managingDirectors.length > 0) {
        const mainDirector = (invoice as any).step1.managingDirectors.find((dir: any) => dir.isMainDirector) || (invoice as any).step1.managingDirectors[0];
        if (mainDirector && mainDirector.firstName && mainDirector.lastName) {
          directorName = `${mainDirector.firstName} ${mainDirector.lastName}`;
        } else if (mainDirector && mainDirector.name) {
          directorName = mainDirector.name;
        }
      }

      // 3. Prüfe step1.personalData
      if (!directorName && (invoice as any).step1?.personalData?.firstName && (invoice as any).step1?.personalData?.lastName) {
        directorName = `${(invoice as any).step1.personalData.firstName} ${(invoice as any).step1.personalData.lastName}`;
      }

      // 4. Fallback zu direkten personalData Feldern
      if (!directorName && (invoice as any).firstName && (invoice as any).lastName) {
        directorName = `${(invoice as any).firstName} ${(invoice as any).lastName}`;
      }

      const legalFormLower = legalForm?.toLowerCase() || '';
      const requiresDirector = legalFormLower.includes('gmbh') || legalFormLower.includes('ug') || legalFormLower.includes('ag') || legalFormLower.includes('kg');
      if (directorName.trim()) {
        if (requiresDirector) {
          footerParts.push(`Geschäftsführer: ${directorName.trim()}`);
        } else {
          footerParts.push(`Inhaber: ${directorName.trim()}`);
        }
      }

      // Footer rendern (zentriert)
      if (footerParts.length > 0) {
        doc.setFontSize(7); // Sehr klein für Footer
        doc.setFont('helvetica', 'normal');
        const footerText = footerParts.join(' | ');
        const footerLines = doc.splitTextToSize(footerText, 170);
        
        // Zentriert rendern
        footerLines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line);
          const xPos = (210 - lineWidth) / 2; // Zentriert auf A4
          doc.text(line, xPos, yPosition + (index * 3));
        });
      }

      console.log('[PDF-Generation] jsPDF generation completed successfully - Template matched with footer');

      // PDF als Buffer zurückgeben
      const pdfOutput = doc.output('arraybuffer');
      const pdfBuffer = Buffer.from(pdfOutput);
      resolve(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF with jsPDF:', error);
      reject(error);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('[PDF-API] POST request received (jsPDF version)');
    const body = await request.json();
    const { invoiceData, invoiceId, companyId } = body;
    console.log('[PDF-API] Request body parsed:', {
      hasInvoiceData: !!invoiceData,
      hasInvoiceId: !!invoiceId,
      hasCompanyId: !!companyId,
      invoiceDataKeys: invoiceData ? Object.keys(invoiceData) : [],
    });

    let finalInvoiceData: InvoiceData;

    if (invoiceData) {
      // Direkte invoiceData übergeben (für Tests)
      console.log('[PDF-API] Using direct invoiceData');
      finalInvoiceData = invoiceData;
    } else if (invoiceId && companyId) {
      // Lade invoiceData aus der Datenbank
      console.log('Loading invoice data from database:', { invoiceId, companyId });
      const invoiceDoc = await db!.collection('companies').doc(companyId).collection('invoices').doc(invoiceId).get();

      if (!invoiceDoc.exists) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      finalInvoiceData = invoiceDoc.data() as InvoiceData;
      console.log('Invoice data loaded successfully');
    } else {
      return NextResponse.json({ error: 'Either invoiceData or invoiceId+companyId must be provided' }, { status: 400 });
    }

    // Logo laden falls vorhanden
    let logoBuffer: Buffer | null = null;
    const logoUrl = (finalInvoiceData as any).companyLogo || (finalInvoiceData as any).profilePictureURL;
    if (logoUrl) {
      logoBuffer = await loadLogoFromUrl(logoUrl);
    }

    // Generiere PDF mit jsPDF
    console.log('[PDF-API] Generating PDF with jsPDF:', {
      companyName: finalInvoiceData.companyName,
      customerName: finalInvoiceData.customerName,
      invoiceNumber: finalInvoiceData.invoiceNumber,
      hasLogo: !!logoBuffer,
      logoSize: logoBuffer?.length,
    });
    const pdfBuffer = await generateInvoicePDF(finalInvoiceData, logoBuffer);
    console.log('[PDF-API] PDF generated successfully, buffer size:', pdfBuffer.length);

    // Prüfe ob direkter PDF-Download gewünscht ist (für E-Mail-Anhänge)
    const contentType = request.headers.get('accept');
    const wantsPdfDirect = contentType?.includes('application/pdf') || request.headers.get('x-pdf-direct') === 'true';
    
    if (wantsPdfDirect) {
      console.log('[PDF-API] Returning PDF directly for email attachment');
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="rechnung-${finalInvoiceData.invoiceNumber || 'preview'}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    }

    // Upload zu Firebase Storage (für normale Verwendung)
    if (!storage) {
      throw new Error('Firebase storage not initialized');
    }
    const bucket = storage.bucket();
    const fileName = `invoices/${finalInvoiceData.companyId || 'unknown'}/${finalInvoiceData.id || 'unknown'}.pdf`;
    const file = bucket.file(fileName);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          invoiceId: finalInvoiceData.id,
          companyId: finalInvoiceData.companyId,
          invoiceNumber: finalInvoiceData.number || finalInvoiceData.invoiceNumber,
        },
      },
    });

    // Erstelle eine signierte URL (gültig für 1 Stunde)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 Stunde
    });

    return NextResponse.json({
      success: true,
      pdfPath: `gs://${bucket.name}/${fileName}`,
      printUrl: url,
      pdfUrl: url,
    });
  } catch (error) {
    console.error('Error in PDF generation API:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
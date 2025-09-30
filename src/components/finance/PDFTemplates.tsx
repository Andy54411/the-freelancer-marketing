'use client';

import React, { useState } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InvoiceFooter } from '@/components/templates/invoice-templates/InvoiceFooter';
import { Button } from '@/components/ui/button';

interface PDFTemplateProps {
  document: InvoiceData;
  template: string;
  color: string;
  logoUrl?: string | null;
  logoSize?: number;
  documentType: 'invoice' | 'quote' | 'reminder';
}

const PDFTemplate: React.FC<PDFTemplateProps> = ({
  document,
  template,
  color,
  logoUrl,
  logoSize = 50,
  documentType
}) => {
  const documentLabels = {
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Mahnung',
  };

  const documentLabel = documentLabels[documentType];

  // Verwende echte Daten aus dem document (Vollständige Firebase-Integration)
  const realItems = document.items || [];
  const vatRate = document.vatRate || (document as any).taxRate || 19;
  
  // Berechne Zwischensumme mit Rabatten
  const subtotal = realItems.reduce((sum, item) => {
    const discountPercent = (item as any).discountPercent || 0;
    const originalTotal = item.total || (item.unitPrice * item.quantity);
    const discountedTotal = discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
    return sum + discountedTotal;
  }, 0);
  
  const taxAmount = subtotal * (vatRate / 100); // Steuerbetrag
  const total = subtotal + taxAmount; // Gesamtbetrag

  // Rechnungsidentifikation
  const companyName = document.companyName || 'Ihr Unternehmen';
  const customerName = document.customerName || 'Kunde';
  const invoiceNumber = document.invoiceNumber || document.number || document.documentNumber || (document as any).title || '';
  const invoiceDate = document.date || document.issueDate || (document as any).invoiceDate || '';
  const dueDate = document.dueDate || (document as any).validUntil || '';
  const sequentialNumber = (document as any).sequentialNumber || '';

  // Kundendaten (vollständig aus Firebase)
  const customerAddress = document.customerAddress || '';
  const customerEmail = document.customerEmail || '';
  const customerPhone = (document as any).customerPhone || '';
  const customerNumber = (document as any).customerNumber || '';
  const customerOrderNumber = (document as any).customerOrderNumber || '';
  const customerFirstName = (document as any).customerFirstName || '';
  const customerLastName = (document as any).customerLastName || '';
  const customerTaxNumber = (document as any).customerTaxNumber || '';
  const customerVatId = (document as any).customerVatId || '';

  // Unternehmensdaten (vollständig aus Firebase)
  const companyAddress = document.companyAddress || '';
  const companyEmail = document.companyEmail || '';
  const companyPhone = document.companyPhone || '';
  const companyWebsite = document.companyWebsite || '';
  const companyVatId = document.companyVatId || '';
  const companyTaxNumber = document.companyTaxNumber || '';
  const companyRegister = (document as any).companyRegister || '';
  
  // Weitere Rechnungsfelder - alle möglichen Kopftext-Varianten
  // WICHTIG: headTextHtml aus Firebase lesen, nicht description (das ist nur die Rechnungsnummer)
  const headTextHtml = (document as any).headTextHtml || '';
  const description = document.description || ''; // Originale description getrennt halten
  const introText = (document as any).introText || '';
  const headerText = (document as any).headerText || '';
  const footerText = (document as any).footerText || '';
  const notes = (document as any).notes || '';
  const hinweise = (document as any).hinweise || '';
  const additionalNotes = (document as any).additionalNotes || '';
  const conclusionText = (document as any).conclusionText || '';
  const paymentTerms = document.paymentTerms || (document as any).paymentTerms || '14 Tage';
  const deliveryDate = (document as any).deliveryDate || '';
  const servicePeriod = (document as any).servicePeriod || '';
  const internalContactPerson = (document as any).internalContactPerson || '';
  const contactPersonName = (document as any).contactPersonName || '';
  
  // Steuereinstellungen
  const isSmallBusiness = document.isSmallBusiness || false;
  const priceInput = (document as any).priceInput || 'netto';
  const taxRuleType = (document as any).taxRuleType || '';
  const showNet = (document as any).showNet || true;
  
  // Skonto-Einstellungen  
  const skontoEnabled = document.skontoEnabled || (document as any).skontoEnabled || false;
  const skontoDays = document.skontoDays || (document as any).skontoDays || 0;
  const skontoPercentage = document.skontoPercentage || (document as any).skontoPercentage || 0;
  const skontoText = document.skontoText || (document as any).skontoText || '';
  
  // E-Invoice Daten
  const eInvoice = document.eInvoice || (document as any).eInvoice;
  const eInvoiceData = document.eInvoiceData || (document as any).eInvoiceData;
  
  // Status und Metadaten
  const status = (document as any).status || '';
  const currency = document.currency || (document as any).currency || 'EUR';
  const language = (document as any).language || 'de';
  const createdBy = (document as any).createdBy || '';
  
  // Weitere Formulardaten
  const deliveryTerms = document.deliveryTerms || (document as any).deliveryTerms || '';
  const taxRule = document.taxRule || document.taxRuleType || (document as any).taxRule || '';
  
  // Logo und Branding - STANDARDMÄSSIG AUS DATENBANK
  // Priorität: 1. User-Upload (logoUrl) 2. User-Override (document.companyLogo) 3. Datenbank-Logo (profilePictureURL/profilePictureFirebaseUrl)
  const companyLogo = logoUrl || 
                     document.companyLogo || 
                     (document as any).profilePictureURL || 
                     (document as any).profilePictureFirebaseUrl ||
                     'https://storage.googleapis.com/tilvo-f142f-storage/user_uploads%2FLLc8PX1VYHfpoFknk8o51LAOfSA2%2Fbusiness_icon_363787a5-842e-4841-8d71-e692082312fa_Gemini_Generated_Image_xzose0xzose0xzos.jpg';
  
  // Parse Adresse falls als String vorliegt
  const parseAddress = (address: string) => {
    if (!address) return { street: '', city: '', postalCode: '', country: '' };
    const lines = address.split('\n');
    const streetLine = lines[0] || '';
    const cityLine = lines[1] || '';
    const countryLine = lines[2] || '';
    
    // Parse "18586 Sellin" Format
    const cityParts = cityLine.split(' ');
    const postalCode = cityParts[0] || '';
    const city = cityParts.slice(1).join(' ') || '';
    
    return {
      street: streetLine,
      postalCode,
      city,
      country: countryLine || 'Deutschland'
    };
  };

  const customerAddressParsed = parseAddress(customerAddress);
  const companyAddressParsed = parseAddress(companyAddress);
  
  // Bankdaten
  const bankDetails = document.bankDetails || {};

  const renderStandardTemplate = () => (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with color bar */}
      <div className="relative mb-8">
        <div 
          className="absolute top-0 left-0 w-full h-2" 
          style={{ backgroundColor: color }}
        />
        <div className="pt-6 flex justify-between items-start" style={{ minHeight: companyLogo ? '160px' : '80px' }}>
          {/* Rechnung-Informationen links */}
          <div className="text-left flex-shrink-0">
            <div className="text-2xl font-bold mb-2">{documentLabel}</div>
            <div className="text-gray-600">Nr. {invoiceNumber}</div>
            {sequentialNumber && <div className="text-gray-500 text-sm">Lfd. Nr.: {sequentialNumber}</div>}
          </div>
          
          {/* Logo rechts */}
          <div className="flex-1 flex justify-end">
            <div className={companyLogo ? "mb-4" : ""} style={{ height: companyLogo ? '100px' : '0px', display: 'flex', alignItems: 'center' }}>
              {companyLogo && (
                <img 
                  src={companyLogo} 
                  alt="Logo" 
                  style={{ 
                    height: `${Math.max(logoSize * 1.2, 50)}px`,
                    maxHeight: '100px',
                    width: 'auto'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer and Company Info in 2-Column Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Customer Info - Left Column */}
        <div>
          <div className="font-semibold mb-2">Rechnungsempfänger:</div>
          <div className="font-medium">{customerName}</div>
          <div className="text-gray-600 mt-1">
            <div>{customerAddressParsed.street}</div>
            <div>{customerAddressParsed.postalCode} {customerAddressParsed.city}</div>
            <div>{customerAddressParsed.country}</div>
          </div>
          {customerVatId && <div className="text-gray-600 mt-1">USt-IdNr.: {customerVatId}</div>}
          {customerOrderNumber && <div className="text-gray-600">Bestellnummer: {customerOrderNumber}</div>}
        </div>
        
        {/* Invoice Details - Right Column */}
        <div>
          <div className="font-semibold mb-2">Rechnungsdetails:</div>
          <div className="space-y-1">
            <div>Nr. {invoiceNumber}</div>
            <div>Lfd. Nr.: {sequentialNumber}</div>
            <div>Rechnungsdatum: {formatDate(invoiceDate)}</div>
            <div>Fälligkeitsdatum: {formatDate(dueDate)}</div>
            <div>Zahlungsziel: {paymentTerms}</div>
            {servicePeriod && servicePeriod.trim() !== '' ? (
              <div>Leistungszeitraum: {servicePeriod}</div>
            ) : deliveryDate ? (
              <div>Lieferdatum: {formatDate(deliveryDate)}</div>
            ) : null}
            {deliveryTerms && <div>Lieferbedingungen: {deliveryTerms}</div>}
            {internalContactPerson && <div>Kontaktperson: {internalContactPerson}</div>}
            {currency && currency !== 'EUR' && <div>Währung: {currency}</div>}
          </div>
        </div>
      </div>

      {/* Trennlinie */}
      <div className="border-t-2 mb-8" style={{ borderColor: '#14ad9f' }}></div>

      {/* Kopftext / Header-Text - Nach dem Vorbild des ProfessionalBusinessTemplate */
      (headTextHtml || description || introText || headerText) && (
        <div className="mb-8">
          <div
            className="text-base text-gray-800 whitespace-pre-line"
            style={{ wordBreak: 'break-word' }}
          >
            {headTextHtml && (
              <div dangerouslySetInnerHTML={{ __html: headTextHtml }} />
            )}
            {!headTextHtml && description && (
              <div dangerouslySetInnerHTML={{ __html: description }} />
            )}
            {!headTextHtml && !description && introText && (
              <div dangerouslySetInnerHTML={{ __html: introText }} />
            )}
            {!headTextHtml && !description && !introText && headerText && (
              <div dangerouslySetInnerHTML={{ __html: headerText }} />
            )}
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="mb-8">
        {(() => {
          // Prüfe ob irgendein Item einen Rabatt hat
          const hasAnyDiscount = realItems.some(item => (item as any).discountPercent > 0);
          
          return (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#F4F2E5' }}>
                  <th className="border p-3 text-left">Beschreibung</th>
                  <th className="border p-3 text-center">Menge</th>
                  <th className="border p-3 text-right">Einzelpreis</th>
                  {hasAnyDiscount && <th className="border p-3 text-right">Rabatt %</th>}
                  <th className="border p-3 text-right">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                {realItems.map((item, index) => {
                  const discountPercent = (item as any).discountPercent || 0;
                  const hasDiscount = discountPercent > 0;
                  const originalPrice = item.unitPrice;
                  const discountedPrice = hasDiscount ? originalPrice * (1 - discountPercent / 100) : originalPrice;
                  const totalWithDiscount = hasDiscount ? discountedPrice * item.quantity : item.total;
                  
                  return (
                    <tr key={index}>
                      <td className="border p-3">{item.description}</td>
                      <td className="border p-3 text-center">{item.quantity} {(item as any).unit || 'Stk'}</td>
                      <td className="border p-3 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      {hasAnyDiscount && (
                        <td className="border p-3 text-right">
                          {hasDiscount ? (
                            <span className="text-red-600 font-semibold">{discountPercent}%</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}
                      <td className="border p-3 text-right">
                        {hasDiscount ? (
                          <span className="text-red-600 font-semibold">{formatCurrency(totalWithDiscount)}</span>
                        ) : (
                          <span className={item.category === 'discount' ? 'text-red-600 font-semibold' : ''}>{formatCurrency(item.total)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>      
      
      {/* Nebeneinander: Steuerliche Infos links, Gesamtbetrag rechts */}
      <div className="flex justify-between items-start mb-8 gap-8">
        {/* Linke Spalte: Steuerliche Informationen */}
        <div className="flex-1 space-y-4">
          {/* Tax Rule Information */}
          {taxRule && (
            <div className="p-3">
              <div className="font-semibold text-sm text-gray-800 mb-1">Steuerliche Behandlung:</div>
              <div className="text-xs text-gray-700">
                {(() => {
                  const taxRuleLabels = {
                    'DE_TAXABLE': 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
                    'DE_TAXABLE_REDUCED': 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
                    'DE_EXEMPT_4_USTG': 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
                    'DE_REVERSE_13B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
                    'EU_REVERSE_18B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
                    'EU_INTRACOMMUNITY_SUPPLY': 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
                    'EU_OSS': 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
                    'NON_EU_EXPORT': 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
                    'NON_EU_OUT_OF_SCOPE': 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)'
                  };
                  return taxRuleLabels[taxRule as keyof typeof taxRuleLabels] || taxRule;
                })()} 
              </div>
            </div>
          )}




        </div>

        {/* Rechte Spalte: Gesamtbetrag */}
        <div className="w-64 flex-shrink-0">
          <div className="flex justify-between py-2">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>MwSt. ({vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg border-t">
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {/* Skonto-Berechnung */}
          {skontoEnabled && skontoDays && skontoPercentage && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="flex justify-between py-1 text-sm text-green-700">
                <span>Skonto ({skontoPercentage}%):</span>
                <span>-{formatCurrency(total * (skontoPercentage / 100))}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-green-800 border-t border-green-200">
                <span>Bei Zahlung bis {(() => {
                  const skontoDate = new Date();
                  skontoDate.setDate(skontoDate.getDate() + skontoDays);
                  return skontoDate.toLocaleDateString('de-DE');
                })()}:</span>
                <span>{formatCurrency(total - (total * (skontoPercentage / 100)))}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Details */}
      {((bankDetails as any).iban || (bankDetails as any).bic) && (
        <div className="mt-8 p-4 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Bankverbindung:</div>
          <div className="text-sm space-y-1">
            {(bankDetails as any).accountHolder && <div>Kontoinhaber: {(bankDetails as any).accountHolder}</div>}
            {(bankDetails as any).iban && <div>IBAN: {(bankDetails as any).iban}</div>}
            {(bankDetails as any).bic && <div>BIC: {(bankDetails as any).bic}</div>}
            {(bankDetails as any).bankName && <div>Bank: {(bankDetails as any).bankName}</div>}
          </div>
        </div>
      )}

      {/* Footer Text mit Platzhalter-Ersetzung */}
      {footerText && (
        <div className="mb-2 p-2 bg-gray-50 rounded">
          <div
            className="text-xs text-gray-700 leading-normal"
            dangerouslySetInnerHTML={{
              __html: footerText
                .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(total))
                .replace(/\[%RECHNUNGSNUMMER%\]/g, invoiceNumber)
                .replace(/\[%ZAHLUNGSZIEL%\]/g, paymentTerms || '')
                .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(invoiceDate))
                .replace(
                  /\[%KONTAKTPERSON%\]/g,
                  contactPersonName || internalContactPerson || companyName || ''
                )
                .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
                .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                .replace(/Vielen Dank/g, '<br>Vielen Dank')
                .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen'),
            }}
          />
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold text-sm text-yellow-800 mb-1">Hinweise:</div>
          <div className="text-xs text-yellow-700">{notes}</div>
        </div>
      )}

      {/* Professional Footer with Pipe Separators - Mit Debug-Ausgabe */}
      <div className="mt-8 pt-4">
        {(() => {
          // DEBUG: Zeige alle verfügbaren Daten im document
          console.log('🔍 [PDF FOOTER DEBUG] Available document data:', {
            documentKeys: Object.keys(document),
            document: document,
            step1: (document as any).step1,
            step2: (document as any).step2,
            step3: (document as any).step3,
            step4: (document as any).step4,
            vatId: (document as any).vatId,
            taxNumber: (document as any).taxNumber,
            website: (document as any).website,
            companyWebsiteForBackend: (document as any).companyWebsiteForBackend,
            registrationNumber: (document as any).registrationNumber,
            districtCourt: (document as any).districtCourt,
            legalForm: (document as any).legalForm,
            phoneNumber: (document as any).phoneNumber
          });
          return null;
        })()}
        <InvoiceFooter 
          data={{
            // === ECHTE DATENBANK-FELDER AUS DER COMPANIES COLLECTION ===
            
            companyName: (document as any).companyName || 'Mietkoch Andy',
            phoneNumber: (document as any).phoneNumber || '+4901605979000',
            email: (document as any).contactEmail || 'a.staudinger32@icloud.com',
            website: (document as any).companyWebsiteForBackend || (document as any).website || 'https://taskilo.de',
            vatId: (document as any).vatId || 'DE123456789',
            taxNumber: (document as any).taxNumber || 'test12345678',
            companyRegister: (document as any).registrationNumber || 'HRB12345',
            
            // Bankdaten aus step4
            iban: (document as any).step4?.iban || 'DE89370400440532013000',
            bic: (document as any).step4?.bic || 'CDBXXSDE',
            
            // Erweiterte Firmendaten aus steps
            companySuffix: (document as any).step2?.companySuffix || 'e.K',
            legalForm: (document as any).legalForm || (document as any).step2?.legalForm || 'GmbH',
            districtCourt: (document as any).districtCourt || (document as any).step3?.districtCourt || 'Köln',
            managingDirectors: (document as any).step1?.managingDirectors || [],
            firstName: (document as any).step1?.personalData?.firstName || 'andy',
            lastName: (document as any).step1?.personalData?.lastName || 'staudinger',
            
            // Adressdaten
            companyStreet: (document as any).companyStreet || 'Siedlung am Wald',
            companyHouseNumber: (document as any).companyHouseNumber || '6',
            companyPostalCode: (document as any).companyPostalCode || '18586',
            companyCity: (document as any).companyCity || 'Sellin',
            
            // Step-basierte Daten (vollständig)
            step1: (document as any).step1,
            step2: (document as any).step2,  
            step4: (document as any).step4
          }} 
        />
      </div>
    </div>
  );

  const renderNeutralTemplate = () => (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Simple Header - Feste Höhe für Logo-Stabilität */}
      <div className="border-b-2 border-gray-300 pb-6 mb-8" style={{ minHeight: companyLogo ? '120px' : '80px' }}>
        <div className="flex justify-between items-start">
          {/* Firmenlogo links */}
          <div className="flex-shrink-0">
            {companyLogo && (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-16 w-auto object-contain"
                style={{ maxHeight: `${logoSize}px` }}
              />
            )}
            <h1 className="text-2xl font-medium mb-2 mt-4">{documentLabel}</h1>
            <p className="text-gray-700">Nr. {invoiceNumber}</p>
          </div>
          
          {/* Firmendaten rechts */}
          <div className="text-right text-xs text-gray-700 leading-relaxed">
            <div className="font-bold text-lg text-gray-900">{companyName}</div>
            {companyAddressParsed.street && <div>{companyAddressParsed.street}</div>}
            {(companyAddressParsed.postalCode || companyAddressParsed.city) && (
              <div>{companyAddressParsed.postalCode} {companyAddressParsed.city}</div>
            )}
            {companyAddressParsed.country && <div>{companyAddressParsed.country}</div>}
            {companyPhone && <div>Tel.: {companyPhone}</div>}
            {companyEmail && <div>E-Mail: {companyEmail}</div>}
            {companyWebsite && <div>Web: {companyWebsite}</div>}
          </div>
        </div>
      </div>

      {/* Customer and Document Info in 2-Column Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Kundendaten links */}
        <div>
          <div className="font-semibold mb-2">Rechnungsempfänger:</div>
          <div className="space-y-1">
            <div className="font-medium">{customerName}</div>
            {customerAddressParsed.street && <div>{customerAddressParsed.street}</div>}
            {(customerAddressParsed.postalCode || customerAddressParsed.city) && (
              <div>{customerAddressParsed.postalCode} {customerAddressParsed.city}</div>
            )}
            {customerAddressParsed.country && <div>{customerAddressParsed.country}</div>}
            {customerEmail && <div>E-Mail: {customerEmail}</div>}
            {customerPhone && <div>Tel.: {customerPhone}</div>}
            {customerNumber && <div>Kundennummer: {customerNumber}</div>}
            {customerVatId && <div>USt-IdNr.: {customerVatId}</div>}
          </div>
        </div>

        {/* Rechnungsdetails rechts */}
        <div>
          <div className="font-semibold mb-2">Rechnungsdetails:</div>
          <div className="space-y-1">
            <div>Nr. {invoiceNumber}</div>
            <div>Lfd. Nr.: {sequentialNumber}</div>
            <div>Rechnungsdatum: {formatDate(invoiceDate)}</div>
            <div>Fälligkeitsdatum: {formatDate(dueDate)}</div>
            <div>Zahlungsziel: {paymentTerms}</div>
            {servicePeriod && servicePeriod.trim() !== '' ? (
              <div>Leistungszeitraum: {servicePeriod}</div>
            ) : deliveryDate ? (
              <div>Lieferdatum: {formatDate(deliveryDate)}</div>
            ) : null}
            {deliveryTerms && <div>Lieferbedingungen: {deliveryTerms}</div>}
            {internalContactPerson && <div>Kontaktperson: {internalContactPerson}</div>}
            {currency && currency !== 'EUR' && <div>Währung: {currency}</div>}
          </div>
        </div>
      </div>

      {/* Trennlinie */}
      <div className="border-t-2 mb-8" style={{ borderColor: '#14ad9f' }}></div>

      {/* Kopftext / Header-Text */}
      {(headTextHtml || description || introText || headerText) && (
        <div className="mb-8">
          <div
            className="text-base text-gray-800 whitespace-pre-line"
            dangerouslySetInnerHTML={{
              __html: headTextHtml || description || introText || headerText || '',
            }}
          />
        </div>
      )}

      {/* Items Table */}
      <div className="mb-8">
        {(() => {
          if (!realItems || realItems.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                Keine Positionen vorhanden
              </div>
            );
          }

          return (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2" style={{ borderColor: '#14ad9f' }}>
                  <th className="text-left py-2 px-2 font-semibold">Pos.</th>
                  <th className="text-left py-2 px-2 font-semibold">Beschreibung</th>
                  <th className="text-right py-2 px-2 font-semibold">Menge</th>
                  <th className="text-right py-2 px-2 font-semibold">Einzelpreis</th>
                  {realItems.some(item => (item as any).discountPercent > 0) && (
                    <th className="text-right py-2 px-2 font-semibold">Rabatt</th>
                  )}
                  <th className="text-right py-2 px-2 font-semibold">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {realItems.map((item, index) => {
                  const discountPercent = (item as any).discountPercent || 0;
                  const originalTotal = item.total || (item.unitPrice * item.quantity);
                  const discountedTotal = discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
                  const hasAnyDiscount = realItems.some(item => (item as any).discountPercent > 0);
                  
                  return (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-2 text-sm">{index + 1}</td>
                      <td className="py-3 px-2 text-sm">
                        <div className="font-medium">{item.description}</div>
                        {(item as any).unit && (
                          <div className="text-xs text-gray-500">Einheit: {(item as any).unit}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 px-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                      {hasAnyDiscount && (
                        <td className="py-3 px-2 text-sm text-right text-red-600">
                          {discountPercent > 0 ? `-${discountPercent}%` : ''}
                        </td>
                      )}
                      <td className="py-3 px-2 text-sm text-right font-medium">{formatCurrency(discountedTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>
      
      {/* Nebeneinander: Steuerliche Infos links, Gesamtbetrag rechts */}
      <div className="flex justify-between items-start mb-8 gap-8">
        {/* Linke Spalte: Steuerliche Informationen */}
        <div className="flex-1 space-y-4">
          {/* Tax Rule Information */}
          {taxRule && (
            <div className="p-3">
              <div className="font-semibold text-sm text-gray-800 mb-1">Steuerliche Behandlung:</div>
              <div className="text-xs text-gray-700">
                {(() => {
                  const taxRuleLabels = {
                    'DE_TAXABLE': 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
                    'DE_TAXABLE_REDUCED': 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
                    'DE_EXEMPT_4_USTG': 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
                    'DE_REVERSE_13B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
                    'EU_REVERSE_18B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
                    'EU_INTRACOMMUNITY_SUPPLY': 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
                    'EU_OSS': 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
                    'NON_EU_EXPORT': 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
                    'NON_EU_OUT_OF_SCOPE': 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)'
                  };
                  return taxRuleLabels[taxRule as keyof typeof taxRuleLabels] || taxRule;
                })()} 
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Gesamtbetrag */}
        <div className="w-64 flex-shrink-0">
          <div className="flex justify-between py-2">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>MwSt. ({vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg border-t">
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {/* Skonto-Berechnung */}
          {skontoEnabled && skontoDays && skontoPercentage && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="flex justify-between py-1 text-sm text-green-700">
                <span>Skonto ({skontoPercentage}%):</span>
                <span>-{formatCurrency(total * (skontoPercentage / 100))}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-green-800 border-t border-green-200">
                <span>Bei Zahlung bis {(() => {
                  const skontoDate = new Date();
                  skontoDate.setDate(skontoDate.getDate() + skontoDays);
                  return skontoDate.toLocaleDateString('de-DE');
                })()}:</span>
                <span>{formatCurrency(total - (total * (skontoPercentage / 100)))}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Details */}
      {((bankDetails as any).iban || (bankDetails as any).bic) && (
        <div className="mt-8 p-4 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Bankverbindung:</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {(bankDetails as any).iban && (
              <div>
                <span className="font-medium">IBAN:</span> {(bankDetails as any).iban}
              </div>
            )}
            {(bankDetails as any).bic && (
              <div>
                <span className="font-medium">BIC:</span> {(bankDetails as any).bic}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Text mit Platzhalter-Ersetzung */}
      {footerText && (
        <div className="mb-2 p-2 bg-gray-50 rounded">
          <div
            className="text-xs text-gray-700 leading-normal"
            dangerouslySetInnerHTML={{
              __html: footerText
                .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(total))
                .replace(/\[%RECHNUNGSNUMMER%\]/g, invoiceNumber)
                .replace(/\[%ZAHLUNGSZIEL%\]/g, paymentTerms || '')
                .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(invoiceDate))
                .replace(
                  /\[%KONTAKTPERSON%\]/g,
                  contactPersonName || internalContactPerson || companyName || ''
                )
                .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
                .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                .replace(/Vielen Dank/g, '<br>Vielen Dank')
                .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen'),
            }}
          />
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold mb-1">Hinweise:</div>
          <div className="text-sm text-gray-700 whitespace-pre-line">{notes}</div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="mt-8 pt-4">
        <InvoiceFooter 
          data={{
            companyName: (document as any).companyName || 'Mietkoch Andy',
            phoneNumber: (document as any).phoneNumber || '+4901605979000',
            email: (document as any).contactEmail || 'a.staudinger32@icloud.com',
            website: (document as any).companyWebsiteForBackend || (document as any).website || 'https://taskilo.de',
            vatId: (document as any).vatId || 'DE123456789',
            taxNumber: (document as any).taxNumber || 'test12345678',
            companyRegister: (document as any).registrationNumber || 'HRB12345',
            iban: (document as any).step4?.iban || 'DE89370400440532013000',
            bic: (document as any).step4?.bic || 'CDBXXSDE',
            companySuffix: (document as any).step2?.companySuffix || 'e.K',
            legalForm: (document as any).legalForm || (document as any).step2?.legalForm || 'GmbH',
            districtCourt: (document as any).districtCourt || (document as any).step3?.districtCourt || 'Köln',
            managingDirectors: (document as any).step1?.managingDirectors || [],
            firstName: (document as any).step1?.personalData?.firstName || 'andy',
            lastName: (document as any).step1?.personalData?.lastName || 'staudinger',
            companyStreet: (document as any).companyStreet || 'Siedlung am Wald',
            companyHouseNumber: (document as any).companyHouseNumber || '6',
            companyPostalCode: (document as any).companyPostalCode || '18586',
            companyCity: (document as any).companyCity || 'Sellin',
            step1: (document as any).step1,
            step2: (document as any).step2,  
            step4: (document as any).step4
          }} 
        />
      </div>
    </div>
  );

  const renderElegantTemplate = () => (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6 text-xs" style={{ fontFamily: 'Georgia, serif' }}>
      {/* Elegant Header with decorative elements */}
      <div className="relative mb-8" style={{ minHeight: companyLogo ? '160px' : '120px' }}>
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />
        
        <div className="flex justify-between items-start pt-6">
          {/* Firmenlogo links */}
          <div className="flex-shrink-0">
            {companyLogo && (
              <div className="relative">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-20 w-auto object-contain"
                  style={{ maxHeight: `${logoSize}px` }}
                />
                <div className="absolute -bottom-2 left-0 w-16 h-0.5" style={{ backgroundColor: color }} />
              </div>
            )}
          </div>
          
          {/* Firmendaten rechts mit eleganter Typografie */}
          <div className="text-right">
            <div className="font-light text-2xl text-gray-900 mb-2">{companyName}</div>
            <div className="text-xs text-gray-600 leading-relaxed space-y-1">
              {companyAddressParsed.street && <div>{companyAddressParsed.street}</div>}
              {(companyAddressParsed.postalCode || companyAddressParsed.city) && (
                <div>{companyAddressParsed.postalCode} {companyAddressParsed.city}</div>
              )}
              {companyAddressParsed.country && <div>{companyAddressParsed.country}</div>}
              <div className="mt-3 space-y-1">
                {companyPhone && <div>Telefon {companyPhone}</div>}
                {companyEmail && <div>{companyEmail}</div>}
                {companyWebsite && <div>{companyWebsite}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="absolute bottom-0 left-0">
          <div className="font-light text-3xl" style={{ color }}>{documentLabel}</div>
          <div className="w-20 h-0.5 mt-1" style={{ backgroundColor: color }} />
        </div>
      </div>

      {/* Customer and Document Info */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        {/* Kundendaten links */}
        <div>
          <div className="font-light text-lg mb-4" style={{ color }}>Rechnungsempfänger</div>
          <div className="space-y-2">
            <div className="font-medium text-lg">{customerName}</div>
            {customerAddressParsed.street && <div>{customerAddressParsed.street}</div>}
            {(customerAddressParsed.postalCode || customerAddressParsed.city) && (
              <div>{customerAddressParsed.postalCode} {customerAddressParsed.city}</div>
            )}
            {customerAddressParsed.country && <div>{customerAddressParsed.country}</div>}
            <div className="mt-4 space-y-1 text-sm">
              {customerEmail && <div>E-Mail: {customerEmail}</div>}
              {customerPhone && <div>Telefon: {customerPhone}</div>}
              {customerNumber && <div>Kundennummer: {customerNumber}</div>}
              {customerVatId && <div>USt-IdNr.: {customerVatId}</div>}
            </div>
          </div>
        </div>

        {/* Rechnungsdetails rechts */}
        <div>
          <div className="font-light text-lg mb-4" style={{ color }}>Rechnungsdetails</div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-600">Nummer:</div>
              <div className="font-medium">{invoiceNumber}</div>
              <div className="text-gray-600">Lfd. Nr.:</div>
              <div className="font-medium">{sequentialNumber}</div>
              <div className="text-gray-600">Datum:</div>
              <div>{formatDate(invoiceDate)}</div>
              <div className="text-gray-600">Fällig am:</div>
              <div>{formatDate(dueDate)}</div>
              <div className="text-gray-600">Zahlungsziel:</div>
              <div>{paymentTerms}</div>
              {servicePeriod && servicePeriod.trim() !== '' ? (
                <>
                  <div className="text-gray-600">Leistungszeitraum:</div>
                  <div>{servicePeriod}</div>
                </>
              ) : deliveryDate ? (
                <>
                  <div className="text-gray-600">Lieferdatum:</div>
                  <div>{formatDate(deliveryDate)}</div>
                </>
              ) : null}
              {deliveryTerms && (
                <>
                  <div className="text-gray-600">Lieferbedingungen:</div>
                  <div>{deliveryTerms}</div>
                </>
              )}
              {internalContactPerson && (
                <>
                  <div className="text-gray-600">Kontaktperson:</div>
                  <div>{internalContactPerson}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative separator */}
      <div className="flex items-center mb-8">
        <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
        <div className="mx-4">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
      </div>

      {/* Kopftext mit eleganter Typografie */}
      {(headTextHtml || description || introText || headerText) && (
        <div className="mb-8">
          <div
            className="text-base text-gray-800 leading-relaxed italic"
            dangerouslySetInnerHTML={{
              __html: headTextHtml || description || introText || headerText || '',
            }}
          />
        </div>
      )}

      {/* Items Table mit eleganter Formatierung */}
      <div className="mb-8">
        {(() => {
          if (!realItems || realItems.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                Keine Positionen vorhanden
              </div>
            );
          }

          return (
            <div className="relative">
              <div className="absolute -inset-1 border" style={{ borderColor: color, opacity: 0.2 }} />
              <table className="w-full bg-white relative">
                <thead>
                  <tr style={{ backgroundColor: color }}>
                    <th className="text-white py-4 px-3 text-left font-light">Pos.</th>
                    <th className="text-white py-4 px-3 text-left font-light">Beschreibung</th>
                    <th className="text-white py-4 px-3 text-right font-light">Menge</th>
                    <th className="text-white py-4 px-3 text-right font-light">Einzelpreis</th>
                    {realItems.some(item => (item as any).discountPercent > 0) && (
                      <th className="text-white py-4 px-3 text-right font-light">Rabatt</th>
                    )}
                    <th className="text-white py-4 px-3 text-right font-light">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {realItems.map((item, index) => {
                    const discountPercent = (item as any).discountPercent || 0;
                    const originalTotal = item.total || (item.unitPrice * item.quantity);
                    const discountedTotal = discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
                    const hasAnyDiscount = realItems.some(item => (item as any).discountPercent > 0);
                    const isEven = index % 2 === 0;
                    
                    return (
                      <tr key={index} className={`${isEven ? 'bg-gray-50' : 'bg-white'} border-b border-gray-200`}>
                        <td className="py-4 px-3 text-sm">{index + 1}</td>
                        <td className="py-4 px-3 text-sm">
                          <div className="font-medium">{item.description}</div>
                          {(item as any).unit && (
                            <div className="text-xs text-gray-500">Einheit: {(item as any).unit}</div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-sm text-right">{item.quantity}</td>
                        <td className="py-4 px-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                        {hasAnyDiscount && (
                          <td className="py-4 px-3 text-sm text-right text-red-600">
                            {discountPercent > 0 ? `-${discountPercent}%` : ''}
                          </td>
                        )}
                        <td className="py-4 px-3 text-sm text-right font-medium">{formatCurrency(discountedTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Totals und Steuerinformationen */}
      <div className="flex justify-between items-start mb-8 gap-8">
        {/* Steuerliche Informationen */}
        <div className="flex-1">
          {taxRule && (
            <div className="bg-gray-50 p-4 rounded border-l-4" style={{ borderColor: color }}>
              <div className="font-medium text-sm mb-2" style={{ color }}>Steuerliche Behandlung</div>
              <div className="text-xs text-gray-700">
                {(() => {
                  const taxRuleLabels = {
                    'DE_TAXABLE': 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
                    'DE_TAXABLE_REDUCED': 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
                    'DE_EXEMPT_4_USTG': 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
                    'DE_REVERSE_13B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
                    'EU_REVERSE_18B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
                    'EU_INTRACOMMUNITY_SUPPLY': 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
                    'EU_OSS': 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
                    'NON_EU_EXPORT': 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
                    'NON_EU_OUT_OF_SCOPE': 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)'
                  };
                  return taxRuleLabels[taxRule as keyof typeof taxRuleLabels] || taxRule;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Gesamtbetrag */}
        <div className="w-80">
          <div className="bg-gray-50 p-6 rounded border" style={{ borderColor: color }}>
            <div className="space-y-3">
              <div className="flex justify-between py-1 text-sm">
                <span>Zwischensumme:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span>MwSt. ({vatRate}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="border-t-2 pt-3" style={{ borderColor: color }}>
                <div className="flex justify-between py-1">
                  <span className="font-light text-xl">Gesamtbetrag:</span>
                  <span className="font-light text-xl" style={{ color }}>{formatCurrency(total)}</span>
                </div>
              </div>
              {skontoEnabled && skontoDays && skontoPercentage && (
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="flex justify-between py-1 text-sm text-green-700">
                    <span>Skonto ({skontoPercentage}%):</span>
                    <span>-{formatCurrency(total * (skontoPercentage / 100))}</span>
                  </div>
                  <div className="flex justify-between py-1 font-medium text-green-800">
                    <span>Bei Zahlung bis {(() => {
                      const skontoDate = new Date();
                      skontoDate.setDate(skontoDate.getDate() + skontoDays);
                      return skontoDate.toLocaleDateString('de-DE');
                    })()}:</span>
                    <span>{formatCurrency(total - (total * (skontoPercentage / 100)))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      {((bankDetails as any).iban || (bankDetails as any).bic) && (
        <div className="mt-8 bg-gray-50 p-4 rounded border-l-4" style={{ borderColor: color }}>
          <div className="font-medium mb-2" style={{ color }}>Bankverbindung</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {(bankDetails as any).iban && (
              <div><span className="font-medium">IBAN:</span> {(bankDetails as any).iban}</div>
            )}
            {(bankDetails as any).bic && (
              <div><span className="font-medium">BIC:</span> {(bankDetails as any).bic}</div>
            )}
          </div>
        </div>
      )}

      {/* Footer Text */}
      {footerText && (
        <div className="mt-8 bg-gray-50 p-4 rounded">
          <div
            className="text-sm text-gray-700 leading-relaxed italic"
            dangerouslySetInnerHTML={{
              __html: footerText
                .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(total))
                .replace(/\[%RECHNUNGSNUMMER%\]/g, invoiceNumber)
                .replace(/\[%ZAHLUNGSZIEL%\]/g, paymentTerms || '')
                .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(invoiceDate))
                .replace(
                  /\[%KONTAKTPERSON%\]/g,
                  contactPersonName || internalContactPerson || companyName || ''
                )
                .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
                .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                .replace(/Vielen Dank/g, '<br>Vielen Dank')
                .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen'),
            }}
          />
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-4 bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
          <div className="font-medium mb-2 text-yellow-800">Hinweise</div>
          <div className="text-sm text-yellow-700 whitespace-pre-line">{notes}</div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="mt-8 pt-6">
        <InvoiceFooter 
          data={{
            companyName: (document as any).companyName || 'Mietkoch Andy',
            phoneNumber: (document as any).phoneNumber || '+4901605979000',
            email: (document as any).contactEmail || 'a.staudinger32@icloud.com',
            website: (document as any).companyWebsiteForBackend || (document as any).website || 'https://taskilo.de',
            vatId: (document as any).vatId || 'DE123456789',
            taxNumber: (document as any).taxNumber || 'test12345678',
            companyRegister: (document as any).registrationNumber || 'HRB12345',
            iban: (document as any).step4?.iban || 'DE89370400440532013000',
            bic: (document as any).step4?.bic || 'CDBXXSDE',
            companySuffix: (document as any).step2?.companySuffix || 'e.K',
            legalForm: (document as any).legalForm || (document as any).step2?.legalForm || 'GmbH',
            districtCourt: (document as any).districtCourt || (document as any).step3?.districtCourt || 'Köln',
            managingDirectors: (document as any).step1?.managingDirectors || [],
            firstName: (document as any).step1?.personalData?.firstName || 'andy',
            lastName: (document as any).step1?.personalData?.lastName || 'staudinger',
            companyStreet: (document as any).companyStreet || 'Siedlung am Wald',
            companyHouseNumber: (document as any).companyHouseNumber || '6',
            companyPostalCode: (document as any).companyPostalCode || '18586',
            companyCity: (document as any).companyCity || 'Sellin',
            step1: (document as any).step1,
            step2: (document as any).step2,  
            step4: (document as any).step4
          }} 
        />
      </div>
    </div>
  );

  const renderTechnicalTemplate = () => (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6 text-xs font-mono" style={{ fontFamily: 'Courier New, monospace' }}>
      {/* Technical Header - Feste Höhe für Logo-Stabilität */}
      <div className="border border-gray-400 p-4 mb-8" style={{ minHeight: companyLogo ? '140px' : '100px' }}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Logo Container mit fester Höhe */}
            {companyLogo && (
              <div className="mb-4">
                <img 
                  src={companyLogo} 
                  alt={companyName}
                  className="h-16 w-auto object-contain"
                  style={{ maxHeight: `${logoSize}px` }}
                />
              </div>
            )}
            <div className="text-2xl font-bold mb-2">[{documentLabel}]</div>
            <div className="text-gray-600">&gt; ID: {invoiceNumber}</div>
            <div className="text-gray-600">&gt; SEQ: {sequentialNumber}</div>
          </div>
          <div className="text-right flex-shrink-0 text-xs">
            <div className="font-bold">{companyName}</div>
            <div className="text-gray-600">
              {companyAddressParsed.street && <div>// {companyAddressParsed.street}</div>}
              {(companyAddressParsed.postalCode || companyAddressParsed.city) && (
                <div>// {companyAddressParsed.postalCode} {companyAddressParsed.city}</div>
              )}
              {companyAddressParsed.country && <div>// {companyAddressParsed.country}</div>}
              {companyPhone && <div>// TEL: {companyPhone}</div>}
              {companyEmail && <div>// EMAIL: {companyEmail}</div>}
              {companyWebsite && <div>// WEB: {companyWebsite}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Customer Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-100 p-4 border-l-4" style={{ borderColor: color }}>
          <div className="text-xs font-bold mb-2" style={{ color }}>CLIENT_INFO:</div>
          <div className="space-y-1 text-xs">
            <div>NAME: {customerName}</div>
            {customerAddressParsed.street && <div>ADDR: {customerAddressParsed.street}</div>}
            {(customerAddressParsed.postalCode || customerAddressParsed.city) && (
              <div>CITY: {customerAddressParsed.postalCode} {customerAddressParsed.city}</div>
            )}
            {customerAddressParsed.country && <div>COUNTRY: {customerAddressParsed.country}</div>}
            {customerEmail && <div>EMAIL: {customerEmail}</div>}
            {customerPhone && <div>TEL: {customerPhone}</div>}
            {customerNumber && <div>CLIENT_ID: {customerNumber}</div>}
            {customerVatId && <div>VAT_ID: {customerVatId}</div>}
          </div>
        </div>

        <div className="bg-gray-100 p-4 border-l-4" style={{ borderColor: color }}>
          <div className="text-xs font-bold mb-2" style={{ color }}>DOCUMENT_META:</div>
          <div className="space-y-1 text-xs">
            <div>NUM: {invoiceNumber}</div>
            <div>SEQ: {sequentialNumber}</div>
            <div>DATE_CREATED: {formatDate(invoiceDate)}</div>
            <div>DATE_DUE: {formatDate(dueDate)}</div>
            <div>PAYMENT_TERMS: {paymentTerms}</div>
            {servicePeriod && servicePeriod.trim() !== '' ? (
              <div>SERVICE_PERIOD: {servicePeriod}</div>
            ) : deliveryDate ? (
              <div>DELIVERY_DATE: {formatDate(deliveryDate)}</div>
            ) : null}
            {deliveryTerms && <div>DELIVERY_TERMS: {deliveryTerms}</div>}
            {internalContactPerson && <div>CONTACT: {internalContactPerson}</div>}
            {currency && currency !== 'EUR' && <div>CURRENCY: {currency}</div>}
          </div>
        </div>
      </div>

      {/* Trennlinie */}
      <div className="border-t-2 mb-8" style={{ borderColor: '#14ad9f' }}></div>

      {/* Kopftext */}
      {(headTextHtml || description || introText || headerText) && (
        <div className="mb-8 bg-gray-50 p-4">
          <div className="text-xs font-bold mb-2">DESCRIPTION:</div>
          <div
            className="text-sm font-mono whitespace-pre-line"
            dangerouslySetInnerHTML={{
              __html: (headTextHtml || description || introText || headerText || '').replace(/<br>/g, '\n'),
            }}
          />
        </div>
      )}

      {/* Technical Items Table */}
      <div className="mb-8">
        <div className="bg-gray-900 text-white p-2 text-xs font-bold">
          ITEM_LIST [{realItems?.length || 0} ITEMS]
        </div>
        {(() => {
          if (!realItems || realItems.length === 0) {
            return (
              <div className="border border-gray-300 p-4 text-center text-xs font-mono">
                // NO_ITEMS_FOUND
              </div>
            );
          }

          return (
            <table className="w-full border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">IDX</th>
                  <th className="border border-gray-300 p-2 text-left">DESCRIPTION</th>
                  <th className="border border-gray-300 p-2 text-center">QTY</th>
                  <th className="border border-gray-300 p-2 text-right">UNIT_PRICE</th>
                  {realItems.some(item => (item as any).discountPercent > 0) && (
                    <th className="border border-gray-300 p-2 text-right">DISCOUNT</th>
                  )}
                  <th className="border border-gray-300 p-2 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {realItems.map((item, index) => {
                  const discountPercent = (item as any).discountPercent || 0;
                  const originalTotal = item.total || (item.unitPrice * item.quantity);
                  const discountedTotal = discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
                  const hasAnyDiscount = realItems.some(item => (item as any).discountPercent > 0);
                  
                  return (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2">{String(index + 1).padStart(3, '0')}</td>
                      <td className="border border-gray-300 p-2">
                        <div>{item.description}</div>
                        {(item as any).unit && (
                          <div className="text-gray-500">UNIT: {(item as any).unit}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      {hasAnyDiscount && (
                        <td className="border border-gray-300 p-2 text-right text-red-600">
                          {discountPercent > 0 ? `-${discountPercent}%` : 'NONE'}
                        </td>
                      )}
                      <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(discountedTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* Technical Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 font-mono text-xs">
          <div className="bg-gray-100 p-2 border">
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>VAT_19%:</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div 
              className="flex justify-between mt-2 pt-2 border-t-2 font-bold"
              style={{ borderColor: color, color }}
            >
              <span>TOTAL_AMOUNT:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Footer */}
      <div className="text-xs text-gray-500 font-mono pt-4">
        <div>// END_OF_DOCUMENT</div>
        <div>// THANK_YOU_FOR_YOUR_BUSINESS</div>
      </div>
    </div>
  );

  const renderGeometricTemplate = () => (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Geometric Header with shapes */}
      <div className="relative mb-8" style={{ minHeight: companyLogo ? '160px' : '120px' }}>
        {/* Geometric shapes background */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ backgroundColor: color, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
        <div className="absolute top-4 right-4 w-4 h-4 rotate-45" style={{ backgroundColor: color, opacity: 0.3 }} />
        
        <div className="flex justify-between items-start relative z-10">
          {/* Logo und Titel */}
          <div className="flex items-center gap-6">
            {companyLogo && (
              <div className="relative">
                <div className="absolute -inset-2 border-2 rotate-3" style={{ borderColor: color, opacity: 0.3 }} />
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-16 w-auto object-contain relative z-10"
                  style={{ maxHeight: `${logoSize}px` }}
                />
              </div>
            )}
            <div>
              <div className="text-2xl font-bold" style={{ color }}>{documentLabel}</div>
              <div className="text-sm text-gray-600">#{invoiceNumber}</div>
            </div>
          </div>
          
          {/* Firmendaten in geometrischer Box */}
          <div className="relative">
            <div className="absolute -inset-3 border-2 rotate-1" style={{ borderColor: color, opacity: 0.2 }} />
            <div className="bg-white p-4 text-right text-xs relative z-10">
              <div className="font-bold text-base">{companyName}</div>
              {companyAddressParsed.street && <div>{companyAddressParsed.street}</div>}
              {(companyAddressParsed.postalCode || companyAddressParsed.city) && (
                <div>{companyAddressParsed.postalCode} {companyAddressParsed.city}</div>
              )}
              {companyAddressParsed.country && <div>{companyAddressParsed.country}</div>}
              <div className="mt-2 space-y-1">
                {companyPhone && <div>{companyPhone}</div>}
                {companyEmail && <div>{companyEmail}</div>}
                {companyWebsite && <div>{companyWebsite}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer and Document Info in geometric layout */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Kundendaten in geometrischer Box */}
        <div className="relative">
          <div className="absolute -inset-2 border-l-4" style={{ borderColor: color, opacity: 0.3 }} />
          <div className="bg-gray-50 p-6 ml-2">
            <div className="font-bold mb-3" style={{ color }}>Rechnungsempfänger</div>
            <div className="space-y-1">
              <div className="font-medium">{customerName}</div>
              {customerAddressParsed.street && <div>{customerAddressParsed.street}</div>}
              {(customerAddressParsed.postalCode || customerAddressParsed.city) && (
                <div>{customerAddressParsed.postalCode} {customerAddressParsed.city}</div>
              )}
              {customerAddressParsed.country && <div>{customerAddressParsed.country}</div>}
              <div className="mt-3 space-y-1 text-sm">
                {customerEmail && <div>E-Mail: {customerEmail}</div>}
                {customerPhone && <div>Tel.: {customerPhone}</div>}
                {customerNumber && <div>Kundennummer: {customerNumber}</div>}
                {customerVatId && <div>USt-IdNr.: {customerVatId}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Rechnungsdetails in geometrischer Box */}
        <div className="relative">
          <div className="absolute -inset-2 border-r-4" style={{ borderColor: color, opacity: 0.3 }} />
          <div className="bg-gray-50 p-6 mr-2">
            <div className="font-bold mb-3" style={{ color }}>Rechnungsdetails</div>
            <div className="space-y-1 text-sm">
              <div>Nr. {invoiceNumber}</div>
              <div>Lfd. Nr.: {sequentialNumber}</div>
              <div>Rechnungsdatum: {formatDate(invoiceDate)}</div>
              <div>Fälligkeitsdatum: {formatDate(dueDate)}</div>
              <div>Zahlungsziel: {paymentTerms}</div>
              {servicePeriod && servicePeriod.trim() !== '' ? (
                <div>Leistungszeitraum: {servicePeriod}</div>
              ) : deliveryDate ? (
                <div>Lieferdatum: {formatDate(deliveryDate)}</div>
              ) : null}
              {deliveryTerms && <div>Lieferbedingungen: {deliveryTerms}</div>}
              {internalContactPerson && <div>Kontaktperson: {internalContactPerson}</div>}
              {currency && currency !== 'EUR' && <div>Währung: {currency}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Geometric separator */}
      <div className="flex items-center justify-center mb-8">
        <div className="w-8 h-8 rotate-45" style={{ backgroundColor: color, opacity: 0.2 }} />
        <div className="flex-1 h-px mx-4" style={{ backgroundColor: color, opacity: 0.3 }} />
        <div className="w-4 h-4 rotate-45" style={{ backgroundColor: color, opacity: 0.4 }} />
        <div className="flex-1 h-px mx-4" style={{ backgroundColor: color, opacity: 0.3 }} />
        <div className="w-8 h-8 rotate-45" style={{ backgroundColor: color, opacity: 0.2 }} />
      </div>

      {/* Kopftext */}
      {(headTextHtml || description || introText || headerText) && (
        <div className="mb-8 relative">
          <div className="absolute -left-4 top-0 w-1 h-full" style={{ backgroundColor: color, opacity: 0.3 }} />
          <div className="pl-6">
            <div
              className="text-base text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: headTextHtml || description || introText || headerText || '',
              }}
            />
          </div>
        </div>
      )}

      {/* Items Table mit geometrischem Design */}
      <div className="mb-8">
        {(() => {
          if (!realItems || realItems.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                Keine Positionen vorhanden
              </div>
            );
          }

          return (
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: color }}>
                  <th className="text-white py-3 px-2 text-left font-semibold">Pos.</th>
                  <th className="text-white py-3 px-2 text-left font-semibold">Beschreibung</th>
                  <th className="text-white py-3 px-2 text-right font-semibold">Menge</th>
                  <th className="text-white py-3 px-2 text-right font-semibold">Einzelpreis</th>
                  {realItems.some(item => (item as any).discountPercent > 0) && (
                    <th className="text-white py-3 px-2 text-right font-semibold">Rabatt</th>
                  )}
                  <th className="text-white py-3 px-2 text-right font-semibold">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {realItems.map((item, index) => {
                  const discountPercent = (item as any).discountPercent || 0;
                  const originalTotal = item.total || (item.unitPrice * item.quantity);
                  const discountedTotal = discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
                  const hasAnyDiscount = realItems.some(item => (item as any).discountPercent > 0);
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr key={index} className={isEven ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-3 px-2 text-sm">{index + 1}</td>
                      <td className="py-3 px-2 text-sm">
                        <div className="font-medium">{item.description}</div>
                        {(item as any).unit && (
                          <div className="text-xs text-gray-500">Einheit: {(item as any).unit}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 px-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                      {hasAnyDiscount && (
                        <td className="py-3 px-2 text-sm text-right text-red-600">
                          {discountPercent > 0 ? `-${discountPercent}%` : ''}
                        </td>
                      )}
                      <td className="py-3 px-2 text-sm text-right font-medium">{formatCurrency(discountedTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* Totals mit geometrischem Design */}
      <div className="flex justify-between items-start mb-8 gap-8">
        {/* Steuerliche Informationen */}
        <div className="flex-1">
          {taxRule && (
            <div className="relative">
              <div className="absolute -left-2 top-0 w-1 h-full" style={{ backgroundColor: color, opacity: 0.3 }} />
              <div className="pl-4">
                <div className="font-semibold text-sm mb-2" style={{ color }}>Steuerliche Behandlung</div>
                <div className="text-xs text-gray-700">
                  {(() => {
                    const taxRuleLabels = {
                      'DE_TAXABLE': 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
                      'DE_TAXABLE_REDUCED': 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
                      'DE_EXEMPT_4_USTG': 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
                      'DE_REVERSE_13B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
                      'EU_REVERSE_18B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
                      'EU_INTRACOMMUNITY_SUPPLY': 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
                      'EU_OSS': 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
                      'NON_EU_EXPORT': 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
                      'NON_EU_OUT_OF_SCOPE': 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)'
                    };
                    return taxRuleLabels[taxRule as keyof typeof taxRuleLabels] || taxRule;
                  })()} 
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gesamtbetrag in geometrischer Box */}
        <div className="w-80 relative">
          <div className="absolute -inset-3 border-2 rotate-1" style={{ borderColor: color, opacity: 0.2 }} />
          <div className="bg-gray-50 p-6 relative">
            <div className="space-y-3">
              <div className="flex justify-between py-1">
                <span>Zwischensumme:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>MwSt. ({vatRate}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="border-t-2 pt-3" style={{ borderColor: color }}>
                <div className="flex justify-between py-1">
                  <span className="font-bold text-lg">Gesamtbetrag:</span>
                  <span className="font-bold text-xl" style={{ color }}>{formatCurrency(total)}</span>
                </div>
              </div>
              {skontoEnabled && skontoDays && skontoPercentage && (
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="flex justify-between py-1 text-sm text-green-700">
                    <span>Skonto ({skontoPercentage}%):</span>
                    <span>-{formatCurrency(total * (skontoPercentage / 100))}</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-green-800">
                    <span>Bei Zahlung bis {(() => {
                      const skontoDate = new Date();
                      skontoDate.setDate(skontoDate.getDate() + skontoDays);
                      return skontoDate.toLocaleDateString('de-DE');
                    })()}:</span>
                    <span>{formatCurrency(total - (total * (skontoPercentage / 100)))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      {((bankDetails as any).iban || (bankDetails as any).bic) && (
        <div className="mt-8 relative">
          <div className="absolute -inset-2 border-l-4" style={{ borderColor: color, opacity: 0.3 }} />
          <div className="bg-gray-50 p-4 ml-2">
            <div className="font-semibold mb-2" style={{ color }}>Bankverbindung</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(bankDetails as any).iban && (
                <div><span className="font-medium">IBAN:</span> {(bankDetails as any).iban}</div>
              )}
              {(bankDetails as any).bic && (
                <div><span className="font-medium">BIC:</span> {(bankDetails as any).bic}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Text */}
      {footerText && (
        <div className="mt-8 relative">
          <div className="absolute -left-4 top-0 w-1 h-full" style={{ backgroundColor: color, opacity: 0.3 }} />
          <div className="pl-6 bg-gray-50 p-4">
            <div
              className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: footerText
                  .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(total))
                  .replace(/\[%RECHNUNGSNUMMER%\]/g, invoiceNumber)
                  .replace(/\[%ZAHLUNGSZIEL%\]/g, paymentTerms || '')
                  .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(invoiceDate))
                  .replace(
                    /\[%KONTAKTPERSON%\]/g,
                    contactPersonName || internalContactPerson || companyName || ''
                  )
                  .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
                  .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                  .replace(/Vielen Dank/g, '<br>Vielen Dank')
                  .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen'),
              }}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-4 relative">
          <div className="absolute -inset-2 border-l-4 border-yellow-400" />
          <div className="bg-yellow-50 p-4 ml-2">
            <div className="font-semibold mb-2 text-yellow-800">Hinweise</div>
            <div className="text-sm text-yellow-700 whitespace-pre-line">{notes}</div>
          </div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="mt-8 pt-6">
        <InvoiceFooter 
          data={{
            companyName: (document as any).companyName || 'Mietkoch Andy',
            phoneNumber: (document as any).phoneNumber || '+4901605979000',
            email: (document as any).contactEmail || 'a.staudinger32@icloud.com',
            website: (document as any).companyWebsiteForBackend || (document as any).website || 'https://taskilo.de',
            vatId: (document as any).vatId || 'DE123456789',
            taxNumber: (document as any).taxNumber || 'test12345678',
            companyRegister: (document as any).registrationNumber || 'HRB12345',
            iban: (document as any).step4?.iban || 'DE89370400440532013000',
            bic: (document as any).step4?.bic || 'CDBXXSDE',
            companySuffix: (document as any).step2?.companySuffix || 'e.K',
            legalForm: (document as any).legalForm || (document as any).step2?.legalForm || 'GmbH',
            districtCourt: (document as any).districtCourt || (document as any).step3?.districtCourt || 'Köln',
            managingDirectors: (document as any).step1?.managingDirectors || [],
            firstName: (document as any).step1?.personalData?.firstName || 'andy',
            lastName: (document as any).step1?.personalData?.lastName || 'staudinger',
            companyStreet: (document as any).companyStreet || 'Siedlung am Wald',
            companyHouseNumber: (document as any).companyHouseNumber || '6',
            companyPostalCode: (document as any).companyPostalCode || '18586',
            companyCity: (document as any).companyCity || 'Sellin',
            step1: (document as any).step1,
            step2: (document as any).step2,  
            step4: (document as any).step4
          }} 
        />
      </div>
    </div>
  );

  const renderDynamicTemplate = () => (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6 text-xs overflow-hidden relative" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Dynamic Header mit Bewegung - A4 optimiert */}
      <div className="relative mb-4" style={{ minHeight: companyLogo ? '80px' : '60px' }}>
        {/* Kompaktere Hintergrund-Elemente */}
        <div className="absolute top-2 right-12 w-32 h-12 rounded-full opacity-10 animate-pulse" style={{ backgroundColor: color }} />
        <div className="absolute top-4 right-4 w-3 h-3 rounded-full opacity-20" style={{ backgroundColor: color }} />
        <div className="absolute top-8 right-16 w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: color }} />
        
        <div className="relative z-10 pt-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {companyLogo && (
                <div className="mb-2 relative">
                  <img 
                    src={companyLogo} 
                    alt={companyName}
                    className="h-12 w-auto object-contain"
                    style={{ maxHeight: `${Math.min(logoSize, 48)}px` }}
                  />
                  <div className="absolute -bottom-1 left-0 w-8 h-0.5" style={{ backgroundColor: color }} />
                </div>
              )}
              <div className="text-lg font-light mb-1" style={{ color }}>
                {documentLabel}
              </div>
              <div className="inline-block px-2 py-1 rounded font-semibold text-white text-xs" style={{ backgroundColor: color }}>
                #{invoiceNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm">{companyName}</div>
              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                {companyAddressParsed.street && <div>{companyAddressParsed.street}</div>}
                {(companyAddressParsed.postalCode || companyAddressParsed.city) && (
                  <div>{companyAddressParsed.postalCode} {companyAddressParsed.city}</div>
                )}
                {companyAddressParsed.country && <div>{companyAddressParsed.country}</div>}
                <div className="mt-1 space-y-0.5">
                  {companyPhone && <div>{companyPhone}</div>}
                  {companyEmail && <div>{companyEmail}</div>}
                  {companyWebsite && <div>{companyWebsite}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer und Document Info mit dynamischem Design */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Kundendaten */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border-l-4" style={{ borderColor: color }}>
          <div className="font-semibold mb-3 flex items-center" style={{ color }}>
            <div className="w-2 h-2 rounded-full mr-3 animate-pulse" style={{ backgroundColor: color }} />
            Rechnungsempfänger
          </div>
          <div className="space-y-1">
            <div className="font-medium text-lg">{customerName}</div>
            {customerAddressParsed.street && <div>{customerAddressParsed.street}</div>}
            {(customerAddressParsed.postalCode || customerAddressParsed.city) && (
              <div>{customerAddressParsed.postalCode} {customerAddressParsed.city}</div>
            )}
            {customerAddressParsed.country && <div>{customerAddressParsed.country}</div>}
            <div className="mt-3 space-y-1 text-sm">
              {customerEmail && <div>E-Mail: {customerEmail}</div>}
              {customerPhone && <div>Telefon: {customerPhone}</div>}
              {customerNumber && <div>Kundennummer: {customerNumber}</div>}
              {customerVatId && <div>USt-IdNr.: {customerVatId}</div>}
            </div>
          </div>
        </div>

        {/* Rechnungsdetails */}
        <div className="bg-gradient-to-bl from-gray-50 to-white p-3 rounded border-r-4" style={{ borderColor: color }}>
          <div className="font-semibold mb-2 flex items-center text-xs" style={{ color }}>
            <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: color }} />
            Rechnungsdetails
          </div>
          <div className="space-y-1 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div className="text-gray-600">Nummer:</div>
              <div className="font-medium">{invoiceNumber}</div>
              <div className="text-gray-600">Lfd. Nr.:</div>
              <div className="font-medium">{sequentialNumber}</div>
              <div className="text-gray-600">Datum:</div>
              <div>{formatDate(invoiceDate)}</div>
              <div className="text-gray-600">Fällig:</div>
              <div>{formatDate(dueDate)}</div>
              <div className="text-gray-600">Zahlungsziel:</div>
              <div>{paymentTerms}</div>
              {servicePeriod && servicePeriod.trim() !== '' ? (
                <>
                  <div className="text-gray-600">Zeitraum:</div>
                  <div>{servicePeriod}</div>
                </>
              ) : deliveryDate ? (
                <>
                  <div className="text-gray-600">Lieferung:</div>
                  <div>{formatDate(deliveryDate)}</div>
                </>
              ) : null}
              {deliveryTerms && (
                <>
                  <div className="text-gray-600">Bedingungen:</div>
                  <div>{deliveryTerms}</div>
                </>
              )}
              {internalContactPerson && (
                <>
                  <div className="text-gray-600">Kontakt:</div>
                  <div>{internalContactPerson}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kompakter Trenner */}
      <div className="flex items-center mb-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className="mx-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>

      {/* Kopftext - kompakt */}
      {(headTextHtml || description || introText || headerText) && (
        <div className="mb-4 relative">
          <div className="absolute -left-1 top-0 w-0.5 h-full bg-gradient-to-b from-transparent" style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }} />
          <div className="pl-4 bg-gradient-to-r from-gray-50 to-white p-3 rounded">
            <div
              className="text-xs text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: headTextHtml || description || introText || headerText || '',
              }}
            />
          </div>
        </div>
      )}

      {/* Dynamic Items Table - A4 kompakt */}
      <div className="mb-4 relative">
        <div className="absolute -right-2 top-8 w-4 h-4 rounded-full opacity-10" style={{ backgroundColor: color }} />
        
        {(() => {
          if (!realItems || realItems.length === 0) {
            return (
              <div className="text-center py-4 text-gray-500 text-xs">
                Keine Positionen vorhanden
              </div>
            );
          }

          return (
            <table className="w-full border-collapse relative z-10 rounded overflow-hidden shadow-sm">
              <thead>
                <tr style={{ backgroundColor: color }}>
                  <th className="text-white py-2 px-2 text-left font-medium text-xs">Pos.</th>
                  <th className="text-white py-2 px-2 text-left font-medium text-xs">Beschreibung</th>
                  <th className="text-white py-2 px-2 text-right font-medium text-xs">Menge</th>
                  <th className="text-white py-2 px-2 text-right font-medium text-xs">Einzelpreis</th>
                  {realItems.some(item => (item as any).discountPercent > 0) && (
                    <th className="text-white py-2 px-2 text-right font-medium text-xs">Rabatt</th>
                  )}
                  <th className="text-white py-2 px-2 text-right font-medium text-xs">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {realItems.map((item, index) => {
                  const discountPercent = (item as any).discountPercent || 0;
                  const originalTotal = item.total || (item.unitPrice * item.quantity);
                  const discountedTotal = discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
                  const hasAnyDiscount = realItems.some(item => (item as any).discountPercent > 0);
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr key={index} className={`${isEven ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="py-2 px-2 text-xs">{index + 1}</td>
                      <td className="py-2 px-2 text-xs">
                        <div className="font-medium">{item.description}</div>
                        {(item as any).unit && (
                          <div className="text-xs text-gray-500">Einheit: {(item as any).unit}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs text-right">{item.quantity}</td>
                      <td className="py-2 px-2 text-xs text-right">{formatCurrency(item.unitPrice)}</td>
                      {hasAnyDiscount && (
                        <td className="py-2 px-2 text-xs text-right text-red-600">
                          {discountPercent > 0 ? `-${discountPercent}%` : ''}
                        </td>
                      )}
                      <td className="py-2 px-2 text-xs text-right font-medium">{formatCurrency(discountedTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* Totals und Steuerinformationen - A4 kompakt */}
      <div className="flex justify-between items-start mb-4 gap-4">
        {/* Steuerliche Informationen */}
        <div className="flex-1">
          {taxRule && (
            <div className="bg-gradient-to-r from-blue-50 to-white p-2 rounded border-l-4" style={{ borderColor: color }}>
              <div className="font-medium text-xs mb-1" style={{ color }}>Steuerliche Behandlung</div>
              <div className="text-xs text-gray-700">
                {(() => {
                  const taxRuleLabels = {
                    'DE_TAXABLE': 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
                    'DE_TAXABLE_REDUCED': 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)',
                    'DE_EXEMPT_4_USTG': 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG',
                    'DE_REVERSE_13B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)',
                    'EU_REVERSE_18B': 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)',
                    'EU_INTRACOMMUNITY_SUPPLY': 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG',
                    'EU_OSS': 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)',
                    'NON_EU_EXPORT': 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)',
                    'NON_EU_OUT_OF_SCOPE': 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)'
                  };
                  return taxRuleLabels[taxRule as keyof typeof taxRuleLabels] || taxRule;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Gesamtbetrag - kompakt für A4 */}
        <div className="w-60">
          <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded border border-gray-200 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between py-0.5 text-xs">
                <span>Zwischensumme:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-xs">
                <span>MwSt. ({vatRate}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2" />
              <div className="flex justify-between py-1 font-bold text-sm" style={{ color }}>
                <span>Gesamtbetrag:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {skontoEnabled && skontoDays && skontoPercentage && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="flex justify-between py-0.5 text-xs text-green-700">
                    <span>Skonto ({skontoPercentage}%):</span>
                    <span>-{formatCurrency(total * (skontoPercentage / 100))}</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-medium text-xs text-green-800">
                    <span>Bei Zahlung bis {(() => {
                      const skontoDate = new Date();
                      skontoDate.setDate(skontoDate.getDate() + skontoDays);
                      return skontoDate.toLocaleDateString('de-DE');
                    })()}:</span>
                    <span>{formatCurrency(total - (total * (skontoPercentage / 100)))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details - kompakt */}
      {((bankDetails as any).iban || (bankDetails as any).bic) && (
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-white p-3 rounded border-l-4" style={{ borderColor: color }}>
          <div className="font-medium mb-1 text-xs" style={{ color }}>Bankverbindung</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(bankDetails as any).iban && (
              <div><span className="font-medium">IBAN:</span> {(bankDetails as any).iban}</div>
            )}
            {(bankDetails as any).bic && (
              <div><span className="font-medium">BIC:</span> {(bankDetails as any).bic}</div>
            )}
          </div>
        </div>
      )}

      {/* Footer Text - kompakt */}
      {footerText && (
        <div className="mt-4 bg-gradient-to-r from-gray-50 to-white p-3 rounded">
          <div
            className="text-sm text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: footerText
                .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(total))
                .replace(/\[%RECHNUNGSNUMMER%\]/g, invoiceNumber)
                .replace(/\[%ZAHLUNGSZIEL%\]/g, paymentTerms || '')
                .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(invoiceDate))
                .replace(
                  /\[%KONTAKTPERSON%\]/g,
                  contactPersonName || internalContactPerson || companyName || ''
                )
                .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
                .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                .replace(/Vielen Dank/g, '<br>Vielen Dank')
                .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen'),
            }}
          />
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-4 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
          <div className="font-medium mb-2 text-yellow-800">Hinweise</div>
          <div className="text-sm text-yellow-700 whitespace-pre-line">{notes}</div>
        </div>
      )}

      {/* Professional Footer */}
      <div className="mt-8 pt-6">
        <InvoiceFooter 
          data={{
            companyName: (document as any).companyName || 'Mietkoch Andy',
            phoneNumber: (document as any).phoneNumber || '+4901605979000',
            email: (document as any).contactEmail || 'a.staudinger32@icloud.com',
            website: (document as any).companyWebsiteForBackend || (document as any).website || 'https://taskilo.de',
            vatId: (document as any).vatId || 'DE123456789',
            taxNumber: (document as any).taxNumber || 'test12345678',
            companyRegister: (document as any).registrationNumber || 'HRB12345',
            iban: (document as any).step4?.iban || 'DE89370400440532013000',
            bic: (document as any).step4?.bic || 'CDBXXSDE',
            companySuffix: (document as any).step2?.companySuffix || 'e.K',
            legalForm: (document as any).legalForm || (document as any).step2?.legalForm || 'GmbH',
            districtCourt: (document as any).districtCourt || (document as any).step3?.districtCourt || 'Köln',
            managingDirectors: (document as any).step1?.managingDirectors || [],
            firstName: (document as any).step1?.personalData?.firstName || 'andy',
            lastName: (document as any).step1?.personalData?.lastName || 'staudinger',
            companyStreet: (document as any).companyStreet || 'Siedlung am Wald',
            companyHouseNumber: (document as any).companyHouseNumber || '6',
            companyPostalCode: (document as any).companyPostalCode || '18586',
            companyCity: (document as any).companyCity || 'Sellin',
            step1: (document as any).step1,
            step2: (document as any).step2,  
            step4: (document as any).step4
          }} 
        />
      </div>
    </div>
  );

  // Template renderer based on selected template
  const renderTemplate = () => {
    switch (template) {
      case 'TEMPLATE_STANDARD':
        return renderStandardTemplate();
      case 'TEMPLATE_NEUTRAL':
        return renderNeutralTemplate();
      case 'TEMPLATE_ELEGANT':
        return renderElegantTemplate();
      case 'TEMPLATE_TECHNICAL':
        return renderTechnicalTemplate();
      case 'TEMPLATE_GEOMETRIC':
        return renderGeometricTemplate();
      case 'TEMPLATE_DYNAMIC':
        return renderDynamicTemplate();
      default:
        return renderNeutralTemplate();
    }
  };

  return (
    <div className="w-full h-full bg-white shadow-lg">
      {renderTemplate()}
    </div>
  );
};

export default PDFTemplate;
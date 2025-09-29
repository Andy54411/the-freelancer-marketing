'use client';

import React, { useState } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InvoiceFooter } from '@/components/templates/invoice-templates/InvoiceFooter';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Minus } from 'lucide-react';

interface PDFTemplateProps {
  document: InvoiceData;
  template: string;
  color: string;
  logoUrl?: string | null;
  logoSize?: number;
  documentType: 'invoice' | 'quote' | 'reminder';
  onLogoChange?: (newLogoUrl: string) => void;
  isEditMode?: boolean;
}

// LogoUpload-Komponente
interface LogoUploadProps {
  currentLogo?: string;
  logoSize: number;
  onLogoChange?: (newLogoUrl: string) => void;
  onSizeChange?: (newSize: number) => void;
  isEditMode?: boolean;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ 
  currentLogo, 
  logoSize, 
  onLogoChange, 
  onSizeChange,
  isEditMode = false 
}) => {
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedLogo(result);
        onLogoChange?.(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const displayLogo = uploadedLogo || currentLogo;
  
  if (!isEditMode) {
    // Im Ansichtsmodus nur das Logo anzeigen
    return displayLogo ? (
      <img 
        src={displayLogo} 
        alt="Logo" 
        style={{ 
          height: `${Math.max(logoSize * 1.2, 50)}px`,
          maxHeight: '100px',
          width: 'auto'
        }}
      />
    ) : null;
  }

  // Im Bearbeitungsmodus das Upload-Element anzeigen
  return (
    <div className="px-4 pb-4 bg-gray-50 space-y-4">
      <div className="space-y-3">
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-[#14ad9f] bg-[#14ad9f]/5' 
              : 'border-gray-300 hover:border-[#14ad9f]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png" 
            className="hidden" 
            type="file"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <div 
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <Button 
              type="button"
              variant="outline"
              className="mb-2"
              onClick={() => fileInputRef.current?.click()}
            >
              Logo hochladen
            </Button>
            <p className="text-sm text-gray-500">oder hier hineinziehen</p>
            <p className="text-xs text-gray-400">.jpg, .jpeg, .png (max. 10 MB)</p>
          </div>
        </div>
        
        {displayLogo && (
          <div className="space-y-2">
            <div className="text-sm text-green-600 text-center">
              ✓ Logo {uploadedLogo ? 'hochgeladen' : 'aus Datenbank'}
            </div>
            <div className="flex justify-center">
              <img 
                alt="Logo Vorschau" 
                className="max-h-12 max-w-24 object-contain border rounded" 
                src={displayLogo}
                style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center gap-2 select-none text-sm font-medium">
          Größe
        </label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onSizeChange?.(Math.max(20, logoSize - 10))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-medium min-w-[3rem] text-center">
            {logoSize}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onSizeChange?.(Math.min(200, logoSize + 10))}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const PDFTemplate: React.FC<PDFTemplateProps> = ({
  document,
  template,
  color,
  logoUrl,
  logoSize = 50,
  documentType,
  onLogoChange,
  isEditMode = false
}) => {
  const documentLabels = {
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Mahnung',
  };

  const documentLabel = documentLabels[documentType];

  // Verwende echte Daten aus dem document (Vollständige Firebase-Integration)
  const realItems = document.items || [];
  const subtotal = document.amount || (document as any).subtotal || 0; // Nettobetrag
  const taxAmount = document.tax || (document as any).taxAmount || 0; // Steuerbetrag  
  const total = document.total || (subtotal + taxAmount); // Gesamtbetrag
  const vatRate = document.vatRate || (document as any).taxRate || 19;

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
  const skontoEnabled = (document as any).skontoEnabled || false;
  const skontoDays = (document as any).skontoDays || 0;
  const skontoPercentage = (document as any).skontoPercentage || 0;
  const skontoText = (document as any).skontoText || '';
  
  // Status und Metadaten
  const status = (document as any).status || '';
  const currency = (document as any).currency || 'EUR';
  const language = (document as any).language || 'de';
  const createdBy = (document as any).createdBy || '';
  
  // Logo und Branding - STANDARDMÄSSIG AUS DATENBANK
  // Priorität: 1. User-Override (document.companyLogo) 2. Datenbank-Logo (profilePictureURL/profilePictureFirebaseUrl)
  const companyLogo = document.companyLogo || 
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
    <div className="bg-white w-full h-full p-8 text-sm">
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
              <LogoUpload
                currentLogo={companyLogo}
                logoSize={logoSize}
                onLogoChange={onLogoChange}
                isEditMode={isEditMode}
              />
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
            <div>Rechnungsdatum: {formatDate(invoiceDate)}</div>
            <div>Fälligkeitsdatum: {formatDate(dueDate)}</div>
            <div>Zahlungsziel: {paymentTerms}</div>
          </div>
        </div>
      </div>

      {/* Trennlinie */}
      <div className="border-t border-gray-300 mb-8"></div>

      {/* Kopftext / Header-Text - Nach dem Vorbild des ProfessionalBusinessTemplate */}
      {(headTextHtml || description || introText || headerText) && (
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
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#F4F2E5' }}>
              <th className="border p-3 text-left">Beschreibung</th>
              <th className="border p-3 text-center">Menge</th>
              <th className="border p-3 text-right">Einzelpreis</th>
              <th className="border p-3 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index}>
                <td className="border p-3">{item.description}</td>
                <td className="border p-3 text-center">{item.quantity} {(item as any).unit || 'Stk'}</td>
                <td className="border p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border p-3 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>MwSt. (${vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg border-t">
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
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
      <div className="mt-8 border-t pt-4">
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
    <div className="bg-white w-full h-full p-8 text-sm">
      {/* Simple Header - Feste Höhe für Logo-Stabilität */}
      <div className="border-b-2 border-gray-300 pb-6 mb-8">
        <div className="flex justify-between items-start" style={{ minHeight: companyLogo ? '130px' : '60px' }}>
          <div className="flex-1">
            {/* Logo Container mit fester Höhe */}
            <div className={companyLogo ? "mb-4" : ""} style={{ height: companyLogo ? '80px' : '0px', display: 'flex', alignItems: 'center' }}>
              {companyLogo && (
                <img 
                  src={companyLogo} 
                  alt="Logo" 
                  style={{ 
                    height: `${Math.max(logoSize * 1.2, 50)}px`,
                    maxHeight: '80px',
                    width: 'auto'
                  }}
                />
              )}
            </div>
            <h1 className="text-2xl font-medium mb-2">{documentLabel}</h1>
            <p className="text-gray-700">Nr. {invoiceNumber}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-medium">{companyName || 'Ihr Unternehmen'}</div>
            <div className="text-gray-600 text-sm">
              <div>Musterstraße 123</div>
              <div>12345 Musterstadt</div>
              <div>Deutschland</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8">
        <div className="font-semibold mb-2">Rechnungsempfänger:</div>
        <div className="pl-4 border-l-4" style={{ borderColor: color }}>
          <div className="font-medium">{customerName || 'Musterkunde GmbH'}</div>
          <div>Kundenstraße 456</div>
          <div>67890 Kundenstadt</div>
          <div>Deutschland</div>
        </div>
      </div>

      {/* Document Details */}
      <div className="grid grid-cols-3 gap-6 mb-8 p-4 bg-gray-50 rounded">
        <div>Rechnungsdatum: {formatDate(invoiceDate)}</div>
        <div>Fälligkeitsdatum: {formatDate(dueDate)}</div>
        <div>Zahlungsziel: {paymentTerms}</div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: color, color: 'white' }}>
              <th className="border p-3 text-left">Beschreibung</th>
              <th className="border p-3 text-center">Menge</th>
              <th className="border p-3 text-right">Einzelpreis</th>
              <th className="border p-3 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-center">{item.quantity} Std</td>
                <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between py-1">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>MwSt. (${vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div 
            className="flex justify-between py-2 font-bold text-lg border-t-2"
            style={{ borderColor: color, color }}
          >
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderElegantTemplate = () => (
    <div className="bg-white w-full h-full p-8 text-sm">
      {/* Elegant Header with decorative elements - Logo-stabil */}
      <div className="relative mb-8" style={{ minHeight: companyLogo ? '220px' : '120px' }}>
        <div className="text-center mb-6">
          {/* Logo Container mit fester Höhe */}
          <div style={{ height: companyLogo ? '120px' : '0px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: companyLogo ? '16px' : '0px' }}>
            {companyLogo && (
              <img 
                src={companyLogo} 
                alt="Logo" 
                style={{ 
                  height: `${Math.max(logoSize * 1.5, 60)}px`,
                  maxHeight: '120px',
                  width: 'auto'
                }}
              />
            )}
          </div>
          <div className="text-4xl font-serif mb-2" style={{ color: '#8A6701' }}>
            {documentLabel}
          </div>
          <div className="text-sm text-gray-600 tracking-wider">
            NR. {invoiceNumber}
          </div>
          <div className="w-24 h-0.5 mx-auto mt-4" style={{ backgroundColor: '#8A6701' }}></div>
        </div>

        <div className="flex justify-between items-start">
          <div className="w-1/2">
            <div className="font-semibold text-gray-800">{companyName || 'Ihr Unternehmen'}</div>
            <div className="text-gray-600 mt-2">
              <div>Musterstraße 123</div>
              <div>12345 Musterstadt</div>
              <div>Deutschland</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info with elegant styling */}
      <div className="mb-8">
        <div className="border border-gray-300 p-6 rounded-lg bg-gray-50">
          <div className="text-sm font-medium mb-3" style={{ color: '#8A6701' }}>
            RECHNUNGSEMPFÄNGER
          </div>
          <div className="font-medium text-gray-800">{customerName || 'Musterkunde GmbH'}</div>
          <div className="text-gray-600 mt-1">
            <div>Kundenstraße 456</div>
            <div>67890 Kundenstadt</div>
            <div>Deutschland</div>
          </div>
        </div>
      </div>

      {/* Document Details */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="font-medium" style={{ color: '#8A6701' }}>Rechnungsdatum</div>
          <div className="mt-1">{formatDate(invoiceDate)}</div>
        </div>
        <div className="text-center">
          <div className="font-medium" style={{ color: '#8A6701' }}>Fälligkeitsdatum</div>
          <div className="mt-1">{formatDate(dueDate)}</div>
        </div>
        <div className="text-center">
          <div className="font-medium" style={{ color: '#8A6701' }}>Zahlungsziel</div>
          <div className="mt-1">14 Tage</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2" style={{ borderColor: '#8A6701' }}>
              <th className="py-3 text-left font-medium" style={{ color: '#8A6701' }}>Beschreibung</th>
              <th className="py-3 text-center font-medium" style={{ color: '#8A6701' }}>Menge</th>
              <th className="py-3 text-right font-medium" style={{ color: '#8A6701' }}>Einzelpreis</th>
              <th className="py-3 text-right font-medium" style={{ color: '#8A6701' }}>Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-center">{item.quantity} Std</td>
                <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-72">
          <div className="flex justify-between py-2 border-b">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>MwSt. (${vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div 
            className="flex justify-between py-3 font-bold text-xl border-t-2 mt-2"
            style={{ borderColor: '#8A6701', color: '#8A6701' }}
          >
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Elegant Footer */}
      <div className="text-center text-xs text-gray-500 mt-16">
        <div className="w-24 h-0.5 mx-auto mb-4" style={{ backgroundColor: '#8A6701' }}></div>
        <div className="italic">Vielen Dank für Ihr Vertrauen und Ihre Zusammenarbeit.</div>
      </div>
    </div>
  );

  const renderTechnicalTemplate = () => (
    <div className="bg-white w-full h-full p-8 text-sm font-mono">
      {/* Technical Header - Feste Höhe für Logo-Stabilität */}
      <div className="border border-gray-400 p-4 mb-8">
        <div className="flex justify-between items-start" style={{ minHeight: companyLogo ? '130px' : '60px' }}>
          <div className="flex-1">
            {/* Logo Container mit fester Höhe */}
            <div className={companyLogo ? "mb-4" : ""} style={{ height: companyLogo ? '80px' : '0px', display: 'flex', alignItems: 'center' }}>
              {companyLogo && (
                <img 
                  src={companyLogo} 
                  alt="Logo" 
                  style={{ 
                    height: `${Math.max(logoSize * 1.2, 50)}px`,
                    maxHeight: '80px',
                    width: 'auto'
                  }}
                />
              )}
            </div>
            <div className="text-2xl font-bold mb-2">[{documentLabel}]</div>
            <div className="text-gray-600">&gt; ID: {invoiceNumber}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold">{companyName || 'Ihr Unternehmen'}</div>
            <div className="text-gray-600 text-xs">
              <div>// Musterstraße 123</div>
              <div>// 12345 Musterstadt</div>
              <div>// Deutschland</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Customer Info */}
      <div className="mb-8">
        <div className="bg-gray-100 p-4 border-l-4" style={{ borderColor: color }}>
          <div className="text-xs font-bold mb-2" style={{ color }}>CLIENT_INFO:</div>
          <div className="space-y-1">
            <div>NAME: {customerName || 'CLIENT_COMPANY_NAME'}</div>
            <div>ADDR: Kundenstraße 456</div>
            <div>CITY: 67890 Kundenstadt</div>
            <div>COUNTRY: Deutschland</div>
          </div>
        </div>
      </div>

      {/* Technical Document Details */}
      <div className="grid grid-cols-3 gap-4 mb-8 font-mono text-xs">
        <div className="bg-gray-50 p-3">
          <div className="font-bold" style={{ color }}>DATE_CREATED:</div>
          <div>{formatDate(invoiceDate)}</div>
        </div>
        <div className="bg-gray-50 p-3">
          <div className="font-bold" style={{ color }}>DATE_DUE:</div>
          <div>{formatDate(dueDate)}</div>
        </div>
        <div className="bg-gray-50 p-3">
          <div className="font-bold" style={{ color }}>PAYMENT_TERMS:</div>
          <div>14 DAYS</div>
        </div>
      </div>

      {/* Technical Items Table */}
      <div className="mb-8">
        <div className="bg-gray-900 text-white p-2 text-xs font-bold">
          ITEM_LIST
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">DESCRIPTION</th>
              <th className="border border-gray-300 p-2 text-center">QTY</th>
              <th className="border border-gray-300 p-2 text-right">UNIT_PRICE</th>
              <th className="border border-gray-300 p-2 text-right">TOTAL_PRICE</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <div className="text-xs text-gray-500 font-mono border-t pt-4">
        <div>// END_OF_DOCUMENT</div>
        <div>// THANK_YOU_FOR_YOUR_BUSINESS</div>
      </div>
    </div>
  );

  const renderGeometricTemplate = () => (
    <div className="bg-white w-full h-full p-8 text-sm">
      {/* Geometric Header */}
      <div className="relative mb-8">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className="w-full h-full" style={{ backgroundColor: '#E64111' }}></div>
        </div>
        <div className="flex justify-between items-start relative z-10" style={{ minHeight: companyLogo ? '160px' : '80px' }}>
          <div className="flex-1">
            {/* Logo Container mit fester Höhe */}
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
            <div className="text-3xl font-bold mb-2 flex items-center">
              <div className="w-8 h-8 mr-3" style={{ backgroundColor: '#E64111' }}></div>
              {documentLabel}
            </div>
            <div className="ml-11 text-gray-600">Nr. {invoiceNumber}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-semibold">{companyName || 'Ihr Unternehmen'}</div>
            <div className="text-gray-600 mt-1">
              <div>Musterstraße 123</div>
              <div>12345 Musterstadt</div>
              <div>Deutschland</div>
            </div>
          </div>
        </div>
      </div>

      {/* Geometric Customer Info */}
      <div className="mb-8 relative">
        <div className="absolute -left-4 top-0 w-1 h-full" style={{ backgroundColor: '#E64111' }}></div>
        <div className="pl-6">
          <div className="font-semibold mb-3 flex items-center">
            <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#E64111' }}></div>
            Rechnungsempfänger:
          </div>
          <div className="bg-gray-50 p-4 relative">
            <div className="absolute top-2 right-2 w-3 h-3" style={{ backgroundColor: '#E64111' }}></div>
            <div className="font-medium">{customerName || 'Musterkunde GmbH'}</div>
            <div>Kundenstraße 456</div>
            <div>67890 Kundenstadt</div>
            <div>Deutschland</div>
          </div>
        </div>
      </div>

      {/* Geometric Document Details */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Rechnungsdatum', value: formatDate(invoiceDate) },
          { label: 'Fälligkeitsdatum', value: formatDate(dueDate) },
          { label: 'Zahlungsziel', value: '14 Tage' }
        ].map((item, index) => (
          <div key={index} className="relative">
            <div className="bg-gray-100 p-4 relative">
              <div 
                className="absolute top-0 left-0 w-full h-1" 
                style={{ backgroundColor: index % 2 === 0 ? '#E64111' : '#ccc' }}
              ></div>
              <div className="font-medium text-gray-800">{item.label}</div>
              <div className="mt-1">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Geometric Items Table */}
      <div className="mb-8 relative">
        <div className="absolute -left-4 top-0 w-2 h-8" style={{ backgroundColor: '#E64111' }}></div>
        <table className="w-full border-collapse ml-4">
          <thead>
            <tr style={{ backgroundColor: '#E64111', color: 'white' }}>
              <th className="p-3 text-left">Beschreibung</th>
              <th className="p-3 text-center">Menge</th>
              <th className="p-3 text-right">Einzelpreis</th>
              <th className="p-3 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="p-3 relative">
                  <span className="absolute left-0 top-1/2 w-2 h-2 -translate-y-1/2 block" style={{ backgroundColor: '#E64111' }}></span>
                  <span className="ml-4">{item.description}</span>
                </td>
                <td className="p-3 text-center">{item.quantity} Std</td>
                <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Geometric Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 relative">
          <div className="absolute -right-4 top-0 w-2 h-full" style={{ backgroundColor: '#E64111' }}></div>
          <div className="space-y-2 pr-6">
            <div className="flex justify-between py-2">
              <span>Zwischensumme:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>MwSt. (${vatRate}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div 
              className="flex justify-between py-3 font-bold text-lg relative"
              style={{ color: '#E64111' }}
            >
              <div className="absolute left-0 top-0 w-4 h-4" style={{ backgroundColor: '#E64111' }}></div>
              <span className="ml-6">Gesamtbetrag:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDynamicTemplate = () => (
    <div className="bg-white w-full h-full p-8 text-sm overflow-hidden relative">
      {/* Clean Dynamic Header */}
      <div className="relative mb-8">
        {/* Besser positioniertes Oval im Hintergrund */}
        <div 
          className="absolute top-4 right-16 w-48 h-20 rounded-full opacity-10 flex items-center justify-center"
          style={{ backgroundColor: '#2BB7C4' }}
        >
          <div 
            className="text-lg font-medium opacity-60"
            style={{ color: '#2BB7C4' }}
          >
            Nr. {invoiceNumber || 'RE-1048'}
          </div>
        </div>
        <div className="relative z-10 pt-4">
          <div className="flex justify-between items-start">
            <div>
              {companyLogo && (
                <img 
                  src={companyLogo} 
                  alt="Logo" 
                  className="mb-4"
                  style={{ 
                    height: `${Math.max(logoSize * 1.2, 50)}px`,
                    maxHeight: '120px',
                    width: 'auto'
                  }}
                />
              )}
              <div className="text-3xl font-light mb-3" style={{ color: '#2BB7C4' }}>
                {documentLabel}
              </div>
              {/* Deutlich sichtbare Rechnungsnummer */}
              <div 
                className="inline-block px-4 py-2 rounded-lg font-semibold text-white text-lg"
                style={{ backgroundColor: '#2BB7C4' }}
              >
                Nr. {invoiceNumber || 'RE-1048'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{companyName || 'Ihr Unternehmen'}</div>
              <div className="text-gray-600 mt-1">
                <div>Musterstraße 123</div>
                <div>12345 Musterstadt</div>
                <div>Deutschland</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Customer Info */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg border-l-4" style={{ borderColor: '#2BB7C4' }}>
          <div className="font-semibold mb-3 flex items-center" style={{ color: '#2BB7C4' }}>
            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#2BB7C4' }}></div>
            Rechnungsempfänger
          </div>
          <div className="font-medium">{customerName || 'Musterkunde GmbH'}</div>
          <div className="text-gray-600 mt-1">
            <div>Kundenstraße 456</div>
            <div>67890 Kundenstadt</div>
            <div>Deutschland</div>
          </div>
        </div>
      </div>

      {/* Clean Document Details */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Rechnungsdatum', value: formatDate(invoiceDate) },
          { label: 'Fälligkeitsdatum', value: formatDate(dueDate) },
          { label: 'Zahlungsziel', value: '14 Tage' }
        ].map((item, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg border-t-2" style={{ borderColor: '#2BB7C4' }}>
            <div className="font-medium text-sm" style={{ color: '#2BB7C4' }}>{item.label}</div>
            <div className="mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Clean Items Table */}
      <div className="mb-8 relative">
        <div 
          className="absolute -right-4 top-16 w-8 h-8 rounded-full opacity-10"
          style={{ backgroundColor: '#2BB7C4' }}
        ></div>
        <table className="w-full border-collapse relative z-10">
          <thead>
            <tr style={{ backgroundColor: '#2BB7C4', color: 'white' }}>
              <th className="p-4 text-left">Beschreibung</th>
              <th className="p-4 text-center">Menge</th>
              <th className="p-4 text-right">Einzelpreis</th>
              <th className="p-4 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="p-4">{item.description}</td>
                <td className="p-4 text-center">{item.quantity} {(item as any).unit || 'Stk'}</td>
                <td className="p-4 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="p-4 text-right font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Clean Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-72">
          <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-lg border border-gray-200">
            <div className="flex justify-between py-2">
              <span>Zwischensumme:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>MwSt. (${vatRate}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-3"></div>
            <div 
              className="flex justify-between py-2 font-bold text-xl border-t-2 pt-3"
              style={{ borderColor: '#2BB7C4', color: '#2BB7C4' }}
            >
              <span>Gesamtbetrag:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <div className="text-center text-gray-500 mt-12">
        <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: '#2BB7C4' }}></div>
        <div className="italic">Vielen Dank für Ihr Vertrauen!</div>
      </div>
    </div>
  );

  const renderPremiumFriendlyTemplate = () => (
    <div className="bg-white w-full h-full p-8 text-sm">
      {/* Friendly Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start" style={{ minHeight: companyLogo ? '160px' : '80px' }}>
          <div className="flex-1">
            {/* Logo Container mit fester Höhe */}
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
            <div className="text-3xl font-bold mb-2" style={{ color: '#283583' }}>
              {documentLabel}
            </div>
            <div className="text-gray-600">Nr. {invoiceNumber}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-semibold">{companyName || 'Ihr Unternehmen'}</div>
            <div className="text-gray-600 mt-1">
              <div>Musterstraße 123</div>
              <div>12345 Musterstadt</div>
              <div>Deutschland</div>
            </div>
          </div>
        </div>
        <div className="w-full h-1 mt-6" style={{ backgroundColor: '#283583' }}></div>
      </div>

      {/* Rest of template similar to Standard but with friendly blue color */}
      {/* Customer Info */}
      <div className="mb-8">
        <div className="font-semibold mb-2">Rechnungsempfänger:</div>
        <div className="bg-blue-50 p-4 rounded border-l-4" style={{ borderColor: '#283583' }}>
          <div className="font-medium">{customerName || 'Musterkunde GmbH'}</div>
          <div>Kundenstraße 456</div>
          <div>67890 Kundenstadt</div>
          <div>Deutschland</div>
        </div>
      </div>

      {/* Document Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <div className="font-semibold mb-2">Rechnungsdetails:</div>
          <div className="space-y-1">
            <div>Rechnungsdatum: {formatDate(invoiceDate)}</div>
            <div>Fälligkeitsdatum: {formatDate(dueDate)}</div>
            <div>Zahlungsziel: {paymentTerms}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <div className="w-full h-1 mb-4" style={{ backgroundColor: '#283583' }}></div>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#283583', color: 'white' }}>
              <th className="p-3 text-left">Beschreibung</th>
              <th className="p-3 text-center">Menge</th>
              <th className="p-3 text-right">Einzelpreis</th>
              <th className="p-3 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-center">{item.quantity} Std</td>
                <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>MwSt. (${vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div 
            className="flex justify-between py-2 font-bold text-lg border-t-2"
            style={{ borderColor: '#283583', color: '#283583' }}
          >
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPremiumCompactTemplate = () => (
    <div className="bg-white w-full h-full p-6 text-xs">
      {/* Compact Header - Logo-stabil */}
      <div className="flex justify-between items-start mb-6" style={{ minHeight: companyLogo ? '100px' : '40px' }}>
        <div className="flex-1">
          {/* Logo Container mit fester Höhe */}
          <div className={companyLogo ? "mb-3" : ""} style={{ height: companyLogo ? '70px' : '0px', display: 'flex', alignItems: 'center' }}>
            {companyLogo && (
              <img 
                src={companyLogo} 
                alt="Logo" 
                style={{ 
                  height: `${Math.max(logoSize * 1.0, 40)}px`,
                  maxHeight: '70px',
                  width: 'auto'
                }}
              />
            )}
          </div>
          <div className="text-xl font-bold mb-1" style={{ color }}>
            {documentLabel}
          </div>
          <div className="text-gray-600 text-xs">Nr. {invoiceNumber}</div>
        </div>
        <div className="text-right text-xs flex-shrink-0">
          <div className="font-semibold">{companyName || 'Ihr Unternehmen'}</div>
          <div className="text-gray-600 mt-1">
            <div>Musterstraße 123 • 12345 Musterstadt • Deutschland</div>
          </div>
        </div>
      </div>

      {/* Compact Customer Info */}
      <div className="mb-6">
        <div className="bg-gray-100 p-3 rounded">
          <div className="font-medium text-xs mb-1">Rechnungsempfänger:</div>
          <div className="text-xs">
            <div className="font-medium">{customerName || 'Musterkunde GmbH'}</div>
            <div>Kundenstraße 456 • 67890 Kundenstadt • Deutschland</div>
          </div>
        </div>
      </div>

      {/* Compact Document Details */}
      <div className="grid grid-cols-6 gap-4 mb-6 text-xs">
        <div className="col-span-2">
          <div className="font-medium">Rechnungsdatum:</div>
          <div>{formatDate(invoiceDate)}</div>
        </div>
        <div className="col-span-2">
          <div className="font-medium">Fälligkeitsdatum:</div>
          <div>{formatDate(dueDate)}</div>
        </div>
        <div className="col-span-2">
          <div className="font-medium">Zahlungsziel:</div>
          <div>14 Tage</div>
        </div>
      </div>

      {/* Compact Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Beschreibung</th>
              <th className="border p-2 text-center">Menge</th>
              <th className="border p-2 text-right">Einzelpreis</th>
              <th className="border p-2 text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {realItems.map((item, index) => (
              <tr key={index}>
                <td className="border p-2">{item.description}</td>
                <td className="border p-2 text-center">{item.quantity} Std</td>
                <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border p-2 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compact Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-48 text-xs">
          <div className="flex justify-between py-1">
            <span>Zwischensumme:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>MwSt. (${vatRate}%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div 
            className="flex justify-between py-1 font-bold border-t"
            style={{ color }}
          >
            <span>Gesamtbetrag:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
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
      case 'PREMIUM_FRIENDLY':
        return renderPremiumFriendlyTemplate();
      case 'PREMIUM_COMPACT':
        return renderPremiumCompactTemplate();
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
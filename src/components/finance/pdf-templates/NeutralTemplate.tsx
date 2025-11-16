import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData, DocumentSettings } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';
import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';
import type { DocumentType } from '@/lib/document-utils';
import { detectDocumentType, getTranslatedDocumentTypeConfig } from '@/lib/document-utils';
import { useDocumentTranslation } from '@/hooks/pdf/useDocumentTranslation';
import { replacePlaceholders } from '@/utils/placeholderSystem';

interface NeutralTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
  documentSettings?: DocumentSettings;
}

export const NeutralTemplate: React.FC<NeutralTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
  documentType,
  documentSettings
}) => {
  // 🌍 ÜBERSETZUNGSSYSTEM
  const { t } = useDocumentTranslation(documentSettings?.language || 'de');

  // 📋 KUNDENNUMMER - Bereits aus LivePreviewModal angereichert
  const companyId = (data as any).companyId || '';
  const displayCustomerNumber = data.customerNumber;

  // 📋 DYNAMISCHE DOKUMENTTYP-KONFIGURATION mit centraler document-utils
  // PRIORITÄT: Explizit übergebener documentType hat höchste Priorität
  const detectedType = documentType || detectDocumentType(data) || 'invoice';
  const config = getTranslatedDocumentTypeConfig(detectedType, t, color);

  // Footer-Daten - ECHTE Daten verwenden, KEINE Fallbacks!
  const footerData = {
    companyName: (data as any).companyName,
    phoneNumber: (data as any).phoneNumber,
    email: (data as any).contactEmail,
    website: (data as any).companyWebsiteForBackend || (data as any).website,
    vatId: (data as any).vatId,
    taxNumber: (data as any).taxNumber,
    companyRegister: (data as any).registrationNumber,
    iban: (data as any).step4?.iban,
    bic: (data as any).step4?.bic,
    companySuffix: (data as any).step2?.companySuffix,
    legalForm: (data as any).legalForm || (data as any).step2?.legalForm,
    districtCourt: (data as any).districtCourt || (data as any).step3?.districtCourt,
    managingDirectors: (data as any).step1?.managingDirectors || [],
    firstName: (data as any).step1?.personalData?.firstName,
    lastName: (data as any).step1?.personalData?.lastName,
    companyStreet: (data as any).companyStreet,
    companyHouseNumber: (data as any).companyHouseNumber,
    companyPostalCode: (data as any).companyPostalCode,
    companyCity: (data as any).companyCity,
    step1: (data as any).step1,
    step2: (data as any).step2,
    step4: (data as any).step4
  };

  return (
    <div
      className={`bg-white w-full max-w-[210mm] mx-auto ${pageMode === 'single' ? 'text-[10px] leading-tight' : 'text-xs'}`}
      style={{
        fontFamily: 'Arial, sans-serif',
        ...(pageMode === 'single' && { maxHeight: '297mm', overflow: 'hidden' })
      }}>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .page-break { page-break-before: always; }
            body { margin: 0; padding: 0; }
          }
          ${
          documentSettings?.showFoldLines ?
          `
          .pdf-page::before {
            content: '';
            position: absolute;
            left: 0;
            top: 105mm;
            width: 5mm;
            height: 1px;
            background-color: #ccc;
            z-index: 100;
          }
          .pdf-page::after {
            content: '';
            position: absolute;
            left: 0;
            top: 210mm;
            width: 5mm;
            height: 1px;
            background-color: #ccc;
            z-index: 100;
          }
          .pdf-page .fold-mark-hole {
            position: absolute;
            left: 0;
            top: 148.5mm;
            width: 3mm;
            height: 3mm;
            border: 1px solid #ccc;
            border-radius: 50%;
            z-index: 100;
          }
          ` :
          ''}
        `

        }} />


      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col relative" style={{ minHeight: '297mm' }}>
        {/* Wasserzeichen */}
        {documentSettings?.showWatermark &&
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="text-6xl font-bold text-gray-100 transform rotate-45 select-none">
              {data.documentLabel}
            </div>
          </div>
        }
        {/* Seitenzahl */}
        {documentSettings?.showPageNumbers &&
        <div className="absolute bottom-4 right-6 text-xs text-gray-500 z-10">Seite 1</div>
        }
        {/* Simple Header - Seite 1 */}
        <div className="p-6 pb-4">
          <div
            className="border-b-2 pb-6 mb-8"
            style={{ minHeight: data.companyLogo ? '120px' : '80px', borderColor: config.color }}>

            <div className="flex justify-between items-start">
              {/* Firmenlogo links */}
              <div className="shrink-0">
                {data.companyLogo &&
                <img
                  src={data.companyLogo}
                  alt={data.companyName}
                  className="h-16 w-auto object-contain"
                  style={{ maxHeight: `${logoSize}px` }} />

                }
                <h1 className="text-2xl font-medium mb-2 mt-4">{config.title}</h1>
                <p className="text-gray-700">
                  {config.numberLabel}: {data.invoiceNumber}
                </p>
              </div>

              {/* Rechter Bereich mit QR-Code und Firmendaten */}
              <div className="flex flex-col items-end space-y-2">
                {/* QR-Code klein oben rechts */}
                {documentSettings?.showQRCode &&
                <div className="shrink-0">
                    {data.qrCodeUrl || documentSettings?.qrCodeUrl ?
                  <img
                    src={data.qrCodeUrl || documentSettings?.qrCodeUrl}
                    alt="QR Code"
                    className="w-16 h-16 border border-gray-300" /> :


                  <div className="w-16 h-16 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                        QR
                      </div>
                  }
                  </div>
                }

                {/* Firmendaten */}
                <div className="text-right text-xs text-gray-700 leading-relaxed">
                  <div className="font-bold text-lg text-gray-900">{data.companyName}</div>
                  {data.companyAddressParsed.street &&
                  <div>{data.companyAddressParsed.street}</div>
                  }
                  {(data.companyAddressParsed.postalCode || data.companyAddressParsed.city) &&
                  <div>
                      {data.companyAddressParsed.postalCode} {data.companyAddressParsed.city}
                    </div>
                  }
                  {data.companyAddressParsed.country &&
                  <div>{data.companyAddressParsed.country}</div>
                  }
                  {data.companyPhone && <div>Tel.: {data.companyPhone}</div>}
                  {data.companyEmail && <div>E-Mail: {data.companyEmail}</div>}
                  {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Customer and Document Info */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {data.customerName &&
            <div>
                <div className="font-semibold mb-2">{config.recipientLabel}:</div>
                <div className="space-y-1">
                  <div className="font-medium">{data.customerName}</div>
                  {data.customerAddressParsed.street &&
                <div>{data.customerAddressParsed.street}</div>
                }
                  {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) &&
                <div>
                      {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                    </div>
                }
                  {data.customerAddressParsed.country &&
                <div>{data.customerAddressParsed.country}</div>
                }
                  {data.customerVatId && <div>USt-IdNr.: {data.customerVatId}</div>}

                  {/* Kundennummer basierend auf documentSettings */}
                  {documentSettings?.showCustomerNumber && displayCustomerNumber &&
                <div>Kundennr.: {displayCustomerNumber}</div>
                }
                  {/* Kontaktperson basierend auf documentSettings */}
                  {documentSettings?.showContactPerson && data.contactPersonName &&
                <div>Kontakt: {data.contactPersonName}</div>
                }
                </div>
              </div>
            }

            <div>
              <div className="font-semibold mb-2">Dokumentdetails:</div>
              <div className="space-y-1">
                <div>
                  {config.numberLabel}:{' '}
                  {detectedType === 'quote' ?
                  data.quoteNumber ||
                  data.documentNumber ||
                  data.title ||
                  data.invoiceNumber ||
                  'AN-000' :
                  data.invoiceNumber || data.documentNumber || data.title || 'DOKUMENT'}
                </div>
                <div>
                  {config.dateLabel}:{' '}
                  {formatDate(
                    detectedType === 'quote' ?
                    data.quoteDate ||
                    data.date ||
                    data.invoiceDate ||
                    new Date().toISOString().split('T')[0] :
                    data.invoiceDate || data.date || new Date().toISOString().split('T')[0]
                  )}
                </div>
                {config.showDueDate &&
                <div>
                    {config.dueDateLabel}:{' '}
                    {(() => {
                    const fallbackDate = formatDate(
                      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    );
                    const targetDate =
                    detectedType === 'quote' ?
                    data.validUntil || data.dueDate || fallbackDate :
                    data.dueDate || data.validUntil || fallbackDate;
                    // Wenn es wie YYYY-MM-DD aussieht, nochmals formatieren, ansonsten direkt verwenden
                    return targetDate.match(/^\d{4}-\d{2}-\d{2}$/) ?
                    formatDate(targetDate) :
                    targetDate;
                  })()}
                  </div>
                }
                {config.showPaymentTerms && <div>Zahlungsziel: {data.paymentTerms}</div>}
              </div>
            </div>
          </div>

          {/* Betreff - Nur bei Stornorechnungen */}
          {detectedType === 'cancellation' && data.title && (
            <div className="mb-6">
              <div className="font-semibold text-sm text-gray-600 mb-1">Betreff:</div>
              <div className="font-medium text-base text-gray-900">
                {data.title}
              </div>
            </div>
          )}

          {/* Header Text (Kopftext) */}
          {data.processedHeaderText &&
          <div
            className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4"
            style={{ borderColor: config.color }}>

              <div
              className="text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: data.processedHeaderText
              }} />

            </div>
          }

          {/* Head Text / Einleitung (processedHeadTextHtml) */}
          {data.processedHeadTextHtml &&
            <div className="mb-4">
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: data.processedHeadTextHtml,
                }}
              />
            </div>
          }

          <div className="border-t-2 mb-4" style={{ borderColor: color }}></div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable
            data={data}
            color={config.color}
            variant="neutral"
            showArticleNumber={documentSettings?.showArticleNumber}
            showVATPerPosition={documentSettings?.showVATPerPosition}
            language={documentSettings?.language || 'de'} />


          {/* Totals und Footer NUR bei einseitigem Modus */}
          {pageMode === 'single' &&
          <>
              {/* Totals */}
              <div className="flex justify-between items-start gap-8 mb-8 mt-8">
                <div className="flex-1 space-y-4">
                  <TaxRulesInfo
                  data={data}
                  color={color}
                  language={documentSettings?.language || 'de'} />

                </div>
                <TotalsDisplay
                data={data}
                color={color}
                variant="standard"
                language={documentSettings?.language || 'de'} />

              </div>

              {/* FooterText */}
              <FooterText
              data={data}
              language={data.language || 'de'}
              variant="standard"
              documentType={detectedType} />


              {/* EPC-QR-Code */}
              {(data.epcQrCodeUrl || documentSettings?.epcQrCodeUrl) &&
            <div className="mt-2">
                  <img
                src={data.epcQrCodeUrl || documentSettings?.epcQrCodeUrl}
                alt="EPC-QR-Code"
                className="w-12 h-12" />

                </div>
            }
            </>
          }
        </div>

        {/* FOOTER auf Seite 1 - IMMER bei Single, AUCH bei Multi */}
        {documentSettings?.showFooter !== false &&
        <div className="bg-white p-2 mt-1">
            <SimpleFooter data={data} color={color} />
          </div>
        }
      </div>

      {/* ========= AUTOMATISCHE EIN-/MEHRSEITIG LOGIK ========= */}
      {/* Zweite Seite IMMER bei mehrseitigem Modus */}
      {pageMode !== 'single' &&
      <>
          {/* ========= SEITENUMBRUCH ========= */}
          <div style={{ pageBreakBefore: 'always', height: '0' }}></div>

          {/* ========= SEITE 2 (nur bei > 3 Items) ========= */}
          <div
          className="pdf-page flex flex-col bg-white"
          style={{
            minHeight: '297mm',
            height: '297mm',
            pageBreakAfter: 'avoid',
            breakAfter: 'avoid'
          }}>

            {/* Seitenzahl Seite 2 */}
            {documentSettings?.showPageNumbers &&
          <div className="absolute bottom-4 right-6 text-xs text-gray-500 z-10">Seite 2</div>
          }
            {/* Header Seite 2 */}
            <div className="p-6 pb-4">
              <div
              className="border-b-2 pb-6 mb-8"
              style={{ minHeight: data.companyLogo ? '120px' : '80px', borderColor: color }}>

                <div className="flex justify-between items-start">
                  <div className="shrink-0">
                    {data.companyLogo &&
                  <img
                    src={data.companyLogo}
                    alt={data.companyName}
                    className="h-16 w-auto object-contain"
                    style={{ maxHeight: `${logoSize}px` }} />

                  }
                    <h1 className="text-2xl font-medium mb-2 mt-4">{data.documentLabel}</h1>
                    <p className="text-gray-700">Nr. {data.invoiceNumber}</p>
                  </div>

                  <div className="text-right text-xs text-gray-700 leading-relaxed">
                    <div className="font-bold text-lg text-gray-900">{data.companyName}</div>
                    {data.companyAddressParsed.street &&
                  <div>{data.companyAddressParsed.street}</div>
                  }
                    {(data.companyAddressParsed.postalCode || data.companyAddressParsed.city) &&
                  <div>
                        {data.companyAddressParsed.postalCode} {data.companyAddressParsed.city}
                      </div>
                  }
                    {data.companyAddressParsed.country &&
                  <div>{data.companyAddressParsed.country}</div>
                  }
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                {data.customerName &&
              <div>
                    <div className="font-semibold mb-2">{config.recipientLabel}:</div>
                    <div className="space-y-1">
                      <div className="font-medium">{data.customerName}</div>
                      {data.customerAddressParsed.street &&
                  <div>{data.customerAddressParsed.street}</div>
                  }
                      {(data.customerAddressParsed.postalCode ||
                  data.customerAddressParsed.city) &&
                  <div>
                          {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                        </div>
                  }
                      {data.customerAddressParsed.country &&
                  <div>{data.customerAddressParsed.country}</div>
                  }
                      {data.customerVatId && <div>USt-IdNr.: {data.customerVatId}</div>}
                    </div>
                  </div>
              }

                <div>
                  <div className="font-semibold mb-2">{config.title}details:</div>
                  <div className="space-y-1">
                    <div>
                      Nr.{' '}
                      {detectedType === 'quote' ?
                    data.quoteNumber ||
                    data.documentNumber ||
                    data.title ||
                    data.invoiceNumber ||
                    'AN-000' :
                    data.invoiceNumber || data.documentNumber || data.title || 'DOKUMENT'}
                    </div>
                    <div>
                      {config.dateLabel}:{' '}
                      {formatDate(
                      detectedType === 'quote' ?
                      data.quoteDate ||
                      data.date ||
                      data.invoiceDate ||
                      new Date().toISOString().split('T')[0] :
                      data.invoiceDate || data.date || new Date().toISOString().split('T')[0]
                    )}
                    </div>
                    {config.showDueDate &&
                  <div>
                        {config.dueDateLabel}:{' '}
                        {(() => {
                      const fallbackDate = formatDate(
                        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).
                        toISOString().
                        split('T')[0]
                      );
                      const targetDate =
                      detectedType === 'quote' ?
                      data.validUntil || data.dueDate || fallbackDate :
                      data.dueDate || data.validUntil || fallbackDate;
                      // Wenn es wie YYYY-MM-DD aussieht, nochmals formatieren, ansonsten direkt verwenden
                      return targetDate.match(/^\d{4}-\d{2}-\d{2}$/) ?
                      formatDate(targetDate) :
                      targetDate;
                    })()}
                      </div>
                  }
                  </div>
                </div>
              </div>

              {/* Betreff - Nur bei Stornorechnungen (Seite 2) */}
              {detectedType === 'cancellation' && data.title && (
                <div className="mb-6">
                  <div className="font-semibold text-sm text-gray-600 mb-1">Betreff:</div>
                  <div className="font-medium text-base text-gray-900">
                    {data.title}
                  </div>
                </div>
              )}

              <div className="border-t-2 mb-4" style={{ borderColor: color }}></div>
            </div>

            {/* Fortsetzung + Totals Seite 2 */}
            <div className="px-6 flex-1">
              <div className="mb-8">
                <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
                <div className="text-xs text-gray-600 mb-4">
                  Weitere Details und Zusammenfassung
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-start gap-8 mb-8">
                <div className="flex-1 space-y-4">
                  <TaxRulesInfo
                  data={data}
                  color={color}
                  language={documentSettings?.language || 'de'} />

                </div>
                <TotalsDisplay
                data={data}
                color={color}
                variant="standard"
                language={documentSettings?.language || 'de'} />

              </div>

              <FooterText
              data={data}
              language={data.language || 'de'}
              variant="standard"
              documentType={detectedType} />


              {/* EPC-QR-Code */}
              {(data.epcQrCodeUrl || documentSettings?.epcQrCodeUrl) &&
            <div className="mt-2">
                  <img
                src={data.epcQrCodeUrl || documentSettings?.epcQrCodeUrl}
                alt="EPC-QR-Code"
                className="w-12 h-12" />

                </div>
            }
            </div>

            {/* SPACER um Seite zu füllen */}
            <div className="flex-1 bg-white"></div>

            {/* === FOOTER AM ENDE DER LETZTEN SEITE === */}
            {documentSettings?.showFooter !== false &&
          <div className="bg-white p-2">
                <SimpleFooter data={data} color={color} />
              </div>
          }
          </div>
        </>
      }
    </div>);

};
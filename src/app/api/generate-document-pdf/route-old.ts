import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { InvoiceData } from '@/types/invoiceTypes';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { formatCurrency, formatDate } from '@/lib/utils';
import PDFTemplate from '@/components/finance/PDFTemplates';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

// Interface für Firmendaten
interface CompanyBrandingData {
  brandColor?: string;
  logoUrl?: string;
  logoSize?: number;
  companyName?: string;
}

// Hilfsfunktion zum Laden der Firmendaten
async function getCompanyBrandingData(companyId: string): Promise<CompanyBrandingData> {
  try {
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    const companyData = companyDoc.data();
    
    console.log('Company data loaded:', companyId, companyData); // Debug-Log
    
    // Mögliche Feldnamen für Farbe prüfen
    const possibleColorFields = [
      companyData?.brandColor,
      companyData?.themeColor, 
      companyData?.primaryColor,
      companyData?.accentColor,
      companyData?.color
    ];
    
    const brandColor = possibleColorFields.find(color => color) || '#14ad9f'; // Taskilo-Standard-Farbe
    
    return {
      brandColor,
      logoUrl: companyData?.logoUrl || companyData?.logo || companyData?.logoPath || undefined,
      logoSize: companyData?.logoSize || companyData?.logoWidth || 50,
      companyName: companyData?.companyName || companyData?.name || companyData?.displayName || 'Unbekannt'
    };
  } catch (error) {
    console.warn('Could not load company branding data:', error);
    return {
      brandColor: '#14ad9f', // Taskilo-Standard-Farbe
      logoUrl: undefined,
      logoSize: 50,
      companyName: 'Unbekannt'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { document, documentType, template, companyId } = await request.json();

    if (!document || !documentType || !template) {
      return NextResponse.json(
        { error: 'Document, documentType and template are required' },
        { status: 400 }
      );
    }

    // Generate PDF using our real 6 templates!
    const pdfBase64 = await generatePdfWithRealTemplates(
      document as InvoiceData,
      documentType,
      template,
      companyId
    );
    
    return NextResponse.json({ 
      pdfBase64,
      success: true 
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF with templates' },
      { status: 500 }
    );
  }
}

// ✅ Verwende die echten React Templates aus PDFTemplates.tsx!
import PDFTemplate from '@/components/finance/PDFTemplates';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

function generateTemplateHTML(
  document: InvoiceData, 
  template: string, 
  brandingData: CompanyBrandingData, 
  documentType: string
): string {
  console.log(`🎨 Generating HTML for template: ${template}`);
  
  try {
    // ✅ Verwende die echten React Templates!
    const templateComponent = React.createElement(PDFTemplate, {
      template: template.toUpperCase().replace(/^/, 'TEMPLATE_'), // 'standard' -> 'TEMPLATE_STANDARD'
      document: document,
      companyBrandingData: brandingData,
      documentType: documentType
    });

    // ✅ Rendere React zu HTML (Next.js 15 kompatibel)
    const htmlContent = renderToStaticMarkup(templateComponent);
    
    return htmlContent;
  } catch (error) {
    console.error('Error rendering React template:', error);
    // Fallback zu einfachem HTML bei Fehlern
    return `
      <div class="max-w-210mm min-h-297mm mx-auto p-6 bg-white text-xs">
        <div class="text-center text-red-500">
          <p>Fehler beim Rendern des Templates: ${template}</p>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    `;
  }
}

async function generatePdfWithRealTemplates(
  document: InvoiceData,
  brandingData: CompanyBrandingData,
  documentType: string,
  documentLabel: string,
  documentNumber: string
): string {
  return `
    <div class="max-w-210mm min-h-297mm mx-auto p-6 bg-white text-xs">
      <!-- Simple Header -->
      <div class="border-b-2 pb-6 mb-8" style="border-color: ${brandingData.brandColor};">
        <div class="flex justify-between items-center">
          <div class="text-2xl font-light">${brandingData.companyName}</div>
          <div class="text-right">
            <h1 class="text-xl font-medium">${documentLabel}</h1>
            <p class="text-gray-500">Nr: ${documentNumber}</p>
            <p class="text-gray-500">Datum: ${formatDate(document.date)}</p>
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="mb-8 p-4 bg-gray-50">
        <h3 class="font-medium mb-3">Rechnungsadresse:</h3>
        <div>
          <p class="font-medium">${document.customerName}</p>
          <p>${document.customerAddress}</p>
          ${document.customerEmail ? `<p>${document.customerEmail}</p>` : ''}
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <table class="w-full">
          <thead>
            <tr class="border-b-2" style="border-color: ${brandingData.brandColor};">
              <th class="p-3 text-left font-medium">Beschreibung</th>
              <th class="p-3 text-right font-medium">Menge</th>
              <th class="p-3 text-right font-medium">Preis</th>
              <th class="p-3 text-right font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${document.items.map((item, index) => `
              <tr class="${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
                <td class="p-3">${item.description}</td>
                <td class="p-3 text-right">${item.quantity} ${item.unit || 'Stk.'}</td>
                <td class="p-3 text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="p-3 text-right">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-1/2 space-y-2">
          <div class="flex justify-between py-1">
            <span>Zwischensumme:</span>
            <span>${formatCurrency(document.amount || 0)}</span>
          </div>
          ${document.tax > 0 ? `
            <div class="flex justify-between py-1">
              <span>MwSt. (${document.vatRate || 19}%):</span>
              <span>${formatCurrency(document.tax)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between py-2 font-bold border-t-2 text-lg" style="border-color: ${brandingData.brandColor}; color: ${brandingData.brandColor};">
            <span>Gesamtbetrag:</span>
            <span>${formatCurrency(document.total)}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 pt-4 border-t text-center text-gray-500 text-xs">
        <p>Vielen Dank für Ihr Vertrauen!</p>
        <p>${brandingData.companyName} | Erstellt mit Taskilo</p>
      </div>
    </div>
  `;
}

// Elegant Template - Luxuriöses Design
function generateElegantTemplate(
  document: InvoiceData,
  brandingData: CompanyBrandingData,
  documentType: string,
  documentLabel: string,
  documentNumber: string
): string {
  return `
    <div class="max-w-210mm min-h-297mm mx-auto p-8 bg-white text-xs">
      <!-- Elegant Header -->
      <div class="text-center mb-10 relative">
        <div class="absolute inset-x-0 top-0 h-1" style="background: linear-gradient(90deg, transparent, ${brandingData.brandColor}, transparent);"></div>
        <div class="pt-6">
          <h1 class="text-3xl font-light tracking-wide mb-2" style="color: ${brandingData.brandColor};">${brandingData.companyName}</h1>
          <div class="text-lg font-light text-gray-600">${documentLabel}</div>
          <div class="mt-4 space-y-1 text-gray-500">
            <p>Nummer: ${documentNumber}</p>
            <p>Datum: ${formatDate(document.date)}</p>
          </div>
        </div>
      </div>

      <!-- Customer Section -->
      <div class="mb-10">
        <div class="border-l-4 pl-6 py-4" style="border-color: ${brandingData.brandColor};">
          <h3 class="font-light text-lg mb-3" style="color: ${brandingData.brandColor};">Rechnungsempfänger</h3>
          <div class="space-y-1">
            <p class="font-medium text-base">${document.customerName}</p>
            <p class="text-gray-700">${document.customerAddress}</p>
            ${document.customerEmail ? `<p class="text-gray-700">${document.customerEmail}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="mb-10">
        <h3 class="font-light text-lg mb-4" style="color: ${brandingData.brandColor};">Leistungsübersicht</h3>
        <div class="space-y-3">
          ${document.items.map(item => `
            <div class="flex justify-between items-center py-3 border-b border-gray-200">
              <div class="flex-1">
                <p class="font-medium">${item.description}</p>
                <p class="text-gray-500 text-sm">${item.quantity} ${item.unit || 'Stk.'} × ${formatCurrency(item.unitPrice)}</p>
              </div>
              <div class="font-medium" style="color: ${brandingData.brandColor};">
                ${formatCurrency(item.total)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Totals -->
      <div class="mb-10">
        <div class="flex justify-end">
          <div class="w-1/2 space-y-3">
            <div class="flex justify-between text-gray-600">
              <span>Zwischensumme:</span>
              <span>${formatCurrency(document.amount || 0)}</span>
            </div>
            ${document.tax > 0 ? `
              <div class="flex justify-between text-gray-600">
                <span>MwSt. (${document.vatRate || 19}%):</span>
                <span>${formatCurrency(document.tax)}</span>
              </div>
            ` : ''}
            <div class="border-t-2 pt-3" style="border-color: ${brandingData.brandColor};">
              <div class="flex justify-between text-xl font-light" style="color: ${brandingData.brandColor};">
                <span>Gesamtbetrag:</span>
                <span>${formatCurrency(document.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Elegant Footer -->
      <div class="text-center mt-12 pt-6 border-t border-gray-200">
        <div class="text-gray-500 space-y-2">
          <p class="italic">Vielen Dank für Ihr Vertrauen!</p>
          <p class="text-xs">${brandingData.companyName} | Erstellt mit Taskilo</p>
        </div>
      </div>
    </div>
  `;
}

// Technical Template - Moderne, strukturierte Darstellung
function generateTechnicalTemplate(
  document: InvoiceData,
  brandingData: CompanyBrandingData,
  documentType: string,
  documentLabel: string,
  documentNumber: string
): string {
  return `
    <div class="max-w-210mm min-h-297mm mx-auto p-6 bg-white text-xs font-mono">
      <!-- Technical Header -->
      <div class="bg-gray-900 text-white p-4 -mx-6 mb-8">
        <div class="flex justify-between items-center">
          <div>
            <div class="text-lg font-bold">${brandingData.companyName}</div>
            <div class="text-sm opacity-75">Professional Services</div>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold" style="color: ${brandingData.brandColor};">${documentLabel}</div>
            <div class="text-sm">#${documentNumber}</div>
            <div class="text-sm">${formatDate(document.date)}</div>
          </div>
        </div>
      </div>

      <!-- Grid Layout -->
      <div class="grid grid-cols-2 gap-8 mb-8">
        <!-- Client Info -->
        <div>
          <div class="bg-gray-100 px-3 py-2 font-bold text-sm" style="color: ${brandingData.brandColor};">
            CLIENT INFORMATION
          </div>
          <div class="border border-gray-300 p-3 space-y-1">
            <div class="font-bold">${document.customerName}</div>
            <div>${document.customerAddress}</div>
            ${document.customerEmail ? `<div>${document.customerEmail}</div>` : ''}
          </div>
        </div>
        
        <!-- Document Info -->
        <div>
          <div class="bg-gray-100 px-3 py-2 font-bold text-sm" style="color: ${brandingData.brandColor};">
            DOCUMENT DETAILS
          </div>
          <div class="border border-gray-300 p-3 space-y-1">
            <div><span class="font-bold">Type:</span> ${documentLabel}</div>
            <div><span class="font-bold">Number:</span> ${documentNumber}</div>
            <div><span class="font-bold">Date:</span> ${formatDate(document.date)}</div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <div class="bg-gray-100 px-3 py-2 font-bold text-sm" style="color: ${brandingData.brandColor};">
          LINE ITEMS
        </div>
        <table class="w-full border border-gray-300">
          <thead class="bg-gray-50">
            <tr>
              <th class="border-r border-gray-300 p-2 text-left font-bold">DESCRIPTION</th>
              <th class="border-r border-gray-300 p-2 text-right font-bold">QTY</th>
              <th class="border-r border-gray-300 p-2 text-right font-bold">RATE</th>
              <th class="p-2 text-right font-bold">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${document.items.map((item, index) => `
              <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                <td class="border-r border-t border-gray-300 p-2">${item.description}</td>
                <td class="border-r border-t border-gray-300 p-2 text-right">${item.quantity}</td>
                <td class="border-r border-t border-gray-300 p-2 text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="border-t border-gray-300 p-2 text-right font-bold">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-1/2">
          <table class="w-full">
            <tr>
              <td class="p-2 text-right">SUBTOTAL:</td>
              <td class="p-2 text-right font-bold">${formatCurrency(document.amount || 0)}</td>
            </tr>
            ${document.tax > 0 ? `
              <tr>
                <td class="p-2 text-right">VAT (${document.vatRate || 19}%):</td>
                <td class="p-2 text-right">${formatCurrency(document.tax)}</td>
              </tr>
            ` : ''}
            <tr class="bg-gray-900 text-white">
              <td class="p-2 text-right font-bold">TOTAL:</td>
              <td class="p-2 text-right font-bold text-lg" style="color: ${brandingData.brandColor};">${formatCurrency(document.total)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-gray-500 text-xs mt-8 font-sans">
        <p>Thank you for your business!</p>
        <p>${brandingData.companyName} | Generated with Taskilo</p>
      </div>
    </div>
  `;
}

// Geometric Template - Moderne geometrische Formen
function generateGeometricTemplate(
  document: InvoiceData,
  brandingData: CompanyBrandingData,
  documentType: string,
  documentLabel: string,
  documentNumber: string
): string {
  return `
    <div class="max-w-210mm min-h-297mm mx-auto p-6 bg-white text-xs relative">
      <!-- Geometric Background Elements -->
      <div class="absolute top-0 right-0 w-32 h-32 opacity-10" style="background: linear-gradient(135deg, ${brandingData.brandColor}, transparent);"></div>
      <div class="absolute bottom-0 left-0 w-24 h-24 opacity-10" style="background: linear-gradient(45deg, ${brandingData.brandColor}, transparent);"></div>

      <!-- Header with Geometric Elements -->
      <div class="relative mb-8">
        <div class="flex items-center mb-4">
          <div class="w-3 h-3 mr-3" style="background-color: ${brandingData.brandColor}; transform: rotate(45deg);"></div>
          <h1 class="text-2xl font-bold">${brandingData.companyName}</h1>
        </div>
        
        <div class="flex justify-between items-end">
          <div class="space-y-1">
            <div class="flex items-center">
              <div class="w-2 h-2 mr-2" style="background-color: ${brandingData.brandColor};"></div>
              <span class="font-medium">Dokument-Nr:</span>
              <span class="ml-2">${documentNumber}</span>
            </div>
            <div class="flex items-center">
              <div class="w-2 h-2 mr-2" style="background-color: ${brandingData.brandColor};"></div>
              <span class="font-medium">Datum:</span>
              <span class="ml-2">${formatDate(document.date)}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-light" style="color: ${brandingData.brandColor};">${documentLabel}</div>
          </div>
        </div>
      </div>

      <!-- Customer Info with Geometric Border -->
      <div class="mb-8 relative">
        <div class="absolute -left-2 top-0 bottom-0 w-1" style="background-color: ${brandingData.brandColor};"></div>
        <div class="pl-6">
          <h3 class="font-bold mb-3 flex items-center">
            <div class="w-3 h-3 mr-2" style="background-color: ${brandingData.brandColor}; clip-path: polygon(0 0, 100% 50%, 0 100%);"></div>
            Rechnungsadresse
          </h3>
          <div class="space-y-1">
            <p class="font-medium">${document.customerName}</p>
            <p>${document.customerAddress}</p>
            ${document.customerEmail ? `<p>${document.customerEmail}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Items with Geometric Design -->
      <div class="mb-8">
        <h3 class="font-bold mb-4 flex items-center">
          <div class="w-4 h-4 mr-2" style="background-color: ${brandingData.brandColor}; clip-path: polygon(50% 0%, 0% 100%, 100% 100%);"></div>
          Leistungsverzeichnis
        </h3>
        
        <div class="space-y-2">
          ${document.items.map((item, index) => `
            <div class="flex justify-between items-center p-3 border-l-4" style="border-color: ${brandingData.brandColor}; background: linear-gradient(90deg, ${brandingData.brandColor}10, transparent);">
              <div class="flex-1">
                <div class="font-medium">${item.description}</div>
                <div class="text-gray-500 text-xs">${item.quantity} ${item.unit || 'Stk.'} × ${formatCurrency(item.unitPrice)}</div>
              </div>
              <div class="font-bold text-right" style="color: ${brandingData.brandColor};">
                ${formatCurrency(item.total)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Totals with Geometric Styling -->
      <div class="flex justify-end mb-8">
        <div class="w-1/2 space-y-2">
          <div class="flex justify-between py-2 border-b border-gray-200">
            <span>Zwischensumme:</span>
            <span>${formatCurrency(document.amount || 0)}</span>
          </div>
          ${document.tax > 0 ? `
            <div class="flex justify-between py-2 border-b border-gray-200">
              <span>MwSt. (${document.vatRate || 19}%):</span>
              <span>${formatCurrency(document.tax)}</span>
            </div>
          ` : ''}
          <div class="relative">
            <div class="absolute -left-4 top-0 bottom-0 w-2" style="background-color: ${brandingData.brandColor};"></div>
            <div class="flex justify-between py-3 font-bold text-lg pl-2" style="color: ${brandingData.brandColor};">
              <span>Gesamtbetrag:</span>
              <span>${formatCurrency(document.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-12 text-gray-500 text-xs">
        <div class="flex items-center justify-center mb-2">
          <div class="w-2 h-2 mr-2" style="background-color: ${brandingData.brandColor}; transform: rotate(45deg);"></div>
          <span>Vielen Dank für Ihr Vertrauen!</span>
          <div class="w-2 h-2 ml-2" style="background-color: ${brandingData.brandColor}; transform: rotate(45deg);"></div>
        </div>
        <p>${brandingData.companyName} | Erstellt mit Taskilo</p>
      </div>
    </div>
  `;
}

// Dynamic Template - Lebendiges, modernes Design
function generateDynamicTemplate(
  document: InvoiceData,
  brandingData: CompanyBrandingData,
  documentType: string,
  documentLabel: string,
  documentNumber: string
): string {
  return `
    <div class="max-w-210mm min-h-297mm mx-auto p-6 bg-white text-xs relative overflow-hidden">
      <!-- Dynamic Background -->
      <div class="absolute top-0 right-0 w-40 h-40 opacity-20" style="background: radial-gradient(circle, ${brandingData.brandColor}, transparent);"></div>
      <div class="absolute bottom-20 left-10 w-20 h-20 opacity-15" style="background: radial-gradient(circle, ${brandingData.brandColor}, transparent);"></div>

      <!-- Dynamic Header -->
      <div class="relative mb-8">
        <div class="bg-gradient-to-r from-gray-50 to-white p-6 -mx-6 mb-6" style="background: linear-gradient(135deg, ${brandingData.brandColor}15, transparent);">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style="background: linear-gradient(135deg, ${brandingData.brandColor}, #333);">
                ${brandingData.companyName}
              </h1>
              <p class="text-gray-600 mt-1">Professional Services</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold" style="color: ${brandingData.brandColor};">${documentLabel}</div>
              <div class="space-y-1 mt-2">
                <div class="flex items-center justify-end">
                  <span class="mr-2">Nr:</span>
                  <span class="font-bold">${documentNumber}</span>
                </div>
                <div class="flex items-center justify-end">
                  <span class="mr-2">Datum:</span>
                  <span class="font-bold">${formatDate(document.date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Card -->
      <div class="mb-8">
        <div class="bg-gradient-to-r p-6 rounded-lg shadow-sm" style="background: linear-gradient(135deg, ${brandingData.brandColor}20, ${brandingData.brandColor}05);">
          <h3 class="font-bold text-lg mb-3" style="color: ${brandingData.brandColor};">Rechnungsempfänger</h3>
          <div class="space-y-1">
            <p class="font-bold text-base">${document.customerName}</p>
            <p class="text-gray-700">${document.customerAddress}</p>
            ${document.customerEmail ? `<p class="text-gray-700">${document.customerEmail}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Dynamic Items -->
      <div class="mb-8">
        <h3 class="font-bold text-lg mb-4" style="color: ${brandingData.brandColor};">Leistungen</h3>
        <div class="space-y-3">
          ${document.items.map((item, index) => `
            <div class="bg-gradient-to-r p-4 rounded-lg transition-all hover:shadow-sm" style="background: linear-gradient(135deg, ${index % 2 === 0 ? brandingData.brandColor + '08' : 'transparent'}, transparent);">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h4 class="font-medium mb-1">${item.description}</h4>
                  <div class="text-gray-500 text-sm">
                    ${item.quantity} ${item.unit || 'Stk.'} × ${formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-lg" style="color: ${brandingData.brandColor};">
                    ${formatCurrency(item.total)}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Dynamic Totals -->
      <div class="mb-8">
        <div class="flex justify-end">
          <div class="w-1/2 bg-gradient-to-br p-6 rounded-lg" style="background: linear-gradient(135deg, ${brandingData.brandColor}10, transparent);">
            <div class="space-y-3">
              <div class="flex justify-between text-gray-600">
                <span>Zwischensumme:</span>
                <span class="font-medium">${formatCurrency(document.amount || 0)}</span>
              </div>
              ${document.tax > 0 ? `
                <div class="flex justify-between text-gray-600">
                  <span>MwSt. (${document.vatRate || 19}%):</span>
                  <span class="font-medium">${formatCurrency(document.tax)}</span>
                </div>
              ` : ''}
              <div class="border-t-2 pt-3" style="border-color: ${brandingData.brandColor};">
                <div class="flex justify-between text-2xl font-bold" style="color: ${brandingData.brandColor};">
                  <span>Total:</span>
                  <span>${formatCurrency(document.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Footer -->
      <div class="text-center mt-12 relative">
        <div class="bg-gradient-to-r p-4 rounded-lg" style="background: linear-gradient(135deg, ${brandingData.brandColor}15, transparent);">
          <p class="font-medium mb-2" style="color: ${brandingData.brandColor};">Vielen Dank für Ihr Vertrauen!</p>
          <p class="text-gray-500 text-xs">${brandingData.companyName} | Erstellt mit Taskilo</p>
        </div>
      </div>
    </div>
  `;
}

async function generatePdfWithRealTemplates(
  document: InvoiceData,
  documentType: string,
  template: string,
  companyId: string
): Promise<string> {
  let browser;
  
  try {
    // ✅ Lade dynamische Firmendaten für Branding
    const brandingData = await getCompanyBrandingData(companyId);
    
    console.log(`Generating PDF for company ${companyId} with template ${template}`);
    console.log('Company branding:', brandingData);
    
    // ✅ Generiere HTML direkt ohne React (Next.js 15 konforme Lösung)
    const htmlContent = generateTemplateHTML(document, template, brandingData, documentType);
    
    // ✅ Verbessertes HTML mit verlinktem Stylesheet statt hardgecodeten CSS
    // Die BASE_URL wird für CSS-Verlinkung benötigt
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${documentType} ${document.invoiceNumber}</title>
          
          <!-- ✅ Verlinke die globale CSS-Datei statt manuelles Kopieren -->
          <link rel="stylesheet" href="${baseUrl}/_next/static/css/app/layout.css" />
          
          <style>
            /* Nur noch absolut notwendige PDF-spezifische Styles */
            @page {
              size: A4;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000000;
              background: #ffffff;
            }
            /* PDF-Container für A4-Format */
            .pdf-container {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
            }
            /* Sicherstellen, dass alle Templates korrekt dargestellt werden */
            .max-w-210mm { max-width: 210mm !important; }
            .min-h-297mm { min-height: 297mm !important; }
            /* Print-optimierte Styles */
            .print-exact * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container print-exact">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    // ✅ Launch Playwright mit optimierten Einstellungen (viel besser als Puppeteer!)
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Reduziert Speicherverbrauch
        '--disable-web-security', // Erlaubt lokale CSS-Dateien
        '--allow-running-insecure-content' // Für lokale Entwicklung
      ]
    });

    const page = await browser.newPage();
    
    // ✅ Setze Viewport für konsistentes A4-Rendering
    await page.setViewportSize({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    });
    
    // ✅ Playwright ist schneller und zuverlässiger bei der Content-Ladung
    await page.setContent(fullHtml, { 
      waitUntil: 'networkidle',
      timeout: 30000 // 30 Sekunden Timeout für komplexe Templates
    });
    
    // ✅ Playwright PDF-Generierung - viel besser als Puppeteer!
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true, // Verwendet @page CSS-Regeln
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      },
      // ✅ Playwright bietet bessere PDF-Qualität
      displayHeaderFooter: false,
      tagged: true, // Für Barrierefreiheit (Accessibility)
    });

    // Convert to base64
    const pdfBase64 = pdfBuffer.toString('base64');
    
    return pdfBase64;

  } catch (error) {
    console.error('Error generating PDF with real templates:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
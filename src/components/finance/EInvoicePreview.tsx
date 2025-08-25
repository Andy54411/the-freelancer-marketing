'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  User,
  Calendar,
  CreditCard,
  Package,
  AlertCircle,
  CheckCircle,
  FileText,
  Euro,
} from 'lucide-react';
import { EInvoiceData } from '@/services/eInvoiceService';

interface EInvoicePreviewProps {
  invoice: EInvoiceData;
}

interface ParsedInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  typeCode: string;
  currency: string;
  seller: {
    name: string;
    address: string;
    vatId: string;
  };
  buyer: {
    name: string;
    address: string;
  };
  amounts: {
    lineTotal: string;
    taxBasis: string;
    taxAmount: string;
    grandTotal: string;
    dueAmount: string;
  };
  tax: {
    rate: string;
    category: string;
    amount: string;
  };
  lineItems: Array<{
    id: string;
    name: string;
    quantity: string;
    unitCode: string;
    unitPrice: string;
    lineTotal: string;
  }>;
}

function parseZUGFeRDData(xmlContent: string): ParsedInvoiceData | null {
  try {
    // Parse XML content to extract structured data
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Helper function to get text content by tag name
    const getTextContent = (tagName: string): string => {
      const elements = xmlDoc.getElementsByTagName(tagName);
      return elements.length > 0 ? elements[0].textContent || '' : '';
    };

    // Hilfsfunktion zum Extrahieren von verschachtelten Elementen
    const getNestedTextContent = (parentTag: string, childTag: string): string => {
      const parentElements = xmlDoc.getElementsByTagName(parentTag);
      if (parentElements.length > 0) {
        const childElements = parentElements[0].getElementsByTagName(childTag);
        return childElements.length > 0 ? childElements[0].textContent || '' : '';
      }
      return '';
    };

    // Extract basic invoice data
    const invoiceNumber = getTextContent('ram:ID');
    const typeCode = getTextContent('ram:TypeCode');
    const currency = getTextContent('ram:InvoiceCurrencyCode');

    // Parse dates
    const issueDateRaw = getTextContent('udt:DateTimeString');
    const issueDate = issueDateRaw ? formatDate(issueDateRaw) : '';

    // Due date aus DueDateDateTime extrahieren - sicherer Ansatz
    const dueDate = getNestedTextContent('ram:DueDateDateTime', 'udt:DateTimeString');
    const formattedDueDate = dueDate ? formatDate(dueDate) : '';

    // Extract seller information
    const sellerElements = xmlDoc.getElementsByTagName('ram:SellerTradeParty')[0];
    const vatRegistrationElement = sellerElements
      ?.getElementsByTagName('ram:SpecifiedTaxRegistration')[0]
      ?.getElementsByTagName('ram:ID')[0];
    const seller = {
      name: sellerElements?.getElementsByTagName('ram:Name')[0]?.textContent || '',
      address: buildAddress(sellerElements),
      vatId: vatRegistrationElement?.textContent || '',
    };

    // Extract buyer information
    const buyerElements = xmlDoc.getElementsByTagName('ram:BuyerTradeParty')[0];
    const buyer = {
      name: buyerElements?.getElementsByTagName('ram:Name')[0]?.textContent || '',
      address: buildAddress(buyerElements),
    };

    // Extract monetary amounts
    const amounts = {
      lineTotal: getTextContent('ram:LineTotalAmount'),
      taxBasis: getTextContent('ram:TaxBasisTotalAmount'),
      taxAmount: getTextContent('ram:TaxTotalAmount'),
      grandTotal: getTextContent('ram:GrandTotalAmount'),
      dueAmount: getTextContent('ram:DuePayableAmount'),
    };

    // Extract tax information
    const tax = {
      rate: getTextContent('ram:RateApplicablePercent'),
      category: getTextContent('ram:CategoryCode'),
      amount: getTextContent('ram:CalculatedAmount'),
    };

    // Extract line items
    const lineItemElements = xmlDoc.getElementsByTagName('ram:IncludedSupplyChainTradeLineItem');
    const lineItems = Array.from(lineItemElements).map((item, index) => {
      const lineId =
        item.getElementsByTagName('ram:LineID')[0]?.textContent || (index + 1).toString();
      const productElement = item.getElementsByTagName('ram:SpecifiedTradeProduct')[0];
      const productName = productElement?.getElementsByTagName('ram:Name')[0]?.textContent || '';

      const quantityElement = item.getElementsByTagName('ram:BilledQuantity')[0];
      const quantity = quantityElement?.textContent || '';
      const unitCode = quantityElement?.getAttribute('unitCode') || '';

      const priceElement = item
        .getElementsByTagName('ram:NetPriceProductTradePrice')[0]
        ?.getElementsByTagName('ram:ChargeAmount')[0];
      const unitPrice = priceElement?.textContent || '';

      const totalElement = item
        .getElementsByTagName('ram:SpecifiedTradeSettlementLineMonetarySummation')[0]
        ?.getElementsByTagName('ram:LineTotalAmount')[0];
      const lineTotal = totalElement?.textContent || '';

      return {
        id: lineId,
        name: productName,
        quantity,
        unitCode,
        unitPrice,
        lineTotal,
      };
    });

    return {
      invoiceNumber,
      issueDate,
      dueDate: formattedDueDate,
      typeCode,
      currency,
      seller,
      buyer,
      amounts,
      tax,
      lineItems,
    };
  } catch (error) {

    return null;
  }
}

function buildAddress(partyElement: Element | null): string {
  if (!partyElement) return '';

  const address = partyElement.getElementsByTagName('ram:PostalTradeAddress')[0];
  if (!address) return '';

  const parts = [
    address.getElementsByTagName('ram:LineOne')[0]?.textContent,
    `${address.getElementsByTagName('ram:PostcodeCode')[0]?.textContent || ''} ${address.getElementsByTagName('ram:CityName')[0]?.textContent || ''}`.trim(),
    address.getElementsByTagName('ram:CountryID')[0]?.textContent,
  ].filter(Boolean);

  return parts.join(', ');
}

function formatDate(dateString: string): string {
  if (!dateString || dateString.length !== 8) return dateString;

  // Format: YYYYMMDD -> DD.MM.YYYY
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);

  return `${day}.${month}.${year}`;
}

function formatAmount(amount: string, currency: string = 'EUR'): string {
  if (!amount) return '';

  const num = parseFloat(amount);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(num);
}

function getUnitCodeDisplay(unitCode: string): string {
  const unitCodes: Record<string, string> = {
    HUR: 'Stunden',
    PCE: 'Stück',
    DAY: 'Tage',
    MTR: 'Meter',
    KGM: 'Kilogramm',
  };

  return unitCodes[unitCode] || unitCode;
}

export function EInvoicePreview({ invoice }: EInvoicePreviewProps) {
  const parsedData = parseZUGFeRDData(invoice.xmlContent);

  if (!parsedData) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Die E-Rechnung konnte nicht gelesen werden.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Invoice Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-[#14ad9f]" />
              <div>
                <CardTitle className="text-xl">E-Rechnung {parsedData.invoiceNumber}</CardTitle>
                <p className="text-sm text-gray-600">
                  {invoice.format.toUpperCase()} Format • Standard: {invoice.standard}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {invoice.validationStatus === 'valid' ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Gültig
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Ungültig
                </Badge>
              )}
              <Badge variant="outline">
                {parsedData.typeCode === '380' ? 'Rechnung' : `Typ ${parsedData.typeCode}`}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seller Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-[#14ad9f]" />
              <span>Rechnungssteller</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-gray-900">{parsedData.seller.name}</p>
              <p className="text-sm text-gray-600">{parsedData.seller.address}</p>
            </div>
            {parsedData.seller.vatId && (
              <div>
                <p className="text-sm font-medium text-gray-700">USt-IdNr.</p>
                <p className="text-sm text-gray-600">{parsedData.seller.vatId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buyer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-[#14ad9f]" />
              <span>Rechnungsempfänger</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-gray-900">{parsedData.buyer.name}</p>
              <p className="text-sm text-gray-600">{parsedData.buyer.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Amounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-[#14ad9f]" />
              <span>Rechnungssumme</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nettobetrag:</span>
                <span className="font-medium">
                  {formatAmount(parsedData.amounts.lineTotal, parsedData.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">MwSt ({parsedData.tax.rate}%):</span>
                <span className="font-medium">
                  {formatAmount(parsedData.tax.amount, parsedData.currency)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Gesamtbetrag:</span>
                <span className="font-bold text-lg text-[#14ad9f]">
                  {formatAmount(parsedData.amounts.grandTotal, parsedData.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Dates and Payment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-[#14ad9f]" />
              <div>
                <p className="text-sm font-medium text-gray-700">Rechnungsdatum</p>
                <p className="font-semibold">{parsedData.issueDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-[#14ad9f]" />
              <div>
                <p className="text-sm font-medium text-gray-700">Fälligkeitsdatum</p>
                <p className="font-semibold">{parsedData.dueDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Euro className="h-5 w-5 text-[#14ad9f]" />
              <div>
                <p className="text-sm font-medium text-gray-700">Währung</p>
                <p className="font-semibold">{parsedData.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-[#14ad9f]" />
            <span>Rechnungspositionen</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parsedData.lineItems.map((item, index) => (
              <div key={index}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} {getUnitCodeDisplay(item.unitCode)} ×{' '}
                      {formatAmount(item.unitPrice, parsedData.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatAmount(item.lineTotal, parsedData.currency)}
                    </p>
                  </div>
                </div>
                {index < parsedData.lineItems.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Rechnungssumme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Nettobetrag</span>
              <span>{formatAmount(parsedData.amounts.lineTotal, parsedData.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Mehrwertsteuer ({parsedData.tax.rate}%)</span>
              <span>{formatAmount(parsedData.tax.amount, parsedData.currency)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Gesamtbetrag</span>
              <span className="text-[#14ad9f]">
                {formatAmount(parsedData.amounts.grandTotal, parsedData.currency)}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Zahlbetrag</span>
              <span>{formatAmount(parsedData.amounts.dueAmount, parsedData.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {invoice.validationErrors && invoice.validationErrors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Validierungsfehler</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {invoice.validationErrors.map((error, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="h-2 w-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

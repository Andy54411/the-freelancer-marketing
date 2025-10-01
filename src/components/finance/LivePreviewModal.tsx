'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  X,
  Palette,
  Layout,
  Settings,
  Image,
  ChevronRight,
  ChevronDown,
  Upload,
  Minus,
  Plus,
  Eye,
} from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';
import { TaxRuleType } from '@/types/taxRules';
import PDFTemplate from './PDFTemplates';
import { SimplePDFViewer } from './SimplePDFViewer';
import { A4_DIMENSIONS } from '@/utils/a4-page-utils';

// PreviewTemplateData type for compatibility with SendDocumentModal
type PreviewTemplateData = {
  invoiceNumber: string;
  documentNumber: string;
  date: string;
  validUntil?: string;
  dueDate?: string;
  title?: string;
  reference?: string;
  currency?: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  customer: {
    name: string;
    email: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
    taxNumber?: string;
    vatId?: string;
  };
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyLogo?: string;
  profilePictureURL?: string;
  companyVatId?: string;
  companyTaxNumber?: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
    category?: string;
    discountPercent?: number;
    unit?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  vatRate?: number;
  isSmallBusiness?: boolean;
  bankDetails?: {
    iban?: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
  };
  notes?: string;
  headTextHtml?: string;
  headerText?: string;
  introText?: string;
  description?: string;
  footerText?: string;
  contactPersonName?: string;
  internalContactPerson?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  selectedTemplate?: string;
  company?: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
    taxNumber: string;
    vatId: string;
    website: string;
    bankDetails: {
      iban: string;
      bic: string;
      accountHolder: string;
    };
  };
};

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: PreviewTemplateData; // ✅ NOW COMPATIBLE with SendDocumentModal!
  documentType: 'invoice' | 'quote' | 'reminder';
  companyId: string;
  selectedTemplate?: any; // Template selection
  replacePlaceholders?: (text: string, data: PreviewTemplateData) => string; // Placeholder engine
  // Callback um Änderungen an das Parent zu übertragen
  onSettingsChange?: (settings: PreviewSettings) => void;
}

interface PreviewSettings {
  template: string;
  color: string;
  logoUrl: string | null;
  logoSize: number;
  showPageNumbers: boolean;
  showFooter: boolean;
  showWatermark: boolean;
  language: string;
  showCustomerNumber: boolean;
  showContactPerson: boolean;
  showQrCode: boolean;
}

type PreviewSection = 'logo' | 'color' | 'layout' | 'settings';

export function LivePreviewModal({
  isOpen,
  onClose,
  document,
  documentType,
  companyId,
  selectedTemplate,
  replacePlaceholders,
  onSettingsChange,
}: LivePreviewModalProps) {
  // Convert PreviewTemplateData to InvoiceData for PDFTemplate compatibility
  const convertToInvoiceData = (previewData: PreviewTemplateData): InvoiceData => {
    // Helper function to safely convert date strings to valid dates
    const parseDate = (dateString?: string): string => {
      if (!dateString) return new Date().toISOString().split('T')[0];

      try {
        // If it's already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          const testDate = new Date(dateString);
          if (!isNaN(testDate.getTime())) {
            return dateString;
          }
        }

        // If it's in DD.MM.YYYY format, convert it
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
          const [day, month, year] = dateString.split('.');
          const isoDate = `${year}-${month}-${day}`;
          const testDate = new Date(isoDate);
          if (!isNaN(testDate.getTime())) {
            return isoDate;
          }
        }

        // Try parsing as-is
        const testDate = new Date(dateString);
        if (!isNaN(testDate.getTime())) {
          return testDate.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Invalid date format:', dateString);
      }

      // Fallback to today's date
      return new Date().toISOString().split('T')[0];
    };

    return {
      // Required fields
      id: 'preview',
      number: previewData.documentNumber || previewData.invoiceNumber || 'RE-1000',
      invoiceNumber: previewData.invoiceNumber || 'RE-1000',
      sequentialNumber: 1000,
      date: parseDate(previewData.date),
      issueDate: parseDate(previewData.date),
      dueDate: parseDate(previewData.dueDate || previewData.validUntil),

      // Customer data
      customerName: previewData.customerName || 'Kunde',
      customerEmail: previewData.customerEmail || '',
      customerAddress: previewData.customerAddress || '',
      customerVatId: previewData.customer?.vatId || '',

      // Company data
      companyName: previewData.companyName || 'Ihr Unternehmen',
      companyEmail: previewData.companyEmail || '',
      companyPhone: previewData.companyPhone || '',
      companyWebsite: previewData.companyWebsite || '',
      companyLogo: previewData.companyLogo || '',
      companyAddress: previewData.companyAddress || '',
      companyVatId: previewData.companyVatId || '',
      companyTaxNumber: previewData.companyTaxNumber || '',

      // Financial data
      amount: previewData.subtotal || 0,
      tax: previewData.tax || 0,
      total: previewData.total || 0,

      // Items
      items: previewData.items.map(item => ({
        id: item.id || Math.random().toString(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        taxRate: item.taxRate || 0,
        unit: item.unit || 'Stk',
      })),

      // Metadata
      status: 'draft' as const,
      createdAt: new Date(),
      year: new Date().getFullYear(),
      companyId,
      isStorno: false,

      // Optional fields
      description: previewData.description || previewData.title || '',
      vatRate: previewData.vatRate || 0,
      isSmallBusiness: previewData.isSmallBusiness || false,
      priceInput: 'netto',
      taxRuleType: TaxRuleType.DE_TAXABLE,
      paymentTerms: previewData.paymentTerms || '',
      notes: previewData.notes || '',
      currency: previewData.currency || 'EUR',
      headTextHtml: previewData.headTextHtml || previewData.headerText || '',
      footerText: previewData.footerText || '',
    };
  };

  // Convert the document for PDFTemplate
  const invoiceData = convertToInvoiceData(document);
  const templateRef = useRef<HTMLDivElement>(null);

  // Preview settings state
  const [settings, setSettings] = useState<PreviewSettings>({
    template: 'TEMPLATE_NEUTRAL',
    color: '#14ad9f',
    logoUrl: null,
    logoSize: 50,
    showPageNumbers: true,
    showFooter: true,
    showWatermark: false,
    language: 'de_DE',
    showCustomerNumber: true,
    showContactPerson: true,
    showQrCode: false,
  });

  const [expandedSections, setExpandedSections] = useState<Set<PreviewSection>>(
    new Set(['layout']) // Start with layout expanded
  );
  const [zoomLevel, setZoomLevel] = useState(4); // Start at 100% zoom (index 4)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom levels from SendDocumentModal
  const zoomLevels = [2, 1.75, 1.5, 1.25, 1, 0.75, 0.5];

  // Document type labels
  const documentLabels = {
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Erinnerung',
  };

  // Layout definitions with SVG previews
  const layouts = {
    standard: [
      {
        value: 'TEMPLATE_STANDARD',
        name: 'Standard',
        svg: (
          <svg
            viewBox="0 0 72 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <line y1="5" x2="72" y2="5" stroke={settings.color} strokeWidth="10"></line>
            <path
              d="M51.2451 29.1655C49.2899 29.1655 47.8906 28.211 47.8906 26.265C47.8906 24.0688 49.605 23.3553 51.6899 23.1885C53.4413 23.0403 54.0807 22.9013 54.0807 22.3175V22.2711C54.0807 21.6873 53.5618 21.2889 52.7185 21.2889C51.8289 21.2889 51.2822 21.7151 51.2173 22.3823H48.252C48.391 20.2603 49.9942 19 52.8297 19C55.6746 19 57.2407 20.251 57.2407 22.4101V28.9987H54.1271V27.6272H54.09C53.5062 28.6836 52.6259 29.1655 51.2451 29.1655ZM52.2181 27.0805C53.2838 27.0805 54.1085 26.4411 54.1085 25.4774V24.5878C53.7657 24.7453 53.1633 24.8658 52.3757 24.9955C51.5231 25.1252 50.9115 25.4774 50.9115 26.1168C50.9115 26.7191 51.4397 27.0805 52.2181 27.0805Z"
              fill="black"
            ></path>
            <line x1="48" y1="44.5" x2="60" y2="44.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="48.5" x2="64" y2="48.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="52.5" x2="56" y2="52.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="83.5" x2="60" y2="83.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="87.5" x2="64" y2="87.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="91.5" x2="56" y2="91.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="8" y1="45.5" x2="43" y2="45.5" stroke="#F4F2E5" strokeWidth="3"></line>
            <line x1="8" y1="51.5" x2="43" y2="51.5" stroke="#F4F2E5" strokeWidth="3"></line>
            <line x1="8" y1="57.5" x2="43" y2="57.5" stroke="#F4F2E5" strokeWidth="3"></line>
            <line x1="8" y1="63.5" x2="43" y2="63.5" stroke="#F4F2E5" strokeWidth="3"></line>
          </svg>
        ),
      },
      {
        value: 'TEMPLATE_NEUTRAL',
        name: 'Neutral',
        svg: (
          <svg
            viewBox="0 0 72 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path
              d="M51.3906 30.1406C48.0938 30.1406 45.7344 28.5312 45.7344 25.25C45.7344 21.5469 48.625 20.3438 52.1406 20.0625C55.0938 19.8125 56.1719 19.5781 56.1719 18.5938V18.5156C56.1719 17.5312 55.2969 16.8594 53.875 16.8594C52.375 16.8594 51.4531 17.5781 51.3438 18.7031H46.3438C46.5781 15.125 49.2812 13 54.0625 13C58.8594 13 61.5 15.1094 61.5 18.75V29.8594H56.25V27.5469H56.1875C55.2031 29.3281 53.7188 30.1406 51.3906 30.1406ZM53.0312 26.625C54.8281 26.625 56.2188 25.5469 56.2188 23.9219V22.4219C55.6406 22.6875 54.625 22.8906 53.2969 23.1094C51.8594 23.3281 50.8281 23.9219 50.8281 25C50.8281 26.0156 51.7188 26.625 53.0312 26.625Z"
              fill={settings.color}
            ></path>
            <line
              x1="12"
              y1="43.5"
              x2="61"
              y2="43.5"
              stroke="#060314"
              strokeOpacity="0.28"
              strokeWidth="3"
            ></line>
            <line
              x1="12"
              y1="49.5"
              x2="61"
              y2="49.5"
              stroke="#060314"
              strokeOpacity="0.28"
              strokeWidth="3"
            ></line>
            <line
              x1="12"
              y1="55.5"
              x2="61"
              y2="55.5"
              stroke="#060314"
              strokeOpacity="0.28"
              strokeWidth="3"
            ></line>
            <line
              x1="12"
              y1="61.5"
              x2="61"
              y2="61.5"
              stroke="#060314"
              strokeOpacity="0.28"
              strokeWidth="3"
            ></line>
            <line x1="12" y1="85.5" x2="24" y2="85.5" stroke={settings.color}></line>
            <line x1="12" y1="89.5" x2="28" y2="89.5" stroke={settings.color}></line>
            <line x1="12" y1="93.5" x2="20" y2="93.5" stroke={settings.color}></line>
            <line x1="40" y1="85.5" x2="52" y2="85.5" stroke={settings.color}></line>
            <line x1="40" y1="89.5" x2="56" y2="89.5" stroke={settings.color}></line>
            <line x1="40" y1="93.5" x2="48" y2="93.5" stroke={settings.color}></line>
          </svg>
        ),
      },
      {
        value: 'TEMPLATE_ELEGANT',
        name: 'Elegant',
        svg: (
          <svg
            viewBox="0 0 72 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path
              d="M53.4263 29.55C52.6723 29.55 51.9833 29.381 51.3593 29.043C50.7353 28.731 50.2413 28.302 49.8773 27.756C49.5133 27.184 49.3313 26.56 49.3313 25.884C49.3313 24.974 49.6173 24.207 50.1893 23.583C50.7873 22.959 51.6453 22.4 52.7633 21.906L56.1173 20.424C56.6373 20.19 56.9623 19.982 57.0923 19.8C57.2223 19.592 57.2873 19.241 57.2873 18.747L57.3263 16.602C57.3523 15.848 57.2353 15.276 56.9753 14.886C56.7153 14.47 56.3123 14.262 55.7663 14.262C55.4543 14.262 55.1293 14.34 54.7913 14.496C54.4533 14.626 54.2063 14.782 54.0503 14.964C53.9723 15.068 53.9203 15.185 53.8943 15.315C53.8683 15.445 53.8553 15.575 53.8553 15.705C53.8553 15.861 53.8683 16.069 53.8943 16.329C53.9203 16.563 53.9333 16.758 53.9333 16.914C53.9333 17.096 53.7123 17.317 53.2703 17.577C52.8283 17.811 52.3213 18.032 51.7493 18.24C51.1773 18.422 50.6833 18.513 50.2673 18.513C50.0593 18.513 49.8773 18.435 49.7213 18.279C49.5913 18.097 49.5263 17.876 49.5263 17.616C49.5263 17.2 49.6693 16.797 49.9553 16.407C50.2413 16.017 50.7223 15.549 51.3983 15.003C52.1003 14.431 52.8673 13.924 53.6993 13.482C54.5313 13.04 55.3503 12.689 56.1563 12.429C56.9623 12.143 57.6513 12 58.2233 12C59.7053 12 60.8883 12.481 61.7723 13.443C62.6563 14.379 63.0723 15.64 63.0203 17.226L62.8253 24.792C62.7993 25.39 62.8903 25.91 63.0983 26.352C63.3323 26.768 63.6183 26.976 63.9563 26.976C64.4243 26.976 64.8403 26.807 65.2043 26.469C65.2823 26.391 65.3603 26.352 65.4383 26.352C65.5683 26.352 65.6723 26.404 65.7503 26.508C65.8543 26.586 65.9063 26.69 65.9063 26.82C65.9063 27.132 65.6463 27.548 65.1263 28.068C64.6323 28.562 64.0993 28.926 63.5273 29.16C62.9553 29.42 62.3573 29.55 61.7333 29.55C60.2253 29.55 58.9643 28.796 57.9503 27.288H57.8723C57.0143 28.094 56.2473 28.666 55.5713 29.004C54.8953 29.368 54.1803 29.55 53.4263 29.55ZM55.8443 26.859C56.0783 26.859 56.2733 26.82 56.4293 26.742C56.5853 26.664 56.7283 26.534 56.8583 26.352C56.9363 26.248 56.9883 26.118 57.0143 25.962C57.0663 25.806 57.0923 25.637 57.0923 25.455L57.2093 22.452C57.2093 22.218 57.1703 22.075 57.0923 22.023C57.0143 21.945 56.9233 21.906 56.8193 21.906C56.7673 21.906 56.7023 21.919 56.6243 21.945C56.5723 21.945 56.5073 21.971 56.4293 22.023C55.8053 22.361 55.3243 22.712 54.9863 23.076C54.6743 23.414 54.5183 24.038 54.5183 24.948C54.5183 25.702 54.6613 26.209 54.9473 26.469C55.2593 26.729 55.5583 26.859 55.8443 26.859Z"
              fill="#8A6701"
            ></path>
            <line x1="8" y1="44.5" x2="43" y2="44.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="51" y1="44.5" x2="63" y2="44.5" stroke="#8A6701"></line>
            <line x1="49" y1="48.5" x2="65" y2="48.5" stroke="#8A6701"></line>
            <line x1="53" y1="52.5" x2="61" y2="52.5" stroke="#8A6701"></line>
            <line x1="51" y1="83.5" x2="63" y2="83.5" stroke="#8A6701"></line>
            <line x1="49" y1="87.5" x2="65" y2="87.5" stroke="#8A6701"></line>
            <line x1="53" y1="91.5" x2="61" y2="91.5" stroke="#8A6701"></line>
            <line x1="8" y1="50.5" x2="43" y2="50.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="8" y1="56.5" x2="43" y2="56.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="8" y1="62.5" x2="43" y2="62.5" stroke="#060314" strokeOpacity="0.28"></line>
          </svg>
        ),
      },
      {
        value: 'TEMPLATE_TECHNICAL',
        name: 'Technisch',
        svg: (
          <svg
            viewBox="0 0 72 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path
              d="M61.3374 27.672H59.2974C57.8334 27.672 56.8734 26.88 56.7294 25.488H56.6094C56.1774 27.096 54.7374 27.96 52.8414 27.96C50.4414 27.96 48.8574 26.592 48.8574 24.264C48.8574 21.672 50.8014 20.448 54.4254 20.448H56.4174V19.824C56.4174 18.36 55.7934 17.592 54.1614 17.592C52.6734 17.592 51.8094 18.24 51.1374 19.152L49.1934 17.424C50.0094 16.032 51.8094 15 54.5694 15C57.9534 15 59.9694 16.56 59.9694 19.68V25.104H61.3374V27.672ZM54.1854 25.632C55.4334 25.632 56.4174 25.008 56.4174 23.856V22.368H54.5214C53.1054 22.368 52.3374 22.872 52.3374 23.832V24.312C52.3374 25.176 53.0574 25.632 54.1854 25.632Z"
              fill={settings.color}
            ></path>
            <line x1="12" y1="44.5" x2="61" y2="44.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="50.5" x2="61" y2="50.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="56.5" x2="61" y2="56.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="62.5" x2="61" y2="62.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="85.5" x2="56" y2="85.5" stroke={settings.color}></line>
            <line x1="12" y1="89.5" x2="60" y2="89.5" stroke={settings.color}></line>
            <line x1="12" y1="93.5" x2="41" y2="93.5" stroke={settings.color}></line>
          </svg>
        ),
      },
      {
        value: 'TEMPLATE_GEOMETRIC',
        name: 'Geometrisch',
        svg: (
          <svg
            viewBox="0 0 72 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path
              d="M58.0763 13.32H59.6443V28.04H58.0763V13.32ZM45.4043 20.68C45.4043 19.08 45.7243 17.7147 46.3643 16.584C47.0043 15.432 47.8576 14.5467 48.9243 13.928C50.0123 13.3093 51.207 13 52.5083 13C53.7883 13 54.887 13.3413 55.8043 14.024C56.7216 14.6853 57.4363 15.592 57.9483 16.744C58.4816 17.896 58.7483 19.208 58.7483 20.68C58.7483 22.1307 58.4816 23.4427 57.9483 24.616C57.4363 25.768 56.7216 26.6853 55.8043 27.368C54.887 28.0293 53.7883 28.36 52.5083 28.36C51.207 28.36 50.0123 28.0507 48.9243 27.432C47.8576 26.8133 47.0043 25.928 46.3643 24.776C45.7243 23.624 45.4043 22.2587 45.4043 20.68ZM47.1003 20.68C47.1003 21.96 47.3456 23.0587 47.8363 23.976C48.3483 24.8933 49.031 25.5973 49.8843 26.088C50.759 26.5573 51.7083 26.792 52.7323 26.792C53.6496 26.792 54.503 26.5253 55.2923 25.992C56.103 25.4587 56.7536 24.7333 57.2443 23.816C57.735 22.8987 57.9803 21.8533 57.9803 20.68C57.9803 19.5067 57.735 18.4613 57.2443 17.544C56.7536 16.6267 56.103 15.9013 55.2923 15.368C54.503 14.8347 53.6496 14.568 52.7323 14.568C51.7083 14.568 50.759 14.8133 49.8843 15.304C49.031 15.7733 48.3483 16.4667 47.8363 17.384C47.3456 18.3013 47.1003 19.4 47.1003 20.68Z"
              fill="#E64111"
            ></path>
            <line x1="12" y1="44.5" x2="61" y2="44.5" stroke="#060314" strokeOpacity="0.9"></line>
            <line x1="12" y1="50.5" x2="61" y2="50.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="56.5" x2="61" y2="56.5" stroke="#060314" strokeOpacity="0.9"></line>
            <line x1="12" y1="62.5" x2="61" y2="62.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="85.5" x2="24" y2="85.5" stroke="#E64111"></line>
            <line x1="12" y1="89.5" x2="28" y2="89.5" stroke="#E64111"></line>
            <line x1="12" y1="93.5" x2="20" y2="93.5" stroke="#E64111"></line>
            <line x1="40" y1="85.5" x2="52" y2="85.5" stroke="#E64111"></line>
            <line x1="40" y1="89.5" x2="56" y2="89.5" stroke="#E64111"></line>
            <line x1="40" y1="93.5" x2="48" y2="93.5" stroke="#E64111"></line>
          </svg>
        ),
      },
      {
        value: 'TEMPLATE_DYNAMIC',
        name: 'Dynamisch',
        svg: (
          <svg
            viewBox="0 0 72 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <clipPath id="clip0_663_547">
                <rect width="100%" height="100%" rx="4" fill="white"></rect>
              </clipPath>
            </defs>
            <g clipPath="url(#clip0_663_547)">
              <rect width="100%" height="100%" rx="4" fill="white"></rect>
              <ellipse cx="18" cy="6" rx="54" ry="25" fill="#2BB7C4"></ellipse>
              <path
                d="M17.6099 22.594C16.6272 22.594 15.7765 22.3373 15.0579 21.824C14.3539 21.296 13.8112 20.592 13.4299 19.712C13.0632 18.832 12.8799 17.8787 12.8799 16.852C12.8799 15.7373 13.0925 14.74 13.5179 13.86C13.9432 12.98 14.5665 12.2833 15.3879 11.77C16.2239 11.2567 17.2212 11 18.3799 11C18.7172 11 19.1352 11.022 19.6339 11.066C20.1472 11.0953 20.5799 11.1393 20.9319 11.198H22.4059V20.328C22.4059 20.5333 22.4499 20.6947 22.5379 20.812C22.6406 20.9147 22.7872 20.966 22.9779 20.966C23.2272 20.966 23.4252 20.8413 23.5719 20.592L24.8039 21.406C24.6132 21.7727 24.3345 22.066 23.9679 22.286C23.6159 22.4913 23.2346 22.594 22.8239 22.594C22.2812 22.594 21.8119 22.44 21.4159 22.132C21.0345 21.8093 20.8292 21.4353 20.7999 21.01V21.032C20.5505 21.516 20.1325 21.8973 19.5459 22.176C18.9592 22.4547 18.3139 22.594 17.6099 22.594ZM17.7419 20.966C18.3285 20.966 18.8492 20.812 19.3039 20.504C19.7585 20.196 20.1032 19.8073 20.3379 19.338C20.4699 19.0887 20.5432 18.876 20.5579 18.7C20.5872 18.524 20.6019 18.326 20.6019 18.106V12.782L19.6779 12.716C18.9445 12.6573 18.4532 12.628 18.2039 12.628C17.0892 12.628 16.2239 13.024 15.6079 13.816C14.9919 14.608 14.6839 15.6127 14.6839 16.83C14.6839 17.9593 14.9552 18.9347 15.4979 19.756C16.0405 20.5627 16.7885 20.966 17.7419 20.966Z"
                fill="white"
              ></path>
              <line
                x1="12"
                y1="43.5"
                x2="61"
                y2="43.5"
                stroke="#060314"
                strokeOpacity="0.28"
                strokeWidth="3"
              ></line>
              <line
                x1="12"
                y1="49.5"
                x2="61"
                y2="49.5"
                stroke="#060314"
                strokeOpacity="0.28"
                strokeWidth="3"
              ></line>
              <line
                x1="12"
                y1="55.5"
                x2="61"
                y2="55.5"
                stroke="#060314"
                strokeOpacity="0.28"
                strokeWidth="3"
              ></line>
              <line
                x1="12"
                y1="61.5"
                x2="61"
                y2="61.5"
                stroke="#060314"
                strokeOpacity="0.28"
                strokeWidth="3"
              ></line>
              <line x1="12" y1="85.5" x2="24" y2="85.5" stroke="#2BB7C4"></line>
              <line x1="12" y1="89.5" x2="28" y2="89.5" stroke="#2BB7C4"></line>
              <line x1="12" y1="93.5" x2="20" y2="93.5" stroke="#2BB7C4"></line>
              <line x1="40" y1="85.5" x2="52" y2="85.5" stroke="#2BB7C4"></line>
              <line x1="40" y1="89.5" x2="56" y2="89.5" stroke="#2BB7C4"></line>
              <line x1="40" y1="93.5" x2="48" y2="93.5" stroke="#2BB7C4"></line>
            </g>
          </svg>
        ),
      },
    ],
  };

  // Available colors (Taskilo brand colors + additional options)
  const colors = [
    '#14ad9f', // Taskilo Teal (Primary)
    '#129488', // Darker Teal
    '#313131', // Dark Grey
    '#848484', // Light Grey
    '#0d8375', // Dark Teal
    '#1d65b3', // Blue
    '#a964d9', // Purple
    '#c31919', // Red
    '#f46e32', // Orange
    '#ffcf00', // Yellow
    '#fd88ab', // Pink
    '#c0ab60', // Beige
    '#7e4528', // Brown
  ];

  // Handle settings changes
  const updateSettings = (newSettings: Partial<PreviewSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Notify parent component about changes
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  };

  // Toggle expanded sections
  const toggleSection = (section: PreviewSection) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isExpanded = (section: PreviewSection) => expandedSections.has(section);

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = e => {
        const logoUrl = e.target?.result as string;
        updateSettings({ logoUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Content className="fixed inset-0 z-50 flex">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-[#14ad9f] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-6 w-6" />
            <DialogTitle className="text-xl font-semibold">
              {documentLabels[documentType]} Vorschau
            </DialogTitle>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex w-full pt-20">
          {/* Left Sidebar - Settings */}
          <div className="w-80 bg-white border-r overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Vorschau-Einstellungen</h3>
            </div>

            {/* Logo Section */}
            <div className="border-b">
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                  isExpanded('logo') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                }`}
                onClick={() => toggleSection('logo')}
              >
                <div className="flex items-center gap-3">
                  <Image className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Dein Firmenlogo</span>
                </div>
                {isExpanded('logo') ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {isExpanded('logo') && (
                <div className="px-4 pb-4 bg-gray-50">
                  <div className="space-y-4">
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Logo hochladen
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">.jpg, .jpeg, .png (max. 10MB)</p>
                    </div>

                    {settings.logoUrl && (
                      <div>
                        <Label className="text-sm font-medium">Größe</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateSettings({ logoSize: Math.max(25, settings.logoSize - 25) })
                            }
                            disabled={settings.logoSize <= 25}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium min-w-[3rem] text-center">
                            {settings.logoSize}%
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateSettings({ logoSize: Math.min(100, settings.logoSize + 25) })
                            }
                            disabled={settings.logoSize >= 100}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Color Section */}
            <div className="border-b">
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                  isExpanded('color') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                }`}
                onClick={() => toggleSection('color')}
              >
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Farbe</span>
                </div>
                {isExpanded('color') ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {isExpanded('color') && (
                <div className="px-4 pb-4 bg-gray-50">
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded border-2 ${
                          settings.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                        } transition-all hover:scale-105`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateSettings({ color })}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Layout Section */}
            <div className="border-b">
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                  isExpanded('layout') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                }`}
                onClick={() => toggleSection('layout')}
              >
                <div className="flex items-center gap-3">
                  <Layout className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Layout auswählen</span>
                </div>
                {isExpanded('layout') ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {isExpanded('layout') && (
                <div className="px-4 pb-4 bg-gray-50">
                  <div
                    className="layouts-container"
                    style={{ '--layout-color': settings.color } as React.CSSProperties}
                  >
                    {/* Standard Layouts */}
                    <div className="layouts layouts--normal layouts--big-thumbnail mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {layouts.standard.map(layout => (
                          <div
                            key={layout.value}
                            className={`layout cursor-pointer border rounded-lg p-2 transition-all hover:border-[#14ad9f] ${
                              settings.template === layout.value
                                ? 'border-[#14ad9f] ring-2 ring-[#14ad9f]/20'
                                : 'border-gray-200'
                            }`}
                            onClick={() => updateSettings({ template: layout.value })}
                          >
                            <div className="w-full h-16 mb-1 flex items-center justify-center">
                              <div className="w-12 h-14">{layout.svg}</div>
                            </div>
                            <label className="text-xs text-center block cursor-pointer">
                              {layout.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Section */}
            <div className="border-b">
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                  isExpanded('settings') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                }`}
                onClick={() => toggleSection('settings')}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">Weitere Einstellungen</span>
                </div>
                {isExpanded('settings') ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {isExpanded('settings') && (
                <div className="px-4 pb-4 bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">QR-Code anzeigen</Label>
                      <Checkbox
                        checked={settings.showQrCode}
                        onCheckedChange={checked =>
                          updateSettings({ showQrCode: checked as boolean })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Kundennummer</Label>
                      <Checkbox
                        checked={settings.showCustomerNumber}
                        onCheckedChange={checked =>
                          updateSettings({ showCustomerNumber: checked as boolean })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Kontaktperson</Label>
                      <Checkbox
                        checked={settings.showContactPerson}
                        onCheckedChange={checked =>
                          updateSettings({ showContactPerson: checked as boolean })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Seitenzahlen anzeigen</Label>
                      <Checkbox
                        checked={settings.showPageNumbers}
                        onCheckedChange={checked =>
                          updateSettings({ showPageNumbers: checked as boolean })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Fußzeile einblenden</Label>
                      <Checkbox
                        checked={settings.showFooter}
                        onCheckedChange={checked =>
                          updateSettings({ showFooter: checked as boolean })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Wasserzeichen</Label>
                      <Checkbox
                        checked={settings.showWatermark}
                        onCheckedChange={checked =>
                          updateSettings({ showWatermark: checked as boolean })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Document Preview */}
          <div className="flex-1 flex flex-col min-h-0">
            <SimplePDFViewer
              zoomLevel={zoomLevels[zoomLevel]}
              a4Width={A4_DIMENSIONS.WEB.width}
              a4Height={A4_DIMENSIONS.WEB.height}
              onZoomChange={newZoom => {
                const newIndex = zoomLevels.findIndex(z => z === newZoom);
                if (newIndex !== -1) {
                  setZoomLevel(newIndex);
                }
              }}
            >
              <div ref={templateRef} data-pdf-template>
                <PDFTemplate
                  document={invoiceData}
                  template={settings.template}
                  color={settings.color}
                  logoUrl={settings.logoUrl}
                  logoSize={settings.logoSize}
                  documentType={documentType}
                />
              </div>
            </SimplePDFViewer>
          </div>
        </div>
      </DialogPrimitive.Content>
    </Dialog>
  );
}

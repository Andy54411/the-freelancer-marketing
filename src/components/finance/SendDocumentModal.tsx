'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Send,
  Mail,
  Download,
  Printer,
  Eye,
  X,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  Palette,
  Layout,
  Settings,
  Image,
  ChevronRight,
  Upload,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceData } from '@/types/invoiceTypes';
import { formatCurrency, formatDate } from '@/lib/utils';
import PDFTemplate from './PDFTemplates';

interface SendDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: InvoiceData;
  documentType: 'invoice' | 'quote' | 'reminder';
  companyId: string;
  onSend?: (method: 'email' | 'download' | 'print', options?: any) => Promise<void>;
}

type SendOption = 'email' | 'mail' | 'print' | 'save' | 'download' | 'logo' | 'color' | 'layout' | 'settings' | 'einvoice';

export function SendDocumentModal({
  isOpen,
  onClose,
  document,
  documentType,
  companyId,
  onSend,
}: SendDocumentModalProps) {
  const [sending, setSending] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendCopy, setSendCopy] = useState(false);
  const [activeOption, setActiveOption] = useState<SendOption>('download'); // Start with download like SevDesk
  const [expandedSections, setExpandedSections] = useState<Set<SendOption>>(new Set(['download']));
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1); // For now, assume single page
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(50); // Logo size in percentage
  const [selectedLayout, setSelectedLayout] = useState('TEMPLATE_NEUTRAL');
  const [selectedColor, setSelectedColor] = useState('#14ad9f');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // E-Invoice specific states
  const [eInvoiceData, setEInvoiceData] = useState<any>(null);
  const [loadingEInvoiceData, setLoadingEInvoiceData] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [realDocumentData, setRealDocumentData] = useState<InvoiceData | null>(null);

  // Document type labels
  const documentLabels = {
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Erinnerung',
  };

  // Load real invoice data from database when modal opens
  useEffect(() => {
    if (!isOpen || !document?.id || !companyId) return;

    const loadRealInvoiceData = async () => {
      setLoadingEInvoiceData(true);
      try {
        console.log('📄 Loading real invoice data for ID:', document.id);
        
        // Lade die echte Rechnung aus der Datenbank
        const { FirestoreInvoiceService } = await import('@/services/firestoreInvoiceService');
        const realInvoice = await FirestoreInvoiceService.getInvoiceById(companyId, document.id);
        
        if (realInvoice) {
          console.log('✅ Real invoice data loaded:', realInvoice);
          setRealDocumentData(realInvoice);
          
          // Lade E-Invoice-Daten wenn vorhanden
          if (realInvoice.eInvoiceData) {
            console.log('📧 E-Invoice data found:', realInvoice.eInvoiceData);
            setEInvoiceData(realInvoice.eInvoiceData);
            
            // Generiere QR-Code für E-Invoice
            if (realInvoice.eInvoiceData.guid) {
              await generateQRCode(realInvoice.eInvoiceData.guid, realInvoice);
            }
          }
          
          // Set default email
          if (realInvoice.customerEmail) {
            setRecipientEmail(realInvoice.customerEmail);
          }
        } else {
          console.log('⚠️ No real invoice data found, using provided document data');
          setRealDocumentData(document);
        }
      } catch (error) {
        console.error('❌ Error loading real invoice data:', error);
        setRealDocumentData(document); // Fallback to provided document
        toast.error('Fehler beim Laden der Rechnungsdaten');
      } finally {
        setLoadingEInvoiceData(false);
      }
    };

    loadRealInvoiceData();
  }, [isOpen, document?.id, companyId]);

  // Generate QR Code for E-Invoice
  const generateQRCode = async (guid: string, invoiceData: InvoiceData) => {
    try {
      console.log('🔗 Generating QR Code for E-Invoice GUID:', guid);
      
      // E-Invoice QR-Code-Inhalt nach GS1 Standard
      const qrContent = JSON.stringify({
        format: 'ZUGFeRD',
        version: '2.1.1',
        guid: guid,
        invoiceNumber: invoiceData.invoiceNumber || invoiceData.number,
        issueDate: invoiceData.date || invoiceData.issueDate,
        dueDate: (invoiceData as any).dueDate || (invoiceData as any).validUntil,
        totalAmount: invoiceData.total,
        currency: invoiceData.currency || 'EUR',
        seller: {
          name: invoiceData.companyName,
          vatId: (invoiceData as any).companyVatId,
        },
        buyer: {
          name: invoiceData.customerName,
          vatId: (invoiceData as any).customerVatId,
        },
        downloadUrl: `${window.location.origin}/api/einvoices/${guid}/xml`,
      });
      
      // Hier würdest du normalerweise eine QR-Code-Bibliothek verwenden
      // Für jetzt erstellen wir eine Placeholder-URL
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`;
      setQrCodeUrl(qrUrl);
      
      console.log('✅ QR Code generated:', qrUrl);
    } catch (error) {
      console.error('❌ Error generating QR Code:', error);
    }
  };

  // Layout definitions with SVG previews
  const layouts = {
    standard: [
      {
        value: 'TEMPLATE_STANDARD',
        name: 'Standard',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <line y1="5" x2="72" y2="5" stroke={selectedColor} strokeWidth="10"></line>
            <path d="M51.2451 29.1655C49.2899 29.1655 47.8906 28.211 47.8906 26.265C47.8906 24.0688 49.605 23.3553 51.6899 23.1885C53.4413 23.0403 54.0807 22.9013 54.0807 22.3175V22.2711C54.0807 21.6873 53.5618 21.2889 52.7185 21.2889C51.8289 21.2889 51.2822 21.7151 51.2173 22.3823H48.252C48.391 20.2603 49.9942 19 52.8297 19C55.6746 19 57.2407 20.251 57.2407 22.4101V28.9987H54.1271V27.6272H54.09C53.5062 28.6836 52.6259 29.1655 51.2451 29.1655ZM52.2181 27.0805C53.2838 27.0805 54.1085 26.4411 54.1085 25.4774V24.5878C53.7657 24.7453 53.1633 24.8658 52.3757 24.9955C51.5231 25.1252 50.9115 25.4774 50.9115 26.1168C50.9115 26.7191 51.4397 27.0805 52.2181 27.0805Z" fill="black"></path>
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
        )
      },
      {
        value: 'TEMPLATE_NEUTRAL',
        name: 'Neutral',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path d="M51.3906 30.1406C48.0938 30.1406 45.7344 28.5312 45.7344 25.25C45.7344 21.5469 48.625 20.3438 52.1406 20.0625C55.0938 19.8125 56.1719 19.5781 56.1719 18.5938V18.5156C56.1719 17.5312 55.2969 16.8594 53.875 16.8594C52.375 16.8594 51.4531 17.5781 51.3438 18.7031H46.3438C46.5781 15.125 49.2812 13 54.0625 13C58.8594 13 61.5 15.1094 61.5 18.75V29.8594H56.25V27.5469H56.1875C55.2031 29.3281 53.7188 30.1406 51.3906 30.1406ZM53.0312 26.625C54.8281 26.625 56.2188 25.5469 56.2188 23.9219V22.4219C55.6406 22.6875 54.625 22.8906 53.2969 23.1094C51.8594 23.3281 50.8281 23.9219 50.8281 25C50.8281 26.0156 51.7188 26.625 53.0312 26.625Z" fill={selectedColor}></path>
            <line x1="12" y1="43.5" x2="61" y2="43.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="49.5" x2="61" y2="49.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="55.5" x2="61" y2="55.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="61.5" x2="61" y2="61.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="85.5" x2="24" y2="85.5" stroke={selectedColor}></line>
            <line x1="12" y1="89.5" x2="28" y2="89.5" stroke={selectedColor}></line>
            <line x1="12" y1="93.5" x2="20" y2="93.5" stroke={selectedColor}></line>
            <line x1="40" y1="85.5" x2="52" y2="85.5" stroke={selectedColor}></line>
            <line x1="40" y1="89.5" x2="56" y2="89.5" stroke={selectedColor}></line>
            <line x1="40" y1="93.5" x2="48" y2="93.5" stroke={selectedColor}></line>
          </svg>
        )
      },
      {
        value: 'TEMPLATE_ELEGANT',
        name: 'Elegant',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path d="M53.4263 29.55C52.6723 29.55 51.9833 29.381 51.3593 29.043C50.7353 28.731 50.2413 28.302 49.8773 27.756C49.5133 27.184 49.3313 26.56 49.3313 25.884C49.3313 24.974 49.6173 24.207 50.1893 23.583C50.7873 22.959 51.6453 22.4 52.7633 21.906L56.1173 20.424C56.6373 20.19 56.9623 19.982 57.0923 19.8C57.2223 19.592 57.2873 19.241 57.2873 18.747L57.3263 16.602C57.3523 15.848 57.2353 15.276 56.9753 14.886C56.7153 14.47 56.3123 14.262 55.7663 14.262C55.4543 14.262 55.1293 14.34 54.7913 14.496C54.4533 14.626 54.2063 14.782 54.0503 14.964C53.9723 15.068 53.9203 15.185 53.8943 15.315C53.8683 15.445 53.8553 15.575 53.8553 15.705C53.8553 15.861 53.8683 16.069 53.8943 16.329C53.9203 16.563 53.9333 16.758 53.9333 16.914C53.9333 17.096 53.7123 17.317 53.2703 17.577C52.8283 17.811 52.3213 18.032 51.7493 18.24C51.1773 18.422 50.6833 18.513 50.2673 18.513C50.0593 18.513 49.8773 18.435 49.7213 18.279C49.5913 18.097 49.5263 17.876 49.5263 17.616C49.5263 17.2 49.6693 16.797 49.9553 16.407C50.2413 16.017 50.7223 15.549 51.3983 15.003C52.1003 14.431 52.8673 13.924 53.6993 13.482C54.5313 13.04 55.3503 12.689 56.1563 12.429C56.9623 12.143 57.6513 12 58.2233 12C59.7053 12 60.8883 12.481 61.7723 13.443C62.6563 14.379 63.0723 15.64 63.0203 17.226L62.8253 24.792C62.7993 25.39 62.8903 25.91 63.0983 26.352C63.3323 26.768 63.6183 26.976 63.9563 26.976C64.4243 26.976 64.8403 26.807 65.2043 26.469C65.2823 26.391 65.3603 26.352 65.4383 26.352C65.5683 26.352 65.6723 26.404 65.7503 26.508C65.8543 26.586 65.9063 26.69 65.9063 26.82C65.9063 27.132 65.6463 27.548 65.1263 28.068C64.6323 28.562 64.0993 28.926 63.5273 29.16C62.9553 29.42 62.3573 29.55 61.7333 29.55C60.2253 29.55 58.9643 28.796 57.9503 27.288H57.8723C57.0143 28.094 56.2473 28.666 55.5713 29.004C54.8953 29.368 54.1803 29.55 53.4263 29.55ZM55.8443 26.859C56.0783 26.859 56.2733 26.82 56.4293 26.742C56.5853 26.664 56.7283 26.534 56.8583 26.352C56.9363 26.248 56.9883 26.118 57.0143 25.962C57.0663 25.806 57.0923 25.637 57.0923 25.455L57.2093 22.452C57.2093 22.218 57.1703 22.075 57.0923 22.023C57.0143 21.945 56.9233 21.906 56.8193 21.906C56.7673 21.906 56.7023 21.919 56.6243 21.945C56.5723 21.945 56.5073 21.971 56.4293 22.023C55.8053 22.361 55.3243 22.712 54.9863 23.076C54.6743 23.414 54.5183 24.038 54.5183 24.948C54.5183 25.702 54.6613 26.209 54.9473 26.469C55.2593 26.729 55.5583 26.859 55.8443 26.859Z" fill="#8A6701"></path>
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
        )
      },
      {
        value: 'TEMPLATE_TECHNICAL',
        name: 'Technisch',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path d="M61.3374 27.672H59.2974C57.8334 27.672 56.8734 26.88 56.7294 25.488H56.6094C56.1774 27.096 54.7374 27.96 52.8414 27.96C50.4414 27.96 48.8574 26.592 48.8574 24.264C48.8574 21.672 50.8014 20.448 54.4254 20.448H56.4174V19.824C56.4174 18.36 55.7934 17.592 54.1614 17.592C52.6734 17.592 51.8094 18.24 51.1374 19.152L49.1934 17.424C50.0094 16.032 51.8094 15 54.5694 15C57.9534 15 59.9694 16.56 59.9694 19.68V25.104H61.3374V27.672ZM54.1854 25.632C55.4334 25.632 56.4174 25.008 56.4174 23.856V22.368H54.5214C53.1054 22.368 52.3374 22.872 52.3374 23.832V24.312C52.3374 25.176 53.0574 25.632 54.1854 25.632Z" fill={selectedColor}></path>
            <line x1="12" y1="44.5" x2="61" y2="44.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="50.5" x2="61" y2="50.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="56.5" x2="61" y2="56.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="62.5" x2="61" y2="62.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="12" y1="85.5" x2="56" y2="85.5" stroke={selectedColor}></line>
            <line x1="12" y1="89.5" x2="60" y2="89.5" stroke={selectedColor}></line>
            <line x1="12" y1="93.5" x2="41" y2="93.5" stroke={selectedColor}></line>
          </svg>
        )
      },
      {
        value: 'TEMPLATE_GEOMETRIC',
        name: 'Geometrisch',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path d="M58.0763 13.32H59.6443V28.04H58.0763V13.32ZM45.4043 20.68C45.4043 19.08 45.7243 17.7147 46.3643 16.584C47.0043 15.432 47.8576 14.5467 48.9243 13.928C50.0123 13.3093 51.207 13 52.5083 13C53.7883 13 54.887 13.3413 55.8043 14.024C56.7216 14.6853 57.4363 15.592 57.9483 16.744C58.4816 17.896 58.7483 19.208 58.7483 20.68C58.7483 22.1307 58.4816 23.4427 57.9483 24.616C57.4363 25.768 56.7216 26.6853 55.8043 27.368C54.887 28.0293 53.7883 28.36 52.5083 28.36C51.207 28.36 50.0123 28.0507 48.9243 27.432C47.8576 26.8133 47.0043 25.928 46.3643 24.776C45.7243 23.624 45.4043 22.2587 45.4043 20.68ZM47.1003 20.68C47.1003 21.96 47.3456 23.0587 47.8363 23.976C48.3483 24.8933 49.031 25.5973 49.8843 26.088C50.759 26.5573 51.7083 26.792 52.7323 26.792C53.6496 26.792 54.503 26.5253 55.2923 25.992C56.103 25.4587 56.7536 24.7333 57.2443 23.816C57.735 22.8987 57.9803 21.8533 57.9803 20.68C57.9803 19.5067 57.735 18.4613 57.2443 17.544C56.7536 16.6267 56.103 15.9013 55.2923 15.368C54.503 14.8347 53.6496 14.568 52.7323 14.568C51.7083 14.568 50.759 14.8133 49.8843 15.304C49.031 15.7733 48.3483 16.4667 47.8363 17.384C47.3456 18.3013 47.1003 19.4 47.1003 20.68Z" fill="#E64111"></path>
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
        )
      },
      {
        value: 'TEMPLATE_DYNAMIC',
        name: 'Dynamisch',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <clipPath id="clip0_663_547">
                <rect width="100%" height="100%" rx="4" fill="white"></rect>
              </clipPath>
            </defs>
            <g clipPath="url(#clip0_663_547)">
              <rect width="100%" height="100%" rx="4" fill="white"></rect>
              <ellipse cx="18" cy="6" rx="54" ry="25" fill="#2BB7C4"></ellipse>
              <path d="M17.6099 22.594C16.6272 22.594 15.7765 22.3373 15.0579 21.824C14.3539 21.296 13.8112 20.592 13.4299 19.712C13.0632 18.832 12.8799 17.8787 12.8799 16.852C12.8799 15.7373 13.0925 14.74 13.5179 13.86C13.9432 12.98 14.5665 12.2833 15.3879 11.77C16.2239 11.2567 17.2212 11 18.3799 11C18.7172 11 19.1352 11.022 19.6339 11.066C20.1472 11.0953 20.5799 11.1393 20.9319 11.198H22.4059V20.328C22.4059 20.5333 22.4499 20.6947 22.5379 20.812C22.6406 20.9147 22.7872 20.966 22.9779 20.966C23.2272 20.966 23.4252 20.8413 23.5719 20.592L24.8039 21.406C24.6132 21.7727 24.3345 22.066 23.9679 22.286C23.6159 22.4913 23.2346 22.594 22.8239 22.594C22.2812 22.594 21.8119 22.44 21.4159 22.132C21.0345 21.8093 20.8292 21.4353 20.7999 21.01V21.032C20.5505 21.516 20.1325 21.8973 19.5459 22.176C18.9592 22.4547 18.3139 22.594 17.6099 22.594ZM17.7419 20.966C18.3285 20.966 18.8492 20.812 19.3039 20.504C19.7585 20.196 20.1032 19.8073 20.3379 19.338C20.4699 19.0887 20.5432 18.876 20.5579 18.7C20.5872 18.524 20.6019 18.326 20.6019 18.106V12.782L19.6779 12.716C18.9445 12.6573 18.4532 12.628 18.2039 12.628C17.0892 12.628 16.2239 13.024 15.6079 13.816C14.9919 14.608 14.6839 15.6127 14.6839 16.83C14.6839 17.9593 14.9552 18.9347 15.4979 19.756C16.0405 20.5627 16.7885 20.966 17.7419 20.966Z" fill="white"></path>
              <line x1="12" y1="43.5" x2="61" y2="43.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
              <line x1="12" y1="49.5" x2="61" y2="49.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
              <line x1="12" y1="55.5" x2="61" y2="55.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
              <line x1="12" y1="61.5" x2="61" y2="61.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
              <line x1="12" y1="85.5" x2="24" y2="85.5" stroke="#2BB7C4"></line>
              <line x1="12" y1="89.5" x2="28" y2="89.5" stroke="#2BB7C4"></line>
              <line x1="12" y1="93.5" x2="20" y2="93.5" stroke="#2BB7C4"></line>
              <line x1="40" y1="85.5" x2="52" y2="85.5" stroke="#2BB7C4"></line>
              <line x1="40" y1="89.5" x2="56" y2="89.5" stroke="#2BB7C4"></line>
              <line x1="40" y1="93.5" x2="48" y2="93.5" stroke="#2BB7C4"></line>
            </g>
          </svg>
        )
      }
    ],
    premium: [
      {
        value: 'PREMIUM_FRIENDLY',
        name: 'Freundlich',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path d="M58.915 12C59.3656 12 59.7383 12.1473 60.033 12.442C60.3276 12.7367 60.475 13.118 60.475 13.586V24.584C60.475 25.0347 60.3276 25.416 60.033 25.728C59.7383 26.0227 59.3656 26.17 58.915 26.17C58.4643 26.17 58.0916 26.0227 57.797 25.728C57.5023 25.416 57.355 25.0347 57.355 24.584V23.31L57.927 23.544C57.927 23.7693 57.8056 24.0467 57.563 24.376C57.3203 24.688 56.991 25 56.575 25.312C56.159 25.624 55.665 25.8927 55.093 26.118C54.5383 26.326 53.9316 26.43 53.273 26.43C52.077 26.43 50.9936 26.1267 50.023 25.52C49.0523 24.896 48.281 24.0467 47.709 22.972C47.1543 21.88 46.877 20.632 46.877 19.228C46.877 17.8067 47.1543 16.5587 47.709 15.484C48.281 14.392 49.0436 13.5427 49.997 12.936C50.9503 12.312 52.0076 12 53.169 12C53.9143 12 54.599 12.1127 55.223 12.338C55.847 12.5633 56.3843 12.8493 56.835 13.196C57.303 13.5427 57.6583 13.898 57.901 14.262C58.161 14.6087 58.291 14.9033 58.291 15.146L57.355 15.484V13.586C57.355 13.1353 57.5023 12.7627 57.797 12.468C58.0916 12.156 58.4643 12 58.915 12ZM53.663 23.57C54.4256 23.57 55.093 23.3793 55.665 22.998C56.237 22.6167 56.679 22.0967 56.991 21.438C57.3203 20.7793 57.485 20.0427 57.485 19.228C57.485 18.396 57.3203 17.6507 56.991 16.992C56.679 16.3333 56.237 15.8133 55.665 15.432C55.093 15.0507 54.4256 14.86 53.663 14.86C52.9176 14.86 52.259 15.0507 51.687 15.432C51.115 15.8133 50.6643 16.3333 50.335 16.992C50.023 17.6507 49.867 18.396 49.867 19.228C49.867 20.0427 50.023 20.7793 50.335 21.438C50.6643 22.0967 51.115 22.6167 51.687 22.998C52.259 23.3793 52.9176 23.57 53.663 23.57Z" fill="#283583"></path>
            <line x1="8" y1="43.5" x2="43" y2="43.5" stroke="#283583" strokeWidth="3"></line>
            <line x1="48" y1="43.5" x2="60" y2="43.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="47.5" x2="64" y2="47.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="51.5" x2="56" y2="51.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="83.5" x2="60" y2="83.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="87.5" x2="64" y2="87.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="48" y1="91.5" x2="56" y2="91.5" stroke="#060314" strokeOpacity="0.46"></line>
            <line x1="8" y1="50.5" x2="43" y2="50.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="8" y1="56.5" x2="43" y2="56.5" stroke="#060314" strokeOpacity="0.28"></line>
            <line x1="8" y1="62.5" x2="43" y2="62.5" stroke="#060314" strokeOpacity="0.28"></line>
          </svg>
        )
      },
      {
        value: 'PREMIUM_COMPACT',
        name: 'Kompakt',
        svg: (
          <svg viewBox="0 0 72 102" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="100%" height="100%" rx="4" fill="white"></rect>
            <path d="M53.5352 22.7129C51.4746 22.7129 50 21.707 50 19.6562C50 17.3418 51.8066 16.5898 54.0039 16.4141C55.8496 16.2578 56.5234 16.1113 56.5234 15.4961V15.4473C56.5234 14.832 55.9766 14.4121 55.0879 14.4121C54.1504 14.4121 53.5742 14.8613 53.5059 15.5645H50.3809C50.5273 13.3281 52.2168 12 55.2051 12C58.2031 12 59.8535 13.3184 59.8535 15.5938V22.5371H56.5723V21.0918H56.5332C55.918 22.2051 54.9902 22.7129 53.5352 22.7129ZM54.5605 20.5156C55.6836 20.5156 56.5527 19.8418 56.5527 18.8262V17.8887C56.1914 18.0547 55.5566 18.1816 54.7266 18.3184C53.8281 18.4551 53.1836 18.8262 53.1836 19.5C53.1836 20.1348 53.7402 20.5156 54.5605 20.5156Z" fill={selectedColor}></path>
            <line x1="12" y1="43.5" x2="61" y2="43.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="47.5" x2="61" y2="47.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="51.5" x2="61" y2="51.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="55.5" x2="61" y2="55.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="59.5" x2="61" y2="59.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="63.5" x2="61" y2="63.5" stroke="#060314" strokeOpacity="0.28" strokeWidth="3"></line>
            <line x1="12" y1="87.5" x2="56" y2="87.5" stroke={selectedColor}></line>
            <line x1="12" y1="90.5" x2="60" y2="90.5" stroke={selectedColor}></line>
            <line x1="12" y1="93.5" x2="41" y2="93.5" stroke={selectedColor}></line>
          </svg>
        )
      }
    ]
  };

  const documentLabel = documentLabels[documentType];

  // Zoom levels matching SevDesk
  const zoomLevels = [2, 1.75, 1.5, 1.25, 1, 0.75, 0.5];
  const zoomLabels = ['200%', '175%', '150%', '125%', '100%', '75%', '50%'];

  const toggleSection = (section: SendOption) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
    setActiveOption(section);
  };

  const isExpanded = (section: SendOption) => expandedSections.has(section);

  // Cleanup logo URL on unmount
  useEffect(() => {
    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
    };
  }, [logoUrl]);

  useEffect(() => {
    if (isOpen && document) {
      // Set default email subject and message
      const subject = `${documentLabel} ${document.invoiceNumber || document.number}`;
      setEmailSubject(subject);

      const message = `Sehr geehrte Damen und Herren,

anbei erhalten Sie Ihre ${documentLabel.toLowerCase()} ${document.invoiceNumber || document.number} vom ${formatDate(document.date)}.

${documentType === 'invoice' ? `Die ${documentLabel.toLowerCase()} ist bis zum ${formatDate(document.dueDate || document.date)} zu begleichen.` : ''}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
${document.companyName || 'Ihr Unternehmen'}`;

      setEmailMessage(message);

      // Set recipient email if available
      if (document.customerEmail) {
        setRecipientEmail(document.customerEmail);
      }

      // Reset to download option when opening (like SevDesk)
      setActiveOption('download');
      setExpandedSections(new Set(['download']));
      setZoomLevel(1);
      setCurrentPage(1);
      setLogoFile(null);
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
      setLogoUrl(null);
      setLogoSize(50);
    }
  }, [isOpen, document, documentType, documentLabel]);

  const handleSend = async (method: 'email' | 'download' | 'print') => {
    if (sending) return;

    try {
      setSending(true);

      if (method === 'email') {
        if (!recipientEmail.trim()) {
          toast.error('Bitte geben Sie eine Empfänger-E-Mail-Adresse ein');
          return;
        }
        if (!emailSubject.trim()) {
          toast.error('Bitte geben Sie einen Betreff ein');
          return;
        }
      }

      if (onSend) {
        await onSend(method, {
          email: method === 'email' ? recipientEmail : undefined,
          subject: method === 'email' ? emailSubject : undefined,
          message: method === 'email' ? emailMessage : undefined,
          sendCopy: method === 'email' ? sendCopy : undefined,
        });
      }

      toast.success(`${documentLabel} erfolgreich versendet`);
      onClose();
    } catch (error) {
      console.error('Error sending document:', error);
      toast.error(`Fehler beim Versenden der ${documentLabel.toLowerCase()}`);
    } finally {
      setSending(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogPrimitive.Content className="max-w-7xl h-[90vh] w-[95vw] p-0 overflow-hidden flex flex-col fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <DialogHeader className="px-6 py-4 border-b bg-[#14ad9f] text-white flex-shrink-0 relative">
          {/* Weißes X-Icon */}
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-white hover:text-white/80 hover:bg-white/10 z-[9999] p-2 rounded transition-colors"
            style={{ color: '#FFFFFF !important', fontSize: '20px', fontWeight: 'bold' }}
          >
            ✕
          </button>
          <DialogTitle className="text-xl font-semibold text-white">
            {documentLabel} versenden
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full min-h-0 flex-1">
          {/* Left side - Send Options */}
          <div className="w-80 flex flex-col border-r bg-white min-h-0">
            {/* Company Settings Warning */}
            {showCompanySettings && (
              <div className="p-4 border-b flex-shrink-0">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Angaben zu deinem Unternehmen</p>
                      <p className="text-sm">
                        Damit deine {documentLabel.toLowerCase()} rechtssicher und GoBD-konform sind,
                        ergänze noch Angaben zu dir und deinem Unternehmen.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setShowCompanySettings(false)}
                      >
                        Angaben vervollständigen
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Send Options Accordion - SevDesk Style */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Main Actions Section */}
              <div className="border-b">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="text-sm font-medium text-gray-700">Aktionen</h3>
                </div>
                
                {/* Download Option - Default active like SevDesk */}
                <div className="border-b">
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                      isExpanded('download') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                    }`}
                    onClick={() => toggleSection('download')}
                  >
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Herunterladen</span>
                    </div>
                    {isExpanded('download') ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isExpanded('download') && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <Button
                        onClick={() => handleSend('download')}
                        disabled={sending}
                        className="w-full bg-[#14ad9f] hover:bg-[#129488]"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        PDF herunterladen
                      </Button>
                    </div>
                  )}
                </div>

                {/* Email Option */}
                <div className="border-b">
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                      isExpanded('email') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                    }`}
                    onClick={() => toggleSection('email')}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Als E-Mail versenden</span>
                    </div>
                    {isExpanded('email') ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isExpanded('email') && (
                    <div className="px-4 pb-4 bg-gray-50 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="recipient-email" className="text-sm font-medium">
                          An
                        </Label>
                        <Input
                          id="recipient-email"
                          type="email"
                          placeholder="empfaenger@beispiel.de"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-subject" className="text-sm font-medium">
                          Betreff
                        </Label>
                        <Input
                          id="email-subject"
                          placeholder="Betreff"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-message" className="text-sm font-medium">
                          Nachricht
                        </Label>
                        <Textarea
                          id="email-message"
                          placeholder="Nachricht"
                          rows={4}
                          value={emailMessage}
                          onChange={(e) => setEmailMessage(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send-copy"
                          checked={sendCopy}
                          onCheckedChange={(checked) => setSendCopy(checked === true)}
                        />
                        <Label htmlFor="send-copy" className="text-sm text-gray-600">
                          Kopie an mich senden
                        </Label>
                      </div>
                      <Button
                        onClick={() => handleSend('email')}
                        disabled={sending}
                        className="w-full bg-[#14ad9f] hover:bg-[#129488]"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        E-Mail senden
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mail Option */}
                <div className="border-b">
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                      isExpanded('mail') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                    }`}
                    onClick={() => toggleSection('mail')}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Per Post verschicken</span>
                    </div>
                    {isExpanded('mail') ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isExpanded('mail') && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-3">
                        Versende deine {documentLabel.toLowerCase()} automatisch per Post.
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Per Post senden (Beta)
                      </Button>
                    </div>
                  )}
                </div>

                {/* Print Option */}
                <div className="border-b">
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                      isExpanded('print') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                    }`}
                    onClick={() => toggleSection('print')}
                  >
                    <div className="flex items-center gap-3">
                      <Printer className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Drucken</span>
                    </div>
                    {isExpanded('print') ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isExpanded('print') && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <Button
                        variant="outline"
                        onClick={() => handleSend('print')}
                        disabled={sending}
                        className="w-full"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Drucken
                      </Button>
                    </div>
                  )}
                </div>

                {/* Save Option */}
                <div className="border-b">
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                      isExpanded('save') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                    }`}
                    onClick={() => toggleSection('save')}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Speichern</span>
                    </div>
                    {isExpanded('save') ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isExpanded('save') && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-3">
                        {documentLabel} als finalisiertes Dokument speichern.
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          toast.success(`${documentLabel} gespeichert`);
                          onClose();
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Speichern
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings Section */}
              {document.status === 'draft' && (
                <div>
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h3 className="text-sm font-medium text-gray-700">Einstellungen</h3>
                  </div>
                  
                  {/* Logo Option */}
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
                      <div className="px-4 pb-4 bg-gray-50 space-y-4">
                        {/* Logo Upload */}
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#14ad9f] transition-colors">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Cleanup previous URL
                                  if (logoUrl) {
                                    URL.revokeObjectURL(logoUrl);
                                  }
                                  
                                  // Create new URL for preview
                                  const newUrl = URL.createObjectURL(file);
                                  setLogoFile(file);
                                  setLogoUrl(newUrl);
                                  toast.success('Logo erfolgreich hochgeladen');
                                }
                              }}
                            />
                            <div className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                              <Button
                                type="button"
                                variant="outline"
                                className="mb-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  fileInputRef.current?.click();
                                }}
                              >
                                Logo hochladen
                              </Button>
                              <p className="text-sm text-gray-500">
                                oder hier hineinziehen
                              </p>
                              <p className="text-xs text-gray-400">
                                .jpg, .jpeg, .png (max. 10 MB)
                              </p>
                            </div>
                          </div>
                          
                          {logoFile && logoUrl && (
                            <div className="space-y-2">
                              <div className="text-sm text-green-600 text-center">
                                ✓ Logo hochgeladen: {logoFile.name}
                              </div>
                              <div className="flex justify-center">
                                <img
                                  src={logoUrl}
                                  alt="Logo Vorschau"
                                  className="max-h-12 max-w-24 object-contain border rounded"
                                  style={{
                                    transform: `scale(${logoSize / 100})`,
                                    transformOrigin: 'center'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Logo Size Control */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Größe</Label>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLogoSize(Math.max(25, logoSize - 25))}
                              disabled={logoSize <= 25}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium min-w-[3rem] text-center">
                              {logoSize}%
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLogoSize(Math.min(100, logoSize + 25))}
                              disabled={logoSize >= 100}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color Option */}
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
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Akzentfarbe wählen</Label>
                          <div className="grid grid-cols-6 gap-2">
                            {[
                              '#14ad9f', '#3b82f6', '#ef4444', '#10b981', 
                              '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'
                            ].map((color) => (
                              <button
                                key={color}
                                className="w-8 h-8 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  toast.success('Farbe ausgewählt');
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Layout Option */}
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
                        <div className="layouts-container" style={{ '--layout-color': selectedColor } as React.CSSProperties}>
                          {/* Standard Layouts */}
                          <div className="layouts layouts--normal layouts--big-thumbnail mb-4">
                            <div className="grid grid-cols-2 gap-2">
                              {layouts.standard.map((layout) => (
                                <div
                                  key={layout.value}
                                  className={`layout cursor-pointer border rounded-lg p-2 transition-all hover:border-[#14ad9f] ${
                                    selectedLayout === layout.value ? 'border-[#14ad9f] ring-2 ring-[#14ad9f]/20' : 'border-gray-200'
                                  }`}
                                  onClick={() => setSelectedLayout(layout.value)}
                                >
                                  <div className="w-full h-16 mb-1 flex items-center justify-center">
                                    <div className="w-12 h-14">
                                      {layout.svg}
                                    </div>
                                  </div>
                                  <label className="text-xs text-center block cursor-pointer">
                                    {layout.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Premium Layouts */}
                          {layouts.premium.length > 0 && (
                            <>
                              <div className="line-spacer border-t border-gray-200 my-3"></div>
                              <div className="layouts layouts--premium">
                                <div className="title text-xs font-medium mb-2 text-gray-600">Premium Layouts</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {layouts.premium.map((layout) => (
                                    <div
                                      key={layout.value}
                                      className={`layout cursor-pointer border rounded-lg p-2 transition-all hover:border-[#14ad9f] ${
                                        selectedLayout === layout.value ? 'border-[#14ad9f] ring-2 ring-[#14ad9f]/20' : 'border-gray-200'
                                      }`}
                                      onClick={() => setSelectedLayout(layout.value)}
                                    >
                                      <div className="w-full h-16 mb-1 flex items-center justify-center">
                                        <div className="w-12 h-14">
                                          {layout.svg}
                                        </div>
                                      </div>
                                      <label className="text-xs text-center block cursor-pointer">
                                        {layout.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* E-Invoice Section */}
                  {eInvoiceData && (
                    <div className="border-b">
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                          isExpanded('einvoice') ? 'bg-gray-50 border-l-4 border-[#14ad9f]' : ''
                        }`}
                        onClick={() => toggleSection('einvoice')}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="font-medium">E-Rechnung</span>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            {eInvoiceData.validationStatus === 'valid' ? 'Gültig' : 'Fehlerhaft'}
                          </Badge>
                        </div>
                        {isExpanded('einvoice') ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      {isExpanded('einvoice') && (
                        <div className="px-4 pb-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* E-Invoice Status */}
                            <div className="bg-white rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Status</span>
                                <Badge 
                                  variant={eInvoiceData.validationStatus === 'valid' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {eInvoiceData.validationStatus === 'valid' ? 'Gültig' : 'Fehlerhaft'}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Format: {eInvoiceData.format?.toUpperCase() || 'ZUGFeRD'}</div>
                                <div>GUID: {eInvoiceData.guid}</div>
                                <div>Erstellt: {formatDate(eInvoiceData.createdAt)}</div>
                              </div>
                            </div>

                            {/* QR Code */}
                            {qrCodeUrl && (
                              <div className="bg-white rounded-lg p-3 border text-center">
                                <div className="text-sm font-medium mb-2">QR-Code</div>
                                <img 
                                  src={qrCodeUrl} 
                                  alt="E-Invoice QR Code" 
                                  className="mx-auto w-24 h-24 border rounded"
                                />
                                <div className="text-xs text-gray-500 mt-2">
                                  Für E-Invoice-Validierung
                                </div>
                              </div>
                            )}

                            {/* Download Actions */}
                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                className="w-full text-sm"
                                onClick={async () => {
                                  try {
                                    if (eInvoiceData.xmlUrl) {
                                      window.open(eInvoiceData.xmlUrl, '_blank');
                                      toast.success('XML-Datei wird heruntergeladen');
                                    } else {
                                      toast.error('XML-URL nicht verfügbar');
                                    }
                                  } catch (error) {
                                    console.error('XML download error:', error);
                                    toast.error('Fehler beim XML-Download');
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                XML herunterladen
                              </Button>
                              
                              <Button
                                variant="outline"
                                className="w-full text-sm"
                                onClick={() => {
                                  toast.info('ZUGFeRD-PDF wird generiert...');
                                  // Hier würde die ZUGFeRD-PDF-Generierung stattfinden
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                ZUGFeRD-PDF
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* More Settings */}
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
                            <Label className="text-sm font-medium">Seitenzahlen anzeigen</Label>
                            <Checkbox defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Fußzeile einblenden</Label>
                            <Checkbox defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Wasserzeichen</Label>
                            <Checkbox />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Document Preview */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Preview Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Vorschau</span>
                <Badge variant="outline" className="text-xs">
                  {layouts.standard.find(l => l.value === selectedLayout)?.name || 
                   layouts.premium.find(l => l.value === selectedLayout)?.name || 'Neutral'}
                </Badge>
                {logoUrl && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Logo</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Seite</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm text-gray-600">von {totalPages}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
                    disabled={zoomLevel <= 0}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <select
                    value={zoomLevels[zoomLevel]}
                    onChange={(e) => {
                      const index = zoomLevels.indexOf(parseFloat(e.target.value));
                      if (index !== -1) setZoomLevel(index);
                    }}
                    className="px-2 py-1 text-sm border rounded"
                  >
                    {zoomLevels.map((level, index) => (
                      <option key={level} value={level}>
                        {zoomLabels[index]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel(Math.min(zoomLevels.length - 1, zoomLevel + 1))}
                    disabled={zoomLevel >= zoomLevels.length - 1}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Document Preview */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50 min-h-0">
              {loadingEInvoiceData ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Lade Rechnungsdaten aus der Datenbank...</span>
                  </div>
                </div>
              ) : (
                <div
                  className="mx-auto max-w-4xl"
                  style={{
                    transform: `scale(${zoomLevels[zoomLevel]})`,
                    transformOrigin: 'top center',
                    width: `${100 / zoomLevels[zoomLevel]}%`,
                    minHeight: '100%'
                  }}
                >
                  <PDFTemplate
                    document={realDocumentData || document}
                    template={selectedLayout}
                    color={selectedColor}
                    logoUrl={logoUrl}
                    logoSize={logoSize}
                    documentType={documentType}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogPrimitive.Content>
    </Dialog>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Download,
  Edit,
  Send,
  X,
  FileText,
  ZoomIn,
  ZoomOut,
  MoreHorizontal,
  Mail,
  CheckCircle,
  Clipboard,
  Calendar,
  Minus,
  Sparkles,
  Eye } from
'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';
import { InvoiceTemplateRenderer } from '@/components/finance/InvoiceTemplates';
import EmailSendModalNormal from '@/components/finance/EmailsendModalnormal';
import { LivePreviewModal } from '@/components/finance/LivePreviewModal';
import { InlinePreview } from '@/components/finance/InlinePreview';
import { CancelInvoiceModal } from '@/components/finance/CancelInvoiceModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/clients';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { toast } from 'sonner';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js Worker konfigurieren - verwende lokale Worker-Datei für CSP-Kompatibilität
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const invoiceId = typeof params?.invoiceId === 'string' ? params.invoiceId : '';

  // URL-Parameter für Template-Überschreibung (für PDF-Generierung)
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  
  // Dokumenttyp-Erkennung: normale Rechnung oder Stornorechnung
  const [documentType, setDocumentType] = useState<'invoice' | 'storno'>('invoice');
  const [isStornoDocument, setIsStornoDocument] = useState(false);

  useEffect(() => {
    // Lade URL-Parameter beim Mount
    const params = new URLSearchParams(window.location.search);
    setUrlParams(params);
  }, [invoiceId]);

  // Template-Überschreibung aus URL-Parametern
  const templateOverride = urlParams?.get('template');
  const colorOverride = urlParams?.get('color');
  const logoSizeOverride = urlParams?.get('logoSize');
  const pageModeOverride = urlParams?.get('pageMode');
  const isPdfMode = urlParams?.get('pdf') === 'true';
  const hideUI = urlParams?.get('hideUI') === 'true';

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [stornoInvoice, setStornoInvoice] = useState<InvoiceData | null>(null);
  const [showingStorno, setShowingStorno] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [availablePdfs, setAvailablePdfs] = useState<{name: string;url: string;}[]>([]);
  const [showPdfSelector, setShowPdfSelector] = useState(false);
  const [useIframeViewer, setUseIframeViewer] = useState(false);
  const [shouldUsePdfJs, setShouldUsePdfJs] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (user && user.uid === uid && invoiceId) {
      loadInvoice();
    }
  }, [user, uid, invoiceId]);

  useEffect(() => {
    if (invoice) {
      loadPdfFromStorage();
    }
  }, [invoice]);

  // Diese Funktion wird nicht mehr benötigt - PDFs werden beim Erstellen/Versenden in Storage gespeichert

  const refreshPdfUrl = async (storagePath: string) => {
    try {
      const pdfRef = ref(storage, storagePath);
      const freshUrl = await getDownloadURL(pdfRef);

      return freshUrl;
    } catch (error) {
      console.error('Error refreshing PDF URL:', error);
      return null;
    }
  };

  // Funktion zur URL-Validierung - vereinfacht für bessere Kompatibilität
  const validatePdfUrl = async (url: string): Promise<boolean> => {
    try {
      // Für Firebase Storage URLs, versuche einen einfacheren Ansatz
      if (
      url.includes('firebasestorage.googleapis.com') ||
      url.includes('storage.googleapis.com'))
      {
        // Bei Firebase Storage URLs, überspringe die HEAD-Validierung in der Entwicklung
        // da diese oft CORS-Probleme verursacht, aber versuche trotzdem zu laden

        return true; // Optimistisch zurückgeben, PDF.js wird den eigentlichen Test machen
      }

      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) {
        return false;
      }

      const contentType = response.headers.get('content-type');

      if (contentType && !contentType.includes('application/pdf')) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating PDF URL:', error);
      return false;
    }
  };

  const loadPdfFromStorage = async () => {
    if (!invoice) return;

    // 1. ZUERST: Prüfe ob PDF-URL direkt in der Rechnung gespeichert ist
    const invoicePdfUrl = (invoice as any).pdfUrl;
    if (invoicePdfUrl) {

      setPdfUrl(invoicePdfUrl);
      setUseIframeViewer(true);
      setShouldUsePdfJs(false);
      return;
    }

    // 2. FALLBACK: Versuche aus Storage zu laden
    const path = `invoices/${uid}/${invoiceId}.pdf`;

    try {
      const pdfRef = ref(storage, path);

      const pdfDownloadUrl = await getDownloadURL(pdfRef);

      setPdfUrl(pdfDownloadUrl);
      setUseIframeViewer(true);
      setShouldUsePdfJs(false);

    } catch (error: any) {

      setPdfError('PDF wurde noch nicht generiert. Bitte erstellen Sie die Rechnung erneut.');
      setPdfLoading(false);
    }
  };

  const loadInvoice = async () => {
    try {
      setLoading(true);

      // Lade immer zuerst die Original-Rechnung
      const invoiceData = await FirestoreInvoiceService.getInvoiceById(uid, invoiceId);

      if (!invoiceData) {
        setError('Rechnung nicht gefunden');
        return;
      }

      if (invoiceData.companyId !== uid) {
        setError('Keine Berechtigung für dieses Dokument');
        return;
      }

      setInvoice(invoiceData);

      // Prüfe ob eine Storno-Rechnung für diese Original-Rechnung existiert
      try {
        const stornoData = await checkForStornoInvoice(uid, invoiceId);
        if (stornoData) {
          setStornoInvoice(stornoData);
          // Standardmäßig Storno anzeigen wenn verfügbar
          setShowingStorno(true);
        } else {
          setStornoInvoice(null);
          setShowingStorno(false);
        }
      } catch (stornoError) {
        setStornoInvoice(null);
        setShowingStorno(false);
      }

      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(
        'Fehler beim Laden der Rechnung: ' + (
        err instanceof Error ? err.message : 'Unbekannter Fehler')
      );
    } finally {
      setLoading(false);
    }
  };

  // Berechne korrekte Summen basierend auf Items
  const calculateInvoiceTotals = (invoice: InvoiceData) => {
    if (!invoice.items || invoice.items.length === 0) {
      return {
        subtotal: invoice.amount || 0,
        taxAmount: invoice.tax || 0,
        total: invoice.total || invoice.amount || 0
      };
    }

    // Berechne Zwischensumme aus Items
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);

    // Berechne Steuer
    const vatRate = invoice.vatRate || 19;
    const taxAmount = invoice.isSmallBusiness ? 0 : subtotal * vatRate / 100;

    // Gesamtsumme
    const total = subtotal + taxAmount;

    return {
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total
    };
  };

  // Hilfsfunktion: Prüfe ob Storno-Rechnung für Original-Rechnung existiert
  const checkForStornoInvoice = async (companyId: string, originalInvoiceId: string): Promise<InvoiceData | null> => {
    try {
      const stornoList = await FirestoreInvoiceService.getStornosByCompany(companyId);
      const matchingStorno = stornoList.find(storno => 
        (storno as any).originalInvoiceId === originalInvoiceId
      );
      return matchingStorno || null;
    } catch (error) {
      console.error('Error checking for storno invoice:', error);
      return null;
    }
  };

  const invoiceTotals = invoice ?
  calculateInvoiceTotals(invoice) :
  { subtotal: 0, taxAmount: 0, total: 0 };

  // Aktuelles Dokument zum Anzeigen (Original oder Storno)
  const currentDocument = showingStorno && stornoInvoice ? stornoInvoice : invoice;
  const isDisplayingStorno = showingStorno && stornoInvoice;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: {
        label: 'Entwurf',
        variant: 'secondary' as const,
        color: 'bg-gray-100 text-gray-800'
      },
      finalized: {
        label: 'Rechnung',
        variant: 'default' as const,
        color: 'bg-[#14ad9f] text-white'
      },
      sent: { label: 'Gesendet', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Bezahlt', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      overdue: {
        label: 'Überfällig',
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800'
      },
      cancelled: {
        label: 'Storniert',
        variant: 'secondary' as const,
        color: 'bg-gray-100 text-gray-800'
      },
      storno: {
        label: 'Stornorechnung',
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800'
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>);

  };

  const onDocumentLoadSuccess = ({ numPages }: {numPages: number;}) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error: any) => {
    // Stille Behandlung für erwartete Fetch-Fehler
    const isFetchError =
    error?.message?.includes('Failed to fetch') ||
    error?.details?.includes('Failed to fetch') ||
    error?.name === 'UnknownErrorException';

    if (isFetchError) {
      // Stumm zum iframe-Fallback wechseln, ohne Console-Fehler

      setUseIframeViewer(true);
      setPdfError(null);
      return;
    }

    // Nur echte, unerwartete Fehler loggen
    console.error('Unexpected PDF load error:', error);
    console.error('PDF URL was:', pdfUrl);

    if (error?.message?.includes('CORS')) {
      setPdfError('CORS-Fehler beim PDF-Laden. PDF-Zugriff ist möglicherweise blockiert.');
      setUseIframeViewer(false);
    } else {
      setPdfError(
        `Fehler beim Laden des PDFs: ${error?.message || 'Unbekannter Fehler'}. Bitte versuchen Sie es erneut.`
      );
      setUseIframeViewer(false);
    }

    // PDF URL nur bei echten Fehlern zurücksetzen
    setPdfUrl(null);
  };
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const loadPdfForViewing = () => {
    loadPdfFromStorage();
  };

  const addTag = async (tagName: string) => {
    if (!tagName.trim() || !invoice) return;

    setIsAddingTag(true);
    try {
      const currentTags = invoice.tags || [];
      if (currentTags.includes(tagName.trim())) {
        toast.error('Tag bereits vorhanden');
        return;
      }

      const newTags = [...currentTags, tagName.trim()];
      const invoiceRef = doc(db, 'companies', uid, 'invoices', invoiceId);

      await updateDoc(invoiceRef, {
        tags: newTags,
        updatedAt: new Date()
      });

      setInvoice((prev) => prev ? { ...prev, tags: newTags } : null);
      setNewTag('');
      toast.success('Tag hinzugefügt');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Fehler beim Hinzufügen des Tags');
    } finally {
      setIsAddingTag(false);
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!invoice) return;

    try {
      const currentTags = invoice.tags || [];
      const newTags = currentTags.filter((tag) => tag !== tagToRemove);
      const invoiceRef = doc(db, 'companies', uid, 'invoices', invoiceId);

      await updateDoc(invoiceRef, {
        tags: newTags,
        updatedAt: new Date()
      });

      setInvoice((prev) => prev ? { ...prev, tags: newTags } : null);
      toast.success('Tag entfernt');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Fehler beim Entfernen des Tags');
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      addTag(newTag.trim());
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!invoice || invoice.status !== 'draft') return;

    setUpdating(true);
    try {
      // Generiere Rechnungsnummer wenn noch keine vorhanden
      let invoiceNumber = invoice.invoiceNumber || invoice.number;
      let sequentialNumber = invoice.sequentialNumber;

      if (!invoiceNumber) {
        try {
          const result = await FirestoreInvoiceService.getNextInvoiceNumber(uid);
          invoiceNumber = result.formattedNumber;
          sequentialNumber = result.sequentialNumber;
        } catch (error) {
          toast.error('Fehler beim Generieren der Rechnungsnummer');
          return;
        }
      }

      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'finalized',
        invoiceNumber,
        number: invoiceNumber,
        ...(sequentialNumber && { sequentialNumber }),
        finalizedAt: new Date(),

        updatedAt: new Date()
      });

      setInvoice((prev) =>
      prev ?
      {
        ...prev,
        status: 'finalized',
        invoiceNumber,
        number: invoiceNumber,

        ...(sequentialNumber && { sequentialNumber })
      } :
      null
      );

      toast.success(`Rechnung ${invoiceNumber} wurde finalisiert!`);
    } catch (error) {
      toast.error('Fehler beim Finalisieren der Rechnung');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice || invoice.status === 'paid') return;

    setUpdating(true);
    try {
      const invoiceRef = doc(db, 'companies', uid, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'paid',
        paidDate: new Date(),
        updatedAt: new Date()
      });

      // Update local state
      setInvoice((prev) => prev ? { ...prev, status: 'paid', paidDate: new Date() } : null);

      toast.success('Rechnung als bezahlt markiert');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Fehler beim Markieren als bezahlt');
    } finally {
      setUpdating(false);
    }
  };

  const handleBackToInvoices = () => {
    // Dynamische Navigation je nach Dokumenttyp
    if (isStornoDocument || (invoice && (invoice as any).isStorno)) {
      // Zurück zur Storno-Übersicht (falls vorhanden) oder zur normalen Rechnungsübersicht
      router.push(`/dashboard/company/${uid}/finance/invoices?filter=storno`);
    } else {
      router.push(`/dashboard/company/${uid}/finance/invoices`);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;

    setUpdating(true);
    try {
      // 1. Generiere Storno-Nummer (ST-XXXX Format)
      const stornoResult = await FirestoreInvoiceService.getNextStornoNumber(uid);
      const stornoNumber = stornoResult.formattedNumber; // z.B. "ST-1001"
      
      // 2. Erstelle Storno-Rechnung in separater Collection
      // Entferne undefined Werte aus der Original-Rechnung
      const cleanInvoiceData = Object.fromEntries(
        Object.entries(invoice).filter(([_, value]) => value !== undefined)
      );
      
      const stornoData = {
        // Basis-Daten der Original-Rechnung kopieren (ohne undefined)
        ...cleanInvoiceData,
        
        // Storno-spezifische Felder (überschreiben original Daten)
        id: `storno-${Date.now()}`, // Neue ID für Storno
        stornoNumber: stornoNumber,
        invoiceNumber: stornoNumber, // Für Display
        number: stornoNumber,
        sequentialNumber: stornoResult.sequentialNumber,
        
        // Referenz zur Original-Rechnung
        originalInvoiceId: invoiceId,
        originalInvoiceNumber: invoice.invoiceNumber || invoice.number,
        
        // Storno-Status und Typ
        status: 'cancelled',
        documentType: 'cancellation',
        isStorno: true,
        
        // Negative Beträge für Storno
        amount: -(invoice.amount || 0),
        total: -(invoice.total || invoice.amount || 0),
        tax: -(invoice.tax || 0),
        
        // Items mit negativen Beträgen
        items: (invoice.items || []).map(item => ({
          ...item,
          quantity: -Math.abs(item.quantity || 0),
          total: -(item.total || 0)
        })),
        
        // Timestamps
        createdAt: new Date(),
        stornoCreatedAt: new Date(),
        stornoDate: new Date(),
        updatedAt: new Date(),
        
        // Titel für Anzeige
        title: `Stornorechnung Nr. ${stornoNumber} zur Rechnung Nr. ${invoice.invoiceNumber || invoice.number}`,
        description: invoice.description || `Stornierung der Rechnung Nr. ${invoice.invoiceNumber || invoice.number}`
      };

      // 3. Speichere Storno-Rechnung in stornoRechnungen subcollection
      const stornoRef = doc(db, 'companies', uid, 'stornoRechnungen', stornoData.id);
      await FirestoreInvoiceService.createDocument(stornoRef, stornoData);

      // 4. Update Original-Rechnung auf cancelled Status
      const invoiceRef = doc(db, 'companies', uid, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
        stornoInvoiceId: stornoData.id,
        stornoInvoiceNumber: stornoNumber
      });

      // 5. Update local state
      setInvoice((prev) => prev ? { 
        ...prev, 
        status: 'cancelled', 
        cancelledAt: new Date(),
        stornoInvoiceId: stornoData.id,
        stornoInvoiceNumber: stornoNumber
      } : null);
      
      setShowCancelModal(false);
      
      // 6. Setze Storno-Rechnung in lokalen State und wechsle Ansicht
      setStornoInvoice(stornoData as unknown as InvoiceData);
      setShowingStorno(true);
      
      toast.success(`Stornorechnung ${stornoNumber} wurde erfolgreich erstellt!`);
      
    } catch (error) {
      console.error('Error creating storno invoice:', error);
      toast.error('Fehler beim Erstellen der Stornorechnung');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditInvoice = () => {
    // Prüfe GoBD-Status vor Navigation - sowohl gobdStatus.isLocked als auch direktes isLocked
    const gobdLocked = (invoice as any)?.gobdStatus?.isLocked;
    const directLocked = (invoice as any)?.isLocked;
    const isLocked = gobdLocked || directLocked;
    
    if (isLocked) {
      toast.error('Festgeschriebene Rechnungen können nicht mehr bearbeitet werden.');
      return;
    }
    router.push(`/dashboard/company/${uid}/finance/invoices/${invoiceId}/edit`);
  };

  const handleViewPdf = async () => {
    if (!invoice) return;

    setDownloadingPdf(true);
    try {
      // Call our modern PDF API endpoint
      const response = await fetch('/api/generate-invoice-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceData: invoice
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF-Generation fehlgeschlagen');
      }

      const contentType = response.headers.get('content-type');

      // Check if we got a PDF directly (Development with Puppeteer)
      if (contentType?.includes('application/pdf')) {
        const pdfBlob = await response.blob();
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Open PDF in new tab instead of downloading
        window.open(pdfUrl, '_blank');

        // Clean up after a short delay
        setTimeout(() => {
          window.URL.revokeObjectURL(pdfUrl);
        }, 10000);

        return;
      }

      // Handle JSON response (contains printUrl)
      const responseData = await response.json();

      if (responseData.printUrl) {
        // Open the print URL in a new tab
        window.open(responseData.printUrl, '_blank');
        return;
      }

      // If we get here, something unexpected happened
      throw new Error('Unerwartetes Response-Format vom PDF-Service');
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      toast.error(`Fehler beim Herunterladen der PDF: ${error.message}`);
    } finally {

      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {

    if (!invoice) {

      return;
    }


    setDownloadingPdf(true);

    try {
      // Get HTML content from the InlinePreview component


      // Find the preview element with data-pdf-template attribute
      const previewElement = document.querySelector('[data-pdf-template]');

      if (!previewElement) {
        throw new Error('Preview-Element nicht gefunden. Bitte warten Sie, bis die Vorschau geladen ist.');
      }

      const htmlContent = previewElement.innerHTML;


      // CRITICAL CHECK: Enthält das HTML ein Template?
      const hasTemplate = htmlContent.includes('NeutralTemplate') ||
      htmlContent.includes('StandardTemplate') ||
      htmlContent.includes('ElegantTemplate');









      // SKIP HTML extraction - send data directly to API for server-side rendering
      if (!hasTemplate) {
        console.warn('⚠️ NO TEMPLATE IN HTML - Using server-side rendering instead');
      }

      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error('Kein HTML-Content in der Preview verfügbar. Bitte laden Sie die Seite neu.');
      }

      // ✅ Use existing PDF API with extracted HTML content


      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error('Kein HTML-Content verfügbar. Bitte laden Sie die Seite neu.');
      }

      // Extract complete HTML with styles (like SendDocumentModal does)
      const templateElement = document.querySelector('[data-pdf-template]') as HTMLElement;

      if (!templateElement) {
        throw new Error('Template element not found');
      }

      // Clone the template element
      const clonedElement = templateElement.cloneNode(true) as HTMLElement;

      // Remove preview-only transform styles
      const removePreviewStyles = (element: HTMLElement) => {
        if (element.style) {
          element.style.removeProperty('transform');
          element.style.removeProperty('transform-origin');
        }
        element.querySelectorAll('*').forEach((child) => {
          if ((child as HTMLElement).style) {
            (child as HTMLElement).style.removeProperty('transform');
            (child as HTMLElement).style.removeProperty('transform-origin');
          }
        });
      };
      removePreviewStyles(clonedElement);

      // Extract ALL styles from document
      const allStyles: string[] = [];

      // Get all <style> tags
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach((styleElement) => {
        if (styleElement.textContent) {
          allStyles.push(styleElement.textContent);
        }
      });

      // Get all linked stylesheets
      const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
      linkTags.forEach((linkElement) => {
        try {
          const link = linkElement as HTMLLinkElement;
          if (link.sheet && link.sheet.cssRules) {
            let css = '';
            for (let i = 0; i < link.sheet.cssRules.length; i++) {
              css += link.sheet.cssRules[i].cssText + '\n';
            }
            allStyles.push(css);
          }
        } catch (e) {

          // Ignore CORS errors for external stylesheets
        }});

      // Create complete HTML with ALL styles (exactly like SendDocumentModal)
      const completeHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <style>
    /* ALL APP STYLES */
    ${allStyles.join('\n\n')}
    
    /* PDF SPECIFIC */
    @page { size: A4; margin: 0; }
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 210mm; 
      background: white;
      font-family: system-ui, -apple-system, sans-serif;
    }
    * { 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>
  ${clonedElement.outerHTML}
</body>
</html>`;

      const response = await fetch('/api/generate-pdf-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          htmlContent: completeHtml
        })
      });



      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ PDF API failed:', response.status, errorData);
        throw new Error(errorData.error || 'PDF-Generation fehlgeschlagen');
      }

      const result = await response.json();

      if (!result.success || !result.pdfBase64 || result.pdfBase64.trim().length === 0) {
        console.error('❌ PDF API returned empty result');
        throw new Error('PDF-Generation returned empty result');
      }



      // Convert base64 to blob
      const byteCharacters = atob(result.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Rechnung_${invoice.invoiceNumber || invoice.number || invoice.id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL
      setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 5000);


      toast.success('PDF erfolgreich heruntergeladen!');

    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      toast.error(`Fehler beim Herunterladen der PDF: ${error.message}`);
    } finally {

      setDownloadingPdf(false);
    }
  };

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>);

  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Rechnung wird geladen...</p>
          </div>
        </div>
      </div>);

  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToInvoices}
          className="mb-4 text-gray-600 hover:text-gray-900">

          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Rechnungen
        </Button>

        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error || 'Rechnung nicht gefunden'}</p>
            <Button onClick={handleBackToInvoices} className="bg-[#14ad9f] hover:bg-[#129488]">
              Zurück zu Rechnungen
            </Button>
          </div>
        </div>
      </div>);

  }

  // Für PDF-Generierung: Nur Template ohne UI rendern
  if (hideUI && invoice) {
    return (
      <div className="min-h-screen bg-white">
        <InlinePreview
          document={{
            ...invoice,
            // Template-Überschreibung aus URL-Parametern
            template: templateOverride || (invoice as any).template || 'TEMPLATE_NEUTRAL',
            color: colorOverride || (invoice as any).color || '#14ad9f',
            logoSize: logoSizeOverride ? parseInt(logoSizeOverride) : (invoice as any).logoSize || 50,
            pageMode: pageModeOverride || (invoice as any).pageMode || 'single'
          }}
          documentType={isStornoDocument || (invoice as any).isStorno ? "cancellation" : "invoice"}
          companyId={uid}
          className="w-full" />

      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* SevDesk-style Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={handleBackToInvoices} className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isDisplayingStorno ? (
                      <>
                        Stornorechnung Nr.{' '}
                        {(stornoInvoice as any).stornoNumber || 
                         (stornoInvoice as any).invoiceNumber ||
                         (stornoInvoice as any).number ||
                         `#${(stornoInvoice as any).sequentialNumber || 'TEMP'}`}
                        {(stornoInvoice as any).originalInvoiceNumber && (
                          <span className="text-sm text-gray-500 ml-2">
                            (zur Rechnung {(stornoInvoice as any).originalInvoiceNumber})
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Rechnung Nr.{' '}
                        {invoice?.invoiceNumber ||
                         invoice?.number ||
                         `#${invoice?.sequentialNumber || 'TEMP'}`}
                      </>
                    )}
                  </h2>
                  
                  {/* Toggle-Buttons für Original/Storno wenn Storno verfügbar */}
                  {stornoInvoice && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setShowingStorno(false)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          !showingStorno 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setShowingStorno(true)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          showingStorno 
                            ? 'bg-red-100 text-red-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Storno
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => router.push(`/dashboard/company/${uid}/finance/invoices/create`)}>

                  Neue Rechnung
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="border-gray-300">

                  <Download className="h-4 w-4 mr-2" />
                  {downloadingPdf ? 'Herunterladen...' : 'PDF Download'}
                </Button>

                {invoice.status !== 'paid' &&
                <Button
                  onClick={handleMarkAsPaid}
                  disabled={updating}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white">

                    {updating ? 'Markiere...' : 'Als bezahlt markieren'}
                  </Button>
                }

                {/* Weitere Funktionen Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Mehr
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {(() => {
                      const gobdLocked = (invoice as any)?.gobdStatus?.isLocked;
                      const directLocked = (invoice as any)?.isLocked;
                      const isLocked = gobdLocked || directLocked;
                      const status = invoice.status;
                      
                      // Hide edit button completely if status is 'sent' OR if any lock field is true
                      const shouldHideEditButton = status === 'sent' || isLocked;
                      
                      // Only show edit button if document is NOT locked
                      // Für Stornorechnungen: Keine Bearbeitung möglich
                      if (isStornoDocument || (invoice as any).isStorno) {
                        return (
                          <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                            <Edit className="h-4 w-4 mr-2" />
                            Stornorechnungen können nicht bearbeitet werden
                          </DropdownMenuItem>
                        );
                      }
                      
                      return !shouldHideEditButton ? (
                        <DropdownMenuItem
                          onClick={handleEditInvoice}
                          className="font-medium cursor-pointer hover:bg-gray-50">
                          <Edit className="h-4 w-4 mr-2" />
                          ✏️ Dokument bearbeiten (Status: {status}, Locked: {String(isLocked)})
                        </DropdownMenuItem>
                      ) : null;
                    })()}
                    
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setSendDialogOpen(true)}
                      className="cursor-pointer hover:bg-gray-50">

                      <Mail className="h-4 w-4 mr-3" />
                      Dokument versenden
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => toast.info('Aufgaben-Feature wird bald hinzugefügt!')}
                      className="cursor-pointer hover:bg-gray-50">

                      <CheckCircle className="h-4 w-4 mr-3" />
                      Aufgabe erstellen
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          toast.info('Lieferschein wird erstellt...', { duration: 2000 });

                          // Erstelle Lieferschein basierend auf Rechnung
                          const deliveryNoteData = {
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.invoiceNumber || invoice.number,
                            customerName: invoice.customerName,
                            customerAddress: invoice.customerAddress,
                            items: invoice.items,
                            deliveryDate: new Date().toISOString().split('T')[0],
                            companyId: uid,
                            createdAt: new Date(),
                            status: 'draft'
                          };

                          // Hier würde normalerweise ein API-Call zur Lieferschein-Erstellung stattfinden
                          // Für jetzt navigieren wir zur Delivery Notes Seite
                          const params = new URLSearchParams({
                            'from-invoice': invoiceId,
                            'invoice-number': invoice.invoiceNumber || invoice.number || '',
                            'customer-name': invoice.customerName || ''
                          });

                          router.push(
                            `/dashboard/company/${uid}/finance/delivery-notes?${params.toString()}`
                          );
                        } catch (error) {
                          console.error('Error creating delivery note:', error);
                          toast.error('Fehler beim Erstellen des Lieferscheins');
                        }
                      }}
                      className="cursor-pointer hover:bg-gray-50">

                      <Clipboard className="h-4 w-4 mr-3" />
                      Lieferschein erzeugen
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        router.push(
                          `/dashboard/company/${uid}/finance/invoices/create?template=${invoiceId}`
                        );
                      }}
                      className="cursor-pointer hover:bg-gray-50">

                      <FileText className="h-4 w-4 mr-3" />
                      Rechnung als Vorlage verwenden
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          // Prüfe ob Rechnung überfällig ist
                          const dueDate = new Date(invoice.dueDate);
                          const today = new Date();
                          const daysOverdue = Math.floor(
                            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
                          );

                          if (invoice.status === 'paid') {
                            toast.info('Diese Rechnung ist bereits bezahlt.');
                            return;
                          }

                          if (daysOverdue < 0) {
                            // Zahlungserinnerung
                            const confirmed = confirm(
                              `Diese Rechnung ist noch nicht fällig (fällig am ${dueDate.toLocaleDateString('de-DE')}). ` +
                              'Möchten Sie trotzdem eine freundliche Zahlungserinnerung senden?'
                            );
                            if (!confirmed) return;

                            toast.info('Zahlungserinnerung wird erstellt...', { duration: 2000 });

                            // Für jetzt: Einfache Toast-Nachricht mit geplanter Funktionalität
                            setTimeout(() => {
                              toast.success(
                                'Zahlungserinnerung wurde zur Versendung vorbereitet!',
                                {
                                  description:
                                  'Diese Funktion wird in Kürze vollständig implementiert.',
                                  duration: 4000
                                }
                              );
                            }, 500);
                          } else {
                            // Mahnung
                            let mahnungType = '1. Mahnung';
                            if (daysOverdue > 30) mahnungType = '2. Mahnung';
                            if (daysOverdue > 60) mahnungType = '3. Mahnung';

                            const confirmed = confirm(
                              `Diese Rechnung ist ${daysOverdue} Tage überfällig. ` +
                              `Möchten Sie eine ${mahnungType} erstellen?`
                            );
                            if (!confirmed) return;

                            toast.info(`${mahnungType} wird erstellt...`, { duration: 2000 });

                            // Navigation zur existierenden Reminders-Seite
                            setTimeout(() => {
                              const params = new URLSearchParams({
                                invoice: invoiceId,
                                'invoice-number': invoice.invoiceNumber || invoice.number || '',
                                'customer-name': invoice.customerName || '',
                                'days-overdue': daysOverdue.toString(),
                                level: daysOverdue > 60 ? '3' : daysOverdue > 30 ? '2' : '1'
                              });
                              router.push(
                                `/dashboard/company/${uid}/finance/reminders?${params.toString()}`
                              );
                            }, 500);
                          }
                        } catch (error) {
                          console.error('Error creating reminder/mahnung:', error);
                          toast.error('Fehler beim Erstellen der Mahnung');
                        }
                      }}
                      className="cursor-pointer hover:bg-gray-50">

                      <Calendar className="h-4 w-4 mr-3" />
                      Mahnung / Zahlungserinnerung
                    </DropdownMenuItem>

                    {/* Storno-Option nur für normale Rechnungen verfügbar */}
                    {!isDisplayingStorno && invoice && !stornoInvoice && invoice.status !== 'cancelled' && (
                      <DropdownMenuItem
                        onClick={() => setShowCancelModal(true)}
                        className="cursor-pointer hover:bg-red-50 text-red-600 hover:text-red-700">
                        <Minus className="h-4 w-4 mr-3" />
                        Rechnung stornieren
                      </DropdownMenuItem>
                    )}
                    
                    {/* Info für bereits stornierte Rechnungen */}
                    {(stornoInvoice || (invoice && invoice.status === 'cancelled')) && (
                      <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                        <Minus className="h-4 w-4 mr-3" />
                        Rechnung wurde bereits storniert
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* GoBD Lock Warning Banner */}
        {((invoice as any).gobdStatus?.isLocked || (invoice as any).isLocked) && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-6 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  <strong>Rechnung festgeschrieben:</strong> Dieses Dokument wurde{' '}
                  {(invoice as any).gobdStatus?.lockedAt ? 
                    `am ${new Date((invoice as any).gobdStatus.lockedAt.seconds * 1000).toLocaleDateString('de-DE')}` :
                    (invoice as any).lockedAt ? 
                      `am ${new Date((invoice as any).lockedAt.seconds * 1000).toLocaleDateString('de-DE')}` :
                      'vor Kurzem'
                  }{' '}
                  für die GoBD-konforme Archivierung gesperrt und kann nicht mehr bearbeitet werden.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - SevDesk Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Invoice Details Section */}
          <div className="lg:col-span-1">
            <div className="infocard bg-white border border-gray-200 rounded-lg">
              {/* Header */}
              <div className="top border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isDisplayingStorno ? 'Stornodetails' : 'Rechnungsdetails'}
                  </h3>
                  <div className="group">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="details p-4">
                <div className="space-y-4">
                  {/* Fälligkeit */}
                  {currentDocument?.dueDate &&
                  <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Fälligkeit</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {(() => {
                          const dueDate = new Date(currentDocument.dueDate);
                          const today = new Date();
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          if (isDisplayingStorno) {
                            return 'Storno (keine Fälligkeit)';
                          } else if (diffDays > 0) {
                            return `In ${diffDays} Tagen`;
                          } else if (diffDays === 0) {
                            return 'Heute';
                          } else {
                            return `${Math.abs(diffDays)} Tage überfällig`;
                          }
                        })()}
                        </p>
                      </div>
                    </div>
                  }

                  {/* Zahlungsziel */}
                  {invoice.dueDate &&
                  <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Zahlungsziel</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">
                          <b>{new Date(invoice.dueDate).toLocaleDateString('de-DE')}</b>
                          <br />
                          <span className="text-xs text-gray-500">
                            (
                            {(() => {
                            const createdDate = new Date(invoice.createdAt || invoice.date);
                            const dueDate = new Date(invoice.dueDate);
                            const diffTime = dueDate.getTime() - createdDate.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return `${diffDays} Tage`;
                          })()}
                            )
                          </span>
                        </p>
                      </div>
                    </div>
                  }

                  {/* Tags */}
                  <div className="detail flex justify-between items-center py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Tags</p>
                    </div>
                    <div className="right flex-1 max-w-[180px]">
                      <div className="flex flex-wrap gap-1 justify-end items-center">
                        {/* Existing Tags */}
                        {invoice.tags && invoice.tags.length > 0 &&
                        <>
                            {invoice.tags.map((tag: string, index: number) =>
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors">

                                {tag}
                                <button
                              onClick={() => removeTag(tag)}
                              className="text-gray-400 hover:text-red-500 text-xs font-bold transition-colors"
                              title="Tag entfernen">

                                  ×
                                </button>
                              </span>
                          )}
                          </>
                        }

                        {/* Add Tag Input */}
                        <div className="inline-flex">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={handleTagKeyPress}
                            disabled={isAddingTag}
                            className="text-right text-sm border-0 outline-0 placeholder-gray-400 bg-transparent hover:bg-gray-50 focus:bg-white focus:border focus:border-[#14ad9f] focus:rounded px-2 py-1 min-w-[100px] max-w-[120px]"
                            placeholder={
                            invoice.tags && invoice.tags.length > 0 ? '+' : 'Tags hinzufügen'
                            }
                            onFocus={(e) => {
                              e.target.style.textAlign = 'left';
                              e.target.placeholder = 'Tag eingeben...';
                            }}
                            onBlur={(e) => {
                              if (newTag.trim()) {
                                addTag(newTag.trim());
                              } else {
                                e.target.style.textAlign = 'right';
                                e.target.placeholder =
                                invoice.tags && invoice.tags.length > 0 ? '+' : 'Tags hinzufügen';
                              }
                            }} />

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Originalrechnung (nur bei Storno) */}
                  {(isStornoDocument || (invoice as any).isStorno) && (invoice as any).originalInvoiceNumber && (
                    <div className="detail flex justify-between items-start py-2 bg-red-50 px-3 py-2 rounded">
                      <div className="left">
                        <p className="label text-sm text-red-700 font-medium">Originalrechnung</p>
                      </div>
                      <div className="right">
                        <p className="text-sm font-bold text-red-900">
                          Nr. {(invoice as any).originalInvoiceNumber}
                        </p>
                        {(invoice as any).originalInvoiceId && (
                          <button 
                            onClick={() => router.push(`/dashboard/company/${uid}/finance/invoices/${(invoice as any).originalInvoiceId}`)}
                            className="text-xs text-red-600 hover:text-red-800 underline mt-1 block"
                          >
                            Originalrechnung anzeigen
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Storno-Erstellungsdatum (nur bei Storno) */}
                  {(isStornoDocument || (invoice as any).isStorno) && (invoice as any).stornoCreatedAt && (
                    <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Storno erstellt am</p>
                      </div>
                      <div className="right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date((invoice as any).stornoCreatedAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rechnungsdatum */}
                  <div className="detail flex justify-between items-start py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">
                        {isStornoDocument || (invoice as any).isStorno ? 'Ursprüngliches Datum' : 'Rechnungsdatum'}
                      </p>
                    </div>
                    <div className="right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(invoice.createdAt || invoice.date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>

                  {/* Status als Badge */}
                  <div className="detail flex justify-between items-start py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Status</p>
                    </div>
                    <div className="right">
                      <Badge
                        variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                        className={
                        invoice.status === 'paid' ?
                        'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                        }>

                        {invoice.status === 'paid' ? 'Bezahlt' : 'Offen'}
                      </Badge>
                    </div>
                  </div>

                  {/* Gesamtbetrag */}
                  <div className="detail flex justify-between items-start py-2 border-t border-gray-100 pt-4">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Gesamtbetrag</p>
                    </div>
                    <div className="right">
                      <p className={`text-sm font-bold ${isDisplayingStorno ? 'text-red-600' : 'text-gray-900'}`}>
                        {(currentDocument?.total || currentDocument?.amount || 0).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  {/* Customer */}
                  {currentDocument?.customerName &&
                  <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Kunde</p>
                      </div>
                      <div className="right">
                        <p className="text-sm font-medium text-gray-900">{currentDocument.customerName}</p>
                      </div>
                    </div>
                  }

                  {/* DATEV Export History */}
                  <div className="detail flex justify-between items-start py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">DATEV Export-Historie</p>
                    </div>
                    <div className="right column">
                      <p className="sublabel text-sm text-gray-500">nicht exportiert</p>
                      <div className="upgrade-icon-wrapper mt-1 flex items-center gap-2 text-xs text-[#14ad9f] cursor-pointer hover:text-[#129488]">
                        <span className="upgrade-text">Zum Export</span>
                        <Sparkles className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="pdf col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              {/* Live Preview Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Live Vorschau</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setShowLivePreview(true)}
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white">

                      <Eye className="h-4 w-4 mr-2" />
                      Vollbild-Vorschau
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}>

                      <Download className="h-4 w-4 mr-2" />
                      PDF Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Live Preview Content */}
              <div className="p-4">
                <div className="flex justify-center">
                  {loading ?
                  <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
                        <p className="text-gray-500">Vorschau wird geladen...</p>
                      </div>
                    </div> :
                  error ?
                  <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-red-400 mx-auto mb-2" />
                        <p className="text-red-500 mb-4">Fehler beim Laden der Vorschau</p>
                        <Button
                        onClick={() => window.location.reload()}
                        className="bg-[#14ad9f] hover:bg-[#129488] text-white">

                          <FileText className="h-4 w-4 mr-2" />
                          Seite neu laden
                        </Button>

                        {/* PDF Selector Modal */}
                        {showPdfSelector && availablePdfs.length > 0 &&
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">PDF auswählen</h3>
                                <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowPdfSelector(false)}>

                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {availablePdfs.map((pdf, index) =>
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border rounded">

                                    <span className="text-sm truncate flex-1 mr-2">{pdf.name}</span>
                                    <Button
                                size="sm"
                                onClick={() => {
                                  setPdfUrl(pdf.url);
                                  setPdfError(null);
                                  setShowPdfSelector(false);
                                  toast.success(`PDF "${pdf.name}" geladen!`);
                                }}
                                className="bg-[#14ad9f] hover:bg-[#129488] text-white">

                                      Laden
                                    </Button>
                                  </div>
                            )}
                              </div>
                            </div>
                          </div>
                      }
                      </div>
                    </div> :
                  currentDocument ?
                  // Live Preview der Rechnung/Storno mit aktuellen Template-Einstellungen aus Firestore
                  <div className={`w-full h-[800px] border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-white ${hideUI ? 'fixed inset-0 z-50 h-screen border-0' : ''}`}>
                      <div className="w-full h-full overflow-auto flex justify-center py-4">
                        <InlinePreview
                        document={{
                          ...currentDocument,
                          // Template-Überschreibung aus URL-Parametern (für PDF-Generierung)
                          template: templateOverride || (currentDocument as any).template || 'TEMPLATE_NEUTRAL',
                          color: colorOverride || (currentDocument as any).color || '#14ad9f',
                          logoSize: logoSizeOverride ? parseInt(logoSizeOverride) : (currentDocument as any).logoSize || 50,
                          pageMode: pageModeOverride || (currentDocument as any).pageMode || 'single'
                        }}
                        documentType={isDisplayingStorno ? "cancellation" : "invoice"}
                        companyId={uid}
                        className={`shadow-lg ${isPdfMode ? 'w-[210mm] min-h-[297mm]' : ''}`} />

                      </div>
                    </div> :

                  <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 mb-4">Keine Rechnungsdaten verfügbar</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EmailSendModalNormal - GoBD-free version */}
        {invoice &&
        <EmailSendModalNormal
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          document={invoice}
          documentType="invoice"
          companyId={uid}
          selectedLayout={(invoice as any).template || (invoice as any).templateId || 'TEMPLATE_NEUTRAL'}
          selectedColor={(invoice as any).color || '#14ad9f'}
          logoUrl={(invoice as any).logoUrl || null}
          logoSize={(invoice as any).logoSize || 50}
          pageMode={(invoice as any).pageMode || 'single'}
          documentSettings={(invoice as any).documentSettings || {}}
          userData={{
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email || undefined,
            phone: (user as any)?.phone
          }}
          companyData={{
            name: invoice.companyName || 'Ihr Unternehmen',
            email: (invoice as any).companyEmail || user?.email || 'noreply@example.com',
            signature: (invoice as any).companySignature || undefined
          }}
          defaultRecipients={[
            (invoice as any).customerEmail || '',
          ].filter(Boolean)}
          onSend={async (method, options) => {
            toast.success(`${method} Aktion ausgeführt`);
            
            // Rechnung nach dem Versand neu laden (um GoBD-Status zu aktualisieren)
            if (method === 'email') {
              console.log('🔄 Lade Rechnung nach E-Mail-Versand neu...');
              setTimeout(() => {
                loadInvoice(); // Rechnung neu laden um GoBD-Status zu bekommen
              }, 1000); // Kurze Verzögerung damit GoBD-Service Zeit hat
            }
          }} />

        }

        {/* Vollbild Live Preview Modal */}
        {(showingStorno ? stornoInvoice : invoice) &&
        <LivePreviewModal
          isOpen={showLivePreview}
          onClose={() => setShowLivePreview(false)}
          document={{
            ...(showingStorno ? stornoInvoice : invoice),
            // Verwende Template-Einstellungen aus Firestore (falls vorhanden)
            template: ((showingStorno ? stornoInvoice : invoice) as any).template || ((showingStorno ? stornoInvoice : invoice) as any).templateId || 'TEMPLATE_NEUTRAL',
            color: ((showingStorno ? stornoInvoice : invoice) as any).color || '#14ad9f',
            logoUrl: ((showingStorno ? stornoInvoice : invoice) as any).logoUrl || null,
            logoSize: ((showingStorno ? stornoInvoice : invoice) as any).logoSize || 50,
            pageMode: ((showingStorno ? stornoInvoice : invoice) as any).pageMode || 'single',
            documentSettings: ((showingStorno ? stornoInvoice : invoice) as any).documentSettings || {
              language: 'de',
              showQRCode: false,
              showEPCQRCode: false,
              showCustomerNumber: false,
              showContactPerson: false,
              showVATPerPosition: false,
              showArticleNumber: false,
              showFoldLines: true,
              showPageNumbers: true,
              showFooter: true,
              showWatermark: false
            }
          }}
          documentType={showingStorno ? "cancellation" : "invoice"}
          companyId={uid}
          onSend={async (method, options) => {
            // Handle send actions if needed
            toast.success(`${method} Aktion ausgeführt`);
          }} />

        }

        {/* Storno Modal */}
        <CancelInvoiceModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelInvoice}
          invoice={invoice}
          isLoading={updating}
        />
      </div>
    </div>);

}
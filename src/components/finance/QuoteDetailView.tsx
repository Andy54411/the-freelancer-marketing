'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  MoreHorizontal,
  Mail,
  Eye,
  Sparkles,
} from 'lucide-react';
import { QuoteService, Quote } from '@/services/quoteService';
import { CustomerService } from '@/services/customerService';
import { Customer } from '@/components/finance/AddCustomerModal';
import { toast } from 'sonner';
import { InlinePreview } from '@/components/finance/InlinePreview';
import { LivePreviewModal } from '@/components/finance/LivePreviewModal';
import { EmailSendModalNormal } from '@/components/finance/EmailsendModalnormal';
import { CustomerDetailModal } from '@/components/finance/customer-detail/CustomerDetailModal';

export default function QuoteDetailView() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const quoteId = typeof params?.quoteId === 'string' ? params.quoteId : '';

  // URL-Parameter für Template-Überschreibung (für PDF-Generierung)
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Lade URL-Parameter beim Mount
    const params = new URLSearchParams(window.location.search);
    setUrlParams(params);
  }, [quoteId]);

  // Template-Überschreibung aus URL-Parametern
  const templateOverride = urlParams?.get('template');
  const colorOverride = urlParams?.get('color');
  const logoSizeOverride = urlParams?.get('logoSize');
  const pageModeOverride = urlParams?.get('pageMode');
  const isPdfMode = urlParams?.get('pdf') === 'true';
  const hideUI = urlParams?.get('hideUI') === 'true';

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  useEffect(() => {
    if (user && user.uid === uid && quoteId) {
      loadQuote();
    }
  }, [user, uid, quoteId]);

  const loadQuote = useCallback(async () => {
    try {
      setLoading(true);
      const quoteData = await QuoteService.getQuote(uid, quoteId);
      if (!quoteData) {
        setError('Angebot nicht gefunden');
        return;
      }
      setQuote(quoteData);
      setError(null);
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Fehler beim Laden des Angebots: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  }, [uid, quoteId]);

  const handleBackToQuotes = () => {
    router.push(`/dashboard/company/${uid}/finance/quotes`);
  };

  const handleEditQuote = () => {
    // Prüfe ob Angebot noch bearbeitet werden kann
    if (quote?.status === 'accepted') {
      toast.error('Angenommene Angebote können nicht mehr bearbeitet werden.');
      return;
    }
    router.push(`/dashboard/company/${uid}/finance/quotes/${quoteId}/edit`);
  };

  const handleDownloadPdf = async () => {
    if (!quote) {
      return;
    }

    setDownloadingPdf(true);

    try {
      // Find the preview element with data-pdf-template attribute (same as InvoiceDetailPage)
      const previewElement = document.querySelector('[data-pdf-template]');

      if (!previewElement) {
        throw new Error(
          'Preview-Element nicht gefunden. Bitte warten Sie, bis die Vorschau geladen ist.'
        );
      }

      const htmlContent = previewElement.innerHTML;

      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error(
          'Kein HTML-Content in der Preview verfügbar. Bitte laden Sie die Seite neu.'
        );
      }

      // Extract complete HTML with styles (exactly like InvoiceDetailPage)
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
        element.querySelectorAll('*').forEach(child => {
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
      styleTags.forEach(styleElement => {
        if (styleElement.textContent) {
          allStyles.push(styleElement.textContent);
        }
      });

      // Get all linked stylesheets
      const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
      linkTags.forEach(linkElement => {
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
        }
      });

      // Create complete HTML with ALL styles (exactly like InvoiceDetailPage)
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: completeHtml,
        }),
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
      link.download = `Angebot_${(quote as any).quoteNumber || quote.number || quote.id.substring(0, 8)}.pdf`;
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

  const handleMarkAsAccepted = async () => {
    if (!quote) return;
    
    setUpdating(true);
    try {
      await QuoteService.updateQuote(uid, quote.id, { status: 'accepted' });
      setQuote(prev => prev ? { ...prev, status: 'accepted', acceptedAt: new Date() } : null);
      toast.success('Angebot wurde als angenommen markiert');
    } catch (error) {
      console.error('Error marking quote as accepted:', error);
      toast.error('Fehler beim Markieren als angenommen');
    } finally {
      setUpdating(false);
    }
  };

  const handleConvertToInvoice = () => {
    if (!quote) return;
    router.push(`/dashboard/company/${uid}/finance/invoices/create?quoteId=${quote.id}`);
  };

  const addTag = async (tagName: string) => {
    if (!quote || isAddingTag || !tagName.trim()) return;

    setIsAddingTag(true);
    try {
      const updatedTags = [...((quote as any).tags || []), tagName];
      await QuoteService.updateQuote(uid, quote.id, { ...quote, tags: updatedTags } as any);
      setQuote(prev => prev ? { ...prev, tags: updatedTags } as any : null);
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
    if (!quote) return;

    try {
      const updatedTags = ((quote as any).tags || []).filter((tag: string) => tag !== tagToRemove);
      await QuoteService.updateQuote(uid, quote.id, { ...quote, tags: updatedTags } as any);
      setQuote(prev => prev ? { ...prev, tags: updatedTags } as any : null);
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

  const handleDuplicate = () => {
    if (!quote) return;
    router.push(`/dashboard/company/${uid}/finance/quotes/create?duplicateId=${quote.id}`);
  };

  const handleCustomerClick = async () => {
    if (!quote?.customerName) return;
    
    setCustomerLoading(true);
    try {
      // Try to find customer by name
      const customers = await CustomerService.getCustomers(uid);
      const customer = customers.find(c => c.name === quote.customerName);
      
      if (customer) {
        setSelectedCustomer(customer);
        setShowCustomerModal(true);
      } else {
        toast.info('Kundendetails nicht gefunden');
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      toast.error('Fehler beim Laden der Kundendetails');
    } finally {
      setCustomerLoading(false);
    }
  };

  const isExpired = (quote: Quote) => {
    const validUntil = new Date(quote.validUntil || quote.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validUntil.setHours(0, 0, 0, 0);
    return validUntil < today && quote.status !== 'accepted';
  };

  const getStatusColor = (status: string, quote: Quote) => {
    if (isExpired(quote) && status !== 'accepted') {
      return 'bg-red-100 text-red-800 border-red-200';
    }

    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string, quote: Quote) => {
    if (isExpired(quote) && status !== 'accepted') {
      return 'Abgelaufen';
    }

    switch (status) {
      case 'draft':
        return 'Entwurf';
      case 'sent':
        return 'Versendet';
      case 'accepted':
        return 'Angenommen';
      case 'rejected':
        return 'Abgelehnt';
      case 'cancelled':
        return 'Storniert';
      case 'expired':
        return 'Abgelaufen';
      default:
        return status;
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
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Angebot wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={handleBackToQuotes}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Angeboten
        </Button>

        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error || 'Angebot nicht gefunden'}</p>
            <Button onClick={handleBackToQuotes} className="bg-[#14ad9f] hover:bg-[#129488]">
              Zurück zu Angeboten
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Für PDF-Generierung: Nur Template ohne UI rendern
  if (hideUI && quote) {
    return (
      <div className="min-h-screen bg-white">
        <InlinePreview
          document={{
            ...quote,
            // Template-Überschreibung aus URL-Parametern
            template: templateOverride || (quote as any).template || 'TEMPLATE_NEUTRAL',
            color: colorOverride || (quote as any).color || '#14ad9f',
            logoSize: logoSizeOverride
              ? parseInt(logoSizeOverride)
              : (quote as any).logoSize || 50,
            pageMode: pageModeOverride || (quote as any).pageMode || 'single',
          }}
          documentType="quote"
          companyId={uid}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* SevDesk-style Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={handleBackToQuotes} className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    Angebot Nr. {(quote as any).quoteNumber || quote.number || `#${(quote as any).sequentialNumber || 'TEMP'}`}
                  </h2>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="border-gray-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingPdf ? 'Herunterladen...' : 'PDF Download'}
                </Button>

                {quote.status === 'sent' && (
                  <Button
                    onClick={handleMarkAsAccepted}
                    disabled={updating}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    {updating ? 'Markiere...' : 'Als angenommen markieren'}
                  </Button>
                )}

                {/* Weitere Funktionen Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Mehr
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {quote.status !== 'accepted' && (
                      <DropdownMenuItem
                        onClick={handleEditQuote}
                        className="font-medium cursor-pointer hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Angebot bearbeiten
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setSendDialogOpen(true)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <Mail className="h-4 w-4 mr-3" />
                      Angebot versenden
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleDuplicate}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <FileText className="h-4 w-4 mr-3" />
                      Angebot als Vorlage verwenden
                    </DropdownMenuItem>

                    {quote.status === 'accepted' && (
                      <DropdownMenuItem
                        onClick={handleConvertToInvoice}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        Zu Rechnung umwandeln
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - SevDesk Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Quote Details Section */}
          <div className="lg:col-span-1">
            <div className="infocard bg-white border border-gray-200 rounded-lg">
              {/* Header */}
              <div className="top border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Angebotsdetails</h3>
                  <div className="group">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="details p-4">
                <div className="space-y-4">
                  {/* Gültigkeit */}
                  {quote.validUntil && (
                    <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Gültigkeit</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {(() => {
                            const validUntil = new Date(quote.validUntil);
                            const today = new Date();
                            const diffTime = validUntil.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (quote.status === 'accepted') {
                              return 'Angenommen';
                            } else if (diffDays > 0) {
                              return `Noch ${diffDays} Tage`;
                            } else if (diffDays === 0) {
                              return 'Läuft heute ab';
                            } else {
                              return `${Math.abs(diffDays)} Tage abgelaufen`;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Gültig bis */}
                  {quote.validUntil && (
                    <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Gültig bis</p>
                      </div>
                      <div className="right text-right">
                        <p className="text-sm font-medium text-gray-900">
                          <b>{new Date(quote.validUntil).toLocaleDateString('de-DE')}</b>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="detail flex justify-between items-center py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Tags</p>
                    </div>
                    <div className="right flex-1 max-w-[180px]">
                      <div className="flex flex-wrap gap-1 justify-end items-center">
                        {/* Existing Tags */}
                        {(quote as any).tags && (quote as any).tags.length > 0 && (
                          <>
                            {(quote as any).tags.map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                              >
                                {tag}
                                <button
                                  onClick={() => removeTag(tag)}
                                  className="text-gray-400 hover:text-red-500 text-xs font-bold transition-colors"
                                  title="Tag entfernen"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </>
                        )}

                        {/* Add Tag Input */}
                        <div className="inline-flex">
                          <input
                            type="text"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyPress={handleTagKeyPress}
                            disabled={isAddingTag}
                            className="text-right text-sm border-0 outline-0 placeholder-gray-400 bg-transparent hover:bg-gray-50 focus:bg-white focus:border focus:border-[#14ad9f] focus:rounded px-2 py-1 min-w-[100px] max-w-[120px]"
                            placeholder={
                              (quote as any).tags && (quote as any).tags.length > 0 ? '+' : 'Tags hinzufügen'
                            }
                            onFocus={e => {
                              e.target.style.textAlign = 'left';
                              e.target.placeholder = 'Tag eingeben...';
                            }}
                            onBlur={e => {
                              if (newTag.trim()) {
                                addTag(newTag.trim());
                              } else {
                                e.target.style.textAlign = 'right';
                                e.target.placeholder =
                                  (quote as any).tags && (quote as any).tags.length > 0 ? '+' : 'Tags hinzufügen';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Angebotsdatum */}
                  <div className="detail flex justify-between items-start py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Angebotsdatum</p>
                    </div>
                    <div className="right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(quote.createdAt || quote.date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>

                  {/* Versendet am */}
                  <div className="detail flex justify-between items-start py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Versendet am</p>
                    </div>
                    <div className="right">
                      {quote.sentAt ? (
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(quote.sentAt).toLocaleDateString('de-DE')} um{' '}
                          {new Date(quote.sentAt).toLocaleTimeString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} Uhr
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Noch nicht versendet</p>
                      )}
                    </div>
                  </div>

                  {/* Status als Badge */}
                  <div className="detail flex justify-between items-start py-2">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Status</p>
                    </div>
                    <div className="right">
                      <Badge
                        variant={quote.status === 'accepted' ? 'default' : 'secondary'}
                        className={getStatusColor(quote.status || 'draft', quote)}
                      >
                        {getStatusText(quote.status || 'draft', quote)}
                      </Badge>
                    </div>
                  </div>

                  {/* Gesamtbetrag */}
                  <div className="detail flex justify-between items-start py-2 border-t border-gray-100 pt-4">
                    <div className="left">
                      <p className="label text-sm text-gray-600">Gesamtbetrag</p>
                    </div>
                    <div className="right">
                      <p className="text-sm font-bold text-gray-900">
                        {(quote.total || (quote as any).amount || 0).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  {/* Customer */}
                  {quote.customerName && (
                    <div className="detail flex justify-between items-start py-2">
                      <div className="left">
                        <p className="label text-sm text-gray-600">Kunde</p>
                      </div>
                      <div className="right">
                        <button
                          onClick={handleCustomerClick}
                          disabled={customerLoading}
                          className="text-sm font-medium text-[#14ad9f] hover:text-[#129488] hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {customerLoading ? 'Lade...' : quote.customerName}
                        </button>
                      </div>
                    </div>
                  )}
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
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Vollbild-Vorschau
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Live Preview Content */}
              <div className="p-4">
                <div className="flex justify-center">
                  {loading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
                        <p className="text-gray-500">Vorschau wird geladen...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-red-400 mx-auto mb-2" />
                        <p className="text-red-500 mb-4">Fehler beim Laden der Vorschau</p>
                        <Button
                          onClick={() => window.location.reload()}
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Seite neu laden
                        </Button>
                      </div>
                    </div>
                  ) : quote ? (
                    // Live Preview des Angebots mit aktuellen Template-Einstellungen
                    <div
                      className={`w-full h-[800px] border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-white ${hideUI ? 'fixed inset-0 z-50 h-screen border-0' : ''}`}
                    >
                      <div className="w-full h-full overflow-auto flex justify-center py-4">
                        <InlinePreview
                          document={{
                            ...quote,
                            // Template-Überschreibung aus URL-Parametern (für PDF-Generierung)
                            template:
                              templateOverride ||
                              (quote as any).template ||
                              'TEMPLATE_NEUTRAL',
                            color: colorOverride || (quote as any).color || '#14ad9f',
                            logoSize: logoSizeOverride
                              ? parseInt(logoSizeOverride)
                              : (quote as any).logoSize || 50,
                            pageMode:
                              pageModeOverride || (quote as any).pageMode || 'single',
                          }}
                          documentType="quote"
                          companyId={uid}
                          className={`inline-preview-content shadow-lg ${isPdfMode ? 'w-[210mm] min-h-[297mm]' : ''}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 mb-4">Keine Angebotsdaten verfügbar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EmailSendModalNormal */}
        {quote && (
          <EmailSendModalNormal
            isOpen={sendDialogOpen}
            onClose={() => setSendDialogOpen(false)}
            document={quote}
            documentType="quote"
            companyId={uid}
            selectedLayout={
              (quote as any).template || (quote as any).templateId || 'TEMPLATE_NEUTRAL'
            }
            selectedColor={(quote as any).color || '#14ad9f'}
            logoUrl={(quote as any).logoUrl || null}
            logoSize={(quote as any).logoSize || 50}
            pageMode={(quote as any).pageMode || 'single'}
            documentSettings={(quote as any).documentSettings || {}}
            userData={{
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email || undefined,
              phone: (user as any)?.phone,
            }}
            companyData={{
              name: (quote as any).companyName || 'Ihr Unternehmen',
              email: (quote as any).companyEmail || user?.email || 'noreply@example.com',
              signature: (quote as any).companySignature || undefined,
            }}
            defaultRecipients={[(quote as any).customerEmail || ''].filter(Boolean)}
            onSend={async (method, options) => {
              if (method === 'email') {
                try {
                  // Setze sentAt Datum in der Datenbank
                  await QuoteService.updateQuote(uid, quoteId, {
                    sentAt: new Date(),
                    status: 'sent', // Status auf 'sent' ändern
                  });

                  // Update local state sofort
                  setQuote(prev => prev ? {
                    ...prev,
                    sentAt: new Date(),
                    status: 'sent' as const,
                  } : null);

                  toast.success('E-Mail versendet und Sendedatum gespeichert');
                } catch (error) {
                  console.error('Fehler beim Aktualisieren des Sendedatums:', error);
                  toast.error('E-Mail versendet, aber Sendedatum konnte nicht gespeichert werden');
                }
              } else {
                toast.success(`${method} Aktion ausgeführt`);
              }
            }}
          />
        )}

        {/* Vollbild Live Preview Modal */}
        {quote && (
          <LivePreviewModal
            isOpen={showLivePreview}
            onClose={() => setShowLivePreview(false)}
            document={{
              ...quote,
              // Verwende Template-Einstellungen aus Firestore (falls vorhanden)
              template:
                (quote as any).template ||
                (quote as any).templateId ||
                'TEMPLATE_NEUTRAL',
              color: (quote as any).color || '#14ad9f',
              logoUrl: (quote as any).logoUrl || null,
              logoSize: (quote as any).logoSize || 50,
              pageMode: (quote as any).pageMode || 'single',
              documentSettings: (quote as any).documentSettings || {
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
                showWatermark: false,
              },
            }}
            documentType="quote"
            companyId={uid}
            onSend={async (method, options) => {
              // Handle send actions if needed
              toast.success(`${method} Aktion ausgeführt`);
            }}
          />
        )}

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            isOpen={showCustomerModal}
            onClose={() => {
              setShowCustomerModal(false);
              setSelectedCustomer(null);
            }}
            companyId={uid}
            calculatedStats={{
              totalAmount: 0,
              totalInvoices: 0,
              totalMeetings: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
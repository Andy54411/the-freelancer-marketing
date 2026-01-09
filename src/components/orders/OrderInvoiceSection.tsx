'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Upload, Clock, CheckCircle, AlertCircle, Send, Link2, X } from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, Timestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface OrderInvoiceSectionProps {
  orderId: string;
  userRole: 'customer' | 'provider';
  orderStatus: string;
  _providerId: string;
  _customerId: string;
  className?: string;
}

interface InvoiceData {
  status: 'none' | 'requested' | 'uploaded' | 'downloaded';
  requestedAt?: Timestamp;
  uploadedAt?: Timestamp;
  downloadedAt?: Timestamp;
  invoiceUrl?: string;
  invoiceFileName?: string;
  linkedInvoiceId?: string; // ID der verknüpften Rechnung aus dem Finance-Bereich
  linkedInvoiceNumber?: string; // Rechnungsnummer der verknüpften Rechnung
}

interface ExistingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  createdAt: Timestamp;
  status: string;
  pdfUrl?: string;
}

export default function OrderInvoiceSection({
  orderId,
  userRole,
  orderStatus,
  _providerId,
  _customerId,
  className = '',
}: OrderInvoiceSectionProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({ status: 'none' });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Neue States für das Verknüpfen existierender Rechnungen
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState<ExistingInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Lade Rechnungsdaten
  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
        if (orderDoc.exists()) {
          const data = orderDoc.data();
          if (data.invoice) {
            setInvoiceData(data.invoice as InvoiceData);
          }
        }
      } catch {
        // Fehler ignorieren - Standardwert verwenden
      } finally {
        setIsLoading(false);
      }
    };
    loadInvoiceData();
  }, [orderId]);

  // Lade existierende Rechnungen aus dem Finance-Bereich
  const loadExistingInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Hole die Company-ID aus dem Auftrag
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
      if (!orderDoc.exists()) return;
      
      const companyId = orderDoc.data().selectedAnbieterId;
      if (!companyId) return;

      // Lade Rechnungen dieser Company (alle finalisierten)
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      const q = query(
        invoicesRef,
        where('status', 'in', ['sent', 'paid', 'finalized', 'draft']),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const invoices: ExistingInvoice[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          invoiceNumber: data.invoiceNumber || data.number || `RE-${docSnap.id.slice(-6)}`,
          customerName: data.customerName || data.customer?.name || 'Unbekannt',
          totalAmount: data.totalAmount || data.total || 0,
          createdAt: data.createdAt,
          status: data.status,
          pdfUrl: data.pdfUrl || data.invoicePdfUrl,
        };
      });
      
      setExistingInvoices(invoices);
    } catch (err) {
      console.error('Fehler beim Laden der Rechnungen:', err);
      setError('Fehler beim Laden der Rechnungen');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Verknüpfe eine existierende Rechnung mit dem Auftrag
  const handleLinkInvoice = async (invoice: ExistingInvoice) => {
    setIsLinking(true);
    setError(null);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      const user = auth.currentUser;
      if (!user) throw new Error('Nicht angemeldet');

      // Hole die Company-ID
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
      if (!orderDoc.exists()) throw new Error('Auftrag nicht gefunden');
      const companyId = orderDoc.data().selectedAnbieterId;

      // Verwende vorhandene PDF-URL oder erstelle eine Print-URL als Fallback
      // Print-URL Struktur: /print/{type}/{companyId}/{documentId}
      const pdfUrl = invoice.pdfUrl || `/print/invoice/${companyId}/${invoice.id}`;

      const response = await fetch(`/api/orders/${orderId}/invoice/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceUrl: pdfUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Verknuepfen der Rechnung');
      }

      setInvoiceData({
        status: 'uploaded',
        uploadedAt: Timestamp.now(),
        invoiceUrl: pdfUrl,
        invoiceFileName: `${invoice.invoiceNumber}.pdf`,
        linkedInvoiceId: invoice.id,
        linkedInvoiceNumber: invoice.invoiceNumber,
        requestedAt: invoiceData.requestedAt,
      });
      
      setShowInvoiceSelector(false);
      setSuccessMessage(`Rechnung ${invoice.invoiceNumber} wurde erfolgreich verknuepft`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLinking(false);
    }
  };

  // Öffne den Invoice Selector
  const openInvoiceSelector = () => {
    setShowInvoiceSelector(true);
    loadExistingInvoices();
  };

  // Kunde fordert Rechnung an
  const handleRequestInvoice = async () => {
    setIsRequesting(true);
    setError(null);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/orders/${orderId}/invoice/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Fehler beim Anfordern der Rechnung');
      }

      setInvoiceData(prev => ({
        ...prev,
        status: 'requested',
        requestedAt: Timestamp.now(),
      }));
      setSuccessMessage('Rechnung wurde beim Anbieter angefordert');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsRequesting(false);
    }
  };

  // Anbieter lädt Rechnung hoch
  const handleUploadInvoice = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Nur PDF erlauben
    if (file.type !== 'application/pdf') {
      setError('Bitte nur PDF-Dateien hochladen');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('Datei darf maximal 10MB groß sein');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/orders/${orderId}/invoice/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Fehler beim Hochladen der Rechnung');
      }

      const result = await response.json();

      setInvoiceData({
        status: 'uploaded',
        uploadedAt: Timestamp.now(),
        invoiceUrl: result.invoiceUrl,
        invoiceFileName: file.name,
        requestedAt: invoiceData.requestedAt,
      });
      setSuccessMessage('Rechnung wurde erfolgreich hochgeladen');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Kunde lädt Rechnung herunter
  const handleDownloadInvoice = async () => {
    if (!invoiceData.invoiceUrl) return;

    try {
      // Öffne Download in neuem Tab
      window.open(invoiceData.invoiceUrl, '_blank');

      // Aktualisiere Status
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      await fetch(`/api/orders/${orderId}/invoice/downloaded`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setInvoiceData(prev => ({
        ...prev,
        status: 'downloaded',
        downloadedAt: Timestamp.now(),
      }));
    } catch {
      // Download trotzdem erlauben
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rechnung
          </h3>
        </div>
        <div className="p-6 flex justify-center">
          <div className="animate-pulse flex items-center gap-2 text-gray-400">
            <Clock className="h-4 w-4 animate-spin" />
            Lade...
          </div>
        </div>
      </div>
    );
  }

  // Nur bei abgeschlossenen oder aktiven Aufträgen anzeigen
  const showableStatuses = ['accepted', 'aktiv', 'completed', 'abgeschlossen', 'PROVIDER_COMPLETED'];
  if (!showableStatuses.some(s => orderStatus.toLowerCase().includes(s.toLowerCase()))) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rechnung
        </h3>
      </div>
      <div className="p-6">
        {/* Erfolgs-/Fehlermeldungen */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* KUNDEN-ANSICHT */}
        {userRole === 'customer' && (
          <div className="space-y-4">
            {invoiceData.status === 'none' && (
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-4">
                  Sie können hier eine Rechnung beim Anbieter anfordern.
                </p>
                <button
                  onClick={handleRequestInvoice}
                  disabled={isRequesting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isRequesting ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Wird angefordert...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Rechnung anfordern
                    </>
                  )}
                </button>
              </div>
            )}

            {invoiceData.status === 'requested' && (
              <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-700 font-medium">Rechnung angefordert</p>
                <p className="text-amber-600 text-sm mt-1">
                  Der Anbieter wurde benachrichtigt. Die Rechnung wird in Kürze bereitgestellt.
                </p>
                {invoiceData.requestedAt && (
                  <p className="text-amber-500 text-xs mt-2">
                    Angefordert am {invoiceData.requestedAt.toDate().toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            )}

            {(invoiceData.status === 'uploaded' || invoiceData.status === 'downloaded') && (
              <div className="text-center">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Rechnung verfügbar</p>
                  {invoiceData.invoiceFileName && (
                    <p className="text-green-600 text-sm mt-1">{invoiceData.invoiceFileName}</p>
                  )}
                </div>
                <button
                  onClick={handleDownloadInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Rechnung herunterladen
                </button>
                {invoiceData.downloadedAt && (
                  <p className="text-gray-400 text-xs mt-2">
                    Zuletzt heruntergeladen am {invoiceData.downloadedAt.toDate().toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ANBIETER-ANSICHT */}
        {userRole === 'provider' && (
          <div className="space-y-4">
            {/* Anforderungs-Hinweis */}
            {invoiceData.status === 'requested' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-amber-700 font-medium">Rechnung angefordert</p>
                    <p className="text-amber-600 text-sm mt-1">
                      Der Kunde hat eine Rechnung angefordert. Bitte laden Sie die Rechnung hoch oder verknüpfen Sie eine bestehende Rechnung.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hochgeladene/Verknüpfte Rechnung anzeigen */}
            {(invoiceData.status === 'uploaded' || invoiceData.status === 'downloaded') && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-green-700 font-medium">
                        {invoiceData.linkedInvoiceNumber 
                          ? `Rechnung ${invoiceData.linkedInvoiceNumber} verknüpft`
                          : 'Rechnung hochgeladen'}
                      </p>
                      {invoiceData.invoiceFileName && (
                        <p className="text-green-600 text-sm">{invoiceData.invoiceFileName}</p>
                      )}
                    </div>
                  </div>
                  {invoiceData.status === 'downloaded' && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Heruntergeladen
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Buttons: PDF hochladen ODER bestehende Rechnung verknüpfen */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 justify-center">
                {/* Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadInvoice}
                  accept="application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#14ad9f] hover:bg-[#0d8a7f] text-white rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      Hochladen...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      {invoiceData.status === 'uploaded' || invoiceData.status === 'downloaded'
                        ? 'Neue PDF'
                        : 'PDF hochladen'}
                    </>
                  )}
                </button>

                {/* Verknüpfen Button - Outline Style */}
                <button
                  onClick={openInvoiceSelector}
                  disabled={isLinking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f]/10 rounded-md transition-colors disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Rechnung verknüpfen
                </button>
              </div>
              <p className="text-gray-400 text-xs text-center">
                PDF hochladen oder bestehende Rechnung verknüpfen
              </p>
            </div>

            {/* Invoice Selector Modal */}
            {showInvoiceSelector && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-gray-900">Rechnung auswählen</h3>
                    <button
                      onClick={() => setShowInvoiceSelector(false)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {loadingInvoices ? (
                      <div className="flex items-center justify-center py-8">
                        <Clock className="h-6 w-6 animate-spin text-teal-500" />
                        <span className="ml-2 text-gray-500">Lade Rechnungen...</span>
                      </div>
                    ) : existingInvoices.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Keine Rechnungen gefunden</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Erstellen Sie zuerst eine Rechnung im Finance-Bereich
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {existingInvoices.map((invoice) => (
                          <button
                            key={invoice.id}
                            onClick={() => handleLinkInvoice(invoice)}
                            disabled={isLinking}
                            className="w-full text-left p-3 border rounded-lg transition-colors hover:bg-teal-50 hover:border-teal-300 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                                <p className="text-sm text-gray-500">{invoice.customerName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">
                                  {invoice.totalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                </p>
                                {invoice.pdfUrl ? (
                                  <span className="text-xs text-green-600">PDF verfügbar</span>
                                ) : (
                                  <span className="text-xs text-teal-600">PDF wird generiert</span>
                                )}
                              </div>
                            </div>
                            {invoice.createdAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                Erstellt am {(() => {
                                  const date = invoice.createdAt;
                                  if (typeof date?.toDate === 'function') return date.toDate().toLocaleDateString('de-DE');
                                  if (date instanceof Date) return date.toLocaleDateString('de-DE');
                                  if (typeof date === 'string') return new Date(date).toLocaleDateString('de-DE');
                                  if (date?.seconds) return new Date(date.seconds * 1000).toLocaleDateString('de-DE');
                                  return '';
                                })()}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t bg-gray-50">
                    <button
                      onClick={() => setShowInvoiceSelector(false)}
                      className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

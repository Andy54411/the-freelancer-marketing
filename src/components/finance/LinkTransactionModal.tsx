'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Filter, FileText, Receipt, Plus } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';


interface Transaction {
  id: string;
  name: string;
  verwendungszweck: string;
  buchungstag: string;
  betrag: number;
}

interface FirestoreInvoice {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  issueDate: string;
  total: number;
  status: string;
  items: Array<{
    description: string;
    category?: string;
  }>;
  createdAt: any;
  isStorno?: boolean;
}

interface Document {
  id: string;
  type: 'vorschlaege' | 'beleg' | 'rechnung' | 'gutschrift';
  number: string;
  supplier: string;
  date: string;
  amount: number;
  status: 'open' | 'paid' | 'overdue';
  category: string;
}

interface LinkTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  companyId: string;
  onClose: () => void;
  onLink: (transactionId: string, documentId: string, documentData?: any) => void;
}

export default function LinkTransactionModal({
  isOpen,
  transaction,
  companyId,
  onClose,
  onLink
}: LinkTransactionModalProps) {
  const [activeTab, setActiveTab] = useState<'vorschlaege' | 'beleg' | 'rechnung' | 'gutschrift'>('vorschlaege');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [firestoreInvoices, setFirestoreInvoices] = useState<FirestoreInvoice[]>([]);
  const [amountDifferenceReason, setAmountDifferenceReason] = useState<string>('');

  // Load real invoices from Firestore
  const loadInvoices = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      const invoicesQuery = query(invoicesRef, orderBy('createdAt', 'desc'));
      const invoicesSnapshot = await getDocs(invoicesQuery);

      const invoices: FirestoreInvoice[] = [];
      invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Sicherheitsprüfung für gültige IDs
        if (doc.id && doc.id.trim() !== '') {
          invoices.push({
            id: doc.id,
            ...data
          } as FirestoreInvoice);
        } else {
          console.warn('⚠️ Invoice mit leerer ID gefunden, überspringe:', data);
        }
      });

      setFirestoreInvoices(invoices);

      // Convert to Document format for display
      const convertedDocuments: Document[] = invoices.map((invoice, index) => {
        const documentNumber = invoice.documentNumber || invoice.invoiceNumber || invoice.id || `DOC-${index}`;
        
        // Bestimme den Dokumenttyp basierend auf der Dokumentnummer
        let documentType: 'vorschlaege' | 'beleg' | 'rechnung' | 'gutschrift';
        if (invoice.isStorno) {
          documentType = 'gutschrift';
        } else if (documentNumber.startsWith('BE-')) {
          documentType = 'beleg';
        } else if (documentNumber.startsWith('RE-')) {
          documentType = 'rechnung';
        } else {
          // Fallback für unbekannte Dokumenttypen
          documentType = 'rechnung';
        }

        return {
          id: invoice.id || `invoice-${index}`, // Fallback ID falls invoice.id leer ist
          type: documentType,
          number: documentNumber,
          supplier: invoice.customerName || 'Unbekannter Kunde',
          date: formatDate(invoice.date || invoice.issueDate),
          amount: invoice.total || 0,
          status: mapStatus(invoice.status),
          category: getMainCategory(invoice.items)
        };
      });

      // Prüfe auf doppelte IDs
      const seenIds = new Set<string>();
      const duplicateIds = convertedDocuments.filter((doc) => {
        if (seenIds.has(doc.id)) {
          console.warn('⚠️ Doppelte Document ID gefunden:', doc.id, doc);
          return true;
        }
        seenIds.add(doc.id);
        return false;
      });

      if (duplicateIds.length > 0) {
        console.error('❌ Doppelte Document IDs gefunden:', duplicateIds.map((d) => d.id));
      }

      setDocuments(convertedDocuments);


    } catch (error) {
      console.error('Error loading invoices:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateString: string): string => {
    if (!dateString) return '---';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '---';
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '---';
    }
  };

  const mapStatus = (status: string): 'open' | 'paid' | 'overdue' => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'bezahlt':
        return 'paid';
      case 'overdue':
      case 'überfällig':
        return 'overdue';
      default:
        return 'open';
    }
  };

  const getMainCategory = (items: Array<{description: string;category?: string;}>): string => {
    if (!items || items.length === 0) return 'Allgemein';
    return items[0]?.category || items[0]?.description || 'Allgemein';
  };

  useEffect(() => {
    if (isOpen && companyId) {
      loadInvoices();
    } else if (!isOpen) {
      // Reset state when modal closes
      setSelectedDocument(null);
      setAmountDifferenceReason('');
      setSearchTerm('');
      setActiveTab('vorschlaege');
    }
  }, [isOpen, companyId]);

  const getSuggestedDocuments = () => {
    if (!transaction) return documents;

    // Intelligente Vorschläge basierend auf der Transaktion
    return documents.filter((doc) => {
      const transactionAmount = Math.abs(transaction.betrag);
      const documentAmount = Math.abs(doc.amount);
      const amountDifference = Math.abs(transactionAmount - documentAmount);
      const amountTolerance = Math.max(transactionAmount * 0.1, 5); // 10% Toleranz oder mindestens 5€

      // Punkte-System für Relevanz
      let score = 0;

      // Betrag-Ähnlichkeit (50 Punkte max)
      if (amountDifference <= amountTolerance) {
        score += 50 - amountDifference / amountTolerance * 50;
      }

      // Name-Ähnlichkeit (30 Punkte max)
      if (transaction.name && doc.supplier) {
        const similarity = calculateStringSimilarity(
          transaction.name.toLowerCase(),
          doc.supplier.toLowerCase()
        );
        score += similarity * 30;
      }

      // Datum-Nähe (20 Punkte max) - Dokumente nahe dem Transaktionsdatum
      if (transaction.buchungstag && doc.date) {
        try {
          const transactionDate = new Date(transaction.buchungstag);
          const docDate = new Date(doc.date);
          const daysDifference = Math.abs((transactionDate.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDifference <= 30) {// Innerhalb von 30 Tagen
            score += (30 - daysDifference) / 30 * 20;
          }
        } catch (error) {

          // Ignore date parsing errors
        }}

      // Mindestpunktzahl für Vorschläge
      return score >= 20;
    }).
    sort((a, b) => {
      // Sortiere nach Relevanz (höchste Punkte zuerst)
      const scoreA = calculateDocumentScore(a);
      const scoreB = calculateDocumentScore(b);
      return scoreB - scoreA;
    });
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    // Einfache String-Ähnlichkeit basierend auf gemeinsamen Worten
    const words1 = str1.split(/\s+/).filter((w) => w.length > 2);
    const words2 = str2.split(/\s+/).filter((w) => w.length > 2);

    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }

    return words1.length > 0 ? matches / words1.length : 0;
  };

  const calculateDocumentScore = (doc: Document): number => {
    if (!transaction) return 0;

    const transactionAmount = Math.abs(transaction.betrag);
    const documentAmount = Math.abs(doc.amount);
    const amountDifference = Math.abs(transactionAmount - documentAmount);
    const amountTolerance = Math.max(transactionAmount * 0.1, 5);

    let score = 0;

    if (amountDifference <= amountTolerance) {
      score += 50 - amountDifference / amountTolerance * 50;
    }

    if (transaction.name && doc.supplier) {
      const similarity = calculateStringSimilarity(
        transaction.name.toLowerCase(),
        doc.supplier.toLowerCase()
      );
      score += similarity * 30;
    }

    return score;
  };

  const getFilteredDocuments = () => {
    let baseDocuments: Document[];

    // Für Vorschläge Tab zeige intelligente Vorschläge
    if (activeTab === 'vorschlaege') {
      baseDocuments = getSuggestedDocuments();
    } else {
      // Für spezifische Tabs nur Dokumente des entsprechenden Typs
      baseDocuments = documents.filter((doc) => doc.type === activeTab);
    }

    // Anwenden des Suchfilters
    if (searchTerm) {
      return baseDocuments.filter((doc) =>
      doc.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return baseDocuments;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      open: { color: 'bg-yellow-100 text-yellow-800', label: 'Offen' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Bezahlt' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Überfällig' }
    };
    const statusConfig = config[status as keyof typeof config] || config.open;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>);

  };

  const handleCreateDocument = () => {


  };

  const handleLinkTransaction = () => {
    if (transaction && selectedDocument) {
      // Finde das ausgewählte Dokument um die vollständigen Daten zu übergeben
      const selectedDocumentData = documents.find((doc) => doc.id === selectedDocument);
      const selectedFirestoreInvoice = firestoreInvoices.find((invoice) => invoice.id === selectedDocument);

      if (selectedDocumentData && selectedFirestoreInvoice) {
        // Berechne Differenz
        const transactionAmount = Math.abs(transaction.betrag);
        const invoiceAmount = Math.abs(selectedFirestoreInvoice.total || 0);
        const difference = Math.abs(transactionAmount - invoiceAmount);

        // Erweiterte Document-Daten für persistente Speicherung
        const documentData = {
          id: selectedFirestoreInvoice.id,
          documentNumber: selectedFirestoreInvoice.documentNumber || selectedFirestoreInvoice.invoiceNumber || selectedFirestoreInvoice.id,
          customerName: selectedFirestoreInvoice.customerName || 'Unbekannter Kunde',
          total: selectedFirestoreInvoice.total || 0,
          date: selectedFirestoreInvoice.date || selectedFirestoreInvoice.issueDate || new Date().toISOString(),
          isStorno: selectedFirestoreInvoice.isStorno || false,
          type: selectedFirestoreInvoice.isStorno ? 'gutschrift' : 'rechnung',
          status: selectedFirestoreInvoice.status || 'open',
          // Differenz-Informationen nur wenn relevant
          ...(difference > 0.01 ? { amountDifference: difference } : {}),
          ...(amountDifferenceReason && amountDifferenceReason.trim() ? { amountDifferenceReason: amountDifferenceReason.trim() } : {})
        };

        // Übergebe erweiterte onLink Funktion mit Document-Daten
        if (typeof onLink === 'function') {
          (onLink as any)(transaction.id, selectedDocument, documentData);
        }
      } else {
        // Fallback für alte onLink Funktion
        onLink(transaction.id, selectedDocument);
      }

      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col border-2 border-[#14ad9f]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Transaktion zuordnen</h1>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors">

            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link Preview Section - Show only when document is selected */}
        {selectedDocument &&
        <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-6">
              {/* Transaction Card */}
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-2">Transaktion</div>
                {transaction &&
              <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-base font-semibold text-gray-900">{transaction.name}</div>
                      <div className={`text-base font-bold ${transaction.betrag >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(Math.abs(transaction.betrag))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div>{transaction.verwendungszweck}</div>
                      <div>
                        {(() => {
                      try {
                        if (!transaction.buchungstag || transaction.buchungstag === 'Invalid Date') return '---';
                        if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.buchungstag)) {
                          const [year, month, day] = transaction.buchungstag.split('-');
                          return `${day}.${month}.${year}`;
                        }
                        const date = new Date(transaction.buchungstag);
                        if (isNaN(date.getTime())) return '---';
                        return date.toLocaleDateString('de-DE');
                      } catch (error) {
                        return '---';
                      }
                    })()}
                      </div>
                    </div>
                  </div>
              }
              </div>

              {/* Link Icon */}
              <div className="shrink-0 self-center">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                    <path d="M9.75027 5.52371L10.7168 4.55722C13.1264 2.14759 17.0332 2.14759 19.4428 4.55722C21.8524 6.96684 21.8524 10.8736 19.4428 13.2832L18.4742 14.2519M5.52886 9.74513L4.55722 10.7168C2.14759 13.1264 2.1476 17.0332 4.55722 19.4428C6.96684 21.8524 10.8736 21.8524 13.2832 19.4428L14.2478 18.4782M9.5 14.5L14.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              {/* Document Card */}
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-2">Dokument</div>
                <div className="bg-white rounded-lg p-4 border">
                  {(() => {
                  const selectedDoc = documents.find((doc) => doc.id === selectedDocument);
                  const selectedInvoice = firestoreInvoices.find((invoice) => invoice.id === selectedDocument);

                  if (selectedDoc && selectedInvoice) {
                    return (
                      <>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-base font-semibold text-gray-900">{selectedDoc.supplier}</div>
                            <div className={`text-base font-bold ${selectedDoc.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('de-DE', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(Math.abs(selectedDoc.amount))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <div>{selectedDoc.type.charAt(0).toUpperCase() + selectedDoc.type.slice(1)} Nr. {selectedDoc.number}</div>
                            <div>{selectedDoc.date}</div>
                          </div>
                        </>);

                  }

                  return <div className="text-sm text-gray-500">Dokument wird geladen...</div>;
                })()}
                </div>
              </div>
            </div>

            {/* Difference Notice - SevDesk Style */}
            {transaction && (() => {
            const selectedDoc = documents.find((doc) => doc.id === selectedDocument);
            if (selectedDoc) {
              const difference = Math.abs(Math.abs(transaction.betrag) - Math.abs(selectedDoc.amount));
              if (difference > 0.01) {
                return (
                  <div className="mt-4" style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'inline-block' }}>
                        <div className="difference-reason-header-text text-sm text-gray-700 mb-2">
                          Was ist der Grund für die Differenz von{' '}
                          <span className="font-medium">
                            {new Intl.NumberFormat('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(difference)}
                          </span>
                          <span>?</span>
                        </div>
                        <div className="form-group" style={{ maxWidth: '240px' }}>
                          <select
                          id="amountDifferenceReason"
                          className="form-control w-full p-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                          value={amountDifferenceReason}
                          onChange={(e) => setAmountDifferenceReason(e.target.value)}>

                            <option value="" disabled>
                              Bitte auswählen
                            </option>
                            <option value="SAMMELBUCHUNG">
                              Teil einer Sammelbuchung
                            </option>
                            <option value="MAHNGEBUEHREN">
                              Mahngebühren
                            </option>
                            <option value="SKONTO">
                              Skonto
                            </option>
                            <option value="RUNDUNG">
                              Rundungsdifferenz
                            </option>
                            <option value="WECHSELKURS">
                              Wechselkurs
                            </option>
                            <option value="GEBUEHREN">
                              Gebühren
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>);

              }
            }
            return null;
          })()}
          </div>
        }

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6">
            <div className="text-lg font-medium text-gray-900 mb-6">Wähle passende Dokumente aus</div>
            
            {/* Tabs and Actions */}
            <div className="flex items-center justify-between mb-4">
              {/* Tabs */}
              <div className="flex space-x-1">
                {(['vorschlaege', 'beleg', 'rechnung', 'gutschrift'] as const).map((tab) =>
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab ?
                  'bg-[#14ad9f] text-white' :
                  'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`
                  }>

                    {tab === 'vorschlaege' ? 'Vorschläge' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCreateDocument}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">

                  {activeTab === 'vorschlaege' ? 'Beleg anlegen' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' anlegen'}
                </button>
                
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Suche"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#14ad9f] focus:border-[#14ad9f] w-48" />

                </div>
                
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">

                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>

            {/* Selection Counter */}
            {getFilteredDocuments().length > 0 &&
            <div className="mb-4 text-sm text-gray-600">
                <input
                type="checkbox"
                checked={selectedDocument !== null}
                onChange={() => {}}
                className="mr-2 h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded" />

                {selectedDocument ? '1 Vorschlag ausgewählt' : `${getFilteredDocuments().length} Vorschläge verfügbar`}
              </div>
            }

            {/* Documents Table */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">

              {loading ?
              <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
                </div> :

              <div className="max-h-[400px] overflow-y-auto">
                  {getFilteredDocuments().length === 0 ?
                <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Leider nichts gefunden</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Verändere deine Filter für bessere Ergebnisse.
                      </p>
                      <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 px-4 py-2 bg-[#14ad9f] text-white text-sm font-medium rounded-md hover:bg-[#129488]">

                        Filter zurücksetzen
                      </button>
                    </div> :

                getFilteredDocuments().map((document) =>
                <div
                  key={document.id}
                  onClick={() => setSelectedDocument(selectedDocument === document.id ? null : document.id)}
                  className={`flex items-center p-4 border-b cursor-pointer transition-all duration-200 ${
                  selectedDocument === document.id ?
                  'bg-[#6bc4bc] border-[#5bb3ab]' :
                  'border-gray-100 hover:bg-gray-50'}`
                  }>

                        {/* Checkbox */}
                        <div className="mr-4">
                          <input
                      type="checkbox"
                      checked={selectedDocument === document.id}
                      onChange={() => {}}
                      className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded" />

                        </div>

                        {/* Document Number */}
                        <div className="w-20 mr-4">
                          <div className="text-sm font-medium text-gray-900">{document.number}</div>
                        </div>

                        {/* Supplier/Customer */}
                        <div className="flex-1 mr-4">
                          <div className="text-sm font-medium text-gray-900">{document.supplier}</div>
                        </div>

                        {/* Date */}
                        <div className="w-24 mr-4">
                          <div className="text-sm text-gray-600">{document.date}</div>
                        </div>

                        {/* Amount 1 */}
                        <div className="w-20 mr-4 text-right">
                          <div className={`text-sm font-medium ${
                    document.amount >= 0 ? 'text-green-600' : 'text-red-600'}`
                    }>
                            {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(Math.abs(document.amount))}
                          </div>
                        </div>

                        {/* Amount 2 */}
                        <div className="w-20 mr-4 text-right">
                          <div className={`text-sm font-medium ${
                    document.amount >= 0 ? 'text-green-600' : 'text-red-600'}`
                    }>
                            {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(Math.abs(document.amount))}
                          </div>
                        </div>

                        {/* Type */}
                        <div className="w-20">
                          <div className="text-sm text-gray-600 capitalize">{document.type}</div>
                        </div>
                      </div>
                )
                }
                </div>
              }
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors">

            Abbrechen
          </button>
          
          <button
            onClick={handleLinkTransaction}
            disabled={!selectedDocument}
            className="px-6 py-2 bg-[#14ad9f] text-white font-medium rounded-md hover:bg-[#129488] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

            Transaktion zuordnen
          </button>
        </div>
      </div>
    </div>);

}
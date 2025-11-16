import React, { useState, useEffect } from 'react';
import { X, Eye, FileText } from 'lucide-react';

interface ConnectedDocument {
  id: string;
  documentId: string;
  documentNumber: string;
  customerName: string;
  amount: number;
  date: string;
  type: 'Invoice' | 'Expense' | 'Receipt';
  selected: boolean;
  unlinkable: boolean;
  href: string;
}

interface ConnectedDocumentsModalProps {
  isOpen: boolean;
  transactionId: string;
  connectedDocuments: ConnectedDocument[];
  onClose: () => void;
  onUnlinkDocuments: (documentIds: string[]) => Promise<void>;
  allowUnlink?: boolean;
}

const ConnectedDocumentsModal: React.FC<ConnectedDocumentsModalProps> = ({
  isOpen,
  transactionId,
  connectedDocuments,
  onClose,
  onUnlinkDocuments,
  allowUnlink = true
}) => {
  const [documents, setDocuments] = useState<ConnectedDocument[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Update local state when connectedDocuments prop changes
  useEffect(() => {
    setDocuments(connectedDocuments.map(doc => ({ ...doc, selected: false })));
    setAllSelected(false);
  }, [connectedDocuments]);

  // Check if all documents are selected
  useEffect(() => {
    const selectableDocuments = documents.filter(doc => doc.unlinkable);
    const selectedCount = selectableDocuments.filter(doc => doc.selected).length;
    setAllSelected(selectableDocuments.length > 0 && selectedCount === selectableDocuments.length);
  }, [documents]);

  const handleSelectAll = (checked: boolean) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.unlinkable ? { ...doc, selected: checked } : doc
      )
    );
    setAllSelected(checked);
  };

  const handleDocumentSelect = (documentId: string, checked: boolean) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === documentId ? { ...doc, selected: checked } : doc
      )
    );
  };

  const getSelectedDocuments = () => {
    return documents.filter(doc => doc.selected);
  };

  const hasSelectedDocuments = () => {
    return getSelectedDocuments().length > 0;
  };

  const handleUnlinkDocuments = async () => {
    if (!hasSelectedDocuments()) return;

    try {
      setIsUnlinking(true);
      const selectedDocumentIds = getSelectedDocuments().map(doc => doc.documentId);
      await onUnlinkDocuments(selectedDocumentIds);
      onClose();
    } catch (error) {
      console.error('Fehler beim Aufheben der Verknüpfungen:', error);
    } finally {
      setIsUnlinking(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'Invoice':
        return 'Rechnung';
      case 'Expense':
        return 'Beleg';
      case 'Receipt':
        return 'Quittung';
      default:
        return 'Dokument';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-xl flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl border-2 border-[#14ad9f] max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Deine verknüpften Dokumente
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Schließen"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-gray-600 mb-6 max-w-lg">
            Hier findest du alle Dokumente, die mit der Transaktion verknüpft sind. 
            Du kannst sie dir anschauen oder auch die Verknüpfung aufheben.
          </p>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Verknüpfte Dokumente</h3>

            {/* Select All Checkbox */}
            {allowUnlink && documents.some(doc => doc.unlinkable) && (
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Alle Dokumente markieren
                </span>
              </label>
            )}

            {/* Documents List */}
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className={`flex items-center p-4 border rounded-lg transition-colors ${
                    document.selected
                      ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                      : document.unlinkable
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Checkbox */}
                  {allowUnlink && (
                    <div className="shrink-0 mr-4">
                      <input
                        type="checkbox"
                        checked={document.selected}
                        disabled={!document.unlinkable}
                        onChange={(e) => handleDocumentSelect(document.id, e.target.checked)}
                        className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f] disabled:opacity-50"
                      />
                    </div>
                  )}

                  {/* Document Info */}
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="h-8 w-8 text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                          {getDocumentTypeLabel(document.type)} {document.documentNumber}
                        </div>
                        <div className="text-sm text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
                          {document.customerName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 shrink-0 ml-4">
                      <div className={`font-semibold whitespace-nowrap ${
                        document.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(document.amount)}
                      </div>

                      <div className="text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(document.date)}
                      </div>
                      {/* View Button */}
                      <div className="flex justify-end ml-4">
                        <a
                          href={document.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          title="Anschauen"
                        >
                          <Eye className="h-5 w-5 text-gray-600" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Keine verknüpften Dokumente gefunden.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {allowUnlink && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleUnlinkDocuments}
              disabled={!hasSelectedDocuments() || isUnlinking}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUnlinking ? 'Wird aufgehoben...' : 'Verknüpfungen aufheben'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectedDocumentsModal;
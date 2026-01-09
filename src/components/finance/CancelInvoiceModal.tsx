'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { InvoiceData } from '@/types/invoiceTypes';

interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invoice: InvoiceData | null;
  isLoading?: boolean;
}

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  invoice: _invoice,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Rechnung stornieren</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Durch diesen Vorgang wird direkt eine Stornorechnung erstellt. 
            Die Bearbeitung der stornierten Ausgangsrechnung ist dann nicht mehr möglich.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2"
          >
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            {isLoading ? 'Storniere...' : 'Rechnung stornieren'}
          </Button>
        </div>
      </div>
    </div>
  );
};
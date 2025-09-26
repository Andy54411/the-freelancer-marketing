import React from 'react';
import { InvoiceTemplateRenderer } from '@/components/finance/InvoiceTemplates';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface LivePreviewComponentProps {
  isVisible: boolean;
  onClose: () => void;
  selectedTemplate: string;
  buildPreviewData: () => any;
  loadingTemplate: boolean;
}

export const LivePreviewComponent: React.FC<LivePreviewComponentProps> = ({
  isVisible,
  onClose,
  selectedTemplate,
  buildPreviewData,
  loadingTemplate,
}) => {
  if (!isVisible) return null;

  const handlePrint = () => {
    const previewData = buildPreviewData();
    const payload = encodeURIComponent(btoa(JSON.stringify(previewData)));
    window.open(`/print/invoice/preview?auto=1&payload=${payload}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Live-Vorschau</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#f5f5f5] p-8">
          <div className="max-w-[210mm] mx-auto bg-white shadow-xl p-8 border-2 border-gray-300">
            {loadingTemplate ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
                <span className="ml-2">Template wird geladen...</span>
              </div>
            ) : (
              <InvoiceTemplateRenderer
                template={selectedTemplate as any}
                data={buildPreviewData()}
                preview={true}
                customizations={{ showLogo: true }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

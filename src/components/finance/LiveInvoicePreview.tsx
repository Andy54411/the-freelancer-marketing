'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { InvoiceTemplateRenderer, InvoiceTemplate } from './InvoiceTemplates';
import { InvoiceData } from '@/types/invoiceTypes';

interface LiveInvoicePreviewProps {
  invoiceData: InvoiceData;
  template: InvoiceTemplate;
}

export function LiveInvoicePreview({ invoiceData, template }: LiveInvoicePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Live Vorschau
        </CardTitle>
        <CardDescription>Echtzeitvorschau Ihrer Rechnung</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* CSS-optimierte Preview für vollständige Darstellung */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div
              className="overflow-auto bg-gray-50 p-2"
              style={{
                height: '100vh',
                maxHeight: '100vh',
                zoom: '0.4',
              }}
            >
              <div className="bg-white shadow-lg mx-auto" style={{ width: 'fit-content' }}>
                <InvoiceTemplateRenderer template={template} data={invoiceData} preview={true} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

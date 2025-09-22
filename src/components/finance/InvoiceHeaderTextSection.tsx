'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import HeaderTextEditor from '@/components/finance/HeaderTextEditor';

interface InvoiceHeaderTextSectionProps {
  // Form Data
  title: string;
  headTextHtml: string;
  onTitleChange: (value: string) => void;
  onHeadTextChange: (value: string) => void;
  
  // Company ID for Editor
  companyId: string;
  userId: string;
  
  // Error Styling
  getFieldErrorClass?: (fieldName: string) => string;
}

export default function InvoiceHeaderTextSection({
  title,
  headTextHtml,
  onTitleChange,
  onHeadTextChange,
  companyId,
  userId,
  getFieldErrorClass = () => '',
}: InvoiceHeaderTextSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
          Kopftext
        </CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset className="space-y-4">
          {/* Betreff Section */}
          <div>
            <div className="space-y-2">
              <Label htmlFor="invoice-title" className="text-sm font-medium text-gray-700">
                Betreff
              </Label>
              <div className="input-icon-field">
                <Input
                  id="invoice-title"
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="RE-1000"
                  className={`${getFieldErrorClass('title')}`}
                  required
                />
              </div>
            </div>
          </div>

          {/* WYSIWYG Editor Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Einleitung / Kopf-Text
            </Label>
            <div className="sev-wysiwyg-wrapper">
              <HeaderTextEditor
                value={headTextHtml}
                onChange={onHeadTextChange}
                companyId={companyId}
                userId={userId}
                objectType="INVOICE"
                textType="HEAD"
              />
            </div>

          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Upload, Search, Calendar, Download } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  category: string;
}

interface SupplierDocumentsTabProps {
  companyId: string;
}

export function SupplierDocumentsTab({ companyId }: SupplierDocumentsTabProps) {
  const [documents] = useState<Document[]>([
    {
      id: '1',
      name: 'Liefervertrag_Google_2025.pdf',
      type: 'PDF',
      size: '2.4 MB',
      uploadDate: '15.09.2025',
      category: 'Verträge',
    },
    {
      id: '2',
      name: 'Rechnung_5078178663.pdf',
      type: 'PDF',
      size: '180 KB',
      uploadDate: '01.09.2025',
      category: 'Rechnungen',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    return <FileText className="h-8 w-8 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Belege & Dokumente</h3>
          <p className="text-sm text-gray-500">Verwalten Sie alle Belege, Verträge und Dokumente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Dokument hinzufügen
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Dokumente durchsuchen..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Dokumente vorhanden</h3>
          <p>Laden Sie Ihr erstes Dokument hoch</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(document => (
            <div
              key={document.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getFileIcon(document.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate" title={document.name}>
                    {document.name}
                  </h4>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{document.type}</span>
                      <span>•</span>
                      <span>{document.size}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{document.uploadDate}</span>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                      {document.category}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
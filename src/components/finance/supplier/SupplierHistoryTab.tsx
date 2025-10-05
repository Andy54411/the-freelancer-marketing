'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, History, Edit, FileText, Receipt, Calendar, User, Filter } from 'lucide-react';

interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'payment' | 'document';
  details?: string;
}

interface SupplierHistoryTabProps {
  companyId: string;
}

export function SupplierHistoryTab({ companyId }: SupplierHistoryTabProps) {
  const [historyEntries] = useState<HistoryEntry[]>([
    {
      id: '1',
      action: 'Ausgabe erfasst',
      description: 'Neue Ausgabe für Google AI Studio OCR erstellt',
      user: 'Andy Staudinger',
      timestamp: '01.09.2025 - 14:32',
      type: 'create',
      details: 'Betrag: 24,48 € • Rechnung: 5078178663',
    },
    {
      id: '2',
      action: 'Lieferant aktualisiert',
      description: 'Kontaktdaten von Google Cloud EMEA Limited geändert',
      user: 'Andy Staudinger',
      timestamp: '25.08.2025 - 09:15',
      type: 'update',
      details: 'E-Mail-Adresse aktualisiert',
    },
    {
      id: '3',
      action: 'Lieferant erstellt',
      description: 'Google Cloud EMEA Limited als neuer Lieferant hinzugefügt',
      user: 'Andy Staudinger',
      timestamp: '05.10.2025 - 11:22',
      type: 'create',
      details: 'Lieferant erstellt • Dublin, Irland',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredEntries = historyEntries.filter(entry => {
    const matchesSearch = 
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || entry.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'payment':
        return <Receipt className="h-4 w-4 text-orange-600" />;
      case 'document':
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Erstellt</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Aktualisiert</Badge>;
      case 'delete':
        return <Badge variant="destructive">Gelöscht</Badge>;
      case 'payment':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Zahlung</Badge>;
      case 'document':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Dokument</Badge>;
      default:
        return <Badge variant="secondary">Aktivität</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Aktivitätsverlauf</h3>
          <p className="text-sm text-gray-500">Übersicht über alle Aktivitäten und Änderungen</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Aktivitäten durchsuchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            Alle
          </Button>
          <Button
            variant={filterType === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('create')}
          >
            <Filter className="h-4 w-4 mr-1" />
            Erstellt
          </Button>
          <Button
            variant={filterType === 'update' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('update')}
          >
            <Filter className="h-4 w-4 mr-1" />
            Geändert
          </Button>
          <Button
            variant={filterType === 'payment' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('payment')}
          >
            <Filter className="h-4 w-4 mr-1" />
            Zahlungen
          </Button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Aktivitäten gefunden</h3>
          <p>Passen Sie Ihre Suchkriterien an oder entfernen Sie Filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(entry.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{entry.action}</h4>
                      <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      {entry.details && (
                        <p className="text-xs text-gray-500 mt-1">{entry.details}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {getTypeBadge(entry.type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{entry.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{entry.timestamp}</span>
                    </div>
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
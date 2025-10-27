'use client';

import { MoreVertical, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WhatsAppTemplate } from '@/types/whatsapp';

interface TemplateGridProps {
  templates: WhatsAppTemplate[];
  onTemplateUpdate: () => void;
  companyId: string;
}

export function TemplateGrid({ templates, onTemplateUpdate, companyId }: TemplateGridProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            In Prüfung
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return 'Marketing';
      case 'UTILITY':
        return 'Dienstprogramm';
      case 'AUTHENTICATION':
        return 'Authentifizierung';
      default:
        return category;
    }
  };

  const getBodyText = (template: WhatsAppTemplate) => {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    return bodyComponent?.text || 'Keine Nachricht';
  };

  return (
    <div
      className="grid gap-5"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      }}
    >
      {templates.map(template => (
        <div
          key={template.id}
          className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Header Section - Template Preview */}
          <div className="bg-gray-100 relative p-10" style={{ height: '200px' }}>
            <div
              className="w-4/5 mx-auto bg-white rounded-xl p-4 shadow-lg"
              style={{ marginBottom: '-60px' }}
            >
              <div className="text-xs text-gray-500 mb-2">{template.name}</div>
              <div className="text-sm text-gray-900 line-clamp-3">{getBodyText(template)}</div>
            </div>
            {/* Gradient Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(242, 244, 247, 0.5) 100%)',
              }}
            ></div>
          </div>

          {/* Footer Section - Template Info */}
          <div className="bg-white p-5 flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Status Badge */}
              <div className="shrink-0">{getStatusBadge(template.status)}</div>

              {/* Template Details */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{template.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                  <span>{getCategoryLabel(template.category)}</span>
                  <span>•</span>
                  <span>{template.language.toUpperCase()}</span>
                  {template.variables.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{template.variables.length} Variablen</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
                <DropdownMenuItem>Duplizieren</DropdownMenuItem>
                <DropdownMenuItem>Status aktualisieren</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Löschen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

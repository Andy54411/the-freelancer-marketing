'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateGrid } from '@/components/whatsapp/TemplateGrid';
import { TemplateEmptyState } from '@/components/whatsapp/TemplateEmptyState';
import { CreateTemplateDialog } from '@/components/whatsapp/CreateTemplateDialog';
import type { WhatsAppTemplate } from '@/types/whatsapp';
import { toast } from 'sonner';

export default function WhatsAppTemplatesPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (uid) {
      loadTemplates();
    }
  }, [uid]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/templates?companyId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateCreated = () => {
    setShowCreateDialog(false);
    loadTemplates();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Vorlagen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Vorlagen verwalten</h1>
            <p className="text-sm text-gray-600 max-w-3xl">
              Vorlagen müssen nach dem Erstellen von Meta geprüft werden. Die Prüfung findet für
              jeden Business-Account einzeln statt und dauert für gewöhnlich nicht länger als eine
              Minute. Den Status der Prüfung siehst du am Symbol auf der Karte.
            </p>
          </div>
          {templates.length > 0 && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Vorlage erstellen
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {templates.length === 0 ? (
          <TemplateEmptyState onCreateClick={() => setShowCreateDialog(true)} />
        ) : (
          <TemplateGrid templates={templates} onTemplateUpdate={loadTemplates} companyId={uid} />
        )}
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleTemplateCreated}
        companyId={uid}
      />
    </div>
  );
}

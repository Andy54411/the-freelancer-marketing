'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Plus, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateGrid } from '@/components/whatsapp/TemplateGrid';
import { TemplateEmptyState } from '@/components/whatsapp/TemplateEmptyState';
import { CreateTemplateDialog } from '@/components/whatsapp/CreateTemplateDialog';
import type { WhatsAppTemplate } from '@/types/whatsapp';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

export default function WhatsAppTemplatesPage() {
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    } catch {
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/whatsapp/templates?companyId=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        toast.success(`${data.templates?.length || 0} Vorlagen aktualisiert`);
      }
    } catch {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTemplateCreated = () => {
    setShowCreateDialog(false);
    loadTemplates();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#111b21]">
        <div className="text-center">
          <Image
            src="/images/whatsapp-logo.svg"
            alt="WhatsApp"
            width={60}
            height={60}
            className="mx-auto mb-4 animate-pulse"
          />
          <Loader2 className="h-8 w-8 animate-spin text-[#00a884] mx-auto mb-3" />
          <p className="text-sm text-[#8696a0]">Vorlagen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      {/* Header - WhatsApp Style */}
      <div className="bg-[#008069] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/company/${uid}/whatsapp`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src="/images/whatsapp-logo.svg"
                alt="WhatsApp"
                width={36}
                height={36}
              />
              <div>
                <h1 className="text-xl font-semibold text-white">Nachrichtenvorlagen</h1>
                <p className="text-sm text-white/70">
                  {templates.length} Vorlage{templates.length !== 1 ? 'n' : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {templates.length > 0 && (
              <>
                <Button
                  onClick={handleRefreshAll}
                  disabled={isRefreshing}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-white text-[#008069] hover:bg-white/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Vorlage erstellen
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#fcf4cb] px-6 py-3 border-b border-[#e9dfa5]">
        <p className="text-sm text-[#54656f]">
          Vorlagen müssen nach dem Erstellen von Meta geprüft werden. Die Prüfung dauert für gewöhnlich nicht länger als eine Minute.
        </p>
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

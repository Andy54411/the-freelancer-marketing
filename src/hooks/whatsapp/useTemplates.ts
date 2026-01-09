/**
 * useTemplates Hook
 * 
 * Lädt und verwaltet WhatsApp Message Templates
 */

import { useEffect, useCallback, useState } from 'react';
import { useWhatsAppStore } from '@/lib/whatsapp-store';

interface UseTemplatesOptions {
  companyId: string;
  autoLoad?: boolean;
}

export function useTemplates({ companyId, autoLoad = true }: UseTemplatesOptions) {
  const { templates, setTemplates, setError } = useWhatsAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/templates?companyId=${companyId}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Laden der Templates');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, setTemplates, setError]);

  const createTemplate = useCallback(async (template: {
    name: string;
    language: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    header?: {
      type: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      text?: string;
      example?: string;
    };
    body: string;
    footer?: string;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text: string;
      url?: string;
      phone_number?: string;
    }>;
    variables?: Array<{
      index: number;
      example: string;
    }>;
  }) => {
    if (!companyId) return { success: false };

    setIsSaving(true);
    try {
      const response = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, template }),
      });

      const data = await response.json();

      if (data.success) {
        await loadTemplates();
        return { success: true, templateId: data.templateId };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Erstellen des Templates');
      return { success: false, error: error instanceof Error ? error.message : 'Fehler' };
    } finally {
      setIsSaving(false);
    }
  }, [companyId, loadTemplates, setError]);

  const deleteTemplate = useCallback(async (templateName: string) => {
    if (!companyId) return { success: false };

    try {
      const response = await fetch(
        `/api/whatsapp/templates?companyId=${companyId}&templateName=${templateName}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        setTemplates(templates.filter(t => t.name !== templateName));
        return { success: true };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Löschen des Templates');
      return { success: false };
    }
  }, [companyId, templates, setTemplates, setError]);

  const sendTemplate = useCallback(async (
    to: string,
    templateName: string,
    language: string,
    variables?: string[]
  ) => {
    if (!companyId) return { success: false };

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          to,
          message: {
            type: 'template',
            templateName,
            templateLanguage: language,
            templateVariables: variables,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, messageId: data.messageId };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Senden des Templates');
      return { success: false };
    }
  }, [companyId, setError]);

  // Template nach Status filtern
  const getTemplatesByStatus = useCallback((status: 'APPROVED' | 'PENDING' | 'REJECTED') => {
    return templates.filter(t => t.status === status);
  }, [templates]);

  // Template nach Kategorie filtern
  const getTemplatesByCategory = useCallback((category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION') => {
    return templates.filter(t => t.category === category);
  }, [templates]);

  // Auto-Load bei Mount
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad, loadTemplates]);

  return {
    templates,
    approvedTemplates: getTemplatesByStatus('APPROVED'),
    pendingTemplates: getTemplatesByStatus('PENDING'),
    rejectedTemplates: getTemplatesByStatus('REJECTED'),
    isLoading,
    isSaving,
    loadTemplates,
    createTemplate,
    deleteTemplate,
    sendTemplate,
    getTemplatesByStatus,
    getTemplatesByCategory,
  };
}

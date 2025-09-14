'use client';

import { useState, useEffect } from 'react';
import { TextTemplate } from '@/types/textTemplates';
import { TextTemplateService } from '@/services/TextTemplateService';

export function useTextTemplates(companyId: string) {
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedTemplates = await TextTemplateService.getTextTemplates(companyId);
        setTemplates(loadedTemplates);
      } catch (err) {
        console.error('Fehler beim Laden der Textvorlagen:', err);
        setError('Fehler beim Laden der Textvorlagen');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [companyId]);

  // Filter-Funktionen für spezifische Template-Typen
  const getTemplatesForDocument = (objectType: string, textType: 'HEAD' | 'FOOT') => {
    return templates.filter(
      template =>
        template.category === 'DOCUMENT' &&
        template.objectType === objectType &&
        template.textType === textType
    );
  };

  const getEmailTemplates = (textType: 'SUBJECT' | 'BODY') => {
    return templates.filter(
      template => template.category === 'EMAIL' && template.textType === textType
    );
  };

  const getLetterTemplates = (textType: 'HEAD' | 'BODY' | 'FOOT') => {
    return templates.filter(
      template => template.category === 'LETTER' && template.textType === textType
    );
  };

  // Standard-Template finden
  const getDefaultTemplate = (category: string, objectType: string, textType: string) => {
    return templates.find(
      template =>
        template.category === category &&
        template.objectType === objectType &&
        template.textType === textType &&
        template.isDefault
    );
  };

  return {
    templates,
    loading,
    error,
    getTemplatesForDocument,
    getEmailTemplates,
    getLetterTemplates,
    getDefaultTemplate,
  };
}

'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { TextTemplate } from '@/types/textTemplates';
import { replacePlaceholders, PlaceholderData } from '@/utils/placeholderSystem';

interface TextTemplateSelectProps {
  label: string;
  templates: TextTemplate[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderData?: PlaceholderData;
  rows?: number;
  className?: string;
}

export function TextTemplateSelect({
  label,
  templates,
  value,
  onChange,
  placeholder,
  placeholderData,
  rows = 4,
  className,
}: TextTemplateSelectProps) {
  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      onChange('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      let processedText = template.text;

      // Platzhalter ersetzen falls PlaceholderData vorhanden
      if (placeholderData) {
        processedText = replacePlaceholders(processedText, placeholderData);
      }

      onChange(processedText);
    }
  };

  const resetToTemplate = () => {
    // Finde Standard-Template oder erstes Template
    const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
    if (defaultTemplate) {
      handleTemplateSelect(defaultTemplate.id);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Vorlage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Vorlage</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.isDefault && ' (Standard)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToTemplate}
                title="Standard-Vorlage laden"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AVAILABLE_QUOTE_TEMPLATES, QuoteTemplate } from './quote-templates';

interface QuoteTemplatePickerProps {
  trigger?: React.ReactNode;
  onTemplateSelect?: (template: QuoteTemplate) => void;
  selectedTemplate?: QuoteTemplate;
  userId?: string;
}

export function QuoteTemplatePicker({
  trigger,
  onTemplateSelect,
  selectedTemplate = 'german-standard',
  userId: _userId,
}: QuoteTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTemplateSelect = async (template: QuoteTemplate) => {
    try {
      setSaving(true);

      // Execute callback
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }

      setOpen(false);
      toast.success(
        `Angebots-Template "${(AVAILABLE_QUOTE_TEMPLATES as readonly any[]).find((t: any) => t.id === template)?.name}" ausgewählt`
      );
    } catch (_error) {
      toast.error('Fehler beim Speichern der Template-Auswahl');

      // Still execute callback even if save failed
      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (template: QuoteTemplate) => {
    setPreviewTemplate(template);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">Angebots-Template auswählen</Button>}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Angebots-Template auswählen</DialogTitle>
            <DialogDescription>
              Wählen Sie das Design aus, das am besten zu Ihrem Unternehmen passt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {(AVAILABLE_QUOTE_TEMPLATES as readonly any[]).map((template: any) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {template.preview ? (
                      <img
                        src={template.preview}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <div className="text-2xl mb-2">📄</div>
                        <div className="text-sm">{template.name}</div>
                      </div>
                    )}

                    {selectedTemplate === template.id && (
                      <div className="absolute top-2 right-2 bg-[#14ad9f] text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{template.name}</h3>
                      {selectedTemplate === template.id && (
                        <Badge variant="secondary" className="text-xs">
                          Aktiv
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>

                    <div className="flex flex-wrap gap-1">
                      {template.features?.slice(0, 2).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template.id)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Vorschau
                    </Button>
                    <Button
                      onClick={() => handleTemplateSelect(template.id)}
                      disabled={saving}
                      className={`flex-1 ${
                        selectedTemplate === template.id
                          ? 'bg-[#14ad9f] hover:bg-[#0f9d84]'
                          : 'bg-[#14ad9f] hover:bg-[#0f9d84]'
                      }`}
                    >
                      {selectedTemplate === template.id ? 'Ausgewählt' : 'Auswählen'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Vorschau:{' '}
                {
                  (AVAILABLE_QUOTE_TEMPLATES as readonly any[]).find(
                    (t: any) => t.id === previewTemplate
                  )?.name
                }
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              <div className="bg-gray-100 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <p>Angebots-Vorschau</p>
                  <p className="text-sm mt-2">Template: {previewTemplate}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Schließen
              </Button>
              <Button
                onClick={() => {
                  handleTemplateSelect(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="bg-[#14ad9f] hover:bg-[#0f9d84]"
              >
                Dieses Template verwenden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

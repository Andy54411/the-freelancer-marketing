import React from 'react';
import { DeliveryNoteData, DeliveryNoteTemplate } from './types';
import { 
  getDeliveryNoteTemplateComponent,
  DEFAULT_DELIVERY_NOTE_TEMPLATE 
} from './index';

interface DeliveryNoteTemplateRendererProps {
  template: DeliveryNoteTemplate | null;
  data: DeliveryNoteData;
  preview?: boolean;
}

/**
 * Template Renderer für Lieferscheine
 * Rendert die ausgewählte Lieferschein-Vorlage mit den bereitgestellten Daten
 */
export const DeliveryNoteTemplateRenderer: React.FC<DeliveryNoteTemplateRendererProps> = ({
  template,
  data,
  preview = false,
}) => {
  // Fallback auf Default-Template wenn kein Template ausgewählt
  const templateToUse = template || DEFAULT_DELIVERY_NOTE_TEMPLATE;
  
  // Template-Component laden
  const TemplateComponent = getDeliveryNoteTemplateComponent(templateToUse);
  
  if (!TemplateComponent) {
    return (
      <div className="p-8 text-center text-red-600">
        <h3 className="text-lg font-medium mb-2">Template nicht gefunden</h3>
        <p>Das Template "{templateToUse}" konnte nicht geladen werden.</p>
        <p className="text-sm text-gray-600 mt-2">
          Verfügbare Templates: german-standard, german-multipage
        </p>
      </div>
    );
  }

  return (
    <div className={`delivery-note-template-renderer ${preview ? 'preview-mode' : 'print-mode'}`}>
      <TemplateComponent data={data} preview={preview} />
    </div>
  );
};

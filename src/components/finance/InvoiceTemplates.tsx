// Export everything from the templates index
export * from './templates/index';

// Re-export types from types.ts for compatibility
export type { InvoiceData } from './templates/types';

// Main template renderer component
import { AVAILABLE_TEMPLATES } from './templates/index';
export { AVAILABLE_TEMPLATES };

export interface InvoiceTemplateRendererProps {
  template: string;
  data: any;
  preview?: boolean;
  onRender?: (html: string) => void;
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({
  template,
  data,
  preview: _preview = false,
  onRender: _onRender,
}) => {
  const templateConfig = AVAILABLE_TEMPLATES.find(t => t.id === template);

  if (!templateConfig) {
    return <div>Template nicht gefunden: {template}</div>;
  }

  const TemplateComponent = templateConfig.component;

  return <TemplateComponent data={data} />;
};

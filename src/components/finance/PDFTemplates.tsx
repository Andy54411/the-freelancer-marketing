'use client';

import React from 'react';
import {
  StandardTemplate,
  NeutralTemplate,
  ElegantTemplate,
  TechnicalTemplate,
  GeometricTemplate,
  DynamicTemplate,
  usePDFTemplateData,
  type PDFTemplateProps,
} from './pdf-templates';

const PDFTemplate: React.FC<PDFTemplateProps> = props => {
  const data = usePDFTemplateData(props);

  // Template renderer based on selected template
  const renderTemplate = () => {
    const pageMode = props.pageMode || 'multi'; // Default: mehrseitig

    switch (props.template) {
      case 'TEMPLATE_STANDARD':
        return (
          <StandardTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
      case 'TEMPLATE_NEUTRAL':
        return (
          <NeutralTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
      case 'TEMPLATE_ELEGANT':
        return (
          <ElegantTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
      case 'TEMPLATE_TECHNICAL':
        return (
          <TechnicalTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
      case 'TEMPLATE_GEOMETRIC':
        return (
          <GeometricTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
      case 'TEMPLATE_DYNAMIC':
        return (
          <DynamicTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
      default:
        return (
          <NeutralTemplate
            data={data}
            color={props.color}
            logoSize={props.logoSize || 50}
            pageMode={pageMode}
          />
        );
    }
  };

  return <div className="w-full h-full bg-white shadow-lg">{renderTemplate()}</div>;
};

export default PDFTemplate;

import React from 'react';
import { A4_DIMENSIONS } from '@/utils/a4-page-utils';

export interface A4PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  pageNumber?: number;
  showPageNumber?: boolean;
  pageBreakBefore?: boolean;
  dimensions?: typeof A4_DIMENSIONS.WEB;
}

/**
 * A4PageWrapper - Wraps content in A4 page boundaries for PDF templates
 */
export const A4PageWrapper: React.FC<A4PageWrapperProps> = ({
  children,
  className = '',
  pageNumber,
  showPageNumber = false,
  pageBreakBefore = false,
  dimensions = A4_DIMENSIONS.WEB
}) => {
  return (
    <div
      className={`
        bg-white 
        ${pageBreakBefore ? 'page-break-before-always' : ''}
        ${className}
      `}
      style={{
        width: `${dimensions.width}px`,
        minHeight: `${dimensions.height}px`,
        maxWidth: `${dimensions.width}px`,
        padding: '40px 30px', // Standard A4 margins
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#000000'
      }}
    >
      {children}
      
      {showPageNumber && pageNumber && (
        <div 
          className="absolute bottom-4 right-4 text-xs text-gray-500"
          style={{ fontSize: '10px' }}
        >
          Seite {pageNumber}
        </div>
      )}
    </div>
  );
};

/**
 * A4PageBreak - Forces a page break for multi-page documents
 */
export const A4PageBreak: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => (
  <div 
    className={`page-break ${className}`}
    style={{
      pageBreakBefore: 'always',
      breakBefore: 'page',
      height: '0px',
      visibility: 'hidden'
    }}
  />
);

/**
 * A4Section - Wrapper for content sections that might break across pages
 */
export interface A4SectionProps {
  children: React.ReactNode;
  className?: string;
  keepTogether?: boolean; // Prevent breaking this section across pages
  breakBefore?: boolean;
  title?: string;
}

export const A4Section: React.FC<A4SectionProps> = ({
  children,
  className = '',
  keepTogether = false,
  breakBefore = false,
  title
}) => (
  <div
    className={className}
    style={{
      pageBreakBefore: breakBefore ? 'always' : 'auto',
      pageBreakInside: keepTogether ? 'avoid' : 'auto',
      breakInside: keepTogether ? 'avoid' : 'auto'
    }}
  >
    {title && (
      <h3 className="text-sm font-semibold mb-2 text-gray-800">
        {title}
      </h3>
    )}
    {children}
  </div>
);

/**
 * CSS classes for A4 page handling
 */
export const A4_PAGE_CLASSES = `
  .page-break-before-always {
    page-break-before: always;
    break-before: page;
  }
  
  .page-break-after-always {
    page-break-after: always;
    break-after: page;
  }
  
  .page-break-avoid {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .page-break-auto {
    page-break-inside: auto;
    break-inside: auto;
  }
  
  @media print {
    .a4-page {
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      padding: 20mm !important;
      box-sizing: border-box !important;
    }
    
    .page-break {
      page-break-before: always !important;
    }
    
    .no-print {
      display: none !important;
    }
  }
`;

export default {
  A4PageWrapper,
  A4PageBreak,
  A4Section,
  A4_PAGE_CLASSES
};
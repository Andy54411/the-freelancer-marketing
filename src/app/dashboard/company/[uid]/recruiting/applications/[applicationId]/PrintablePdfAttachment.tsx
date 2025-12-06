'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the PdfDocument component with SSR disabled
// This ensures that react-pdf and pdfjs-dist are only loaded on the client side
// preventing Webpack/SSR issues with the worker configuration
const PdfDocument = dynamic(() => import('./PdfDocument'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
      <p>Lade PDF für Druck...</p>
    </div>
  ),
});

interface PrintablePdfAttachmentProps {
  url: string;
  name: string;
}

export default function PrintablePdfAttachment({ url, name }: PrintablePdfAttachmentProps) {
  return <PdfDocument url={url} name={name} />;
}

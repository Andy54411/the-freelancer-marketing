'use client';

import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

export function PrintButton() {
  const handlePrintAndDownload = async () => {
    // Alle PDF-Links aus den data-attributes holen (nicht iframe src)
    const attachmentElements = document.querySelectorAll('[data-pdf-url]');

    // Jede PDF mit fetch downloaden und als Blob speichern
    attachmentElements.forEach(async (element, index) => {
      const url = element.getAttribute('data-pdf-url');
      const name = element.getAttribute('data-pdf-name') || `attachment_${index + 1}.pdf`;

      if (!url) return;

      try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Blob-URL erstellen und downloaden
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Blob-URL wieder freigeben
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch {
        // Fallback: Neuen Tab öffnen
        window.open(url, '_blank');
      }
    });

    // Nach kurzer Verzögerung drucken
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handlePrintAndDownload}
      title="PDFs herunterladen + Bewerbung drucken"
      className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 print:hidden"
    >
      <Download className="h-4 w-4 mr-1" />
      Download + Druck
    </Button>
  );
}

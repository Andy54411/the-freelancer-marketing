'use client';

import { useEffect, useState } from 'react';

interface TextThumbnailProps {
  fileId: string;
  fileName?: string;
  className?: string;
  mimeType?: string;
}

export function TextThumbnail({ fileId, className, mimeType }: TextThumbnailProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadText = async () => {
      try {
        const response = await fetch(`/api/webmail/drive/files/${fileId}`);
        if (!response.ok) throw new Error('Failed to load file');

        const text = await response.text();
        
        if (isMounted) {
          // Nur die ersten 500 Zeichen anzeigen
          setContent(text.substring(0, 500));
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadText();

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  if (error) {
    return null;
  }

  const isXml = mimeType === 'application/xml' || mimeType === 'text/xml';
  const isCsv = mimeType === 'text/csv';

  return (
    <div className={`${className} bg-white overflow-hidden`}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="w-full h-full p-2 overflow-hidden">
          {isCsv ? (
            <CsvPreview content={content} />
          ) : isXml ? (
            <pre className="text-[8px] leading-tight text-gray-600 font-mono whitespace-pre-wrap break-all">
              {content}
            </pre>
          ) : (
            <pre className="text-[9px] leading-tight text-gray-700 font-mono whitespace-pre-wrap break-all">
              {content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function CsvPreview({ content }: { content: string }) {
  const lines = content.split('\n').slice(0, 8);
  const rows = lines.map(line => {
    // Einfaches CSV-Parsing
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });

  return (
    <table className="w-full text-[8px] border-collapse">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i === 0 ? 'bg-gray-100 font-semibold' : ''}>
            {row.slice(0, 4).map((cell, j) => (
              <td key={j} className="border border-gray-200 px-1 py-0.5 truncate max-w-[60px]">
                {cell.substring(0, 15)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

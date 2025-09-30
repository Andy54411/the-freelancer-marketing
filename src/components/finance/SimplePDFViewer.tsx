import React, { useRef, useState } from 'react';
import { useSimplePagination } from '@/hooks/pdf/useSimplePagination';
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut, FileText, ScrollText } from 'lucide-react';

interface SimplePDFViewerProps {
  children: React.ReactNode;
  zoomLevel: number;
  a4Width: number;
  a4Height: number;
  onZoomChange: (zoomLevel: number) => void;
}

export const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({
  children,
  zoomLevel,
  a4Width,
  a4Height,
  onZoomChange
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { totalPages, contentHeight } = useSimplePagination(contentRef, a4Height);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('scroll');

  const zoomOptions = [
    { value: 2, label: '200%' },
    { value: 1.75, label: '175%' },
    { value: 1.5, label: '150%' },
    { value: 1.25, label: '125%' },
    { value: 1, label: '100%' },
    { value: 0.75, label: '75%' },
    { value: 0.5, label: '50%' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* PDF Toolbar - genau wie im Bild */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('single')}
            className={`p-2 rounded ${viewMode === 'single' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Einzelseite"
          >
            <FileText size={20} />
          </button>
          <button
            onClick={() => setViewMode('scroll')}
            className={`p-2 rounded ${viewMode === 'scroll' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Scrollansicht"
          >
            <ScrollText size={20} />
          </button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <span>Seite</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
            className="w-12 px-2 py-1 text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <span>von</span>
          <span>{totalPages}</span>
          
          <div className="flex ml-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 border border-gray-300 rounded-l hover:bg-gray-50 disabled:opacity-50"
              title="Vorherige Seite"
            >
              <ChevronUp size={16} />
            </button>
            <div className="w-px bg-gray-300"></div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 border border-gray-300 rounded-r hover:bg-gray-50 disabled:opacity-50"
              title="Nächste Seite"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const currentIndex = zoomOptions.findIndex(option => option.value === zoomLevel);
              const nextIndex = Math.max(0, currentIndex - 1);
              onZoomChange(zoomOptions[nextIndex].value);
            }}
            disabled={zoomLevel >= Math.max(...zoomOptions.map(o => o.value))}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="Vergrößern"
          >
            <ZoomIn size={16} />
          </button>
          <div className="w-px bg-gray-300 h-6"></div>
          <button
            onClick={() => {
              const currentIndex = zoomOptions.findIndex(option => option.value === zoomLevel);
              const nextIndex = Math.min(zoomOptions.length - 1, currentIndex + 1);
              onZoomChange(zoomOptions[nextIndex].value);
            }}
            disabled={zoomLevel <= Math.min(...zoomOptions.map(o => o.value))}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="Verkleinern"
          >
            <ZoomOut size={16} />
          </button>
          <select
            value={zoomLevel}
            onChange={(e) => {
              onZoomChange(parseFloat(e.target.value));
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {zoomOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollbarer Inhalt */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {/* Versteckter Messbereich */}
        <div
          ref={contentRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: `${a4Width}px`,
            visibility: 'hidden'
          }}
        >
          {children}
        </div>

        {/* Sichtbare A4-Seiten */}
        {Array.from({ length: totalPages }).map((_, pageIndex) => (
          <div
            key={pageIndex}
            className="bg-white shadow-lg border mx-auto mb-4 relative"
            style={{
              width: `${a4Width * zoomLevel}px`,
              height: `${a4Height * zoomLevel}px`,
              overflow: 'hidden'
            }}
          >
            {/* Seitennummer */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 text-xs rounded">
              Seite {pageIndex + 1}
            </div>

            {/* Inhalt für diese Seite */}
            <div
              style={{
                transform: `scale(${zoomLevel}) translateY(${-pageIndex * a4Height}px)`,
                transformOrigin: 'top left',
                width: `${a4Width}px`
              }}
            >
              {children}
            </div>
          </div>
        ))}

        {/* Einfache Zusammenfassung */}
        {totalPages > 1 && (
          <div className="text-center text-sm text-gray-600 mt-4 bg-blue-50 p-2 rounded">
            📄 {totalPages} A4-Seiten (je {a4Height}px hoch)
          </div>
        )}
      </div>
    </div>
  );
};
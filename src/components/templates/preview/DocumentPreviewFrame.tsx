import React from 'react';

interface DocumentPreviewFrameProps {
  children: React.ReactNode;
  scale?: number; // feste Skalierung, default 0.74
  maxHeight?: number; // px, default 900
  padding?: number; // inner padding für den Scrollbereich, default 0
}

/**
 * Großer Vorschau-Wrapper für A4-Dokumente.
 * Kapselt Skalierung, Rahmen und Scroll-Verhalten.
 */
const DocumentPreviewFrame: React.FC<DocumentPreviewFrameProps> = ({
  children,
  scale = 1,
  maxHeight = 900,
  padding = 0,
}) => {
  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg bg-white"
      style={{ maxHeight }}
    >
      <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight, padding }}>
        <div className="flex justify-center">
          <div className="transform origin-top inline-block" style={{ scale }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewFrame;

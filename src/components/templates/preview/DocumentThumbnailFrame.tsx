import React from 'react';

interface DocumentThumbnailFrameProps {
  children: React.ReactNode;
  scale?: number; // default 0.22
  className?: string; // optionale Container-Klassen (z. B. Höhe/Aspekt)
  aspect?: string; // Tailwind Aspect-Ratio-Klasse, default A4
}

/**
 * Thumbnail-Wrapper für Mini-Vorschauen in der Template-Liste.
 * Verhindert Overflow und ermöglicht konsistente Miniaturdarstellung.
 */
const DocumentThumbnailFrame: React.FC<DocumentThumbnailFrameProps> = ({
  children,
  scale = 0.22,
  className = '',
  aspect = 'aspect-[210/297]',
}) => {
  return (
    <div className={`bg-white rounded border relative overflow-hidden ${aspect} ${className}`}>
      <div className="absolute inset-[4px]">
        <div
          className="transform origin-top-left pointer-events-none"
          style={{
            scale,
            width: `${Math.round(100 / scale)}%`,
            height: `${Math.round(100 / scale)}%`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DocumentThumbnailFrame;

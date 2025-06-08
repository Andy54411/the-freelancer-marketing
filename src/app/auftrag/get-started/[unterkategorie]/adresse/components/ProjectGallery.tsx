// /Users/andystaudinger/tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/ProjectGallery.tsx
'use client';

import React from 'react';
import Image from 'next/image'; // Importiere die Image Komponente

export interface ProjectGalleryProps {
  userId: string;
  images?: string[];
}

const ProjectGallery: React.FC<ProjectGalleryProps> = ({ userId, images }) => {
  if (!images || images.length === 0) {
    return <p className="text-sm text-gray-500">Keine Projektbilder vorhanden.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((imageUrl, index) => (
          <div key={`${userId}-img-${index}`} className="aspect-square bg-gray-200 rounded-md overflow-hidden">
            <Image
              src={imageUrl}
              alt={`Projektbild ${index + 1}`}
              layout="fill" // Lässt das Bild den Container füllen
              objectFit="cover" // Behält das Seitenverhältnis bei und schneidet ggf. ab
              className="rounded-md" // Klassen für Styling, falls benötigt (w-full h-full ist durch layout="fill" abgedeckt)
              priority={index < 4} // Optional: Lade die ersten paar Bilder priorisiert
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectGallery;
// Custom Image Loader für bessere Kompatibilität
export const customImageLoader = ({ src, width, quality }: {
  src: string;
  width: number;
  quality?: number;
}) => {
  // Für lokale Bilder, die direkt aus public/ geladen werden
  if (src.startsWith('/')) {
    return src;
  }
  
  // Für externe Bilder
  return `${src}?w=${width}&q=${quality || 75}`;
};

// Fallback Bild für Fehlerbehandlung
export const getFallbackImage = (category?: string) => {
  switch (category) {
    case 'hero':
      return '/images/default-hero.jpg';
    case 'category':
      return '/images/default-category.jpg';
    default:
      return '/images/default-placeholder.jpg';
  }
};

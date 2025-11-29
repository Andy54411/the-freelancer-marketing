'use client';

import { Button } from '@/components/ui/button';
import { Heart, Share2, Printer } from 'lucide-react';
import { useJobFavorites } from '@/hooks/useJobFavorites';
import { toast } from 'sonner';

export function JobActions({ jobId }: { jobId: string }) {
  const { isFavorite, toggleFavorite } = useJobFavorites(jobId);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link in die Zwischenablage kopiert');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="icon" onClick={handleShare} title="Teilen">
        <Share2 className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => window.print()} title="Drucken">
        <Printer className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={toggleFavorite}
        className={isFavorite ? 'text-red-500 hover:text-red-600' : ''}
        title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
      </Button>
    </div>
  );
}

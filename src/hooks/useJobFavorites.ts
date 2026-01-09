import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

export function useJobFavorites(jobId: string) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !jobId) {
      setLoading(false);
      return;
    }

    // Listen to the specific job favorite document
    // Path: users/{uid}/job_favorites/{jobId}
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'job_favorites', jobId), 
      (doc) => {
        setIsFavorite(doc.exists());
        setLoading(false);
      },
      (_error) => {
        // Handle permission errors or other issues gracefully
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, jobId]);

  const toggleFavorite = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user?.uid) {
      toast.error('Bitte melden Sie sich an, um Favoriten zu speichern.');
      return;
    }

    try {
      const favoriteRef = doc(db, 'users', user.uid, 'job_favorites', jobId);
      if (isFavorite) {
        await deleteDoc(favoriteRef);
        toast.success('Aus Favoriten entfernt');
      } else {
        await setDoc(favoriteRef, {
          jobId,
          addedAt: new Date().toISOString(),
        });
        toast.success('Zu Favoriten hinzugefügt');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Fehler beim Aktualisieren der Favoriten');
    }
  };

  return { isFavorite, toggleFavorite, loading };
}

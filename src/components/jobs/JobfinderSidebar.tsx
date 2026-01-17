'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Bell, BellOff, Trash2, MapPin, Search, Briefcase } from 'lucide-react';
import { db } from '@/firebase/clients';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { JobfinderData, LegacyJobfinderData } from '@/types/jobfinder';
import { isNewFormat } from '@/types/jobfinder';

interface JobfinderItem {
  id: string;
  name: string;
  searchTerm?: string;
  location?: string;
  category?: string;
  jobType?: string;
  active: boolean;
  pushNotification: boolean;
  matchCount: number;
  createdAt: Date;
}

export const JobfinderSidebar = () => {
  const { user } = useAuth();
  const [jobfinders, setJobfinders] = useState<JobfinderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'jobfinder'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: JobfinderItem[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Konvertiere Timestamp zu Date
        let createdAt = new Date();
        if (data.createdAt) {
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt._seconds) {
            createdAt = new Date(data.createdAt._seconds * 1000);
          }
        }
        
        // Prüfe ob neues oder altes Format
        if (isNewFormat(data as JobfinderData | LegacyJobfinderData)) {
          // Neues Format (von Flutter App)
          const newData = data as JobfinderData;
          items.push({
            id: docSnap.id,
            name: newData.name || 'Mein Jobfinder',
            searchTerm: newData.searchTerm,
            location: newData.location,
            category: newData.category,
            jobType: newData.jobType,
            active: newData.active,
            pushNotification: newData.pushNotification,
            matchCount: newData.matchCount || 0,
            createdAt,
          });
        } else {
          // Legacy Format (von alter Web-Version)
          const legacyData = data as LegacyJobfinderData;
          items.push({
            id: docSnap.id,
            name: legacyData.location ? `Jobfinder ${legacyData.location}` : 'Mein Jobfinder',
            searchTerm: legacyData.searchPhrase,
            location: legacyData.location,
            category: undefined,
            jobType: undefined,
            active: legacyData.active,
            pushNotification: true, // Legacy hat kein pushNotification Feld
            matchCount: 0,
            createdAt,
          });
        }
      });
      
      setJobfinders(items);
      setLoading(false);
    });

    // Use setTimeout to defer unsubscribe and avoid Firestore internal assertion errors
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, [user?.uid]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (!user?.uid) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid, 'jobfinder', id), {
        active: !currentActive,
        updatedAt: new Date().toISOString(),
      });
      toast.success(currentActive ? 'Jobfinder deaktiviert' : 'Jobfinder aktiviert');
    } catch {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const deleteJobfinder = async (id: string) => {
    if (!user?.uid) return;
    
    if (!confirm('Möchtest du diesen Jobfinder wirklich löschen?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'jobfinder', id));
      toast.success('Jobfinder gelöscht');
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <div className="space-y-6">
      {/* Gespeicherte Jobfinder */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#14ad9f]" />
          Meine Jobfinder
        </h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
            ))}
          </div>
        ) : jobfinders.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Du hast noch keine Jobfinder erstellt. Erstelle deinen ersten Jobfinder, um bei neuen passenden Jobs benachrichtigt zu werden.
          </p>
        ) : (
          <div className="space-y-3">
            {jobfinders.map((jf) => (
              <div 
                key={jf.id} 
                className={`border rounded-lg p-4 transition-colors ${
                  jf.active ? 'border-teal-200 bg-teal-50/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{jf.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {jf.searchTerm && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <Search className="w-3 h-3" />
                          {jf.searchTerm}
                        </span>
                      )}
                      {jf.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {jf.location}
                        </span>
                      )}
                      {jf.category && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <Briefcase className="w-3 h-3" />
                          {jf.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={jf.active}
                    onCheckedChange={() => toggleActive(jf.id, jf.active)}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {jf.pushNotification ? (
                      <Bell className="w-3 h-3 text-[#14ad9f]" />
                    ) : (
                      <BellOff className="w-3 h-3" />
                    )}
                    <span>{jf.matchCount} Treffer</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                    onClick={() => deleteJobfinder(jf.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webinar Info */}
      <div className="bg-linear-to-br from-teal-50 to-white border border-teal-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Interesse an weiteren kostenfreien Webinaren?
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Sie möchten mehr zur richtigen Formulierung von Stellenanzeigen wissen oder haben Interesse an den aktuellen Arbeitsmarkt-Insights?
        </p>
        <a 
          href="#" 
          className="inline-flex items-center justify-center w-full px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium group"
        >
          Zu den Webinaren
          <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};

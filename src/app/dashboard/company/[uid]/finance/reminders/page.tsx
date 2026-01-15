'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentListView, DocumentItem } from '@/components/finance/DocumentListView';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, doc, updateDoc, Timestamp } from 'firebase/firestore';

export default function RemindersPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [reminders, setReminders] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadReminders = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const remindersRef = collection(db, 'companies', uid, 'reminders');
      const remindersQuery = query(remindersRef);
      const snapshot = await getDocs(remindersQuery);

      const docs: DocumentItem[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();
        const today = new Date();
        const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: docSnap.id,
          number: data.number || data.reminderNumber || `M${data.reminderLevel || 1}-${docSnap.id.slice(0, 6)}`,
          reminderNumber: data.reminderNumber,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          dueDate: data.dueDate,
          status: data.status || 'draft',
          reminderLevel: data.reminderLevel || 1,
          outstandingAmount: data.outstandingAmount || data.originalAmount || 0,
          total: data.outstandingAmount || data.originalAmount || 0,
          daysPastDue,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });

      // Sort by date descending
      docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setReminders(docs);
    } catch {
      setError('Fehler beim Laden der Mahnungen');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (user && uid) {
      loadReminders();
    }
  }, [user, uid, loadReminders]);

  const handleSendReminder = async (reminder: DocumentItem) => {
    try {
      const reminderRef = doc(db, 'companies', uid, 'reminders', reminder.id);
      await updateDoc(reminderRef, { status: 'sent', sentAt: new Date() });
      toast.success(`Mahnung ${reminder.number} wurde versendet`);
      loadReminders();
    } catch {
      toast.error('Fehler beim Versenden der Mahnung');
    }
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Mahnungen</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/company/${uid}/finance/reminders/settings`)}>
              <Settings className="w-4 h-4 mr-2" />
              Einstellungen
            </Button>
            <Link href={`/dashboard/company/${uid}/finance/reminders/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Neue Mahnung
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            <p className="mt-2 text-gray-600">Mahnungen werden geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Mahnungen</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/company/${uid}/finance/reminders/settings`)}>
              <Settings className="w-4 h-4 mr-2" />
              Einstellungen
            </Button>
            <Link href={`/dashboard/company/${uid}/finance/reminders/create`}>
              <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Neue Mahnung
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadReminders} className="bg-[#14ad9f] hover:bg-taskilo-hover">
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Mahnungen</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/company/${uid}/finance/reminders/settings`)}>
            <Settings className="w-4 h-4 mr-2" />
            Einstellungen
          </Button>
          <Link href={`/dashboard/company/${uid}/finance/reminders/create`}>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Neue Mahnung
            </Button>
          </Link>
        </div>
      </header>

      <DocumentListView
        documents={reminders}
        documentType="reminder"
        companyId={uid}
        basePath={`/dashboard/company/${uid}/finance/reminders`}
        onRefresh={loadReminders}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onSendEmail={handleSendReminder}
      />
    </div>
  );
}

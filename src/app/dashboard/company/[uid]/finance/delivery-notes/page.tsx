'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// import { DeliveryNoteComponent } from '@/components/finance/DeliveryNoteComponent';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function DeliveryNotesPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lieferscheine</h1>
          <p className="text-gray-600 mt-1">
            Erstellen und verwalten Sie Lieferscheine mit automatischer Lageraktualisierung
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neuer Lieferschein
        </Button>
      </div>

      {/* <DeliveryNoteComponent
        companyId={uid}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
      /> */}
      <div className="text-center py-12">
        <p className="text-gray-500">DeliveryNoteComponent wird noch implementiert</p>
      </div>
    </div>
  );
}

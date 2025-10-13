'use client';

import React, { useState, useEffect } from 'react';
import { HardDrive, Database, TrendingUp } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { StorageUpgradeModal } from '@/components/storage/StorageUpgradeModal';

interface StorageCardSidebarProps {
  companyId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const kb = bytes / 1024;
  const mb = bytes / (1024 * 1024);
  const gb = bytes / (1024 * 1024 * 1024);

  if (gb >= 1) {
    return gb.toFixed(2) + ' GB';
  } else if (mb >= 1) {
    return mb.toFixed(2) + ' MB';
  } else if (kb >= 1) {
    return kb.toFixed(2) + ' KB';
  } else {
    return bytes + ' B';
  }
};

const formatSmallSize = (bytes: number): string => {
  if (bytes === 0) return '0 MB';
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

export function StorageCardSidebar({ companyId }: StorageCardSidebarProps) {
  const [storageLimit, setStorageLimit] = useState(1024 * 1024 * 1024); // 1 GB default
  const [storageUsed, setStorageUsed] = useState(0);
  const [firestoreUsed, setFirestoreUsed] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const companyRef = doc(db, 'companies', companyId);

    const unsubscribe = onSnapshot(
      companyRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          const usage = data.usage || {};

          setStorageLimit(data.storageLimit || 1024 * 1024 * 1024);
          setStorageUsed(usage.storageUsed || data.storageUsed || 0);
          setFirestoreUsed(usage.firestoreUsed || 0);
        } else {
        }
      },
      error => {
        console.error('[StorageCardSidebar] Error loading usage data:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [companyId]);

  const totalUsed = storageUsed + firestoreUsed;
  const storagePercentage = storageLimit > 0 ? (totalUsed / storageLimit) * 100 : 0;
  const isNearLimit = storagePercentage > 80;

  return (
    <>
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-[#14ad9f]" />
          <span className="text-xs font-semibold text-gray-700">Speicher & Daten</span>
        </div>

        <div className="space-y-2">
          {/* Gesamt-Übersicht */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-medium">{formatFileSize(totalUsed)}</span>
            <span className="font-medium">{formatFileSize(storageLimit)}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                storagePercentage >= 100
                  ? 'bg-red-500'
                  : isNearLimit
                    ? 'bg-orange-500'
                    : 'bg-[#14ad9f]'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>

          <div className="text-xs text-gray-500 text-center">
            {storagePercentage < 1 ? storagePercentage.toFixed(2) : storagePercentage.toFixed(1)}%
            verwendet
          </div>

          {/* Breakdown: Storage vs. Firestore */}
          <div className="pt-2 border-t border-gray-200 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Dateien</span>
              </div>
              <span className="text-gray-600 font-medium">{formatSmallSize(storageUsed)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Database className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Datenbank</span>
              </div>
              <span className="text-gray-600 font-medium">{formatSmallSize(firestoreUsed)}</span>
            </div>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#14ad9f] hover:bg-[#0f9688] rounded-md transition-colors"
          >
            <TrendingUp className="h-3 w-3" />
            Mehr Speicher
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <StorageUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentStorage={storageLimit}
        usedStorage={totalUsed}
        companyId={companyId}
      />
    </>
  );
}

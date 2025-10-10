'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HardDrive, TrendingUp, AlertCircle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { StorageUpgradeModal } from '@/components/storage/StorageUpgradeModal';

interface CompanyStorageCardProps {
  companyId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function CompanyStorageCard({ companyId }: CompanyStorageCardProps) {
  const [storageLimit, setStorageLimit] = useState(1024 * 1024 * 1024); // 1 GB default
  const [storageUsed, setStorageUsed] = useState(0);
  const [storagePlanId, setStoragePlanId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load storage info from Firestore (real-time)
  useEffect(() => {
    if (!companyId) return;

    const companyRef = doc(db, 'companies', companyId);

    const unsubscribe = onSnapshot(
      companyRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setStorageLimit(data.storageLimit || 1024 * 1024 * 1024); // 1 GB default
          setStoragePlanId(data.storagePlanId || null);
          setSubscriptionStatus(data.subscriptionStatus || null);

          // TODO: Calculate actual storage used across all customers
          // For now, we'll use a placeholder or you can implement aggregation
          setStorageUsed(data.storageUsed || 0);
        }
        setLoading(false);
      },
      error => {
        console.error('Error loading storage info:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
  const isNearLimit = storagePercentage > 80;
  const isOverLimit = storagePercentage >= 100;

  const getPlanDisplay = () => {
    if (!storagePlanId) return '1 GB (Kostenlos)';
    return storagePlanId.toUpperCase().replace('GB', ' GB');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-[#14ad9f]" />
            Speicherplatz
          </CardTitle>
          <CardDescription>Laden...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-[#14ad9f]" />
            Speicherplatz
          </CardTitle>
          <CardDescription>
            Verwalten Sie den Speicherplatz für alle Kundendokumente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {formatFileSize(storageUsed)} von {formatFileSize(storageLimit)}
              </span>
              <span
                className={`font-semibold ${
                  isOverLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-900'
                }`}
              >
                {storagePercentage.toFixed(1)}% verwendet
              </span>
            </div>

            <Progress
              value={Math.min(storagePercentage, 100)}
              className={`h-2 ${
                isOverLimit
                  ? '[&>div]:bg-red-500'
                  : isNearLimit
                    ? '[&>div]:bg-orange-500'
                    : '[&>div]:bg-[#14ad9f]'
              }`}
            />
          </div>

          {/* Current Plan */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Aktueller Plan</span>
              <span className="text-sm font-semibold text-gray-900">{getPlanDisplay()}</span>
            </div>
            {subscriptionStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-100 text-green-700'
                      : subscriptionStatus === 'canceled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {subscriptionStatus === 'active'
                    ? 'Aktiv'
                    : subscriptionStatus === 'canceled'
                      ? 'Gekündigt'
                      : subscriptionStatus}
                </span>
              </div>
            )}
          </div>

          {/* Warning if near/over limit */}
          {(isNearLimit || isOverLimit) && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg ${
                isOverLimit
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-orange-50 border border-orange-200'
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  isOverLimit ? 'text-red-600' : 'text-orange-600'
                }`}
              />
              <div className="text-sm">
                <p className={`font-semibold ${isOverLimit ? 'text-red-900' : 'text-orange-900'}`}>
                  {isOverLimit ? 'Speicherlimit erreicht!' : 'Speicher fast voll'}
                </p>
                <p className={isOverLimit ? 'text-red-700' : 'text-orange-700'}>
                  {isOverLimit
                    ? 'Sie können keine neuen Dokumente mehr hochladen. Bitte upgraden Sie Ihren Plan.'
                    : 'Ihr Speicherplatz ist zu über 80% belegt. Erwägen Sie ein Upgrade.'}
                </p>
              </div>
            </div>
          )}

          {/* Upgrade Button */}
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full bg-[#14ad9f] hover:bg-[#0f9688] text-white"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Speicher erweitern
          </Button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Der Speicherplatz gilt für alle Kundendokumente dieser Company
          </p>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <StorageUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentStorage={storageLimit}
        usedStorage={storageUsed}
        companyId={companyId}
      />
    </>
  );
}

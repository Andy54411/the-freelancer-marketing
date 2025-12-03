'use client';

import React, { Suspense } from 'react';
import UserHeader from '@/components/UserHeader'; // Importiere die UserHeader-Komponente
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext'; // Import SidebarVisibilityProvider
import { FiLoader } from 'react-icons/fi'; // Für den Suspense-Fallback
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateNotifications } from '@/hooks/useUpdateNotifications';
import UpdateNotificationModal from '@/components/ui/UpdateNotificationModal';

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Update-Notification System
  const {
    unseenUpdates,
    unseenCount,
    loading,
    showNotificationModal,
    setShowNotificationModal,
    markUpdateAsSeen,
    markAllAsSeen,
    dismissUpdate,
  } = useUpdateNotifications();

  return (
    <SidebarVisibilityProvider>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ '--global-header-height': '64px' } as React.CSSProperties}
      >
        <UserHeader currentUid={user?.uid ?? ''} />
        <main className="flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Lade
                Benutzeroberfläche...
              </div>
            }
          >
            {children}
          </Suspense>
        </main>

        {/* Update Notification Modal */}
        <UpdateNotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          updates={unseenUpdates}
          onMarkAsSeen={markUpdateAsSeen}
          onMarkAllAsSeen={markAllAsSeen}
          onDismissUpdate={dismissUpdate}
        />
      </div>
    </SidebarVisibilityProvider>
  );
}

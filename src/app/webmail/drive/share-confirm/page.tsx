'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, FileIcon, FolderIcon, Loader2, AlertCircle } from 'lucide-react';

interface ShareInfo {
  id: string;
  ownerEmail: string;
  itemName: string;
  itemType: 'file' | 'folder';
  permission: 'view' | 'edit';
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export default function ShareConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; action: 'accepted' | 'rejected' } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Ungültiger Freigabe-Link');
      setLoading(false);
      return;
    }

    const fetchShareInfo = async () => {
      try {
        const response = await fetch(`/api/webmail/drive/shares/by-token?token=${token}`);
        const data = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Freigabe nicht gefunden');
          return;
        }
        
        setShareInfo(data.share);
      } catch {
        setError('Fehler beim Laden der Freigabe-Details');
      } finally {
        setLoading(false);
      }
    };

    fetchShareInfo();
  }, [token]);

  const handleAction = async (action: 'accept' | 'reject') => {
    if (!token) return;
    
    setActionLoading(action);
    try {
      const response = await fetch(`/api/webmail/drive/shares/by-token/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActionResult({ success: true, action: action === 'accept' ? 'accepted' : 'rejected' });
      } else {
        setError(data.error || 'Aktion fehlgeschlagen');
      }
    } catch {
      setError('Fehler bei der Verarbeitung');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#14ad9f] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Lade Freigabe-Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Fehler</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/webmail/drive')}
            className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Zu Taskilo Drive
          </button>
        </div>
      </div>
    );
  }

  if (actionResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 ${actionResult.action === 'accepted' ? 'bg-green-100' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {actionResult.action === 'accepted' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-gray-600" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {actionResult.action === 'accepted' ? 'Freigabe akzeptiert' : 'Freigabe abgelehnt'}
          </h1>
          <p className="text-gray-600 mb-6">
            {actionResult.action === 'accepted' 
              ? 'Sie können jetzt auf die freigegebene Datei zugreifen.'
              : 'Die Freigabe-Anfrage wurde abgelehnt.'}
          </p>
          <button
            onClick={() => router.push('/webmail/drive')}
            className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Zu Taskilo Drive
          </button>
        </div>
      </div>
    );
  }

  if (shareInfo?.status !== 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Bereits verarbeitet</h1>
          <p className="text-gray-600 mb-6">
            Diese Freigabe-Anfrage wurde bereits {shareInfo?.status === 'accepted' ? 'akzeptiert' : 'abgelehnt'}.
          </p>
          <button
            onClick={() => router.push('/webmail/drive')}
            className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            Zu Taskilo Drive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {shareInfo?.itemType === 'folder' ? (
              <FolderIcon className="w-8 h-8 text-[#14ad9f]" />
            ) : (
              <FileIcon className="w-8 h-8 text-[#14ad9f]" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Freigabe-Anfrage</h1>
          <p className="text-gray-600">
            <strong>{shareInfo?.ownerEmail}</strong> möchte {shareInfo?.itemType === 'folder' ? 'einen Ordner' : 'eine Datei'} mit Ihnen teilen.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            {shareInfo?.itemType === 'folder' ? (
              <FolderIcon className="w-5 h-5 text-[#14ad9f]" />
            ) : (
              <FileIcon className="w-5 h-5 text-[#14ad9f]" />
            )}
            <span className="font-semibold text-gray-900">{shareInfo?.itemName}</span>
          </div>
          <p className="text-sm text-gray-500">
            Berechtigung: {shareInfo?.permission === 'edit' ? 'Bearbeiten' : 'Anzeigen'}
          </p>
        </div>

        {shareInfo?.message && (
          <div className="bg-[#14ad9f]/5 border-l-4 border-[#14ad9f] p-4 mb-6 rounded-r-lg">
            <p className="text-gray-700 italic">&quot;{shareInfo.message}&quot;</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleAction('reject')}
            disabled={actionLoading !== null}
            className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === 'reject' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            Ablehnen
          </button>
          <button
            onClick={() => handleAction('accept')}
            disabled={actionLoading !== null}
            className="flex-1 px-6 py-3 bg-[#14ad9f] text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === 'accept' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, Share2, Mail, Eye, Edit, Loader2, Check, AlertCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    type: 'file' | 'folder';
  };
  userEmail: string;
}

export function ShareModal({ isOpen, onClose, item, userEmail }: ShareModalProps) {
  const [targetEmail, setTargetEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/webmail/drive/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userEmail,
          targetEmail,
          fileId: item.type === 'file' ? item.id : null,
          folderId: item.type === 'folder' ? item.id : null,
          permission,
          message: message.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Teilen');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setTargetEmail('');
        setMessage('');
        setPermission('view');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-[#14ad9f]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Freigeben</h2>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Freigabe gesendet</h3>
              <p className="text-gray-500">
                Eine Bestätigungs-E-Mail wurde an {targetEmail} gesendet.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* E-Mail Eingabe */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse des Empfängers
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="beispiel@taskilo.de"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Berechtigung */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Berechtigung
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPermission('view')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      permission === 'view'
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5 text-[#14ad9f]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">Anzeigen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermission('edit')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      permission === 'edit'
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5 text-[#14ad9f]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Edit className="w-5 h-5" />
                    <span className="font-medium">Bearbeiten</span>
                  </button>
                </div>
              </div>

              {/* Optionale Nachricht */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nachricht (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Fügen Sie eine persönliche Nachricht hinzu..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading || !targetEmail}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#14ad9f] text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Senden...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" />
                      <span>Freigeben</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, CheckCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ElsterCertificateSettingsProps {
  uid: string;
}

interface CertificateStatus {
  certificateExists: boolean;
  fileInfo?: {
    size: number;
    uploadedAt: string;
  };
}

export function ElsterCertificateSettings({ uid }: ElsterCertificateSettingsProps) {
  const [status, setStatus] = useState<CertificateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/company/${uid}/elster/certificate-status`);
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          certificateExists: data.certificateExists,
          fileInfo: data.fileInfo,
        });
      } else {
        setError(data.error);
      }
    } catch {
      setError('Zertifikatsstatus konnte nicht abgerufen werden');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pfx')) {
      setError('Nur .pfx-Dateien werden unterstützt');
      return;
    }

    if (file.size > 50 * 1024) {
      setError('Datei ist zu groß (maximal 50 KB)');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMessage(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        
        const response = await fetch(`/api/company/${uid}/elster/upload-certificate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            certificate: base64,
            filename: file.name,
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          setSuccessMessage('Zertifikat hochgeladen');
          await fetchStatus();
        } else {
          setError(data.error);
        }
        
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch {
      setError('Fehler beim Hochladen');
      setUploading(false);
    }

    event.target.value = '';
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie das ELSTER-Zertifikat wirklich löschen?')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/company/${uid}/elster/delete-certificate`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Zertifikat gelöscht');
        await fetchStatus();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-100 rounded w-1/4"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">ELSTER-Zertifikat</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Für elektronische Steuerübermittlung
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-gray-500 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="text-sm space-y-1">
                <p className="font-medium">So funktioniert ELSTER:</p>
                <p>1. Zertifikat (.pfx) einmalig hochladen</p>
                <p>2. PIN bei jeder Übermittlung eingeben</p>
                <p>3. Daten werden verschlüsselt gesendet</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Testmodus Hinweis */}
        <p className="text-xs text-gray-400">
          Testmodus: Übermittlungen gehen an Testfinanzamt 9198
        </p>

        {/* Status Messages */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {successMessage && (
          <p className="text-sm text-green-600">{successMessage}</p>
        )}

        {/* Zertifikat Status */}
        {status?.certificateExists ? (
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Zertifikat vorhanden</p>
                {status.fileInfo && (
                  <p className="text-xs text-gray-500">
                    {formatDate(status.fileInfo.uploadedAt)} · {formatFileSize(status.fileInfo.size)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#14ad9f] hover:text-[#0d8a7f] cursor-pointer transition-colors">
                {uploading ? 'Lädt...' : 'Ersetzen'}
                <input
                  type="file"
                  accept=".pfx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Löscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-colors">
            <Upload className="w-8 h-8 text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-600">
              {uploading ? 'Wird hochgeladen...' : 'Zertifikat hochladen'}
            </span>
            <span className="text-xs text-gray-400 mt-1">.pfx · max. 50 KB</span>
            <input
              type="file"
              accept=".pfx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}

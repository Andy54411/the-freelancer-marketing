'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Upload, Trash2, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

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
    } catch (err) {
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

    // Validierung
    if (!file.name.toLowerCase().endsWith('.pfx')) {
      setError('Nur .pfx-Dateien werden unterstützt');
      return;
    }

    if (file.size > 50 * 1024) { // Max 50KB
      setError('Datei ist zu groß (maximal 50 KB)');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMessage(null);

      // Datei als Base64 lesen
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
          setSuccessMessage('Zertifikat erfolgreich hochgeladen');
          await fetchStatus();
        } else {
          setError(data.error);
        }
        
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Fehler beim Hochladen des Zertifikats');
      setUploading(false);
    }

    // Input zurücksetzen
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
        setSuccessMessage('Zertifikat erfolgreich gelöscht');
        await fetchStatus();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Fehler beim Löschen des Zertifikats');
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#14ad9f]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">ELSTER-Zertifikat</h2>
            <p className="text-sm text-gray-500">Für elektronische Steuerübermittlung</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#14ad9f] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#14ad9f]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">ELSTER-Zertifikat</h2>
          <p className="text-sm text-gray-500">Für elektronische Steuerübermittlung</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Wie funktioniert ELSTER?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>Laden Sie Ihr ELSTER-Zertifikat (.pfx-Datei) einmalig hier hoch</li>
              <li>Bei jeder Übermittlung geben Sie Ihre PIN ein (wird nicht gespeichert)</li>
              <li>Ihre Steuerdaten werden verschlüsselt ans Finanzamt gesendet</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test-Modus Hinweis */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">Testmodus aktiv</p>
            <p>Alle ELSTER-Übermittlungen werden aktuell im Testmodus an das Testfinanzamt 9198 gesendet. 
              Ihre Daten werden nicht an ein echtes Finanzamt übermittelt.</p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Zertifikat Status */}
      <div className="space-y-4">
        {status?.certificateExists ? (
          // Zertifikat vorhanden
          <div className="border border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Zertifikat vorhanden</p>
                  {status.fileInfo && (
                    <p className="text-sm text-gray-500">
                      Hochgeladen am {formatDate(status.fileInfo.uploadedAt)} • {formatFileSize(status.fileInfo.size)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Löschen
              </button>
            </div>
          </div>
        ) : (
          // Kein Zertifikat
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Kein Zertifikat vorhanden
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Laden Sie Ihr ELSTER-Zertifikat hoch, um Steuererklärungen elektronisch zu übermitteln.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#14ad9f] text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Zertifikat hochladen
                </>
              )}
              <input
                type="file"
                accept=".pfx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-3">
              Erlaubtes Format: .pfx • Maximale Größe: 50 KB
            </p>
          </div>
        )}

        {/* Neues Zertifikat hochladen (wenn bereits eins existiert) */}
        {status?.certificateExists && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">
              Sie können das bestehende Zertifikat durch ein neues ersetzen:
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Neues Zertifikat hochladen
                </>
              )}
              <input
                type="file"
                accept=".pfx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

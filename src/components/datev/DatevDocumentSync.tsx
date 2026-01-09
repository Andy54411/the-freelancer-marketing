'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FiUpload,
  FiFileText,
  FiFile,
  FiRefreshCw,
  FiTrash2,
  FiEye,
  FiCheck,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import { DatevOrganization } from '@/services/datevService';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { toast } from 'sonner';

interface DatevDocumentSyncProps {
  companyId: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  syncedAt?: string;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  datevId?: string;
  category: 'invoice' | 'receipt' | 'contract' | 'report' | 'other';
  url?: string;
}

interface SyncJob {
  id: string;
  documentId: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export function DatevDocumentSync({ companyId }: DatevDocumentSyncProps) {
  const [loading, setLoading] = useState(true);
  const [organization] = useState<DatevOrganization | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadDocumentData();
  }, [companyId]);

  const loadDocumentData = async () => {
    try {
      setLoading(true);
      const token = await DatevTokenManager.getUserToken();

      if (!token) {
        toast.error('Keine DATEV-Verbindung gefunden');
        return;
      }

      // Load organization - Organizations not needed for Taskilo

      // Mock document data - in production, load from your backend
      setDocuments([
        {
          id: '1',
          name: 'Rechnung_RG-2025-001.pdf',
          type: 'PDF',
          size: 245760,
          uploadedAt: '2025-08-01T10:00:00Z',
          syncedAt: '2025-08-01T10:05:00Z',
          status: 'synced',
          datevId: 'DATEV-DOC-001',
          category: 'invoice',
        },
        {
          id: '2',
          name: 'Beleg_Büromaterial.jpg',
          type: 'JPEG',
          size: 1024000,
          uploadedAt: '2025-08-02T14:30:00Z',
          status: 'pending',
          category: 'receipt',
        },
        {
          id: '3',
          name: 'Arbeitsvertrag_Mueller.pdf',
          type: 'PDF',
          size: 512000,
          uploadedAt: '2025-08-02T16:15:00Z',
          syncedAt: '2025-08-02T16:20:00Z',
          status: 'synced',
          datevId: 'DATEV-DOC-003',
          category: 'contract',
        },
      ]);
    } catch {
      toast.error('Fehler beim Laden der Dokument-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!organization) {
      toast.error('Keine DATEV-Verbindung verfügbar');
      return;
    }

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error(`Datei ${file.name} ist zu groß (max. 10MB)`);
        continue;
      }

      const newDocument: Document = {
        id: Date.now().toString() + i,
        name: file.name,
        type: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        category: detectCategory(file.name),
      };

      setDocuments(prev => [newDocument, ...prev]);

      // Create sync job
      const syncJob: SyncJob = {
        id: newDocument.id + '-sync',
        documentId: newDocument.id,
        status: 'uploading',
        progress: 0,
        startedAt: new Date().toISOString(),
      };

      setSyncJobs(prev => [syncJob, ...prev]);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setSyncJobs(prev =>
          prev.map(job =>
            job.id === syncJob.id ? { ...job, progress: Math.min(job.progress + 10, 100) } : job
          )
        );
      }, 200);

      try {
        // Simulate DATEV upload
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In production, use: await DatevService.uploadDocument(organization.id, file);

        clearInterval(progressInterval);

        // Update sync job
        setSyncJobs(prev =>
          prev.map(job =>
            job.id === syncJob.id
              ? {
                  ...job,
                  status: 'completed',
                  progress: 100,
                  completedAt: new Date().toISOString(),
                }
              : job
          )
        );

        // Update document
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === newDocument.id
              ? {
                  ...doc,
                  status: 'synced',
                  syncedAt: new Date().toISOString(),
                  datevId: `DATEV-DOC-${Date.now()}`,
                }
              : doc
          )
        );

        toast.success(`${file.name} erfolgreich zu DATEV hochgeladen`);
      } catch {
        clearInterval(progressInterval);

        setSyncJobs(prev =>
          prev.map(job =>
            job.id === syncJob.id
              ? {
                  ...job,
                  status: 'failed',
                  error: 'Upload fehlgeschlagen',
                }
              : job
          )
        );

        setDocuments(prev =>
          prev.map(doc => (doc.id === newDocument.id ? { ...doc, status: 'error' } : doc))
        );

        toast.error(`Fehler beim Upload von ${file.name}`);
      }
    }

    setUploading(false);
  };

  const detectCategory = (filename: string): Document['category'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('rechnung') || lower.includes('invoice')) return 'invoice';
    if (lower.includes('beleg') || lower.includes('receipt')) return 'receipt';
    if (lower.includes('vertrag') || lower.includes('contract')) return 'contract';
    if (lower.includes('bericht') || lower.includes('report')) return 'report';
    return 'other';
  };

  const syncDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document || !organization) return;

    const syncJob: SyncJob = {
      id: documentId + '-sync-' + Date.now(),
      documentId: documentId,
      status: 'uploading',
      progress: 0,
      startedAt: new Date().toISOString(),
    };

    setSyncJobs(prev => [syncJob, ...prev]);
    setDocuments(prev =>
      prev.map(doc => (doc.id === documentId ? { ...doc, status: 'syncing' } : doc))
    );

    try {
      // Simulate sync process
      for (let progress = 0; progress <= 100; progress += 20) {
        setSyncJobs(prev => prev.map(job => (job.id === syncJob.id ? { ...job, progress } : job)));
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // In production: await DatevService.uploadDocument(organization.id, documentFile);

      setSyncJobs(prev =>
        prev.map(job =>
          job.id === syncJob.id
            ? {
                ...job,
                status: 'completed',
                completedAt: new Date().toISOString(),
              }
            : job
        )
      );

      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId
            ? {
                ...doc,
                status: 'synced',
                syncedAt: new Date().toISOString(),
                datevId: `DATEV-DOC-${Date.now()}`,
              }
            : doc
        )
      );

      toast.success(`${document.name} erfolgreich synchronisiert`);
    } catch {
      setSyncJobs(prev =>
        prev.map(job =>
          job.id === syncJob.id
            ? { ...job, status: 'failed', error: 'Synchronisation fehlgeschlagen' }
            : job
        )
      );

      setDocuments(prev =>
        prev.map(doc => (doc.id === documentId ? { ...doc, status: 'error' } : doc))
      );

      toast.error(`Fehler bei der Synchronisation von ${document.name}`);
    }
  };

  const deleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    setSyncJobs(prev => prev.filter(job => job.documentId !== documentId));
    toast.success('Dokument gelöscht');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <FiRefreshCw className="animate-spin w-6 h-6 text-[#14ad9f]" />
            <span className="ml-2">Lade Dokument-Synchronisation...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Keine DATEV-Verbindung</CardTitle>
          <CardDescription>Bitte richten Sie zuerst die DATEV-Integration ein.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiUpload className="text-[#14ad9f]" />
            Dokumente hochladen
          </CardTitle>
          <CardDescription>
            Laden Sie Belege, Rechnungen und Verträge direkt zu DATEV hoch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                : 'border-gray-300 hover:border-[#14ad9f]/50'
            }`}
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) {
                handleFileUpload(e.dataTransfer.files);
              }
            }}
          >
            <FiFile className="mx-auto w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Dateien hier ablegen oder auswählen</h3>
            <p className="text-sm text-gray-500 mb-4">
              PDF, JPG, PNG, DOC, XLS bis zu 10MB pro Datei
            </p>
            <Input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={e => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
              className="bg-[#14ad9f] hover:bg-taskilo-hover"
            >
              {uploading ? (
                <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FiUpload className="w-4 h-4 mr-2" />
              )}
              Dateien auswählen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sync Jobs */}
      {syncJobs.filter(job => job.status !== 'completed' && job.status !== 'failed').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiClock className="text-[#14ad9f]" />
              Aktive Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncJobs
                .filter(job => job.status !== 'completed' && job.status !== 'failed')
                .map(job => {
                  const document = documents.find(doc => doc.id === job.documentId);
                  return (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{document?.name}</span>
                        <span className="text-sm text-gray-500">{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="w-full" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FiFileText className="text-[#14ad9f]" />
                Dokumente
              </CardTitle>
              <CardDescription>Alle hochgeladenen und synchronisierten Dokumente</CardDescription>
            </div>
            <Button
              onClick={loadDocumentData}
              variant="outline"
              size="sm"
              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
            >
              <FiRefreshCw className="w-4 h-4 mr-2" />
              Aktualisieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map(document => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FiFileText className="text-[#14ad9f] w-5 h-5" />
                  <div>
                    <h4 className="font-medium">{document.name}</h4>
                    <p className="text-sm text-gray-500">
                      {document.type} • {(document.size / 1024).toFixed(1)} KB •
                      {new Date(document.uploadedAt).toLocaleDateString('de-DE')}
                    </p>
                    {document.syncedAt && document.datevId && (
                      <p className="text-xs text-green-600">
                        DATEV ID: {document.datevId} • Synchronisiert:{' '}
                        {new Date(document.syncedAt).toLocaleString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      document.status === 'synced'
                        ? 'border-green-500 text-green-500'
                        : document.status === 'syncing'
                          ? 'border-blue-500 text-blue-500'
                          : document.status === 'error'
                            ? 'border-red-500 text-red-500'
                            : 'border-gray-500 text-gray-500'
                    }
                  >
                    {document.status === 'synced' && <FiCheck className="w-3 h-3 mr-1" />}
                    {document.status === 'syncing' && (
                      <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {document.status === 'error' && <FiAlertCircle className="w-3 h-3 mr-1" />}
                    {document.status === 'synced'
                      ? 'Synchronisiert'
                      : document.status === 'syncing'
                        ? 'Synchronisiert...'
                        : document.status === 'error'
                          ? 'Fehler'
                          : 'Ausstehend'}
                  </Badge>
                  <Badge variant="outline">
                    {document.category === 'invoice'
                      ? 'Rechnung'
                      : document.category === 'receipt'
                        ? 'Beleg'
                        : document.category === 'contract'
                          ? 'Vertrag'
                          : document.category === 'report'
                            ? 'Bericht'
                            : 'Sonstiges'}
                  </Badge>
                  <div className="flex gap-1">
                    {document.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncDocument(document.id)}
                        className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                      >
                        <FiUpload className="w-3 h-3" />
                      </Button>
                    )}
                    {document.url && (
                      <Button size="sm" variant="outline">
                        <FiEye className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteDocument(document.id)}
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-center text-gray-500 py-8">Noch keine Dokumente hochgeladen</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

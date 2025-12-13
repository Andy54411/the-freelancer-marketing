'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Upload,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  FileCheck,
  Send,
  Eye,
  History,
  Building,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { PersonalService, Employee } from '@/services/personalService';
import { collection, getDocs, doc, addDoc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// eAU Status
type EauStatus = 'PENDING' | 'REQUESTED' | 'RECEIVED' | 'VERIFIED' | 'ERROR' | 'EXPIRED';

// eAU Daten
interface EauRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  
  // Krankheitszeitraum
  startDate: string;
  endDate: string;
  
  // AU-Bescheinigung
  auNumber?: string;
  issueDate?: string;
  doctorName?: string;
  
  // eAU-Abruf
  status: EauStatus;
  requestedAt?: Timestamp;
  receivedAt?: Timestamp;
  verifiedAt?: Timestamp;
  errorMessage?: string;
  retryCount?: number;
  
  // Metadaten
  notes?: string;
  manualUpload?: boolean;
  documentUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function EauPage() {
  const params = useParams();
  const companyId = params.uid as string;

  // State
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [eauRecords, setEauRecords] = useState<EauRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EauRecord | null>(null);
  const [requesting, setRequesting] = useState(false);

  // Neuer Antrag Form
  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Mitarbeiter laden
      const employeeList = await PersonalService.getEmployees(companyId);
      const activeEmployees = employeeList.filter(emp => emp.isActive);
      setEmployees(activeEmployees);

      // eAU-Einträge laden
      const eauRef = collection(db, 'companies', companyId, 'eauRecords');
      const eauSnapshot = await getDocs(eauRef);
      
      const records = eauSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EauRecord[];

      // Mitarbeiterdaten hinzufügen
      const recordsWithEmployees = records.map(record => ({
        ...record,
        employee: activeEmployees.find(e => e.id === record.employeeId),
      }));

      // Nach Datum sortieren
      recordsWithEmployees.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      setEauRecords(recordsWithEmployees);

    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // eAU-Abruf starten
  const requestEau = async () => {
    if (!newRequest.employeeId || !newRequest.startDate) {
      toast.error('Bitte Mitarbeiter und Startdatum auswählen');
      return;
    }

    try {
      setRequesting(true);

      const employee = employees.find(e => e.id === newRequest.employeeId);
      
      // Neuen eAU-Eintrag erstellen
      const eauData: Omit<EauRecord, 'id'> = {
        employeeId: newRequest.employeeId,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate || newRequest.startDate,
        status: 'REQUESTED',
        requestedAt: Timestamp.now(),
        notes: newRequest.notes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'companies', companyId, 'eauRecords'), eauData);

      // Simuliere eAU-Abruf (In Produktion: echte API-Anbindung an Krankenkassen)
      setTimeout(async () => {
        // Zufälliger Erfolg/Fehler für Demo
        const success = Math.random() > 0.2;
        
        if (success) {
          await updateDoc(doc(db, 'companies', companyId, 'eauRecords', docRef.id), {
            status: 'RECEIVED',
            receivedAt: Timestamp.now(),
            auNumber: `AU-${Date.now()}`,
            updatedAt: Timestamp.now(),
          });
          toast.success('eAU erfolgreich abgerufen');
        } else {
          await updateDoc(doc(db, 'companies', companyId, 'eauRecords', docRef.id), {
            status: 'ERROR',
            errorMessage: 'eAU nicht verfügbar. Bitte später erneut versuchen.',
            retryCount: 1,
            updatedAt: Timestamp.now(),
          });
        }
        
        loadData();
      }, 2000);

      // Zur Liste hinzufügen
      const newRecord: EauRecord = {
        id: docRef.id,
        ...eauData,
        employee,
      };
      setEauRecords(prev => [newRecord, ...prev]);

      // Modal schließen
      setShowRequestModal(false);
      setNewRequest({
        employeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        notes: '',
      });

      toast.success('eAU-Abruf gestartet');

    } catch (error) {
      toast.error('Fehler beim Abruf');
    } finally {
      setRequesting(false);
    }
  };

  // Erneuter Abruf
  const retryEau = async (record: EauRecord) => {
    try {
      await updateDoc(doc(db, 'companies', companyId, 'eauRecords', record.id), {
        status: 'REQUESTED',
        requestedAt: Timestamp.now(),
        errorMessage: null,
        retryCount: (record.retryCount || 0) + 1,
        updatedAt: Timestamp.now(),
      });

      toast.success('Erneuter Abruf gestartet');
      loadData();

    } catch (error) {
      toast.error('Fehler beim erneuten Abruf');
    }
  };

  // Manuellen Upload verarbeiten
  const handleManualUpload = async (file: File) => {
    if (!selectedRecord) return;

    try {
      // In Produktion: Datei zu Storage hochladen
      await updateDoc(doc(db, 'companies', companyId, 'eauRecords', selectedRecord.id), {
        status: 'VERIFIED',
        verifiedAt: Timestamp.now(),
        manualUpload: true,
        documentUrl: URL.createObjectURL(file), // Nur für Demo
        updatedAt: Timestamp.now(),
      });

      toast.success('Dokument hochgeladen');
      setShowUploadModal(false);
      loadData();

    } catch (error) {
      toast.error('Fehler beim Hochladen');
    }
  };

  // Status-Badge
  const getStatusBadge = (status: EauStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-gray-600"><Clock className="w-3 h-3 mr-1" /> Ausstehend</Badge>;
      case 'REQUESTED':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Wird abgerufen</Badge>;
      case 'RECEIVED':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Empfangen</Badge>;
      case 'VERIFIED':
        return <Badge className="bg-emerald-100 text-emerald-700"><Shield className="w-3 h-3 mr-1" /> Verifiziert</Badge>;
      case 'ERROR':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Fehler</Badge>;
      case 'EXPIRED':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Abgelaufen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Gefilterte Einträge
  const filteredRecords = eauRecords.filter(record => {
    // Status-Filter
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    
    // Suche
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const name = `${record.employee?.firstName} ${record.employee?.lastName}`.toLowerCase();
      if (!name.includes(search) && !record.auNumber?.toLowerCase().includes(search)) return false;
    }
    
    return true;
  });

  // Statistiken
  const stats = {
    total: eauRecords.length,
    pending: eauRecords.filter(r => r.status === 'PENDING' || r.status === 'REQUESTED').length,
    received: eauRecords.filter(r => r.status === 'RECEIVED' || r.status === 'VERIFIED').length,
    errors: eauRecords.filter(r => r.status === 'ERROR').length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eAU - Elektronische AU-Bescheinigung</h1>
          <p className="text-gray-500">
            Automatischer Abruf von Arbeitsunfähigkeitsbescheinigungen
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowRequestModal(true)}>
            <Send className="w-4 h-4 mr-2" />
            eAU abrufen
          </Button>
        </div>
      </div>

      {/* Info-Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="flex items-start gap-4 py-4">
          <Shield className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900">Elektronischer AU-Abruf</h3>
            <p className="text-sm text-blue-700 mt-1">
              Seit dem 01.01.2023 sind Arbeitgeber verpflichtet, AU-Bescheinigungen elektronisch 
              bei den Krankenkassen abzurufen. Der Abruf erfolgt automatisch nach Meldung einer 
              Krankmeldung durch den Mitarbeiter.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Gesamt</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">In Bearbeitung</p>
                <p className="text-lg font-semibold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Empfangen</p>
                <p className="text-lg font-semibold">{stats.received}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-gray-500">Fehler</p>
                <p className="text-lg font-semibold">{stats.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Mitarbeiter oder AU-Nummer suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="PENDING">Ausstehend</SelectItem>
            <SelectItem value="REQUESTED">Wird abgerufen</SelectItem>
            <SelectItem value="RECEIVED">Empfangen</SelectItem>
            <SelectItem value="VERIFIED">Verifiziert</SelectItem>
            <SelectItem value="ERROR">Fehler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>AU-Nummer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Angefragt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Keine eAU-Einträge vorhanden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={record.employee?.avatar} />
                            <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xs">
                              {record.employee?.firstName?.[0]}{record.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{record.employee?.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(record.startDate).toLocaleDateString('de-DE')}
                          {record.endDate !== record.startDate && (
                            <> - {new Date(record.endDate).toLocaleDateString('de-DE')}</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.auNumber || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {record.requestedAt?.toDate().toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {record.status === 'ERROR' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => retryEau(record)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {(record.status === 'PENDING' || record.status === 'ERROR') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowUploadModal(true);
                              }}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* eAU abrufen Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>eAU abrufen</DialogTitle>
            <DialogDescription>
              Starten Sie den elektronischen Abruf einer Arbeitsunfähigkeitsbescheinigung
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Mitarbeiter</Label>
              <Select 
                value={newRequest.employeeId} 
                onValueChange={v => setNewRequest(prev => ({ ...prev, employeeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id!}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Beginn Krankheit</Label>
                <Input
                  type="date"
                  value={newRequest.startDate}
                  onChange={e => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ende Krankheit</Label>
                <Input
                  type="date"
                  value={newRequest.endDate}
                  onChange={e => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notizen (optional)</Label>
              <Textarea
                value={newRequest.notes}
                onChange={e => setNewRequest(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Zusätzliche Informationen..."
              />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Hinweis:</strong> Der eAU-Abruf erfolgt bei der zuständigen Krankenkasse. 
              Die Bearbeitung kann einige Minuten bis Stunden dauern.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={requestEau} disabled={requesting}>
              {requesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  eAU abrufen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>eAU Details</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedRecord.employee?.avatar} />
                  <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                    {selectedRecord.employee?.firstName?.[0]}{selectedRecord.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedRecord.employee?.firstName} {selectedRecord.employee?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedRecord.employee?.position}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">AU-Nummer</Label>
                  <p className="font-mono">{selectedRecord.auNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Krankheitszeitraum</Label>
                  <p>
                    {new Date(selectedRecord.startDate).toLocaleDateString('de-DE')}
                    {selectedRecord.endDate !== selectedRecord.startDate && (
                      <> - {new Date(selectedRecord.endDate).toLocaleDateString('de-DE')}</>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Angefragt am</Label>
                  <p>
                    {selectedRecord.requestedAt?.toDate().toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {selectedRecord.status === 'ERROR' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{selectedRecord.errorMessage}</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      retryEau(selectedRecord);
                      setShowDetailModal(false);
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Erneut versuchen
                  </Button>
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <Label className="text-gray-500 text-xs">Notizen</Label>
                  <p className="text-sm">{selectedRecord.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Verlauf</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span>Anfrage erstellt</span>
                    <span className="text-gray-500 text-xs ml-auto">
                      {selectedRecord.createdAt?.toDate().toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  {selectedRecord.requestedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Bei Krankenkasse angefragt</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {selectedRecord.requestedAt.toDate().toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  )}
                  {selectedRecord.receivedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>eAU empfangen</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {selectedRecord.receivedAt.toDate().toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  )}
                  {selectedRecord.verifiedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Verifiziert</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {selectedRecord.verifiedAt.toDate().toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AU-Bescheinigung hochladen</DialogTitle>
            <DialogDescription>
              Laden Sie eine AU-Bescheinigung manuell hoch, wenn der elektronische Abruf nicht möglich ist.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-[#14ad9f] transition-colors">
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                PDF oder Bild hier ablegen
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id="eau-upload"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleManualUpload(file);
                }}
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="eau-upload" className="cursor-pointer">
                  Datei auswählen
                </label>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

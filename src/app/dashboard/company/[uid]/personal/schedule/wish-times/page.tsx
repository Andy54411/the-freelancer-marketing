'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Heart,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCircle,
  X,
  Filter,
  Download,
  Users,
  CalendarDays,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { PersonalService, Employee } from '@/services/personalService';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Wunschzeit-Interface
interface WishTime {
  id?: string;
  employeeId: string;
  type: 'PREFERRED' | 'UNAVAILABLE' | 'VACATION_REQUEST';
  dateType: 'SPECIFIC' | 'RECURRING';
  // Für spezifische Daten
  startDate?: string;
  endDate?: string;
  // Für wiederkehrende Wünsche
  dayOfWeek?: number; // 0-6 (Montag-Sonntag)
  // Zeitangaben
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reason?: string;
  adminNote?: string;
  // Metadaten
  createdAt: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Urlaubssperre-Interface
interface VacationBlock {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  reason: string;
  departments?: string[];
  createdAt: string;
}

const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function WishTimesPage() {
  const params = useParams();
  const companyId = params.uid as string;

  // State
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [wishTimes, setWishTimes] = useState<WishTime[]>([]);
  const [vacationBlocks, setVacationBlocks] = useState<VacationBlock[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal State
  const [showWishModal, setShowWishModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedWish, setSelectedWish] = useState<WishTime | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<VacationBlock | null>(null);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Mitarbeiter laden
      const employeeList = await PersonalService.getEmployees(companyId);
      setEmployees(employeeList.filter(emp => emp.isActive));

      // Wunschzeiten laden
      const wishRef = collection(db, 'companies', companyId, 'wishTimes');
      const wishSnapshot = await getDocs(wishRef);
      const loadedWishes: WishTime[] = wishSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as WishTime[];
      setWishTimes(loadedWishes);

      // Urlaubssperren laden
      const blocksRef = collection(db, 'companies', companyId, 'vacationBlocks');
      const blocksSnapshot = await getDocs(blocksRef);
      const loadedBlocks: VacationBlock[] = blocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as VacationBlock[];
      setVacationBlocks(loadedBlocks);

    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Wunschzeit genehmigen/ablehnen
  const updateWishStatus = async (wishId: string, status: 'APPROVED' | 'REJECTED', note?: string) => {
    try {
      const wishRef = doc(db, 'companies', companyId, 'wishTimes', wishId);
      await updateDoc(wishRef, {
        status,
        adminNote: note || '',
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success(status === 'APPROVED' ? 'Wunschzeit genehmigt' : 'Wunschzeit abgelehnt');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Wunschzeit löschen
  const deleteWish = async (wishId: string) => {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'wishTimes', wishId));
      toast.success('Wunschzeit gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Urlaubssperre speichern
  const saveVacationBlock = async (blockData: Partial<VacationBlock>) => {
    try {
      const blocksRef = collection(db, 'companies', companyId, 'vacationBlocks');
      
      if (selectedBlock?.id) {
        await updateDoc(doc(blocksRef, selectedBlock.id), blockData);
        toast.success('Urlaubssperre aktualisiert');
      } else {
        await addDoc(blocksRef, {
          ...blockData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Urlaubssperre erstellt');
      }

      setShowBlockModal(false);
      setSelectedBlock(null);
      loadData();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Urlaubssperre löschen
  const deleteVacationBlock = async (blockId: string) => {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'vacationBlocks', blockId));
      toast.success('Urlaubssperre gelöscht');
      loadData();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Filter anwenden
  const filteredWishes = wishTimes.filter(wish => {
    if (selectedEmployee !== 'all' && wish.employeeId !== selectedEmployee) return false;
    if (filterStatus !== 'all' && wish.status !== filterStatus) return false;
    if (filterType !== 'all' && wish.type !== filterType) return false;
    return true;
  });

  // Statistiken
  const stats = {
    pending: wishTimes.filter(w => w.status === 'PENDING').length,
    approved: wishTimes.filter(w => w.status === 'APPROVED').length,
    rejected: wishTimes.filter(w => w.status === 'REJECTED').length,
    activeBlocks: vacationBlocks.filter(b => new Date(b.endDate) >= new Date()).length,
  };

  // Helper: Mitarbeiter finden
  const getEmployee = (employeeId: string) => {
    return employees.find(e => e.id === employeeId);
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
          <h1 className="text-2xl font-bold text-gray-900">Wunschzeiten & Verfügbarkeiten</h1>
          <p className="text-gray-500">
            Verwalten Sie Wunschzeiten, Verfügbarkeiten und Urlaubssperren
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBlockModal(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Urlaubssperre
          </Button>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-gray-500">Ausstehend</p>
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
                <p className="text-xs text-gray-500">Genehmigt</p>
                <p className="text-lg font-semibold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-gray-500">Abgelehnt</p>
                <p className="text-lg font-semibold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Aktive Sperren</p>
                <p className="text-lg font-semibold">{stats.activeBlocks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="wishes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wishes">Wunschzeiten</TabsTrigger>
          <TabsTrigger value="blocks">Urlaubssperren</TabsTrigger>
          <TabsTrigger value="recurring">Wiederkehrend</TabsTrigger>
        </TabsList>

        {/* Wunschzeiten Tab */}
        <TabsContent value="wishes" className="space-y-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Mitarbeiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id!}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="PENDING">Ausstehend</SelectItem>
                <SelectItem value="APPROVED">Genehmigt</SelectItem>
                <SelectItem value="REJECTED">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="PREFERRED">Wunschzeit</SelectItem>
                <SelectItem value="UNAVAILABLE">Nicht verfügbar</SelectItem>
                <SelectItem value="VACATION_REQUEST">Urlaubsantrag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste */}
          <Card>
            <CardContent className="p-0">
              {filteredWishes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Keine Wunschzeiten gefunden
                </div>
              ) : (
                <div className="divide-y">
                  {filteredWishes.map(wish => {
                    const employee = getEmployee(wish.employeeId);
                    return (
                      <div key={wish.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={employee?.avatar} />
                              <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                                {employee?.firstName[0]}{employee?.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {employee?.firstName} {employee?.lastName}
                                </p>
                                <Badge variant={
                                  wish.type === 'PREFERRED' ? 'default' :
                                  wish.type === 'UNAVAILABLE' ? 'destructive' : 'secondary'
                                }>
                                  {wish.type === 'PREFERRED' ? 'Wunschzeit' :
                                   wish.type === 'UNAVAILABLE' ? 'Nicht verfügbar' : 'Urlaubsantrag'}
                                </Badge>
                                <Badge variant={
                                  wish.status === 'PENDING' ? 'outline' :
                                  wish.status === 'APPROVED' ? 'default' : 'destructive'
                                } className={
                                  wish.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''
                                }>
                                  {wish.status === 'PENDING' ? 'Ausstehend' :
                                   wish.status === 'APPROVED' ? 'Genehmigt' : 'Abgelehnt'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {wish.startDate && (
                                    <>
                                      {new Date(wish.startDate).toLocaleDateString('de-DE')}
                                      {wish.endDate && wish.endDate !== wish.startDate && (
                                        <> - {new Date(wish.endDate).toLocaleDateString('de-DE')}</>
                                      )}
                                    </>
                                  )}
                                  {wish.dayOfWeek !== undefined && (
                                    <>{dayNames[wish.dayOfWeek]} (wiederkehrend)</>
                                  )}
                                </span>
                                {!wish.allDay && wish.startTime && wish.endTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {wish.startTime} - {wish.endTime}
                                  </span>
                                )}
                              </div>
                              {wish.reason && (
                                <p className="text-sm text-gray-600 mt-2">{wish.reason}</p>
                              )}
                            </div>
                          </div>

                          {/* Aktionen */}
                          <div className="flex items-center gap-2">
                            {wish.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:bg-green-50"
                                  onClick={() => updateWishStatus(wish.id!, 'APPROVED')}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => updateWishStatus(wish.id!, 'REJECTED')}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteWish(wish.id!)}
                            >
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urlaubssperren Tab */}
        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Aktive Urlaubssperren</CardTitle>
                <Button size="sm" onClick={() => setShowBlockModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Sperre
                </Button>
              </div>
              <CardDescription>
                In diesen Zeiträumen können keine Urlaubsanträge gestellt werden
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vacationBlocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine Urlaubssperren vorhanden
                </div>
              ) : (
                <div className="space-y-4">
                  {vacationBlocks.map(block => (
                    <div
                      key={block.id}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{block.name}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {new Date(block.startDate).toLocaleDateString('de-DE')} - {' '}
                            {new Date(block.endDate).toLocaleDateString('de-DE')}
                          </div>
                          {block.reason && (
                            <p className="text-sm text-gray-600 mt-2">{block.reason}</p>
                          )}
                          {block.departments && block.departments.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {block.departments.map(dept => (
                                <Badge key={dept} variant="outline">{dept}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBlock(block);
                              setShowBlockModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteVacationBlock(block.id!)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wiederkehrende Wunschzeiten */}
        <TabsContent value="recurring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wiederkehrende Verfügbarkeiten</CardTitle>
              <CardDescription>
                Regelmäßige Wunschzeiten und Nicht-Verfügbarkeiten der Mitarbeiter
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wishTimes.filter(w => w.dateType === 'RECURRING').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine wiederkehrenden Verfügbarkeiten
                </div>
              ) : (
                <div className="space-y-4">
                  {wishTimes.filter(w => w.dateType === 'RECURRING').map(wish => {
                    const employee = getEmployee(wish.employeeId);
                    return (
                      <div key={wish.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                                {employee?.firstName[0]}{employee?.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee?.firstName} {employee?.lastName}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{dayNames[wish.dayOfWeek || 0]}</span>
                                {wish.startTime && wish.endTime && (
                                  <span>{wish.startTime} - {wish.endTime}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant={wish.type === 'PREFERRED' ? 'default' : 'destructive'}>
                            {wish.type === 'PREFERRED' ? 'Wunsch' : 'Nicht verfügbar'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Urlaubssperre Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBlock ? 'Urlaubssperre bearbeiten' : 'Neue Urlaubssperre'}
            </DialogTitle>
            <DialogDescription>
              Mitarbeiter werden beim Urlaubsantrag über diese Sperre informiert
            </DialogDescription>
          </DialogHeader>

          <VacationBlockForm
            block={selectedBlock}
            departments={Array.from(new Set(employees.map(e => e.department).filter(Boolean)))}
            onSave={saveVacationBlock}
            onCancel={() => {
              setShowBlockModal(false);
              setSelectedBlock(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Urlaubssperre Formular
interface VacationBlockFormProps {
  block: VacationBlock | null;
  departments: string[];
  onSave: (data: Partial<VacationBlock>) => void;
  onCancel: () => void;
}

function VacationBlockForm({ block, departments, onSave, onCancel }: VacationBlockFormProps) {
  const [formData, setFormData] = useState({
    name: block?.name || '',
    startDate: block?.startDate || '',
    endDate: block?.endDate || '',
    reason: block?.reason || '',
    departments: block?.departments || [],
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Bezeichnung</Label>
        <Input
          id="name"
          placeholder="z.B. Weihnachten, Inventur"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Von</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="endDate">Bis</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="reason">Begründung</Label>
        <Textarea
          id="reason"
          placeholder="Warum ist in diesem Zeitraum kein Urlaub möglich?"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
        />
      </div>

      <div>
        <Label>Betroffene Abteilungen</Label>
        <p className="text-xs text-gray-500 mb-2">Leer lassen für alle Abteilungen</p>
        <div className="space-y-2">
          {departments.map(dept => (
            <div key={dept} className="flex items-center gap-2">
              <Checkbox
                id={`dept-${dept}`}
                checked={formData.departments.includes(dept)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({ ...prev, departments: [...prev.departments, dept] }));
                  } else {
                    setFormData(prev => ({ ...prev, departments: prev.departments.filter(d => d !== dept) }));
                  }
                }}
              />
              <label htmlFor={`dept-${dept}`} className="text-sm">{dept}</label>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          onClick={() => onSave(formData)}
          className="bg-[#14ad9f] hover:bg-[#14ad9f]/90"
          disabled={!formData.name || !formData.startDate || !formData.endDate}
        >
          Speichern
        </Button>
      </DialogFooter>
    </div>
  );
}

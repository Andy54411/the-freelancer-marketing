'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RefreshCcw,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  Calendar,
  Pause,
  Play,
  Filter,
  TrendingUp,
  CalendarDays,
  Euro,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { collection, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { format, addMonths, addWeeks, addDays, addYears } from 'date-fns';
import { de } from 'date-fns/locale';

interface RecurringExpense {
  id: string;
  name: string;
  description?: string;
  amount: number;
  vatRate: number;
  category: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  nextDueDate: Date;
  lastExecuted?: Date;
  status: 'active' | 'paused' | 'cancelled';
  supplier?: string;
  accountingCategory?: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface FormData {
  name: string;
  description: string;
  amount: string;
  vatRate: string;
  category: string;
  interval: RecurringExpense['interval'];
  startDate: string;
  supplier: string;
  accountingCategory: string;
  notes: string;
}

const INTERVAL_LABELS: Record<RecurringExpense['interval'], string> = {
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  quarterly: 'Vierteljährlich',
  yearly: 'Jährlich',
};

const CATEGORIES = [
  'Miete & Nebenkosten',
  'Versicherungen',
  'Software & Lizenzen',
  'Telekommunikation',
  'Leasing',
  'Abonnements',
  'Wartung',
  'Buchhaltung & Steuerberatung',
  'Marketing',
  'Personal',
  'Sonstiges',
];

const STATUS_CONFIG = {
  active: { label: 'Aktiv', color: 'bg-green-100 text-green-800' },
  paused: { label: 'Pausiert', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Beendet', color: 'bg-gray-100 text-gray-800' },
};

export default function RecurringExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog-States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);
  const [saving, setSaving] = useState(false);

  const initialFormData: FormData = {
    name: '',
    description: '',
    amount: '',
    vatRate: '19',
    category: '',
    interval: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    accountingCategory: '',
    notes: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return format(d, 'dd.MM.yyyy', { locale: de });
  };

  const calculateNextDueDate = (startDate: Date, interval: RecurringExpense['interval']): Date => {
    const today = new Date();
    let nextDate = new Date(startDate);

    while (nextDate <= today) {
      switch (interval) {
        case 'daily':
          nextDate = addDays(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'quarterly':
          nextDate = addMonths(nextDate, 3);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
      }
    }

    return nextDate;
  };

  // Wiederkehrende Ausgaben laden
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const expensesRef = collection(db, 'companies', uid, 'recurringExpenses');
      const snapshot = await getDocs(expensesRef);

      const data: RecurringExpense[] = snapshot.docs.map(doc => {
        const d = doc.data();
        const startDate = d.startDate?.toDate ? d.startDate.toDate() : new Date(d.startDate);
        return {
          id: doc.id,
          name: d.name || '',
          description: d.description,
          amount: d.amount || 0,
          vatRate: d.vatRate || 19,
          category: d.category || 'Sonstiges',
          interval: d.interval || 'monthly',
          startDate,
          nextDueDate: d.nextDueDate?.toDate
            ? d.nextDueDate.toDate()
            : calculateNextDueDate(startDate, d.interval || 'monthly'),
          lastExecuted: d.lastExecuted?.toDate ? d.lastExecuted.toDate() : undefined,
          status: d.status || 'active',
          supplier: d.supplier,
          accountingCategory: d.accountingCategory,
          notes: d.notes,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : undefined,
        };
      });

      // Sortierung nach nächstem Fälligkeitsdatum
      data.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

      setExpenses(data);
    } catch (error) {
      toast.error('Fehler beim Laden der wiederkehrenden Ausgaben');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid && user) {
      loadExpenses();
    }
  }, [uid, user]);

  // Filtern
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.supplier && e.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Statistiken
  const activeExpenses = expenses.filter(e => e.status === 'active');
  const monthlyTotal = activeExpenses
    .filter(e => e.interval === 'monthly')
    .reduce((sum, e) => sum + e.amount, 0);
  const yearlyEstimate = activeExpenses.reduce((sum, e) => {
    switch (e.interval) {
      case 'daily':
        return sum + e.amount * 365;
      case 'weekly':
        return sum + e.amount * 52;
      case 'monthly':
        return sum + e.amount * 12;
      case 'quarterly':
        return sum + e.amount * 4;
      case 'yearly':
        return sum + e.amount;
      default:
        return sum;
    }
  }, 0);

  // Speichern (nur für Bearbeitung - Erstellung erfolgt über /create Seite)
  const handleSave = async () => {
    if (!selectedExpense) {
      toast.error('Keine Ausgabe zum Bearbeiten ausgewählt');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    try {
      setSaving(true);
      const startDate = new Date(formData.startDate);
      const nextDueDate = calculateNextDueDate(startDate, formData.interval);

      const expenseData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        amount: parseFloat(formData.amount),
        vatRate: parseFloat(formData.vatRate),
        category: formData.category || 'Sonstiges',
        interval: formData.interval,
        startDate: Timestamp.fromDate(startDate),
        nextDueDate: Timestamp.fromDate(nextDueDate),
        status: 'active' as const,
        supplier: formData.supplier.trim() || null,
        accountingCategory: formData.accountingCategory.trim() || null,
        notes: formData.notes.trim() || null,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'companies', uid, 'recurringExpenses', selectedExpense.id), expenseData);
      toast.success('Wiederkehrende Ausgabe aktualisiert');

      setIsEditOpen(false);
      setFormData(initialFormData);
      setSelectedExpense(null);
      loadExpenses();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Status ändern
  const handleStatusChange = async (expense: RecurringExpense, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'companies', uid, 'recurringExpenses', expense.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Status auf "${STATUS_CONFIG[newStatus].label}" geändert`);
      loadExpenses();
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    }
  };

  // Löschen
  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      await deleteDoc(doc(db, 'companies', uid, 'recurringExpenses', selectedExpense.id));
      toast.success('Wiederkehrende Ausgabe gelöscht');
      setIsDeleteOpen(false);
      setSelectedExpense(null);
      loadExpenses();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Bearbeiten öffnen
  const openEdit = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setFormData({
      name: expense.name,
      description: expense.description || '',
      amount: expense.amount.toString(),
      vatRate: expense.vatRate.toString(),
      category: expense.category,
      interval: expense.interval,
      startDate: format(expense.startDate, 'yyyy-MM-dd'),
      supplier: expense.supplier || '',
      accountingCategory: expense.accountingCategory || '',
      notes: expense.notes || '',
    });
    setIsEditOpen(true);
  };

  // Autorisierung prüfen
  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500">Keine Berechtigung</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCcw className="h-6 w-6 text-[#14ad9f]" />
            Wiederkehrende Ausgaben
          </h1>
          <p className="text-gray-500 mt-1">
            Verwalten Sie Ihre regelmäßigen Kosten und Abonnements
          </p>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/company/${uid}/finance/expenses/create?type=wiederkehrend`)}
          className="bg-[#14ad9f] hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue wiederkehrende Ausgabe
        </Button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aktive Ausgaben</p>
                <p className="text-2xl font-bold text-gray-900">{activeExpenses.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <RefreshCcw className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monatliche Kosten</p>
                <p className="text-2xl font-bold text-[#14ad9f]">{formatCurrency(monthlyTotal)}</p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-[#14ad9f]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Jährliche Schätzung</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(yearlyEstimate)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pausiert</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {expenses.filter(e => e.status === 'paused').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Pause className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter und Suche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Suche nach Name, Lieferant..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="paused">Pausiert</SelectItem>
                <SelectItem value="cancelled">Beendet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine wiederkehrenden Ausgaben
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Keine Ergebnisse für Ihre Filter'
                  : 'Erfassen Sie Ihre regelmäßigen Kosten'}
              </p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <Button
                  onClick={() => router.push(`/dashboard/company/${uid}/finance/expenses/create?type=wiederkehrend`)}
                  className="bg-[#14ad9f] hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Erste wiederkehrende Ausgabe
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Intervall</TableHead>
                  <TableHead>Nächste Fälligkeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map(expense => (
                  <TableRow key={expense.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.name}</p>
                        {expense.supplier && (
                          <p className="text-sm text-gray-500">{expense.supplier}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{INTERVAL_LABELS[expense.interval]}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(expense.nextDueDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[expense.status].color}>
                        {STATUS_CONFIG[expense.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(expense)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {expense.status === 'active' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(expense, 'paused')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pausieren
                            </DropdownMenuItem>
                          )}
                          {expense.status === 'paused' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(expense, 'active')}>
                              <Play className="h-4 w-4 mr-2" />
                              Aktivieren
                            </DropdownMenuItem>
                          )}
                          {expense.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(expense, 'cancelled')}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Beenden
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExpense(expense);
                              setIsDeleteOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - nur für Bearbeitung */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditOpen(false);
          setSelectedExpense(null);
          setFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Wiederkehrende Ausgabe bearbeiten
            </DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die wiederkehrende Ausgabe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Büromiete, Adobe CC"
                />
              </div>

              <div>
                <Label htmlFor="amount">Betrag (brutto) *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vatRate">MwSt.-Satz</Label>
                <Select
                  value={formData.vatRate}
                  onValueChange={value => setFormData(prev => ({ ...prev, vatRate: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="19">19%</SelectItem>
                    <SelectItem value="7">7%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interval">Intervall</Label>
                <Select
                  value={formData.interval}
                  onValueChange={value => setFormData(prev => ({ ...prev, interval: value as RecurringExpense['interval'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Täglich</SelectItem>
                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                    <SelectItem value="monthly">Monatlich</SelectItem>
                    <SelectItem value="quarterly">Vierteljährlich</SelectItem>
                    <SelectItem value="yearly">Jährlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Startdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="supplier">Lieferant/Anbieter</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="z.B. Vermieter GmbH"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Beschreibung..."
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Interne Notizen..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedExpense(null);
                setFormData(initialFormData);
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wiederkehrende Ausgabe löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie die wiederkehrende Ausgabe &quot;{selectedExpense?.name}&quot; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

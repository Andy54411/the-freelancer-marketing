'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  Edit,
  Trash2,
  X,
  Mail,
  Download,
  MoreHorizontal,
  Filter,
  Search,
  DollarSign,
  FileText,
  Truck,
  CheckCircle,
  Send,
  Copy,
  Play,
  Pause,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

// Document Types
export type DocumentType = 
  | 'invoice' 
  | 'quote' 
  | 'order-confirmation' 
  | 'delivery-note' 
  | 'recurring-invoice' 
  | 'reminder' 
  | 'credit';

// Generic Document Interface
export interface DocumentItem {
  id: string;
  number?: string;
  invoiceNumber?: string;
  quoteNumber?: string;
  deliveryNoteNumber?: string;
  confirmationNumber?: string;
  reminderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  date?: string | Date;
  issueDate?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  dueDate?: string;
  validUntil?: string | Date;
  deliveryDate?: string;
  status: string;
  amount?: number;
  total?: number;
  subtotal?: number;
  tax?: number;
  items?: any[];
  isStorno?: boolean;
  // Recurring specific
  recurringStatus?: string;
  recurringInterval?: string;
  recurringNextExecutionDate?: string;
  title?: string;
  // Reminder specific
  reminderLevel?: number;
  outstandingAmount?: number;
  daysPastDue?: number;
  // Quote specific
  customerOrderNumber?: string;
}

// Tab Configuration
interface TabConfig {
  id: string;
  label: string;
  filterFn: (doc: DocumentItem) => boolean;
  locked?: boolean;
}

// Column Configuration
interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render: (doc: DocumentItem) => React.ReactNode;
}

// Action Configuration
interface ActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (doc: DocumentItem) => void;
  showCondition?: (doc: DocumentItem) => boolean;
  className?: string;
}

interface DocumentListViewProps {
  documents: DocumentItem[];
  documentType: DocumentType;
  companyId: string;
  basePath: string;
  onRefresh?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  customActions?: ActionConfig[];
  onMarkAsPaid?: (doc: DocumentItem) => void;
  onCreateStorno?: (doc: DocumentItem) => void;
  onSendEmail?: (doc: DocumentItem) => void;
  onConvertToInvoice?: (doc: DocumentItem) => void;
  onMarkAsDelivered?: (doc: DocumentItem) => void;
  onMarkAsSent?: (doc: DocumentItem) => void;
  onPauseResume?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  onDuplicate?: (doc: DocumentItem) => void;
}

// Document Type Configurations
const documentConfigs: Record<DocumentType, {
  title: string;
  tabs: TabConfig[];
  columns: ColumnConfig[];
  numberField: string;
  statusConfig: Record<string, { label: string; className: string }>;
}> = {
  invoice: {
    title: 'Rechnungen',
    numberField: 'invoiceNumber',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'draft', label: 'Entwurf', filterFn: (d) => d.status === 'draft' },
      { id: 'open', label: 'Offen', filterFn: (d) => ['sent', 'finalized'].includes(d.status) && !isOverdue(d) },
      { id: 'overdue', label: 'Fällig', filterFn: (d) => ['sent', 'finalized'].includes(d.status) && isOverdue(d) },
      { id: 'finalized', label: 'Festgeschrieben', filterFn: (d) => d.status === 'finalized' },
      { id: 'paid', label: 'Bezahlt', filterFn: (d) => d.status === 'paid', locked: true },
      { id: 'partial', label: 'Teilbezahlt', filterFn: () => false, locked: true },
      { id: 'cancelled', label: 'Storno', filterFn: (d) => ['cancelled', 'storno'].includes(d.status), locked: true },
      { id: 'recurring', label: 'Wiederkehrend', filterFn: () => false, locked: true },
    ],
    columns: [],
    statusConfig: {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      finalized: { label: 'Offen', className: 'bg-blue-100 text-blue-800' },
      sent: { label: 'Offen', className: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      overdue: { label: 'Fällig', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Storno', className: 'bg-gray-100 text-gray-800' },
      storno: { label: 'Storno', className: 'bg-red-100 text-red-800' },
    },
  },
  quote: {
    title: 'Angebote',
    numberField: 'number',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'draft', label: 'Entwurf', filterFn: (d) => d.status === 'draft' },
      { id: 'sent', label: 'Versendet', filterFn: (d) => d.status === 'sent' },
      { id: 'accepted', label: 'Angenommen', filterFn: (d) => d.status === 'accepted' },
      { id: 'expired', label: 'Abgelaufen', filterFn: (d) => isExpired(d) },
      { id: 'cancelled', label: 'Storniert', filterFn: (d) => d.status === 'cancelled' },
    ],
    columns: [],
    statusConfig: {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Angenommen', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Abgelehnt', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Storniert', className: 'bg-gray-100 text-gray-800' },
      expired: { label: 'Abgelaufen', className: 'bg-red-100 text-red-800' },
    },
  },
  'order-confirmation': {
    title: 'Auftragsbestätigungen',
    numberField: 'confirmationNumber',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'draft', label: 'Entwurf', filterFn: (d) => d.status === 'draft' },
      { id: 'sent', label: 'Gesendet', filterFn: (d) => d.status === 'sent' },
      { id: 'confirmed', label: 'Bestätigt', filterFn: (d) => d.status === 'confirmed' },
      { id: 'cancelled', label: 'Storniert', filterFn: (d) => d.status === 'cancelled' },
    ],
    columns: [],
    statusConfig: {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Gesendet', className: 'bg-blue-100 text-blue-800' },
      confirmed: { label: 'Bestätigt', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Storniert', className: 'bg-red-100 text-red-800' },
    },
  },
  'delivery-note': {
    title: 'Lieferscheine',
    numberField: 'deliveryNoteNumber',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'draft', label: 'Entwurf', filterFn: (d) => d.status === 'draft' },
      { id: 'sent', label: 'Versendet', filterFn: (d) => d.status === 'sent' },
      { id: 'delivered', label: 'Zugestellt', filterFn: (d) => d.status === 'delivered' },
      { id: 'invoiced', label: 'Fakturiert', filterFn: (d) => d.status === 'invoiced' },
      { id: 'cancelled', label: 'Storniert', filterFn: (d) => d.status === 'cancelled' },
    ],
    columns: [],
    statusConfig: {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      delivered: { label: 'Zugestellt', className: 'bg-green-100 text-green-800' },
      invoiced: { label: 'Fakturiert', className: 'bg-purple-100 text-purple-800' },
      cancelled: { label: 'Storniert', className: 'bg-gray-100 text-gray-800' },
    },
  },
  'recurring-invoice': {
    title: 'Wiederkehrende Rechnungen',
    numberField: 'number',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'active', label: 'Aktiv', filterFn: (d) => d.recurringStatus === 'active' },
      { id: 'paused', label: 'Pausiert', filterFn: (d) => d.recurringStatus === 'paused' },
      { id: 'completed', label: 'Abgeschlossen', filterFn: (d) => d.recurringStatus === 'completed' },
    ],
    columns: [],
    statusConfig: {
      active: { label: 'Aktiv', className: 'bg-green-100 text-green-800' },
      paused: { label: 'Pausiert', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Abgeschlossen', className: 'bg-gray-100 text-gray-800' },
    },
  },
  reminder: {
    title: 'Mahnungen',
    numberField: 'number',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'draft', label: 'Entwurf', filterFn: (d) => d.status === 'draft' },
      { id: 'sent', label: 'Versendet', filterFn: (d) => d.status === 'sent' },
      { id: 'paid', label: 'Bezahlt', filterFn: (d) => d.status === 'paid' },
      { id: 'escalated', label: 'Eskaliert', filterFn: (d) => d.status === 'escalated' },
    ],
    columns: [],
    statusConfig: {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      escalated: { label: 'Eskaliert', className: 'bg-red-100 text-red-800' },
    },
  },
  credit: {
    title: 'Stornorechnungen',
    numberField: 'invoiceNumber',
    tabs: [
      { id: 'all', label: 'Alle', filterFn: () => true },
      { id: 'draft', label: 'Entwurf', filterFn: (d) => d.status === 'draft' },
      { id: 'sent', label: 'Versendet', filterFn: (d) => d.status === 'sent' },
      { id: 'finalized', label: 'Abgeschlossen', filterFn: (d) => d.status === 'finalized' || d.status === 'paid' },
    ],
    columns: [],
    statusConfig: {
      draft: { label: 'Entwurf', className: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Versendet', className: 'bg-blue-100 text-blue-800' },
      finalized: { label: 'Abgeschlossen', className: 'bg-green-100 text-green-800' },
      processed: { label: 'Verarbeitet', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Storniert', className: 'bg-red-100 text-red-800' },
    },
  },
};

// Helper functions
function isOverdue(doc: DocumentItem): boolean {
  if (doc.status === 'paid') return false;
  const dueDate = new Date(doc.dueDate || doc.validUntil || 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function isExpired(doc: DocumentItem): boolean {
  const validUntil = new Date(doc.validUntil || doc.dueDate || 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  validUntil.setHours(0, 0, 0, 0);
  return validUntil < today && doc.status !== 'accepted';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE');
}

function getDocumentNumber(doc: DocumentItem, type: DocumentType): string {
  switch (type) {
    case 'invoice':
    case 'credit':
      return doc.invoiceNumber || doc.number || (doc.status === 'draft' ? 'Entwurf' : `DOK-${doc.id.substring(0, 8)}`);
    case 'quote':
      return doc.number || doc.quoteNumber || 'Ohne Nummer';
    case 'order-confirmation':
      return doc.confirmationNumber || doc.number || 'Ohne Nummer';
    case 'delivery-note':
      return doc.deliveryNoteNumber || doc.number || (doc.status === 'draft' ? 'Entwurf' : `LS-${doc.id.substring(0, 8)}`);
    case 'recurring-invoice':
      return doc.title || doc.number || 'Abo-Rechnung';
    case 'reminder':
      return doc.number || doc.reminderNumber || `M${doc.reminderLevel || 1}-${doc.id.substring(0, 6)}`;
    default:
      return doc.number || doc.id;
  }
}

function getDueDateText(dueDate: string | undefined, status: string): string {
  if (status === 'paid') return 'Bezahlt';
  if (!dueDate) return '-';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Fällig';
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Morgen';
  return `In ${diffDays} Tagen`;
}

export function DocumentListView({
  documents: initialDocuments,
  documentType,
  companyId,
  basePath,
  onRefresh,
  activeTab,
  setActiveTab,
  showFilters,
  setShowFilters,
  onMarkAsPaid,
  onCreateStorno,
  onSendEmail,
  onConvertToInvoice,
  onMarkAsDelivered,
  onMarkAsSent,
  onPauseResume,
  onDelete,
  onDuplicate,
}: DocumentListViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  const config = documentConfigs[documentType];

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (doc: DocumentItem) => {
    let status = doc.status;
    
    // Special handling for recurring invoices
    if (documentType === 'recurring-invoice') {
      status = doc.recurringStatus || 'active';
    }
    
    // Check for overdue
    if (['invoice', 'quote'].includes(documentType) && isOverdue(doc) && !['paid', 'accepted'].includes(status)) {
      status = documentType === 'quote' ? 'expired' : 'overdue';
    }

    const statusCfg = config.statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={statusCfg.className}>
        {statusCfg.label}
      </Badge>
    );
  };

  const handleView = (doc: DocumentItem) => {
    router.push(`${basePath}/${doc.id}`);
  };

  const handleEdit = (doc: DocumentItem) => {
    router.push(`${basePath}/${doc.id}/edit`);
  };

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      // Tab filter
      const tabConfig = config.tabs.find(t => t.id === activeTab);
      if (tabConfig && !tabConfig.filterFn(doc)) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const docNumber = getDocumentNumber(doc, documentType).toLowerCase();
        const customerName = (doc.customerName || '').toLowerCase();
        if (!docNumber.includes(searchLower) && !customerName.includes(searchLower)) {
          return false;
        }
      }

      // Amount filter
      const amount = doc.total || doc.amount || 0;
      if (minAmount && amount < parseFloat(minAmount)) return false;
      if (maxAmount && amount > parseFloat(maxAmount)) return false;

      // Date filter
      const docDate = new Date(doc.date || doc.createdAt || 0);
      if (startDate && docDate < new Date(startDate)) return false;
      if (endDate && docDate > new Date(endDate)) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      const aDate = new Date(a.date || a.createdAt || 0).getTime();
      const bDate = new Date(b.date || b.createdAt || 0).getTime();
      const aDue = new Date(a.dueDate || a.validUntil || 0).getTime();
      const bDue = new Date(b.dueDate || b.validUntil || 0).getTime();

      switch (sortField) {
        case 'dueDate':
        case 'validUntil':
          comparison = aDue - bDue;
          break;
        case 'number':
          comparison = getDocumentNumber(a, documentType).localeCompare(getDocumentNumber(b, documentType));
          break;
        case 'date':
          comparison = aDate - bDate;
          break;
        case 'amount':
          comparison = (a.total || a.amount || 0) - (b.total || b.amount || 0);
          break;
        default:
          comparison = aDate - bDate;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Calculate tab counts
  const tabsWithCounts = config.tabs.map(tab => ({
    ...tab,
    count: documents.filter(tab.filterFn).length,
  }));

  // Render table based on document type
  const renderTableHeaders = () => {
    switch (documentType) {
      case 'invoice':
      case 'credit':
        return (
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dueDate')}>
              Fälligkeit {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
              {documentType === 'credit' ? 'Stornonr.' : 'Rechnungsnr.'} {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
              Datum {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
              Betrag (netto) {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-right">Offen (brutto)</TableHead>
            <TableHead></TableHead>
          </TableRow>
        );
      case 'quote':
        return (
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
              Angebotsnr. {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
              Datum {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('validUntil')}>
              Gültig bis {sortField === 'validUntil' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
              Betrag {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        );
      case 'order-confirmation':
        return (
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
              Bestätigungsnr. {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
              Datum {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>
              Betrag {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        );
      case 'delivery-note':
        return (
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
              Lieferscheinnr. {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
              Datum {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Lieferdatum</TableHead>
            <TableHead>Positionen</TableHead>
            <TableHead></TableHead>
          </TableRow>
        );
      case 'recurring-invoice':
        return (
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
              Titel {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Intervall</TableHead>
            <TableHead>Nächste Ausführung</TableHead>
            <TableHead className="text-right">Betrag</TableHead>
            <TableHead></TableHead>
          </TableRow>
        );
      case 'reminder':
        return (
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Mahnstufe</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
              Mahnnr. {sortField === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Kunde</TableHead>
            <TableHead>Tage überfällig</TableHead>
            <TableHead className="text-right">Forderung</TableHead>
            <TableHead></TableHead>
          </TableRow>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (doc: DocumentItem) => {
    switch (documentType) {
      case 'invoice':
      case 'credit':
        return (
          <TableRow key={doc.id}>
            <TableCell>{getStatusBadge(doc)}</TableCell>
            <TableCell>
              <span className={isOverdue(doc) ? 'text-red-600' : ''}>
                {getDueDateText(doc.dueDate, doc.status)}
              </span>
            </TableCell>
            <TableCell>{getDocumentNumber(doc, documentType)}</TableCell>
            <TableCell>{doc.customerName}</TableCell>
            <TableCell>{formatDate(doc.date || doc.issueDate || doc.createdAt)}</TableCell>
            <TableCell className="text-right">{formatCurrency(doc.amount || 0)}</TableCell>
            <TableCell className="text-right">
              {doc.status === 'paid' ? '0,00 €' : formatCurrency(doc.total || 0)}
            </TableCell>
            <TableCell>{renderActions(doc)}</TableCell>
          </TableRow>
        );
      case 'quote':
        return (
          <TableRow key={doc.id}>
            <TableCell>{getStatusBadge(doc)}</TableCell>
            <TableCell>{getDocumentNumber(doc, documentType)}</TableCell>
            <TableCell>{doc.customerName}</TableCell>
            <TableCell>{formatDate(doc.date || doc.createdAt)}</TableCell>
            <TableCell>
              <span className={isExpired(doc) ? 'text-red-600 font-medium' : ''}>
                {formatDate(doc.validUntil || doc.dueDate)}
              </span>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(doc.total || 0)}</TableCell>
            <TableCell>{renderActions(doc)}</TableCell>
          </TableRow>
        );
      case 'order-confirmation':
        return (
          <TableRow key={doc.id}>
            <TableCell>{getStatusBadge(doc)}</TableCell>
            <TableCell>{getDocumentNumber(doc, documentType)}</TableCell>
            <TableCell>{doc.customerName}</TableCell>
            <TableCell>{formatDate(doc.date || doc.createdAt)}</TableCell>
            <TableCell className="text-right">{formatCurrency(doc.total || 0)}</TableCell>
            <TableCell>{renderActions(doc)}</TableCell>
          </TableRow>
        );
      case 'delivery-note':
        return (
          <TableRow key={doc.id}>
            <TableCell>{getStatusBadge(doc)}</TableCell>
            <TableCell>{getDocumentNumber(doc, documentType)}</TableCell>
            <TableCell>{doc.customerName}</TableCell>
            <TableCell>{formatDate(doc.date || doc.createdAt)}</TableCell>
            <TableCell>{formatDate(doc.deliveryDate)}</TableCell>
            <TableCell>{doc.items?.length || 0} Artikel</TableCell>
            <TableCell>{renderActions(doc)}</TableCell>
          </TableRow>
        );
      case 'recurring-invoice':
        const intervalLabels: Record<string, string> = {
          weekly: 'Wöchentlich',
          monthly: 'Monatlich',
          quarterly: 'Vierteljährlich',
          yearly: 'Jährlich',
        };
        return (
          <TableRow key={doc.id}>
            <TableCell>{getStatusBadge(doc)}</TableCell>
            <TableCell>{doc.title || getDocumentNumber(doc, documentType)}</TableCell>
            <TableCell>{doc.customerName}</TableCell>
            <TableCell>{intervalLabels[doc.recurringInterval || ''] || doc.recurringInterval}</TableCell>
            <TableCell>{formatDate(doc.recurringNextExecutionDate)}</TableCell>
            <TableCell className="text-right">{formatCurrency(doc.total || 0)}</TableCell>
            <TableCell>{renderActions(doc)}</TableCell>
          </TableRow>
        );
      case 'reminder':
        const levelLabels: Record<number, string> = {
          1: '1. Mahnung',
          2: '2. Mahnung',
          3: '3. Mahnung',
        };
        return (
          <TableRow key={doc.id}>
            <TableCell>{getStatusBadge(doc)}</TableCell>
            <TableCell>
              <Badge className={doc.reminderLevel === 3 ? 'bg-red-100 text-red-800' : doc.reminderLevel === 2 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}>
                {levelLabels[doc.reminderLevel || 1] || `${doc.reminderLevel}. Mahnung`}
              </Badge>
            </TableCell>
            <TableCell>{getDocumentNumber(doc, documentType)}</TableCell>
            <TableCell>{doc.customerName}</TableCell>
            <TableCell className="text-red-600">{doc.daysPastDue || 0} Tage</TableCell>
            <TableCell className="text-right text-red-600">{formatCurrency(doc.outstandingAmount || doc.total || 0)}</TableCell>
            <TableCell>{renderActions(doc)}</TableCell>
          </TableRow>
        );
      default:
        return null;
    }
  };

  const renderActions = (doc: DocumentItem) => {
    return (
      <div className="flex items-center gap-1">
        {/* Quick action buttons */}
        {documentType === 'invoice' && ['sent', 'finalized'].includes(doc.status) && onMarkAsPaid && (
          <Button variant="ghost" size="sm" title="Als bezahlt markieren" onClick={() => onMarkAsPaid(doc)}>
            <DollarSign className="h-4 w-4" />
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(doc)}>
              <Eye className="h-4 w-4 mr-2" />
              Anzeigen
            </DropdownMenuItem>
            
            {doc.status === 'draft' && (
              <DropdownMenuItem onClick={() => handleEdit(doc)}>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </DropdownMenuItem>
            )}

            {/* Quote specific actions */}
            {documentType === 'quote' && onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(doc)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplizieren
              </DropdownMenuItem>
            )}
            
            {documentType === 'quote' && doc.status === 'accepted' && onConvertToInvoice && (
              <DropdownMenuItem onClick={() => onConvertToInvoice(doc)}>
                <FileText className="h-4 w-4 mr-2" />
                Zu Rechnung umwandeln
              </DropdownMenuItem>
            )}

            {/* Delivery note specific actions */}
            {documentType === 'delivery-note' && doc.status === 'draft' && onMarkAsSent && (
              <DropdownMenuItem onClick={() => onMarkAsSent(doc)}>
                <Truck className="h-4 w-4 mr-2" />
                Als versendet markieren
              </DropdownMenuItem>
            )}
            
            {documentType === 'delivery-note' && doc.status === 'sent' && onMarkAsDelivered && (
              <DropdownMenuItem onClick={() => onMarkAsDelivered(doc)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Als zugestellt markieren
              </DropdownMenuItem>
            )}
            
            {documentType === 'delivery-note' && ['sent', 'delivered'].includes(doc.status) && onConvertToInvoice && (
              <DropdownMenuItem onClick={() => onConvertToInvoice(doc)}>
                <FileText className="h-4 w-4 mr-2" />
                In Rechnung umwandeln
              </DropdownMenuItem>
            )}

            {/* Recurring invoice specific actions */}
            {documentType === 'recurring-invoice' && doc.recurringStatus !== 'completed' && onPauseResume && (
              <DropdownMenuItem onClick={() => onPauseResume(doc)}>
                {doc.recurringStatus === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausieren
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Fortsetzen
                  </>
                )}
              </DropdownMenuItem>
            )}

            {/* Reminder specific actions */}
            {documentType === 'reminder' && doc.status === 'draft' && onSendEmail && (
              <DropdownMenuItem onClick={() => onSendEmail(doc)}>
                <Send className="h-4 w-4 mr-2" />
                Senden
              </DropdownMenuItem>
            )}

            {/* Invoice storno action */}
            {documentType === 'invoice' && ['sent', 'paid'].includes(doc.status) && !doc.isStorno && onCreateStorno && (
              <DropdownMenuItem onClick={() => onCreateStorno(doc)}>
                <X className="h-4 w-4 mr-2" />
                Stornieren
              </DropdownMenuItem>
            )}

            {/* Email action */}
            {['sent', 'paid', 'finalized', 'delivered'].includes(doc.status) && onSendEmail && (
              <DropdownMenuItem onClick={() => onSendEmail(doc)}>
                <Mail className="h-4 w-4 mr-2" />
                E-Mail senden
              </DropdownMenuItem>
            )}

            {/* Delete action */}
            {doc.status === 'draft' && onDelete && (
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(doc)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full h-auto p-1">
          {tabsWithCounts.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`flex-1 relative ${tab.locked ? 'opacity-50' : ''}`}
              disabled={tab.locked}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1 rounded">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportieren
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Suche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nummer oder Kontakt"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Kontakt</label>
                  <Select value={selectedContact} onValueChange={setSelectedContact}>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Kontakte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kontakte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Betrag</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Min"
                      type="number"
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value)}
                    />
                    <Input
                      placeholder="Max"
                      type="number"
                      value={maxAmount}
                      onChange={e => setMaxAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Startdatum</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Enddatum</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedContact('');
                    setMinAmount('');
                    setMaxAmount('');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Zurücksetzen
                </Button>
                <Button
                  className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                  onClick={() => setShowFilters(false)}
                >
                  Übernehmen
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                {renderTableHeaders()}
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Keine {config.title} gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map(doc => renderTableRow(doc))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

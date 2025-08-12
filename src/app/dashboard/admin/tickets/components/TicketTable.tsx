'use client';

import { useState } from 'react';
import { Ticket } from '@/types/ticket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  User,
  Calendar,
  MessageSquare,
  Edit,
  Eye,
  Trash,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface TicketTableProps {
  tickets: Ticket[];
}

export function TicketTable({ tickets }: TicketTableProps) {
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Offen';
      case 'in-progress':
        return 'In Bearbeitung';
      case 'waiting':
        return 'Wartend';
      case 'resolved':
        return 'Gelöst';
      case 'closed':
        return 'Geschlossen';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Niedrig';
      case 'medium':
        return 'Mittel';
      case 'high':
        return 'Hoch';
      case 'urgent':
        return 'Dringend';
      default:
        return priority;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'feature':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'support':
        return <User className="h-4 w-4 text-green-500" />;
      case 'payment':
      case 'billing':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'bug':
        return 'Bug/Fehler';
      case 'feature':
        return 'Feature';
      case 'support':
        return 'Support';
      case 'billing':
        return 'Abrechnung';
      case 'payment':
        return 'Zahlung';
      case 'account':
        return 'Account';
      case 'technical':
        return 'Technisch';
      case 'feedback':
        return 'Feedback';
      case 'other':
        return 'Sonstiges';
      default:
        return category;
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Tickets gefunden</h3>
        <p className="text-gray-500">
          Es gibt derzeit keine Tickets, die Ihren Filterkriterien entsprechen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={selectedTickets.length === tickets.length}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedTickets(tickets.map(t => t.id));
                  } else {
                    setSelectedTickets([]);
                  }
                }}
                className="rounded border-gray-300"
              />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Titel</TableHead>
            <TableHead>Kategorie</TableHead>
            <TableHead>Priorität</TableHead>
            <TableHead>Zugewiesen</TableHead>
            <TableHead>Erstellt</TableHead>
            <TableHead>Kommentare</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map(ticket => (
            <TableRow
              key={ticket.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                // Hier würde die Navigation zum Ticket-Detail stehen
                console.log('Öffne Ticket:', ticket.id);
              }}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedTickets.includes(ticket.id)}
                  onChange={e => {
                    e.stopPropagation();
                    if (e.target.checked) {
                      setSelectedTickets([...selectedTickets, ticket.id]);
                    } else {
                      setSelectedTickets(selectedTickets.filter(id => id !== ticket.id));
                    }
                  }}
                  className="rounded border-gray-300"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  <span className="text-sm font-medium">{getStatusText(ticket.status)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <div className="font-medium text-gray-900 truncate">{ticket.title}</div>
                  <div className="text-sm text-gray-500 truncate">{ticket.description}</div>
                  {ticket.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {ticket.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {ticket.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{ticket.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(ticket.category)}
                  <span className="text-sm">{getCategoryText(ticket.category)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {getPriorityText(ticket.priority)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 truncate max-w-24">
                    {ticket.assignedTo ? ticket.assignedTo.split('@')[0] : 'Nicht zugewiesen'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(ticket.createdAt, {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{ticket.comments.length}</span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      Anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

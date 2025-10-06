'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText,
  Clock,
  User,
  Building2,
  Loader2,
  Plus,
  CalendarDays,
  Briefcase,
  Activity,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  Trash2
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';
import CompanyCalendar, { CompanyCalendarRef } from '@/components/CompanyCalendar';
import WorkspaceManager from '@/components/workspace/WorkspaceManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  where,
  getDocs 
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CustomerHistoryTabProps {
  customer: Customer;
}

interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'document' | 'system' | 'invoice' | 'note';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  userId?: string;
  metadata?: any;
}

interface ActivityStats {
  calls: number;
  emails: number;
  meetings: number;
  documents: number;
}

export function CustomerHistoryTab({ customer }: CustomerHistoryTabProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ActivityStats>({
    calls: 0,
    emails: 0,
    meetings: 0,
    documents: 0
  });
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddCall, setShowAddCall] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newCallNote, setNewCallNote] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);
  
  // Calendar Event Modal State
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>();
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);
  const calendarRef = useRef<CompanyCalendarRef>(null);

  // Load activities and calendar events from Firebase
  useEffect(() => {
    if (!customer?.id || !customer?.companyId) return;

    setLoading(true);
    let activitiesUnsubscribe: (() => void) | undefined;
    let calendarUnsubscribe: (() => void) | undefined;
    let documentsUnsubscribe: (() => void) | undefined;

    // Load documents
    const documentsRef = collection(
      db,
      'companies',
      customer.companyId,
      'customers',
      customer.id,
      'documents'
    );
    const documentsQuery = query(documentsRef, orderBy('uploadedAt', 'desc'));
    
    documentsUnsubscribe = onSnapshot(documentsQuery, (snapshot) => {
      const loadedDocuments: any[] = [];
      snapshot.forEach((doc) => {
        loadedDocuments.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setDocuments(loadedDocuments);
    });

    // Load activities
    const activitiesRef = collection(
      db, 
      'companies', 
      customer.companyId, 
      'customers', 
      customer.id, 
      'activities'
    );
    const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));

    activitiesUnsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const loadedActivities: ActivityItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedActivities.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as ActivityItem);
      });
      setActivities(loadedActivities);
    }, (error) => {
      console.error('Error loading activities:', error);
      toast.error('Fehler beim Laden des Aktivitätsverlaufs');
    });

    // Load calendar events for this customer
    const calendarEventsRef = collection(db, 'companies', customer.companyId, 'calendar_events');
    const calendarQuery = query(
      calendarEventsRef, 
      where('customerId', '==', customer.id),
      orderBy('createdAt', 'desc')
    );

    calendarUnsubscribe = onSnapshot(calendarQuery, (snapshot) => {
      const loadedEvents: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedEvents.push({
          id: doc.id,
          ...data,
        });
      });
      setCalendarEvents(loadedEvents);
    }, (error) => {
      console.error('Error loading calendar events:', error);
    });

    // Initial system activity if no activities exist
    createInitialSystemActivity();

    return () => {
      if (activitiesUnsubscribe) activitiesUnsubscribe();
      if (calendarUnsubscribe) calendarUnsubscribe();
      if (documentsUnsubscribe) documentsUnsubscribe();
    };
  }, [customer?.id, customer?.companyId]);

  // Calculate stats when activities or calendar events change
  useEffect(() => {
    calculateStats(activities, calendarEvents);
    setLoading(false);
  }, [activities, calendarEvents]);

  const calculateStats = (activityList: ActivityItem[], eventList: any[] = []) => {
    // Count activities
    const activityCalls = activityList.filter(a => a.type === 'call').length;
    const activityEmails = activityList.filter(a => a.type === 'email').length;
    const activityMeetings = activityList.filter(a => a.type === 'meeting').length;
    const activityDocuments = activityList.filter(a => ['document', 'note'].includes(a.type)).length;

    // Count calendar events by type
    const calendarMeetings = eventList.filter(e => ['meeting', 'appointment'].includes(e.eventType)).length;
    const calendarCalls = eventList.filter(e => e.eventType === 'call').length;

    const newStats = {
      calls: activityCalls + calendarCalls,
      emails: activityEmails,
      meetings: activityMeetings + calendarMeetings,
      documents: activityDocuments + documents.length, // Echte Dokumente hinzufügen
    };
    setStats(newStats);
  };

  // Calendar Event Handlers
  const handleCalendarDateClick = (date: Date) => {
    setSelectedCalendarDate(date);
    setSelectedCalendarEvent(null);
    setCalendarModalOpen(true);
  };

  const handleCalendarEventClick = (event: any) => {
    setSelectedCalendarEvent(event);
    setSelectedCalendarDate(undefined);
    setCalendarModalOpen(true);
  };

  const handleCalendarEventSaved = (event: any) => {
    setCalendarModalOpen(false);
    toast.success('Termin wurde erfolgreich gespeichert');
    // Refresh calendar to show new/updated event
    if (calendarRef.current) {
      calendarRef.current.refreshEvents();
    }
  };

  const handleCalendarEventDeleted = (eventId: string) => {
    setCalendarModalOpen(false);
    toast.success('Termin wurde gelöscht');
    // Refresh calendar to remove deleted event
    if (calendarRef.current) {
      calendarRef.current.refreshEvents();
    }
  };

  const createInitialSystemActivity = async () => {
    if (!customer?.id || !customer?.companyId) return;

    // Check if there are already activities
    const activitiesRef = collection(
      db, 
      'companies', 
      customer.companyId, 
      'customers', 
      customer.id, 
      'activities'
    );
    
    try {
      const snapshot = await getDocs(activitiesRef);
      if (snapshot.empty) {
        // Create initial system activity
        await addDoc(activitiesRef, {
          type: 'system',
          title: 'Kunde erstellt',
          description: `Kunde ${customer.customerNumber} wurde im System angelegt`,
          timestamp: customer.createdAt ? new Date(customer.createdAt) : serverTimestamp(),
          user: 'System',
          userId: 'system'
        });
      }
    } catch (error) {
      console.error('Error creating initial activity:', error);
    }
  };

  const addActivity = async (type: ActivityItem['type'], title: string, description: string) => {
    if (!customer?.id || !customer?.companyId || !user) return;

    setAddingActivity(true);
    try {
      const activitiesRef = collection(
        db, 
        'companies', 
        customer.companyId, 
        'customers', 
        customer.id, 
        'activities'
      );

      await addDoc(activitiesRef, {
        type,
        title,
        description,
        timestamp: serverTimestamp(),
        user: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt',
        userId: user.uid
      });

      toast.success('Aktivität wurde hinzugefügt');
      setNewNote('');
      setNewCallNote('');
      setShowAddNote(false);
      setShowAddCall(false);
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Fehler beim Hinzufügen der Aktivität');
    } finally {
      setAddingActivity(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addActivity('note', 'Notiz hinzugefügt', newNote.trim());
  };

  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallNote.trim()) return;
    await addActivity('call', 'Telefonanruf protokolliert', newCallNote.trim());
  };

  const getActivityIcon = (type: ActivityItem['type'], metadata?: any) => {
    // Spezielle Icons für Angebots-bezogene Aktivitäten basierend auf actionType
    if (metadata?.quoteId || metadata?.quoteNumber) {
      switch (metadata?.actionType) {
        case 'created': return <Plus className="h-4 w-4" />;
        case 'updated': return <Edit className="h-4 w-4" />;
        case 'sent': return <Send className="h-4 w-4" />;
        case 'accepted': return <CheckCircle className="h-4 w-4" />;
        case 'rejected': return <XCircle className="h-4 w-4" />;
        case 'deleted': return <Trash2 className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
      }
    }

    // Spezielle Icons für Rechnungs-bezogene Aktivitäten basierend auf actionType
    if (metadata?.invoiceId || metadata?.invoiceNumber) {
      switch (metadata?.actionType) {
        case 'created': return <Plus className="h-4 w-4" />;
        case 'updated': return <Edit className="h-4 w-4" />;
        case 'sent': return <Send className="h-4 w-4" />;
        case 'paid': return <CheckCircle className="h-4 w-4" />;
        case 'overdue': return <Clock className="h-4 w-4" />;
        case 'cancelled': return <XCircle className="h-4 w-4" />;
        case 'deleted': return <Trash2 className="h-4 w-4" />;
        case 'storno': return <XCircle className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
      }
    }
    
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'system': return <Building2 className="h-4 w-4" />;
      case 'invoice': return <FileText className="h-4 w-4" />;
      case 'note': return <MessageSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type'], metadata?: any) => {
    // Spezielle Farben für Angebots-bezogene Aktivitäten basierend auf actionType
    if (metadata?.quoteId || metadata?.quoteNumber) {
      switch (metadata?.actionType) {
        case 'created': return 'bg-blue-500';
        case 'updated': return 'bg-yellow-500';
        case 'sent': return 'bg-indigo-500';
        case 'accepted': return 'bg-green-500';
        case 'rejected': return 'bg-red-500';
        case 'deleted': return 'bg-gray-500';
        default: return 'bg-indigo-500'; // Default für Angebote
      }
    }

    // Spezielle Farben für Rechnungs-bezogene Aktivitäten basierend auf actionType
    if (metadata?.invoiceId || metadata?.invoiceNumber) {
      switch (metadata?.actionType) {
        case 'created': return 'bg-emerald-500';
        case 'updated': return 'bg-amber-500';
        case 'sent': return 'bg-blue-500';
        case 'paid': return 'bg-green-600';
        case 'overdue': return 'bg-orange-500';
        case 'cancelled': return 'bg-red-500';
        case 'deleted': return 'bg-gray-500';
        case 'storno': return 'bg-red-600';
        default: return 'bg-emerald-500'; // Default für Rechnungen
      }
    }
    
    switch (type) {
      case 'call': return 'bg-blue-500';
      case 'email': return 'bg-green-500';
      case 'meeting': return 'bg-purple-500';
      case 'document': return 'bg-orange-500';
      case 'system': return 'bg-[#14ad9f]';
      case 'invoice': return 'bg-red-500';
      case 'note': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vor wenigen Minuten';
    if (diffInHours < 24) return `Vor ${diffInHours} Stunden`;
    if (diffInHours < 48) return 'Gestern';
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Kombiniere Activities und Calendar Events in einer Timeline
  const getCombinedTimeline = () => {
    const combinedItems: (ActivityItem & { source: 'activity' | 'calendar' })[] = [];

    // Activities hinzufügen
    activities.forEach(activity => {
      combinedItems.push({
        ...activity,
        source: 'activity' as const
      });
    });

    // Calendar Events als Activities hinzufügen
    calendarEvents.forEach(event => {
      const eventDate = event.createdAt ? event.createdAt.toDate() : new Date(event.startDate);
      combinedItems.push({
        id: event.id,
        type: 'meeting' as const,
        title: `Termin: ${event.title}`,
        description: event.description || `${event.eventType} am ${new Date(event.startDate).toLocaleDateString('de-DE')} um ${event.startTime}`,
        timestamp: eventDate,
        user: 'Kalendersystem',
        userId: event.createdBy,
        source: 'calendar' as const,
        metadata: event
      });
    });

    // Sortiere nach timestamp (neueste zuerst)
    return combinedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="activities" 
            className="flex items-center gap-2 data-[state=active]:bg-[#14ad9f] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Activity className="h-4 w-4" />
            Aktivitäten
          </TabsTrigger>
          <TabsTrigger 
            value="calendar" 
            className="flex items-center gap-2 data-[state=active]:bg-[#14ad9f] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <CalendarDays className="h-4 w-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger 
            value="workspace" 
            className="flex items-center gap-2 data-[state=active]:bg-[#14ad9f] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Briefcase className="h-4 w-4" />
            Workspace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="mt-6">
          <div className="space-y-6">
            {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#14ad9f]" />
              <div>
                <p className="text-sm text-gray-600">Anrufe</p>
                <p className="text-lg font-semibold">{stats.calls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#14ad9f]" />
              <div>
                <p className="text-sm text-gray-600">E-Mails</p>
                <p className="text-lg font-semibold">{stats.emails}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#14ad9f]" />
              <div>
                <p className="text-sm text-gray-600">Termine</p>
                <p className="text-lg font-semibold">{stats.meetings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#14ad9f]" />
              <div>
                <p className="text-sm text-gray-600">Dokumente</p>
                <p className="text-lg font-semibold">{stats.documents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Aktivitätsverlauf</CardTitle>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md gap-1.5 has-[>svg]:px-2.5 h-8 px-3 text-sm border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                onClick={() => setShowAddNote(!showAddNote)}
                disabled={addingActivity}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Notiz hinzufügen
              </button>
              <button
                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md gap-1.5 has-[>svg]:px-2.5 h-8 px-3 text-sm border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                onClick={() => setShowAddCall(!showAddCall)}
                disabled={addingActivity}
              >
                <Phone className="h-4 w-4 mr-2" />
                Anruf protokollieren
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Note Form */}
          {showAddNote && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Neue Notiz hinzufügen</h4>
              <Textarea
                placeholder="Notiz eingeben..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mb-3"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingActivity}
                  className="bg-[#14ad9f] hover:bg-[#129488]"
                >
                  {addingActivity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Notiz speichern
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNote('');
                  }}
                  disabled={addingActivity}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {/* Add Call Form */}
          {showAddCall && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Anruf protokollieren</h4>
              <Textarea
                placeholder="Gesprächsnotizen eingeben..."
                value={newCallNote}
                onChange={(e) => setNewCallNote(e.target.value)}
                className="mb-3"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddCall}
                  disabled={!newCallNote.trim() || addingActivity}
                  className="bg-[#14ad9f] hover:bg-[#129488]"
                >
                  {addingActivity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Anruf speichern
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddCall(false);
                    setNewCallNote('');
                  }}
                  disabled={addingActivity}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#14ad9f] mb-2" />
              <p className="text-sm text-gray-500">Lade Aktivitätsverlauf...</p>
            </div>
          ) : (() => {
            const combinedTimeline = getCombinedTimeline();
            return combinedTimeline.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Noch keine Aktivitäten</h3>
                <p className="text-sm mb-4">Fügen Sie die erste Notiz oder den ersten Anruf hinzu</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-6">
                  {combinedTimeline.map((item, index) => (
                    <div key={`${item.source}-${item.id}`} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${getActivityColor(item.type, item.metadata)} text-white`}>
                        {getActivityIcon(item.type, item.metadata)}
                        {item.source === 'calendar' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Calendar className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className={`rounded-lg p-4 ${item.source === 'calendar' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            <span className="text-xs text-gray-500">{formatDate(item.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          
                          {/* Angebot-Verlinkung anzeigen */}
                          {item.metadata?.quoteId && item.metadata?.quoteNumber && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md gap-1.5 has-[>svg]:px-2.5 h-7 px-2 text-xs border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                                onClick={() => {
                                  // Navigation zum Angebot
                                  window.open(
                                    `/dashboard/company/${customer.companyId}/finance/quotes/${item.metadata.quoteId}`,
                                    '_blank'
                                  );
                                }}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {item.metadata.quoteNumber} ansehen
                              </button>
                              {item.metadata.amount && item.metadata.currency && (
                                <Badge variant="secondary" className="text-xs">
                                  {new Intl.NumberFormat('de-DE', { 
                                    style: 'currency', 
                                    currency: item.metadata.currency 
                                  }).format(item.metadata.amount)}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Rechnungs-Verlinkung anzeigen */}
                          {item.metadata?.invoiceId && item.metadata?.invoiceNumber && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-md gap-1.5 has-[>svg]:px-2.5 h-7 px-2 text-xs border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                                onClick={() => {
                                  // Navigation zur Rechnung
                                  window.open(
                                    `/dashboard/company/${customer.companyId}/finance/invoices/${item.metadata.invoiceId}`,
                                    '_blank'
                                  );
                                }}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {item.metadata.invoiceNumber} ansehen
                              </button>
                              {item.metadata.amount && item.metadata.currency && (
                                <Badge variant="secondary" className="text-xs">
                                  {new Intl.NumberFormat('de-DE', { 
                                    style: 'currency', 
                                    currency: item.metadata.currency 
                                  }).format(item.metadata.amount)}
                                </Badge>
                              )}
                            </div>
                          )}

                          {item.user && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                              <User className="h-3 w-3" />
                              {item.user}
                            </div>
                          )}
                          {item.source === 'calendar' && item.metadata && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                              <Calendar className="h-3 w-3" />
                              <span>Kalenderereignis</span>
                              {item.metadata.location && (
                                <>
                                  <span>•</span>
                                  <span>{item.metadata.location}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#14ad9f]" />
                    Kundenkalender - Termine & Projekte
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Alle termine und Projekte im Zusammenhang mit {customer.name}
                  </p>
                </div>
                <Button
                  onClick={() => handleCalendarDateClick(new Date())}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Termin
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px]">
                <CompanyCalendar 
                  companyUid={customer.companyId || user?.uid || ''} 
                  selectedOrderId={customer.id}
                  onDateClick={(dateInfo) => handleCalendarDateClick(dateInfo.date)}
                  onEventClick={handleCalendarEventClick}
                  ref={calendarRef}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#14ad9f]" />
                Workspace - Aufgaben & Projekte
              </CardTitle>
              <p className="text-sm text-gray-600">
                Verwalten Sie Aufgaben und Projekte für {customer.name}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[700px] overflow-hidden">
                <WorkspaceManager />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Calendar Event Modal */}
      <CalendarEventModal
        open={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        event={selectedCalendarEvent}
        selectedDate={selectedCalendarDate}
        companyId={customer.companyId || user?.uid || ''}
        customerId={customer.id}
        onEventSaved={handleCalendarEventSaved}
        onEventDeleted={handleCalendarEventDeleted}
      />
    </div>
  );
}
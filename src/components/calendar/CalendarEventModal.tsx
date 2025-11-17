'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  Save,
  X,
  Image,
  File,
  FileImage,
  FileVideo,
  Loader2,
  MessageSquare,
  User,
  Building2,
  Phone,
  Mail } from
'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where } from
'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll } from
'firebase/storage';
import { db, storage } from '@/firebase/clients';

// Types
interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: 'meeting' | 'appointment' | 'task' | 'reminder' | 'call';
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  participants?: string[];
  customerId?: string;
  companyId: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

interface EventNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

interface EventFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  storagePath: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: any;
}

interface CalendarEventModalProps {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | any | null; // Allow both CalendarEvent and EventClickArg
  selectedDate?: Date;
  companyId: string;
  customerId?: string;
  onEventSaved?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
}

export function CalendarEventModal({
  open,
  onClose,
  event,
  selectedDate,
  companyId,
  customerId,
  onEventSaved,
  onEventDeleted
}: CalendarEventModalProps) {
  const { user } = useAuth();

  // Sichere Datums-Konvertierung
  const safeToDateString = (date: any): string => {
    if (!date) return new Date().toISOString().split('T')[0];

    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return new Date().toISOString().split('T')[0];
    }

    return dateObj.toISOString().split('T')[0];
  };

  // Form State
  const [formData, setFormData] = useState<CalendarEvent>({
    title: '',
    description: '',
    startDate: safeToDateString(selectedDate || new Date()),
    endDate: safeToDateString(selectedDate || new Date()),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    eventType: 'meeting',
    status: 'planned',
    priority: 'medium',
    participants: [],
    customerId,
    companyId,
    createdBy: user?.uid || ''
  });

  // Component State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [files, setFiles] = useState<EventFile[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  // Load existing event data
  useEffect(() => {
    if (event) {
      // Check if this is a FullCalendar EventClickArg object
      if ('jsEvent' in event && 'event' in event) {
        const fcEvent = (event as any).event;

        // Extract the real calendar event ID from FullCalendar event ID
        let actualEventId = fcEvent.id;
        if (fcEvent.id && fcEvent.id.startsWith('calendar-')) {
          actualEventId = fcEvent.id.replace('calendar-', '');
        }

        const updatedFormData = {
          id: actualEventId,
          title: fcEvent.title || '',
          description: fcEvent.extendedProps?.description || '',
          startDate: fcEvent.start ? safeToDateString(fcEvent.start) : safeToDateString(new Date()),
          endDate: fcEvent.end ? safeToDateString(fcEvent.end) : safeToDateString(new Date()),
          startTime: fcEvent.start ? new Date(fcEvent.start).toTimeString().substring(0, 5) : '09:00',
          endTime: fcEvent.end ? new Date(fcEvent.end).toTimeString().substring(0, 5) : '10:00',
          location: fcEvent.extendedProps?.location || '',
          eventType: (fcEvent.extendedProps?.eventType || 'meeting') as 'meeting' | 'appointment' | 'task' | 'reminder' | 'call',
          status: (fcEvent.extendedProps?.status || 'planned') as 'planned' | 'confirmed' | 'completed' | 'cancelled',
          priority: (fcEvent.extendedProps?.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          participants: fcEvent.extendedProps?.participants || [],
          customerId: fcEvent.extendedProps?.customerId || customerId,
          companyId,
          createdBy: fcEvent.extendedProps?.createdBy || user?.uid || '',
          createdAt: fcEvent.extendedProps?.createdAt,
          updatedAt: fcEvent.extendedProps?.updatedAt
        };

        setFormData(updatedFormData);

        if (actualEventId) {
          loadEventNotes(actualEventId);
          loadEventFiles(actualEventId);
        }
      } else {
        // Regular CalendarEvent object
        const updatedFormData = {
          ...event,
          title: event.title || '',
          description: event.description || '',
          startDate: safeToDateString(event.startDate),
          endDate: safeToDateString(event.endDate),
          id: event.id // Ensure the ID is properly set
        };

        setFormData(updatedFormData);
      }

      if (event.id) {
        loadEventNotes(event.id);
        loadEventFiles(event.id);
      }

      if (event.id) {

        loadEventNotes(event.id);
        loadEventFiles(event.id);
      }
    } else {
      // Reset form for new event
      const defaultDate = selectedDate ? safeToDateString(selectedDate) : safeToDateString(new Date());
      const newFormData: CalendarEvent = {
        title: '',
        description: '',
        startDate: defaultDate,
        endDate: defaultDate,
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        eventType: 'meeting' as const,
        status: 'planned' as const,
        priority: 'medium' as const,
        participants: [],
        customerId,
        companyId,
        createdBy: user?.uid || ''
      };

      setFormData(newFormData);
      setNotes([]);
      setFiles([]);
      setNewNote('');
    }
  }, [event, selectedDate, customerId, companyId, user?.uid]);

  // Load event notes
  const loadEventNotes = (eventId: string) => {
    if (!eventId) return;

    const notesRef = collection(db, 'companies', companyId, 'calendar_events', eventId, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotes: EventNote[] = [];
      snapshot.forEach((doc) => {
        loadedNotes.push({
          id: doc.id,
          ...doc.data()
        } as EventNote);
      });
      setNotes(loadedNotes);
    });

    return unsubscribe;
  };

  // Load event files
  const loadEventFiles = (eventId: string) => {
    if (!eventId) return;

    const filesRef = collection(db, 'companies', companyId, 'calendar_events', eventId, 'files');
    const q = query(filesRef, orderBy('uploadedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedFiles: EventFile[] = [];
      snapshot.forEach((doc) => {
        loadedFiles.push({
          id: doc.id,
          ...doc.data()
        } as EventFile);
      });
      setFiles(loadedFiles);
    });

    return unsubscribe;
  };

  // Save event
  const handleSaveEvent = async () => {
    if (!formData.title?.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      // Sichere Datum-Konvertierung für Speicherung
      const safeToISOString = (dateStr: string): string => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return new Date().toISOString();
        }
        return date.toISOString();
      };

      const eventData = {
        ...formData,
        startDate: safeToISOString(formData.startDate),
        endDate: safeToISOString(formData.endDate),
        updatedAt: serverTimestamp()
      };

      // Filter out undefined values for Firestore
      const cleanEventData = Object.entries(eventData).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const existingEventId = event?.id || formData.id;

      if (existingEventId) {
        // Update existing event
        const eventRef = doc(db, 'companies', companyId, 'calendar_events', existingEventId);
        await updateDoc(eventRef, cleanEventData);

        // Create activity entry for the updated calendar event
        if (customerId) {
          try {
            const activitiesRef = collection(db, 'companies', companyId, 'customers', customerId, 'activities');
            await addDoc(activitiesRef, {
              type: 'meeting',
              title: 'Termin aktualisiert',
              description: `Termin "${eventData.title}" wurde bearbeitet`,
              timestamp: serverTimestamp(),
              userId: user?.uid || '',
              user: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'System',
              metadata: {
                eventId: existingEventId,
                eventType: eventData.eventType,
                startDate: eventData.startDate
              }
            });
          } catch (activityError) {
            console.error('Error creating activity:', activityError);
          }
        }

        toast.success('Termin wurde aktualisiert');
        onEventSaved?.({ ...eventData, id: existingEventId });
        onClose();
      } else {
        // Create new event
        const eventsRef = collection(db, 'companies', companyId, 'calendar_events');
        const docRef = await addDoc(eventsRef, {
          ...cleanEventData,
          createdAt: serverTimestamp()
        });

        // Create activity entry for the calendar event
        if (customerId) {
          try {
            const activitiesRef = collection(db, 'companies', companyId, 'customers', customerId, 'activities');
            await addDoc(activitiesRef, {
              type: 'meeting',
              title: 'Termin erstellt',
              description: `Termin "${eventData.title}" wurde erstellt`,
              timestamp: serverTimestamp(),
              userId: user?.uid || '',
              user: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'System',
              metadata: {
                eventId: docRef.id,
                eventType: eventData.eventType,
                startDate: eventData.startDate
              }
            });
          } catch (activityError) {
            console.error('Error creating activity:', activityError);
            // Don't fail the whole operation if activity creation fails
          }
        }

        toast.success('Termin wurde erstellt');

        // Update formData with the new event ID to enable notes/files functionality
        setFormData((prev) => ({ ...prev, id: docRef.id }));

        // Load notes and files for the newly created event
        loadEventNotes(docRef.id);
        loadEventFiles(docRef.id);

        // Call onEventSaved with the complete event data including ID
        onEventSaved?.({ ...eventData, id: docRef.id });

        // Don't close the modal - let user add notes/files to the newly created event
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Fehler beim Speichern des Termins');
    } finally {
      setLoading(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    const currentEventId = event?.id || formData.id;
    if (!currentEventId) return;

    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;

    setLoading(true);
    try {
      // Delete all files from storage
      if (files.length > 0) {
        await Promise.all(
          files.map((file) => deleteObject(ref(storage, file.storagePath)))
        );
      }

      // Delete event document (subcollections will be deleted automatically)
      await deleteDoc(doc(db, 'companies', companyId, 'calendar_events', currentEventId));

      // Create activity entry for the deleted calendar event
      if (customerId) {
        try {
          const activitiesRef = collection(db, 'companies', companyId, 'customers', customerId, 'activities');
          await addDoc(activitiesRef, {
            type: 'system',
            title: 'Termin gelöscht',
            description: `Termin "${event?.title || formData.title}" wurde gelöscht`,
            timestamp: serverTimestamp(),
            userId: user?.uid || '',
            user: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'System',
            metadata: {
              deletedEventId: currentEventId,
              eventType: event?.eventType || formData.eventType
            }
          });
        } catch (activityError) {
          console.error('Error creating delete activity:', activityError);
        }
      }

      toast.success('Termin wurde gelöscht');
      if (currentEventId) {
        onEventDeleted?.(currentEventId);
      }
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Fehler beim Löschen des Termins');
    } finally {
      setLoading(false);
    }
  };

  // Add note
  const handleAddNote = async () => {
    const currentEventId = event?.id || formData.id;
    if (!newNote.trim() || !currentEventId || !user) {
      toast.error('Bitte speichern Sie zuerst den Termin, bevor Sie Notizen hinzufügen');
      return;
    }

    setAddingNote(true);
    try {
      const notesRef = collection(db, 'companies', companyId, 'calendar_events', currentEventId, 'notes');
      await addDoc(notesRef, {
        content: newNote.trim(),
        createdBy: user.uid,
        createdByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt',
        createdAt: serverTimestamp()
      });

      setNewNote('');
      toast.success('Notiz wurde hinzugefügt');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Fehler beim Hinzufügen der Notiz');
    } finally {
      setAddingNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    const currentEventId = event?.id || formData.id;
    if (!currentEventId) {
      toast.error('Termin-ID nicht gefunden');
      return;
    }

    try {
      await deleteDoc(doc(db, 'companies', companyId, 'calendar_events', currentEventId, 'notes', noteId));
      toast.success('Notiz wurde gelöscht');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Fehler beim Löschen der Notiz');
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    const currentEventId = event?.id || formData.id;
    if (!files || !currentEventId || !user) {
      toast.error('Bitte speichern Sie zuerst den Termin, bevor Sie Dateien hochladen');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];


    Array.from(files).forEach(async (file) => {
      if (file.size > maxSize) {
        toast.error(`Datei ${file.name} ist zu groß (max. 10MB)`);
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`Dateityp von ${file.name} wird nicht unterstützt`);
        return;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingFiles((prev) => [...prev, fileId]);

      try {
        // Upload to Firebase Storage
        const storagePath = `companies/${companyId}/calendar_events/${currentEventId}/files/${fileId}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Save file metadata to Firestore
        const filesRef = collection(db, 'companies', companyId, 'calendar_events', currentEventId, 'files');
        await addDoc(filesRef, {
          name: fileId,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: downloadURL,
          storagePath: storagePath,
          uploadedBy: user.uid,
          uploadedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt',
          uploadedAt: serverTimestamp()
        });

        toast.success(`${file.name} wurde hochgeladen`);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Fehler beim Hochladen von ${file.name}`);
      } finally {
        setUploadingFiles((prev) => prev.filter((id) => id !== fileId));
      }
    });
  };

  // Delete file
  const handleDeleteFile = async (file: EventFile) => {
    const currentEventId = event?.id || formData.id;
    if (!currentEventId) {
      toast.error('Termin-ID nicht gefunden');
      return;
    }

    try {
      // Delete from storage
      await deleteObject(ref(storage, file.storagePath));

      // Delete from Firestore
      await deleteDoc(doc(db, 'companies', companyId, 'calendar_events', currentEventId, 'files', file.id));

      toast.success('Datei wurde gelöscht');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Fehler beim Löschen der Datei');
    }
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':return 'bg-blue-500';
      case 'appointment':return 'bg-green-500';
      case 'task':return 'bg-orange-500';
      case 'reminder':return 'bg-yellow-500';
      case 'call':return 'bg-purple-500';
      default:return 'bg-gray-500';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14ad9f]" />
            {event || formData.id ? 'Termin bearbeiten' : 'Neuen Termin erstellen'}
          </DialogTitle>
          <DialogDescription>
            {event || formData.id ? 'Bearbeiten Sie die Termindetails, fügen Sie Notizen hinzu oder laden Sie Dateien hoch.' : 'Erstellen Sie einen neuen Termin mit allen wichtigen Details.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notizen ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dateien ({files.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="z.B. Kundentermin" />

                </div>

                <div>
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Zusätzliche Details..."
                    rows={3} />

                </div>

                <div>
                  <Label htmlFor="location">Ort</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="z.B. Büro, Online, Kundenstandort" />

                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Startdatum</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />

                  </div>
                  <div>
                    <Label htmlFor="endDate">Enddatum</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Startzeit</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />

                  </div>
                  <div>
                    <Label htmlFor="endTime">Endzeit</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />

                  </div>
                </div>

                <div>
                  <Label htmlFor="eventType">Termintyp</Label>
                  <Select value={formData.eventType} onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Besprechung</SelectItem>
                      <SelectItem value="appointment">Termin</SelectItem>
                      <SelectItem value="task">Aufgabe</SelectItem>
                      <SelectItem value="reminder">Erinnerung</SelectItem>
                      <SelectItem value="call">Anruf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Geplant</SelectItem>
                        <SelectItem value="confirmed">Bestätigt</SelectItem>
                        <SelectItem value="completed">Abgeschlossen</SelectItem>
                        <SelectItem value="cancelled">Abgesagt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priorität</Label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                        <SelectItem value="urgent">Dringend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <div className="space-y-6">
              {(() => {
                const hasEventId = !!(event?.id || formData.id);
                return !hasEventId ?
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-blue-800">
                    <MessageSquare className="h-5 w-5" />
                    <h3 className="font-medium">Notizen nach Erstellung verfügbar</h3>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Speichern Sie zuerst den Termin, um Notizen hinzuzufügen.
                    <br />
                    <small>Debug: event?.id={String(event?.id)}, formData.id={String(formData.id)}</small>
                  </p>
                </div> :
                null;
              })()}
              
              {/* Add new note */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Neue Notiz hinzufügen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={(() => {
                        const hasId = !!(event?.id || formData.id);
                        return hasId ? "Schreiben Sie eine Notiz..." : "Speichern Sie zuerst den Termin";
                      })()}
                      rows={3}
                      disabled={!!!(event?.id || formData.id)} />

                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addingNote || !(event?.id || formData.id)}
                      className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">

                      {addingNote && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Notiz hinzufügen
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes list */}
              <div className="space-y-4">
                {notes.map((note) =>
                <Card key={note.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-2">{note.content}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            {note.createdByName}
                            <span>•</span>
                            {note.createdAt?.toDate?.()?.toLocaleDateString('de-DE') || 'Gerade eben'}
                          </div>
                        </div>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-500 hover:text-red-700">

                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {notes.length === 0 &&
                <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Noch keine Notizen</h3>
                    <p className="text-sm">Fügen Sie die erste Notiz zu diesem Termin hinzu</p>
                  </div>
                }
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <div className="space-y-6">
              {(() => {
                const hasEventId = !!(event?.id || formData.id);
                return !hasEventId ?
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-blue-800">
                      <FileText className="h-5 w-5" />
                      <h3 className="font-medium">Dateien nach Erstellung verfügbar</h3>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Speichern Sie zuerst den Termin, um Dateien hochzuladen.
                      <br />
                      <small>Debug: event?.id={String(event?.id)}, formData.id={String(formData.id)}</small>
                    </p>
                  </div> :
                null;
              })()}
              
              {/* File upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Dateien hochladen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-4">
                      Dateien hier ablegen oder klicken zum Auswählen
                    </p>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      disabled={!(event?.id || formData.id)} />

                    <Button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      variant="outline"
                      disabled={!(event?.id || formData.id)}>

                      {(() => {
                        const hasId = !!(event?.id || formData.id);
                        return hasId ? 'Dateien auswählen' : 'Termin zuerst speichern';
                      })()}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Unterstützte Formate: Bilder, PDF, Office-Dokumente (max. 10MB)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Files list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) =>
                <Card key={file.id}>
                    <CardContent className="p-4">
                      {/* File info */}
                      <div className="flex items-start gap-2 mb-3">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-all leading-5">{file.originalName}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex justify-end gap-1">
                          <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}>

                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file)}
                        className="text-red-500 hover:text-red-700">

                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      
                      {file.type.startsWith('image/') &&
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-24 object-cover rounded" />

                    }
                      
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                        <User className="h-3 w-3" />
                        {file.uploadedByName}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {uploadingFiles.map((fileId) =>
                <Card key={fileId}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-gray-600">Wird hochgeladen...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {files.length === 0 && uploadingFiles.length === 0 &&
              <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Noch keine Dateien</h3>
                  <p className="text-sm">Laden Sie die erste Datei zu diesem Termin hoch</p>
                </div>
              }
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {(event || formData.id) &&
              <Button
                variant="destructive"
                onClick={handleDeleteEvent}
                disabled={loading}>

                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              }
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {formData.id && !event ? 'Schließen' : 'Abbrechen'}
              </Button>
              <Button
                onClick={handleSaveEvent}
                disabled={loading || !formData.title?.trim()}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">

                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                {event || formData.id ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}
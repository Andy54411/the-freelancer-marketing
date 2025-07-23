'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { collection, query, onSnapshot, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  FiMail,
  FiUsers,
  FiSettings,
  FiRefreshCw,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiArrowRight,
  FiLogOut,
  FiShield,
  FiUser,
} from 'react-icons/fi';

// Types
interface TaskiloContact {
  id: string;
  email: string;
  name: string;
  category: string;
  department: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive';
  lastContact?: string;
  assignedStaff?: string;
}

interface EmailTicket {
  id: string;
  subject: string;
  sender: string;
  contactId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'employee';
  departments: string[];
  permissions: string[];
  isActive: boolean;
  assignedTickets: number;
}

// Authentication Hook
function useStaffAuth() {
  const [user, setUser] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.ok) {
        const data = await response.json();
        setUser(data.employee);
      } else {
        router.push('/dashboard/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/dashboard/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      router.push('/dashboard/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const hasPermission = (permission: string) => {
    return user?.permissions.includes(permission) || user?.role === 'master';
  };

  return { user, loading, logout, hasPermission };
}

export default function EmailManagementPage() {
  const { user, logout, hasPermission, loading } = useStaffAuth();
  const router = useRouter();

  const [contacts, setContacts] = useState<TaskiloContact[]>([]);
  const [tickets, setTickets] = useState<EmailTicket[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load real data from Firebase
  useEffect(() => {
    if (user) {
      loadRealData();
    }
  }, [user]);

  const loadRealData = async () => {
    try {
      setIsRefreshing(true);

      // Load Email Contacts from Firebase
      const contactsRef = collection(db, 'emailContacts');
      const contactsQuery = query(contactsRef, orderBy('createdAt', 'desc'));

      const unsubscribeContacts = onSnapshot(contactsQuery, snapshot => {
        const contactsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as TaskiloContact[];
        setContacts(contactsData);
      });

      // Load Email Tickets from Firebase
      const ticketsRef = collection(db, 'emailTickets');
      const ticketsQuery = query(ticketsRef, orderBy('createdAt', 'desc'));

      const unsubscribeTickets = onSnapshot(ticketsQuery, snapshot => {
        const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as EmailTicket[];
        setTickets(ticketsData);
      });

      // Load Staff from Firebase
      const staffRef = collection(db, 'adminStaff');
      const staffQuery = query(staffRef, where('isActive', '==', true));

      const unsubscribeStaff = onSnapshot(staffQuery, snapshot => {
        const staffData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as StaffMember[];
        setStaff(staffData);
      });

      setDataLoaded(true);
      setIsRefreshing(false);

      // Return cleanup function
      return () => {
        unsubscribeContacts();
        unsubscribeTickets();
        unsubscribeStaff();
      };
    } catch (error) {
      console.error('Fehler beim Laden der E-Mail-Daten:', error);
      setIsRefreshing(false);
      // Fallback zu Demo-Daten bei Fehler
      loadFallbackData();
    }
  };

  const loadFallbackData = () => {
    // Fallback Demo-Daten falls Firebase nicht verfügbar
    setContacts([
      {
        id: 'contact_1',
        email: 'support@taskilo.de',
        name: 'Support Team',
        category: 'support',
        department: 'general',
        priority: 'high' as const,
        status: 'active' as const,
        lastContact: '2024-01-20',
        assignedStaff: 'emp_002',
      },
      {
        id: 'contact_2',
        email: 'newsletter@taskilo.de',
        name: 'Newsletter Team',
        category: 'business',
        department: 'marketing',
        priority: 'medium' as const,
        status: 'active' as const,
        lastContact: '2024-01-19',
        assignedStaff: 'emp_001',
      },
    ]);

    setTickets([
      {
        id: 'ticket_1',
        subject: 'Datenschutzanfrage',
        sender: 'kunde@example.com',
        contactId: 'contact_2',
        status: 'open' as const,
        priority: 'high' as const,
        assignedTo: 'emp_001',
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z',
        unread: true,
      },
    ]);

    setStaff([
      {
        id: 'emp_001',
        name: 'Demo Mitarbeiter',
        email: 'demo@taskilo.com',
        role: 'employee' as const,
        departments: ['support'],
        permissions: ['view_assigned', 'respond_emails'],
        isActive: true,
        assignedTickets: 1,
      },
    ]);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    // Reload real data
    await loadRealData();
  };

  const reassignEmail = async (ticketId: string, newStaffId: string) => {
    try {
      // Update in Firebase
      const ticketRef = doc(db, 'emailTickets', ticketId);
      await updateDoc(ticketRef, {
        assignedTo: newStaffId,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, assignedTo: newStaffId, updatedAt: new Date().toISOString() }
            : ticket
        )
      );
    } catch (error) {
      console.error('Fehler beim Neuzuweisen der E-Mail:', error);
      // Fallback zu lokaler Aktualisierung
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === ticketId ? { ...ticket, assignedTo: newStaffId } : ticket
        )
      );
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      legal: 'bg-red-100 text-red-800',
      support: 'bg-blue-100 text-blue-800',
      general: 'bg-gray-100 text-gray-800',
      technical: 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      open: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : 'Nicht zugewiesen';
  };

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : 'Unbekannter Kontakt';
  };

  if (loading || !dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FiRefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Lade E-Mail-Daten...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalUnreadEmails = tickets.filter(t => t.unread).length;
  const activeStaffCount = staff.filter(s => s.isActive).length;

  return (
    <div className="space-y-6 p-6">
      {/* User Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            <FiUser className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-gray-600">
              {user.departments.join(', ')} •
              <Badge className="ml-1" variant={user.role === 'master' ? 'default' : 'secondary'}>
                {user.role === 'master' ? 'Master' : 'Mitarbeiter'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isRefreshing}>
            <FiRefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          {hasPermission('create_employee') && (
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin/staff-management')}
            >
              <FiPlus className="h-4 w-4 mr-2" />
              Mitarbeiter verwalten
            </Button>
          )}
          <Button variant="outline" onClick={logout}>
            <FiLogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ungelesene E-Mails</CardTitle>
            <FiMail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnreadEmails}</div>
            <p className="text-xs text-muted-foreground">Benötigen Aufmerksamkeit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Kontakte</CardTitle>
            <FiSettings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Von {contacts.length} Gesamtkontakten</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Mitarbeiter</CardTitle>
            <FiUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaffCount}</div>
            <p className="text-xs text-muted-foreground">Im E-Mail System</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
            <FiEye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets.filter(t => t.status === 'open').length}
            </div>
            <p className="text-xs text-muted-foreground">Benötigen Bearbeitung</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Kontakte</TabsTrigger>
          <TabsTrigger value="tickets">E-Mail Tickets</TabsTrigger>
          {hasPermission('view_all') && <TabsTrigger value="staff">Mitarbeiter</TabsTrigger>}
          {hasPermission('reassign') && <TabsTrigger value="assignments">Zuweisungen</TabsTrigger>}
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Taskilo Kontakte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{contact.name}</span>
                        <Badge className={getCategoryColor(contact.category)}>
                          {contact.category}
                        </Badge>
                        <Badge variant="outline">{contact.department}</Badge>
                        <Badge className={getPriorityColor(contact.priority)}>
                          {contact.priority}
                        </Badge>
                        <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                          {contact.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">{contact.email}</div>
                      {contact.assignedStaff && (
                        <div className="text-sm text-gray-500">
                          Zugewiesen an: {getStaffName(contact.assignedStaff)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <FiEdit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <FiEye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.subject}</span>
                        <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                        <Badge variant="outline">{getContactName(ticket.contactId)}</Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        {ticket.unread && <Badge variant="destructive">Ungelesen</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">Von: {ticket.sender}</div>
                      <div className="text-sm text-gray-500">
                        Erstellt: {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
                      </div>
                      {ticket.assignedTo && (
                        <div className="text-sm text-gray-500">
                          Zugewiesen an: {getStaffName(ticket.assignedTo)}
                        </div>
                      )}
                    </div>
                    {hasPermission('reassign') && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={ticket.assignedTo || ''}
                          onValueChange={value => reassignEmail(ticket.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Zuweisen" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="">Nicht zugewiesen</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">
                          <FiArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Mitarbeiter Übersicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staff.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        <Badge variant={member.role === 'master' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                        <Badge variant="outline">{member.assignedTickets} Tickets</Badge>
                      </div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                      <div className="text-sm text-gray-500">
                        Abteilungen: {member.departments.join(', ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Kontakte zugewiesen:{' '}
                        {contacts.filter(contact => contact.assignedStaff === member.id).length}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.isActive ? 'default' : 'secondary'}>
                        {member.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>E-Mail Zuweisungen verwalten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <AlertDescription>
                    Hier können Sie E-Mails zwischen Mitarbeitern neu zuweisen und die
                    Arbeitsbelastung verwalten.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold">Kontakt-Zuweisungen</h3>
                  {contacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <span className="font-medium">{contact.name}</span>
                        <div className="text-sm text-gray-600">{contact.email}</div>
                      </div>
                      <Select
                        value={contact.assignedStaff || ''}
                        onValueChange={async value => {
                          try {
                            // Update in Firebase
                            const contactRef = doc(db, 'emailContacts', contact.id);
                            await updateDoc(contactRef, {
                              assignedStaff: value,
                              updatedAt: new Date().toISOString(),
                            });

                            // Update local state
                            setContacts(prev =>
                              prev.map(c =>
                                c.id === contact.id ? { ...c, assignedStaff: value } : c
                              )
                            );
                          } catch (error) {
                            console.error('Fehler beim Zuweisen des Kontakts:', error);
                            // Fallback zu lokaler Aktualisierung
                            setContacts(prev =>
                              prev.map(c =>
                                c.id === contact.id ? { ...c, assignedStaff: value } : c
                              )
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Mitarbeiter wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="">Nicht zugewiesen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Mitarbeiter-Arbeitsbelastung</h3>
                  {staff.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <span className="font-medium">{member.name}</span>
                        <div className="text-sm text-gray-600">
                          {member.assignedTickets} aktive Tickets
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Abteilungen: {member.departments.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

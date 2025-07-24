'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FiUserPlus,
  FiUsers,
  FiKey,
  FiMail,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiShield,
  FiClock,
  FiActivity,
} from 'react-icons/fi';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'support' | 'manager' | 'readonly';
  department: string;
  assignedContacts: string[];
  isOnline: boolean;
  lastActive: string;
  permissions: string[];
  loginCount: number;
  createdAt: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface AccessLog {
  id: string;
  staffId: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

const LIVE_STAFF: StaffMember[] = [
  {
    id: 'andy-team',
    name: 'Andy Staudinger',
    email: 'team@taskilo.de',
    role: 'admin',
    department: 'Management',
    assignedContacts: ['team'],
    isOnline: false,
    lastActive: 'Noch nicht angemeldet',
    permissions: ['email_read', 'email_write', 'email_assign', 'staff_manage', 'system_admin'],
    loginCount: 0,
    createdAt: '2025-07-22T00:00:00Z',
    status: 'active',
  },
  {
    id: 'andy-noreply',
    name: 'Andy Staudinger',
    email: 'noreply@taskilo.de',
    role: 'admin',
    department: 'Management',
    assignedContacts: ['noreply'],
    isOnline: false,
    lastActive: 'Noch nicht angemeldet',
    permissions: ['email_read', 'email_write', 'email_assign'],
    loginCount: 0,
    createdAt: '2025-07-22T00:00:00Z',
    status: 'active',
  },
  {
    id: 'andy-support',
    name: 'Andy Staudinger',
    email: 'support@taskilo.de',
    role: 'support',
    department: 'Customer Support',
    assignedContacts: ['support'],
    isOnline: false,
    lastActive: 'Noch nicht angemeldet',
    permissions: ['email_read', 'email_write'],
    loginCount: 0,
    createdAt: '2025-07-16T00:00:00Z',
    status: 'active',
  },
  {
    id: 'andy-main',
    name: 'Andy Staudinger',
    email: 'andy.staudinger@taskilo.de',
    role: 'admin',
    department: 'Management',
    assignedContacts: ['andy'],
    isOnline: true,
    lastActive: '2025-07-16T00:00:00Z',
    permissions: ['email_read', 'email_write', 'email_assign', 'staff_manage', 'system_admin'],
    loginCount: 1,
    createdAt: '2025-07-16T00:00:00Z',
    status: 'active',
  },
  {
    id: 'elisabeth-newsletter',
    name: 'Elisabeth Schröder',
    email: 'newsletter@taskilo.de',
    role: 'manager',
    department: 'Newsletter Management',
    assignedContacts: ['newsletter'],
    isOnline: false,
    lastActive: 'Noch nicht angemeldet',
    permissions: ['email_read', 'email_write', 'manage_newsletter'],
    loginCount: 0,
    createdAt: '2025-07-22T00:00:00Z',
    status: 'active',
  },
];

const LIVE_ACCESS_LOGS: AccessLog[] = [
  {
    id: 'log-1',
    staffId: 'andy-main',
    action: 'login',
    timestamp: '2025-07-16T00:00:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    success: true,
  },
];

const AVAILABLE_PERMISSIONS = [
  { id: 'email_read', name: 'E-Mails lesen', description: 'Kann eingehende E-Mails lesen' },
  {
    id: 'email_write',
    name: 'E-Mails beantworten',
    description: 'Kann E-Mails beantworten und versenden',
  },
  {
    id: 'email_assign',
    name: 'E-Mails zuweisen',
    description: 'Kann E-Mails anderen Mitarbeitern zuweisen',
  },
  {
    id: 'staff_view',
    name: 'Mitarbeiter anzeigen',
    description: 'Kann andere Mitarbeiter und deren Status sehen',
  },
  {
    id: 'staff_manage',
    name: 'Mitarbeiter verwalten',
    description: 'Kann Mitarbeiter hinzufügen, bearbeiten und löschen',
  },
  {
    id: 'system_admin',
    name: 'System-Administration',
    description: 'Vollzugriff auf alle System-Funktionen',
  },
];

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>(LIVE_STAFF);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(LIVE_ACCESS_LOGS);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'support' as const,
    department: '',
    permissions: [] as string[],
  });

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-purple-100 text-purple-800',
      support: 'bg-blue-100 text-blue-800',
      readonly: 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || colors.support;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getRolePermissions = (role: string): string[] => {
    const rolePermissions = {
      admin: [
        'email_read',
        'email_write',
        'email_assign',
        'staff_manage',
        'staff_view',
        'system_admin',
      ],
      manager: ['email_read', 'email_write', 'email_assign', 'staff_view'],
      support: ['email_read', 'email_write'],
      readonly: ['email_read', 'staff_view'],
    };
    return rolePermissions[role as keyof typeof rolePermissions] || [];
  };

  const addStaff = () => {
    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      ...newStaff,
      assignedContacts: [],
      isOnline: false,
      lastActive: new Date().toISOString(),
      permissions: getRolePermissions(newStaff.role),
      loginCount: 0,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    setStaff(prev => [...prev, newMember]);
    setNewStaff({
      name: '',
      email: '',
      role: 'support',
      department: '',
      permissions: [],
    });
    setIsAddDialogOpen(false);
  };

  const toggleStaffStatus = (staffId: string) => {
    setStaff(prev =>
      prev.map(member =>
        member.id === staffId
          ? { ...member, status: member.status === 'active' ? 'inactive' : ('active' as const) }
          : member
      )
    );
  };

  const deleteStaff = (staffId: string) => {
    setStaff(prev => prev.filter(member => member.id !== staffId));
  };

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const onlineStaff = staff.filter(s => s.isOnline).length;
  const recentLogins = accessLogs.filter(
    log =>
      log.success &&
      log.action === 'login' &&
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Mitarbeiter-Verwaltung</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FiUserPlus className="h-4 w-4 mr-2" />
              Neuen Mitarbeiter hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neuen Mitarbeiter hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newStaff.name}
                  onChange={e => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Vor- und Nachname"
                />
              </div>
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaff.email}
                  onChange={e => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="mitarbeiter@taskilo.de"
                />
              </div>
              <div>
                <Label htmlFor="department">Abteilung</Label>
                <Input
                  id="department"
                  value={newStaff.department}
                  onChange={e => setNewStaff(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="z.B. Customer Support"
                />
              </div>
              <div>
                <Label htmlFor="role">Rolle</Label>
                <Select
                  value={newStaff.role}
                  onValueChange={(value: any) => setNewStaff(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support Mitarbeiter</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="readonly">Nur Lesen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={addStaff} disabled={!newStaff.name || !newStaff.email}>
                  Hinzufügen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistik-Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Mitarbeiter</CardTitle>
            <FiUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Mitarbeiter</CardTitle>
            <FiShield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <FiActivity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{onlineStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins (24h)</CardTitle>
            <FiClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentLogins}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Mitarbeiter</TabsTrigger>
          <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
          <TabsTrigger value="access-logs">Zugriffsprotokolle</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => (
              <Card key={member.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {member.name}
                        <span
                          className={`w-3 h-3 rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                        ></span>
                      </CardTitle>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-sm text-gray-500">{member.department}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                      <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Zugewiesene Kontakte:</span>
                        <div className="font-medium">{member.assignedContacts.length}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Login Anzahl:</span>
                        <div className="font-medium">{member.loginCount}</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      <div>Erstellt: {new Date(member.createdAt).toLocaleDateString('de-DE')}</div>
                      <div>
                        Letzte Aktivität: {new Date(member.lastActive).toLocaleString('de-DE')}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {member.permissions.slice(0, 3).map(permission => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {AVAILABLE_PERMISSIONS.find(p => p.id === permission)?.name || permission}
                        </Badge>
                      ))}
                      {member.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.permissions.length - 3} weitere
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <FiEdit2 className="h-3 w-3 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant={member.status === 'active' ? 'outline' : 'default'}
                        onClick={() => toggleStaffStatus(member.id)}
                      >
                        {member.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                      </Button>
                      {member.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteStaff(member.id)}
                        >
                          <FiTrash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Berechtigungen verwalten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Verfügbare Berechtigungen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AVAILABLE_PERMISSIONS.map(permission => (
                      <div key={permission.id} className="p-3 border rounded-lg">
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-sm text-gray-600">{permission.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Rollen-basierte Berechtigungen</h3>
                  <div className="space-y-3">
                    {['admin', 'manager', 'support', 'readonly'].map(role => (
                      <div key={role} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getRoleColor(role)}>{role}</Badge>
                          <span className="font-medium">
                            {role === 'admin'
                              ? 'Administrator'
                              : role === 'manager'
                                ? 'Manager'
                                : role === 'support'
                                  ? 'Support Mitarbeiter'
                                  : 'Nur Lesen'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {getRolePermissions(role).map(permId => (
                            <Badge key={permId} variant="outline" className="text-xs">
                              {AVAILABLE_PERMISSIONS.find(p => p.id === permId)?.name || permId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zugriffsprotokolle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accessLogs.map(log => {
                  const staffMember = staff.find(s => s.id === log.staffId);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {staffMember?.name || 'Unbekannter Benutzer'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {log.action === 'login'
                            ? 'Anmeldung'
                            : log.action === 'login_failed'
                              ? 'Fehlgeschlagene Anmeldung'
                              : log.action === 'email_access'
                                ? 'E-Mail Zugriff'
                                : log.action}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('de-DE')} • {log.ipAddress}
                        </div>
                      </div>
                      <Badge
                        className={
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }
                      >
                        {log.success ? 'Erfolgreich' : 'Fehlgeschlagen'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

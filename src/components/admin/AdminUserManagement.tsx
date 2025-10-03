'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  Eye,
  UserPlus,
  Settings,
  Clock,
} from 'lucide-react';
import { AdminUser, AdminRole, DEFAULT_ADMIN_ROLES, getRoleById } from '@/lib/admin-roles';
import { toast } from 'sonner';

interface CreateAdminUserFormData {
  email: string;
  name: string;
  phone: string;
  roleId: string;
  departments: string[];
  notes: string;
}

export default function AdminUserManagement() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [newUser, setNewUser] = useState<CreateAdminUserFormData>({
    email: '',
    name: '',
    phone: '',
    roleId: 'support-admin',
    departments: [],
    notes: '',
  });

  // Verfügbare Abteilungen
  const availableDepartments = ['Support', 'Technical', 'Sales', 'Analytics', 'Management'];

  // Demo-Daten laden (später durch API ersetzen)
  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/admin-users');

      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data.adminUsers || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Laden der Admin-Benutzer');
      }
    } catch (error) {
      toast.error('Fehler beim Laden der Admin-Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async () => {
    try {
      if (!newUser.email || !newUser.name || !newUser.roleId) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        return;
      }

      const response = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadAdminUsers(); // Neu laden
        setShowCreateDialog(false);
        setNewUser({
          email: '',
          name: '',
          phone: '',
          roleId: 'support-admin',
          departments: [],
          notes: '',
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Erstellen des Admin-Benutzers');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Admin-Benutzers');
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const user = adminUsers.find(u => u.id === userId);
      if (!user) return;

      // TODO: API Call zu /api/admin/users/toggle-status
      setAdminUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive: !u.isActive } : u)));

      toast.success(`Benutzer ${user.isActive ? 'deaktiviert' : 'aktiviert'}`);
    } catch (error) {
      toast.error('Fehler beim Ändern des Benutzerstatus');
    }
  };

  const deleteAdminUser = async (userId: string) => {
    try {
      const user = adminUsers.find(u => u.id === userId);
      if (!user) return;

      if (user.role.id === 'master-admin') {
        toast.error('Master Admin kann nicht gelöscht werden');
        return;
      }

      if (!confirm(`Sind Sie sicher, dass Sie ${user.name} löschen möchten?`)) {
        return;
      }

      // TODO: API Call zu /api/admin/users/delete
      setAdminUsers(prev => prev.filter(u => u.id !== userId));

      toast.success(`Admin-Benutzer ${user.name} gelöscht`);
    } catch (error) {
      toast.error('Fehler beim Löschen des Benutzers');
    }
  };

  // Gefilterte Benutzer
  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role.id === filterRole;

    return matchesSearch && matchesRole;
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inaktiv</Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin-Benutzer Verwaltung</h1>
          <p className="text-gray-600">Verwalte Admin-Mitarbeiter und deren Rollen</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Neuer Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neuen Admin-Benutzer erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie einen neuen Admin-Benutzer mit spezifischen Rollen und Berechtigungen
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Max Mustermann"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="max@taskilo.de"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={e => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+49 123 456789"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rolle *</Label>
                  <Select
                    value={newUser.roleId}
                    onValueChange={value => setNewUser(prev => ({ ...prev, roleId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rolle auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_ADMIN_ROLES.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newUser.roleId && (
                    <p className="text-sm text-gray-600 mt-1">
                      {DEFAULT_ADMIN_ROLES.find(r => r.id === newUser.roleId)?.description}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Abteilungen</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {availableDepartments.map(dept => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={dept}
                        checked={newUser.departments.includes(dept)}
                        onCheckedChange={checked => {
                          if (checked) {
                            setNewUser(prev => ({
                              ...prev,
                              departments: [...prev.departments, dept],
                            }));
                          } else {
                            setNewUser(prev => ({
                              ...prev,
                              departments: prev.departments.filter(d => d !== dept),
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={dept} className="text-sm">
                        {dept}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  value={newUser.notes}
                  onChange={e => setNewUser(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Zusätzliche Informationen..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={createAdminUser}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                disabled={!newUser.name || !newUser.email || !newUser.roleId}
              >
                Admin erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter und Suche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Admin suchen..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterRole === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterRole('all')}
                size="sm"
              >
                Alle
              </Button>
              {DEFAULT_ADMIN_ROLES.map(role => (
                <Button
                  key={role.id}
                  variant={filterRole === role.id ? 'default' : 'outline'}
                  onClick={() => setFilterRole(role.id)}
                  size="sm"
                >
                  {role.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900">{adminUsers.length}</p>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktiv</p>
                <p className="text-2xl font-bold text-green-600">
                  {adminUsers.filter(u => u.isActive).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Support</p>
                <p className="text-2xl font-bold text-blue-600">
                  {adminUsers.filter(u => u.role.id === 'support-admin').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-[#14ad9f]">
                  {
                    adminUsers.filter(
                      u =>
                        u.lastLogin &&
                        new Date(u.lastLogin).getTime() > Date.now() - 24 * 60 * 60 * 1000
                    ).length
                  }
                </p>
              </div>
              <div className="w-8 h-8 bg-[#14ad9f]/10 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-[#14ad9f] rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin-Benutzer Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Admin-Benutzer ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.name}
                        {user.role.id === 'master-admin' && (
                          <span className="text-sm text-red-600 ml-2">(Master Admin)</span>
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                        {user.phone && (
                          <>
                            <span>•</span>
                            <Phone className="h-3 w-3" />
                            <span>{user.phone}</span>
                          </>
                        )}
                      </div>
                      {user.departments.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {user.departments.map(dept => (
                            <Badge key={dept} variant="outline" className="text-xs">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Letzter Login: {user.lastLogin ? formatDate(user.lastLogin) : 'Nie'}
                        </span>
                        <span>•</span>
                        <span>{user.loginCount} Logins</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className={user.role.color}>{user.role.name}</Badge>
                    {getStatusBadge(user.isActive)}

                    <div className="flex space-x-1">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                        className={
                          user.isActive
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {user.role.id !== 'master-admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAdminUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Keine Admin-Benutzer gefunden' : 'Keine Admin-Benutzer verfügbar'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

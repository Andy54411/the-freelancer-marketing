// Admin Rollen und Berechtigungen System
export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  color: string;
  isSystemRole: boolean; // Kann nicht gelöscht werden
}

export interface AdminPermission {
  id: string;
  name: string;
  description: string;
  category: 'tickets' | 'users' | 'analytics' | 'settings' | 'system';
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  departments: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  loginCount: number;
  createdBy: string;
  avatar?: string;
  phone?: string;
  notes?: string;
}

// Standard Admin-Rollen
export const DEFAULT_ADMIN_ROLES: AdminRole[] = [
  {
    id: 'master-admin',
    name: 'Master Admin',
    description: 'Vollzugriff auf alle Funktionen und Systemeinstellungen',
    color: 'bg-red-100 text-red-800',
    isSystemRole: true,
    permissions: [
      {
        id: 'all',
        name: 'Vollzugriff',
        description: 'Zugriff auf alle Funktionen',
        category: 'system',
      },
    ],
  },
  {
    id: 'support-admin',
    name: 'Support Admin',
    description: 'Verwaltung von Tickets und Kundensupport',
    color: 'bg-blue-100 text-blue-800',
    isSystemRole: true,
    permissions: [
      {
        id: 'tickets.view',
        name: 'Tickets anzeigen',
        description: 'Kann alle Tickets einsehen',
        category: 'tickets',
      },
      {
        id: 'tickets.edit',
        name: 'Tickets bearbeiten',
        description: 'Kann Tickets bearbeiten und beantworten',
        category: 'tickets',
      },
      {
        id: 'tickets.assign',
        name: 'Tickets zuweisen',
        description: 'Kann Tickets anderen Mitarbeitern zuweisen',
        category: 'tickets',
      },
      {
        id: 'tickets.close',
        name: 'Tickets schließen',
        description: 'Kann Tickets als gelöst markieren',
        category: 'tickets',
      },
    ],
  },
  {
    id: 'analytics-admin',
    name: 'Analytics Admin',
    description: 'Zugriff auf Berichte und Analytics',
    color: 'bg-green-100 text-green-800',
    isSystemRole: true,
    permissions: [
      {
        id: 'analytics.view',
        name: 'Analytics anzeigen',
        description: 'Kann alle Berichte und Statistiken einsehen',
        category: 'analytics',
      },
      {
        id: 'analytics.export',
        name: 'Daten exportieren',
        description: 'Kann Berichte und Daten exportieren',
        category: 'analytics',
      },
      {
        id: 'users.view',
        name: 'Benutzer anzeigen',
        description: 'Kann Benutzerdaten einsehen',
        category: 'users',
      },
    ],
  },
  {
    id: 'user-admin',
    name: 'User Admin',
    description: 'Verwaltung von Benutzern und Unternehmen',
    color: 'bg-purple-100 text-purple-800',
    isSystemRole: true,
    permissions: [
      {
        id: 'users.view',
        name: 'Benutzer anzeigen',
        description: 'Kann alle Benutzer einsehen',
        category: 'users',
      },
      {
        id: 'users.edit',
        name: 'Benutzer bearbeiten',
        description: 'Kann Benutzerdaten bearbeiten',
        category: 'users',
      },
      {
        id: 'users.suspend',
        name: 'Benutzer sperren',
        description: 'Kann Benutzer sperren/entsperren',
        category: 'users',
      },
      {
        id: 'users.delete',
        name: 'Benutzer löschen',
        description: 'Kann Benutzer löschen',
        category: 'users',
      },
    ],
  },
];

// Hilfsfunktionen
export function getRoleById(roleId: string): AdminRole | undefined {
  return DEFAULT_ADMIN_ROLES.find(role => role.id === roleId);
}

export function hasPermission(user: AdminUser, permissionId: string): boolean {
  // Master Admin hat immer alle Rechte
  if (user.role.id === 'master-admin') return true;

  return user.role.permissions.some(
    permission => permission.id === permissionId || permission.id === 'all'
  );
}

export function canAccessTickets(user: AdminUser): boolean {
  return hasPermission(user, 'tickets.view') || user.role.id === 'support-admin';
}

export function canManageUsers(user: AdminUser): boolean {
  return hasPermission(user, 'users.view') || user.role.id === 'user-admin';
}

export function canViewAnalytics(user: AdminUser): boolean {
  return hasPermission(user, 'analytics.view') || user.role.id === 'analytics-admin';
}

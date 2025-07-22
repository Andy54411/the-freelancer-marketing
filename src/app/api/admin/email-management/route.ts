// src/app/api/admin/email-management/route.ts
import { NextResponse, type NextRequest } from 'next/server';

// Email Assignment and Management Interface
interface EmailContact {
  id: string;
  email: string;
  department: string;
  category: string;
  isActive: boolean;
  assignedTo?: string; // User ID of assigned employee
  assignedDate?: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'employee';
  departments: string[];
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

interface EmailAssignment {
  id: string;
  emailContactId: string;
  employeeId: string;
  assignedBy: string; // Master user ID
  assignedAt: string;
  status: 'active' | 'reassigned' | 'suspended';
  notes?: string;
}

// Static data for demonstration - in production this would be from database
const EMAIL_CONTACTS: EmailContact[] = [
  {
    id: 'legal',
    email: 'legal@taskilo.com',
    department: 'Rechtliche Angelegenheiten',
    category: 'legal',
    isActive: true,
    assignedTo: 'emp_001',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'high',
    description: 'Für alle rechtlichen Fragen, AGB, Verträge und juristische Angelegenheiten',
  },
  {
    id: 'support',
    email: 'support@taskilo.com',
    department: 'Allgemeiner Support',
    category: 'support',
    isActive: true,
    assignedTo: 'emp_002',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'medium',
    description: 'Für allgemeine Fragen, Beschwerden und Kundensupport',
  },
  {
    id: 'tech',
    email: 'tech@taskilo.com',
    department: 'Technischer Support',
    category: 'technical',
    isActive: true,
    assignedTo: 'emp_003',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'high',
    description: 'Für technische Probleme, Bugs und Plattform-spezifische Fragen',
  },
  {
    id: 'privacy',
    email: 'privacy@taskilo.com',
    department: 'Datenschutz',
    category: 'legal',
    isActive: true,
    assignedTo: 'emp_001',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'high',
    description: 'Für Datenschutzanfragen, DSGVO-Auskunft und Löschung von Daten',
  },
  {
    id: 'business',
    email: 'business@taskilo.com',
    department: 'Geschäftsanfragen',
    category: 'business',
    isActive: true,
    assignedTo: 'emp_004',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'medium',
    description: 'Für Partnerschaftsanfragen, B2B-Kooperationen und Geschäftsentwicklung',
  },
  {
    id: 'billing',
    email: 'billing@taskilo.com',
    department: 'Rechnungsfragen',
    category: 'business',
    isActive: true,
    assignedTo: 'emp_004',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'medium',
    description: 'Für Fragen zu Rechnungen, Zahlungen und Abrechnungen',
  },
  {
    id: 'disputes',
    email: 'disputes@taskilo.com',
    department: 'Beschwerden & Mediation',
    category: 'legal',
    isActive: true,
    assignedTo: 'emp_005',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'high',
    description: 'Für Streitbeilegung, Mediation zwischen Kunden und Dienstleistern',
  },
  {
    id: 'press',
    email: 'press@taskilo.com',
    department: 'Presse & Medien',
    category: 'business',
    isActive: true,
    assignedTo: 'emp_006',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'low',
    description: 'Für Presseanfragen, Medienanfragen und PR-Kooperationen',
  },
  {
    id: 'info',
    email: 'info@taskilo.com',
    department: 'Allgemeine Informationen',
    category: 'primary',
    isActive: true,
    assignedTo: 'emp_002',
    assignedDate: '2025-07-22T00:00:00Z',
    priority: 'medium',
    description: 'Für allgemeine Informationen und erste Kontaktaufnahme',
  },
];

const EMPLOYEES: Employee[] = [
  {
    id: 'master_001',
    name: 'Andy Staudinger',
    email: 'andy@taskilo.com',
    role: 'master',
    departments: ['all'],
    isActive: true,
    permissions: [
      'view_all',
      'reassign',
      'create_employee',
      'delete_employee',
      'manage_permissions',
    ],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-22T10:00:00Z',
  },
  {
    id: 'emp_001',
    name: 'Elisabeth Schröder',
    email: 'elisabeth@taskilo.com',
    role: 'employee',
    departments: ['legal', 'privacy'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-22T09:30:00Z',
  },
  {
    id: 'emp_002',
    name: 'Max Müller',
    email: 'max@taskilo.com',
    role: 'employee',
    departments: ['support', 'general'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-22T08:45:00Z',
  },
  {
    id: 'emp_003',
    name: 'Sarah Weber',
    email: 'sarah@taskilo.com',
    role: 'employee',
    departments: ['technical'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'escalate'],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-22T09:15:00Z',
  },
  {
    id: 'emp_004',
    name: 'Thomas Schmidt',
    email: 'thomas@taskilo.com',
    role: 'employee',
    departments: ['business', 'billing'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-22T07:20:00Z',
  },
  {
    id: 'emp_005',
    name: 'Lisa Wagner',
    email: 'lisa@taskilo.com',
    role: 'employee',
    departments: ['disputes', 'mediation'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'escalate'],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-22T09:00:00Z',
  },
  {
    id: 'emp_006',
    name: 'Michael Braun',
    email: 'michael@taskilo.com',
    role: 'employee',
    departments: ['press', 'marketing'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    createdAt: '2025-07-22T00:00:00Z',
    lastLogin: '2025-07-21T16:30:00Z',
  },
];

// GET /api/admin/email-management - Get email management data
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const employeeId = url.searchParams.get('employeeId');
    const role = url.searchParams.get('role') || 'employee';

    console.log('[API /admin/email-management] GET request:', { action, employeeId, role });

    // Authenticate user (in production, verify JWT token)
    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID required' }, { status: 401 });
    }

    const employee = EMPLOYEES.find(emp => emp.id === employeeId && emp.isActive);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found or inactive' },
        { status: 404 }
      );
    }

    // Action: Get dashboard overview
    if (action === 'dashboard') {
      let assignedContacts = EMAIL_CONTACTS;

      // Filter by role
      if (employee.role === 'employee') {
        assignedContacts = EMAIL_CONTACTS.filter(contact => contact.assignedTo === employeeId);
      }

      const dashboardData = {
        employee: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          departments: employee.departments,
          permissions: employee.permissions,
        },
        assignedContacts: assignedContacts.map(contact => ({
          id: contact.id,
          email: contact.email,
          department: contact.department,
          priority: contact.priority,
          isActive: contact.isActive,
          assignedTo: contact.assignedTo,
          assignedEmployee:
            EMPLOYEES.find(emp => emp.id === contact.assignedTo)?.name || 'Unassigned',
        })),
        statistics: {
          totalContacts: assignedContacts.length,
          highPriority: assignedContacts.filter(c => c.priority === 'high').length,
          mediumPriority: assignedContacts.filter(c => c.priority === 'medium').length,
          lowPriority: assignedContacts.filter(c => c.priority === 'low').length,
          unassigned: EMAIL_CONTACTS.filter(c => !c.assignedTo).length,
        },
      };

      return NextResponse.json({
        success: true,
        dashboard: dashboardData,
      });
    }

    // Action: Get all employees (master only)
    if (action === 'employees') {
      if (employee.role !== 'master') {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        employees: EMPLOYEES.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          departments: emp.departments,
          isActive: emp.isActive,
          lastLogin: emp.lastLogin,
          assignedContactsCount: EMAIL_CONTACTS.filter(c => c.assignedTo === emp.id).length,
        })),
      });
    }

    // Action: Get assignment history (master only)
    if (action === 'assignments') {
      if (employee.role !== 'master') {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Mock assignment history
      const assignments = EMAIL_CONTACTS.map(contact => ({
        id: `assign_${contact.id}`,
        emailContactId: contact.id,
        email: contact.email,
        department: contact.department,
        employeeId: contact.assignedTo,
        employeeName: EMPLOYEES.find(emp => emp.id === contact.assignedTo)?.name || 'Unassigned',
        assignedBy: 'master_001',
        assignedAt: contact.assignedDate,
        status: 'active',
        priority: contact.priority,
      }));

      return NextResponse.json({
        success: true,
        assignments,
      });
    }

    // Default: Return employee's assigned contacts
    let contacts = EMAIL_CONTACTS;
    if (employee.role === 'employee') {
      contacts = contacts.filter(contact => contact.assignedTo === employeeId);
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
      },
      contacts: contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('[API /admin/email-management] Error in GET:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve email management data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/email-management - Manage email assignments (master only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, employeeId, emailContactId, targetEmployeeId, priority, notes } = body;

    console.log('[API /admin/email-management] POST request:', body);

    // Authenticate master user
    const employee = EMPLOYEES.find(
      emp => emp.id === employeeId && emp.role === 'master' && emp.isActive
    );
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Master authentication required' },
        { status: 403 }
      );
    }

    // Action: Reassign email contact
    if (action === 'reassign') {
      const contact = EMAIL_CONTACTS.find(c => c.id === emailContactId);
      const targetEmployee = EMPLOYEES.find(emp => emp.id === targetEmployeeId && emp.isActive);

      if (!contact || !targetEmployee) {
        return NextResponse.json(
          { success: false, error: 'Contact or target employee not found' },
          { status: 404 }
        );
      }

      // Update assignment (in production, update database)
      const contactIndex = EMAIL_CONTACTS.findIndex(c => c.id === emailContactId);
      if (contactIndex !== -1) {
        EMAIL_CONTACTS[contactIndex] = {
          ...EMAIL_CONTACTS[contactIndex],
          assignedTo: targetEmployeeId,
          assignedDate: new Date().toISOString(),
        };
      }

      return NextResponse.json({
        success: true,
        message: `Email ${contact.email} reassigned to ${targetEmployee.name}`,
        assignment: {
          emailContact: contact.email,
          previousEmployee: EMPLOYEES.find(emp => emp.id === contact.assignedTo)?.name,
          newEmployee: targetEmployee.name,
          assignedAt: new Date().toISOString(),
          notes,
        },
      });
    }

    // Action: Update priority
    if (action === 'update_priority') {
      const contact = EMAIL_CONTACTS.find(c => c.id === emailContactId);
      if (!contact) {
        return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
      }

      // Update priority (in production, update database)
      const contactIndex = EMAIL_CONTACTS.findIndex(c => c.id === emailContactId);
      if (contactIndex !== -1) {
        EMAIL_CONTACTS[contactIndex] = {
          ...EMAIL_CONTACTS[contactIndex],
          priority: priority as 'low' | 'medium' | 'high',
        };
      }

      return NextResponse.json({
        success: true,
        message: `Priority updated for ${contact.email}`,
        contact: EMAIL_CONTACTS[contactIndex],
      });
    }

    // Action: Activate/Deactivate contact
    if (action === 'toggle_active') {
      const contact = EMAIL_CONTACTS.find(c => c.id === emailContactId);
      if (!contact) {
        return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
      }

      // Toggle active status (in production, update database)
      const contactIndex = EMAIL_CONTACTS.findIndex(c => c.id === emailContactId);
      if (contactIndex !== -1) {
        EMAIL_CONTACTS[contactIndex] = {
          ...EMAIL_CONTACTS[contactIndex],
          isActive: !EMAIL_CONTACTS[contactIndex].isActive,
        };
      }

      return NextResponse.json({
        success: true,
        message: `Contact ${contact.email} ${contact.isActive ? 'deactivated' : 'activated'}`,
        contact: EMAIL_CONTACTS[contactIndex],
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /admin/email-management] Error in POST:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process email management request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

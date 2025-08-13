// Admin Agents/Staff Management für Ticket-Zuweisungen
export interface AdminAgent {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'support' | 'technical' | 'manager';
  department?: string;
  isActive: boolean;
  avatar?: string;
}

// Standard-Mitarbeiter für das System
export const DEFAULT_ADMIN_AGENTS: AdminAgent[] = [
  {
    id: 'admin-1',
    name: 'System Administrator',
    email: 'admin@taskilo.de',
    role: 'admin',
    department: 'IT',
    isActive: true,
  },
  {
    id: 'support-1',
    name: 'Support Team',
    email: 'support@taskilo.de',
    role: 'support',
    department: 'Customer Service',
    isActive: true,
  },
  {
    id: 'tech-1',
    name: 'Technical Support',
    email: 'tech@taskilo.de',
    role: 'technical',
    department: 'Engineering',
    isActive: true,
  },
];

// Alle verfügbaren Agenten abrufen
export function getAvailableAgents(): AdminAgent[] {
  return DEFAULT_ADMIN_AGENTS.filter(agent => agent.isActive);
}

// Agent by ID finden
export function getAgentById(id: string): AdminAgent | undefined {
  return DEFAULT_ADMIN_AGENTS.find(agent => agent.id === id);
}

// Agent by Email finden
export function getAgentByEmail(email: string): AdminAgent | undefined {
  return DEFAULT_ADMIN_AGENTS.find(agent => agent.email === email);
}

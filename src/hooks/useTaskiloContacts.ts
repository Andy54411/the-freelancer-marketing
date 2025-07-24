// src/hooks/useTaskiloContacts.ts
import { useState, useEffect, useCallback } from 'react';

interface TaskiloContact {
  id: string;
  department: string;
  email: string;
  description: string;
  category: 'primary' | 'support' | 'business' | 'legal' | 'technical';
  isActive: boolean;
}

interface ContactsResponse {
  success: boolean;
  total: number;
  contacts: TaskiloContact[];
  metadata?: {
    categories: string[];
    domain: string;
    lastUpdated: string;
  };
}

interface AGBContact {
  section: string;
  purpose: string;
  email: string;
  description: string;
}

interface AGBContactsResponse {
  success: boolean;
  total?: number;
  contacts?: AGBContact[];
  integration?: {
    contactBlock: Record<string, string>;
    sectionMapping: Record<string, any>;
  };
  metadata?: {
    domain: string;
    totalContacts: number;
    lastUpdated: string;
  };
}

export const useTaskiloContacts = () => {
  const [contacts, setContacts] = useState<TaskiloContact[]>([]);
  const [agbContacts, setAGBContacts] = useState<AGBContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all Taskilo contacts
  const fetchContacts = useCallback(
    async (params?: { category?: string; active?: boolean; format?: 'simple' | 'full' }) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.append('category', params.category);
        if (params?.active !== undefined) searchParams.append('active', params.active.toString());
        if (params?.format) searchParams.append('format', params.format);

        const response = await fetch(`/api/contacts?${searchParams.toString()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ContactsResponse = await response.json();

        if (data.success) {
          setContacts(data.contacts);
          return data;
        } else {
          throw new Error('Failed to fetch contacts');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('[useTaskiloContacts] Error fetching contacts:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch AGB-specific contacts
  const fetchAGBContacts = useCallback(
    async (params?: { section?: string; format?: 'mapping' | 'integration' }) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        if (params?.section) searchParams.append('section', params.section);
        if (params?.format) searchParams.append('format', params.format);

        const response = await fetch(`/api/contacts/agb?${searchParams.toString()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AGBContactsResponse = await response.json();

        if (data.success) {
          if (data.contacts) {
            setAGBContacts(data.contacts);
          }
          return data;
        } else {
          throw new Error('Failed to fetch AGB contacts');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('[useTaskiloContacts] Error fetching AGB contacts:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Validate email for AGB integration
  const validateEmail = useCallback(async (email: string, section?: string) => {
    try {
      const response = await fetch('/api/contacts/agb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validate',
          email,
          section,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.validation : null;
    } catch (err) {
      console.error('[useTaskiloContacts] Error validating email:', err);
      return null;
    }
  }, []);

  // Get email suggestions for AGB section
  const getSuggestions = useCallback(async (section: string) => {
    try {
      const response = await fetch('/api/contacts/agb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'suggest',
          section,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.suggestions : [];
    } catch (err) {
      console.error('[useTaskiloContacts] Error getting suggestions:', err);
      return [];
    }
  }, []);

  // Helper functions for common use cases
  const getContactByCategory = useCallback(
    (category: string) => {
      return contacts.filter(contact => contact.category === category);
    },
    [contacts]
  );

  const getContactByEmail = useCallback(
    (email: string) => {
      return contacts.find(contact => contact.email === email);
    },
    [contacts]
  );

  const getAllEmails = useCallback(() => {
    return contacts.map(contact => contact.email);
  }, [contacts]);

  const getContactBlock = useCallback(() => {
    return {
      legal: contacts.find(c => c.id === 'legal')?.email || 'legal@taskilo.de',
      support: contacts.find(c => c.id === 'support')?.email || 'support@taskilo.de',
      tech: contacts.find(c => c.id === 'tech')?.email || 'tech@taskilo.de',
      privacy: contacts.find(c => c.id === 'privacy')?.email || 'privacy@taskilo.de',
      business: contacts.find(c => c.id === 'business')?.email || 'business@taskilo.de',
      billing: contacts.find(c => c.id === 'billing')?.email || 'billing@taskilo.de',
      info: contacts.find(c => c.id === 'info')?.email || 'info@taskilo.de',
      disputes: contacts.find(c => c.id === 'disputes')?.email || 'disputes@taskilo.de',
      press: contacts.find(c => c.id === 'press')?.email || 'press@taskilo.de',
    };
  }, [contacts]);

  // Load initial data on mount
  useEffect(() => {
    fetchContacts();
    fetchAGBContacts();
  }, [fetchContacts, fetchAGBContacts]);

  return {
    // Data
    contacts,
    agbContacts,
    loading,
    error,

    // Actions
    fetchContacts,
    fetchAGBContacts,
    validateEmail,
    getSuggestions,

    // Helpers
    getContactByCategory,
    getContactByEmail,
    getAllEmails,
    getContactBlock,
  };
};

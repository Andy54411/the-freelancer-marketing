// AWS Lambda API Configuration für Taskilo Email System
export const AWS_EMAIL_API = {
  // Fallback zu Vercel API Routes wegen CORS-Problemen mit Lambda
  baseUrl: '', // Relative URLs für Vercel API Routes
  endpoints: {
    // E-Mail Management - verwende Vercel API Routes als Fallback
    sendEmail: '/api/admin/emails/send',
    getEmails: '/api/admin/emails/inbox',
    updateEmail: '/api/admin/emails/inbox',
    deleteEmail: '/api/admin/emails/inbox',

    // Template Management
    getTemplates: '/api/admin/emails/templates',
    createTemplate: '/api/admin/emails/templates',
    updateTemplate: '/api/admin/emails/templates',
    deleteTemplate: '/api/admin/emails/templates',

    // Kontakt Management
    getContacts: '/api/admin/emails/contacts',
    createContact: '/api/admin/emails/contacts',
    updateContact: '/api/admin/emails/contacts',
    deleteContact: '/api/admin/emails/contacts',

    // Bulk Operations
    sendBulkEmails: '/api/admin/emails/bulk-send',
  },
};

// AWS Lambda URLs als Backup (wenn CORS behoben ist)
export const AWS_LAMBDA_API = {
  baseUrl: 'https://n5h6gsveai.execute-api.eu-central-1.amazonaws.com/prod',
  endpoints: {
    sendEmail: '/admin/emails/send',
    getEmails: '/admin/emails',
    updateEmail: '/admin/emails',
    deleteEmail: '/admin/emails',
    getTemplates: '/admin/emails/templates',
    createTemplate: '/admin/emails/templates',
    updateTemplate: '/admin/emails/templates',
    deleteTemplate: '/admin/emails/templates',
    getContacts: '/admin/emails/contacts',
    createContact: '/admin/emails/contacts',
    updateContact: '/admin/emails/contacts',
    deleteContact: '/admin/emails/contacts',
    sendBulkEmails: '/admin/emails/bulk-send',
  },
};

// Helper Funktion für API-Aufrufe
export const callEmailAPI = async (endpoint: string, method: string = 'GET', data?: any) => {
  const url = `${AWS_EMAIL_API.baseUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

   // Debug log

  const response = await fetch(url, options);

   // Debug log

  if (!response.ok) {
    const errorText = await response.text();
     // Debug log
    throw new Error(`API Error: ${response.status} - ${response.statusText || errorText}`);
  }

  const result = await response.json();
   // Debug log
  return result;
};

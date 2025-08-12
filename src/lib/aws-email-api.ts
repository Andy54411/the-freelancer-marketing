// AWS Lambda API Configuration für Taskilo Email System
export const AWS_EMAIL_API = {
  baseUrl: 'https://n5h6gsveai.execute-api.eu-central-1.amazonaws.com/prod',
  endpoints: {
    // E-Mail Management
    sendEmail: '/admin/emails/send',
    getEmails: '/admin/emails',
    updateEmail: '/admin/emails',
    deleteEmail: '/admin/emails',

    // Template Management
    getTemplates: '/admin/emails/templates',
    createTemplate: '/admin/emails/templates',
    updateTemplate: '/admin/emails/templates',
    deleteTemplate: '/admin/emails/templates',

    // Kontakt Management
    getContacts: '/admin/emails/contacts',
    createContact: '/admin/emails/contacts',
    updateContact: '/admin/emails/contacts',
    deleteContact: '/admin/emails/contacts',

    // Bulk Operations
    sendBulkEmails: '/admin/emails/bulk',
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

  console.log('🔍 API Call:', { url, method, data }); // Debug log

  const response = await fetch(url, options);

  console.log('📡 API Response:', { status: response.status, statusText: response.statusText }); // Debug log

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error Details:', errorText); // Debug log
    throw new Error(`API Error: ${response.status} - ${response.statusText || errorText}`);
  }

  const result = await response.json();
  console.log('✅ API Success:', result); // Debug log
  return result;
};

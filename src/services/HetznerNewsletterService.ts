// Hetzner Newsletter Service - Ruft die Hetzner webmail-proxy Newsletter-API auf
// Ersetzt den Firebase-basierten NewsletterService

const HETZNER_API_URL = process.env.NEXT_PUBLIC_HETZNER_WEBMAIL_URL || 'https://mail.taskilo.de';

export interface HetznerNewsletterSubscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'pending' | 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  source: 'website' | 'import' | 'api' | 'manual' | 'footer';
  tags: string[];
  confirmedAt: number | null;
  unsubscribedAt: number | null;
  emailsSent: number;
  emailsOpened: number;
  linksClicked: number;
  createdAt: number;
  updatedAt: number;
}

export interface HetznerNewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  fromName: string;
  fromEmail: string;
  htmlContent: string;
  textContent: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  recipientType: 'all' | 'segment' | 'tags';
  recipientTags: string[];
  scheduledAt: number | null;
  sentAt: number | null;
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  createdAt: number;
  updatedAt: number;
}

export interface HetznerNewsletterTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  htmlContent: string;
  textContent: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HetznerNewsletterAnalytics {
  totalSubscribers: number;
  activeSubscribers: number;
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}

export class HetznerNewsletterService {
  // ==========================================================================
  // SUBSCRIBERS
  // ==========================================================================

  static async getSubscribers(options?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<HetznerNewsletterSubscriber[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.search) params.append('search', options.search);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribers?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Abonnenten');
    }

    return data.subscribers;
  }

  static async addSubscriber(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    source?: 'website' | 'import' | 'api' | 'manual' | 'footer';
    tags?: string[];
  }): Promise<{ success: boolean; subscriberId?: string; error?: string; requiresConfirmation?: boolean }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  static async updateSubscriber(id: string, data: {
    firstName?: string;
    lastName?: string;
    tags?: string[];
    status?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  static async deleteSubscriber(id: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribers/${id}`, {
      method: 'DELETE',
    });

    return await response.json();
  }

  static async confirmSubscription(id: string, token: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, token }),
    });

    return await response.json();
  }

  static async unsubscribe(email: string, token?: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, reason }),
    });

    return await response.json();
  }

  // ==========================================================================
  // CAMPAIGNS
  // ==========================================================================

  static async getCampaigns(status?: string): Promise<HetznerNewsletterCampaign[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/campaigns?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Kampagnen');
    }

    return data.campaigns;
  }

  static async getCampaign(id: string): Promise<HetznerNewsletterCampaign | null> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/campaigns/${id}`);
    const data = await response.json();

    if (!data.success) {
      return null;
    }

    return data.campaign;
  }

  static async createCampaign(data: {
    name: string;
    subject: string;
    previewText?: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    htmlContent: string;
    textContent?: string;
    templateId?: string;
    recipientType?: 'all' | 'segment' | 'tags';
    recipientTags?: string[];
  }): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  static async updateCampaign(id: string, data: Partial<HetznerNewsletterCampaign>): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  static async deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/campaigns/${id}`, {
      method: 'DELETE',
    });

    return await response.json();
  }

  static async sendCampaign(id: string): Promise<{ success: boolean; sent?: number; errors?: number; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/campaigns/${id}/send`, {
      method: 'POST',
    });

    return await response.json();
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  static async getTemplates(category?: string): Promise<HetznerNewsletterTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/templates?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Templates');
    }

    return data.templates;
  }

  static async createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    htmlContent: string;
    textContent?: string;
    isDefault?: boolean;
  }): Promise<{ success: boolean; templateId?: string; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  static async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    htmlContent?: string;
    textContent?: string;
    isDefault?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  static async deleteTemplate(id: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/templates/${id}`, {
      method: 'DELETE',
    });

    return await response.json();
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  static async getAnalytics(campaignId?: string): Promise<HetznerNewsletterAnalytics> {
    const params = new URLSearchParams();
    if (campaignId) params.append('campaignId', campaignId);

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/analytics?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Analytics');
    }

    return data.analytics;
  }

  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  static async getSettings(): Promise<{
    defaultFromName: string;
    defaultFromEmail: string;
    doubleOptIn: boolean;
    welcomeEmailEnabled: boolean;
    companyName: string;
    companyAddress: string;
  }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/settings`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Einstellungen');
    }

    return data.settings;
  }

  static async updateSettings(data: {
    defaultFromName?: string;
    defaultFromEmail?: string;
    doubleOptIn?: boolean;
    welcomeEmailEnabled?: boolean;
    companyName?: string;
    companyAddress?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return await response.json();
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  static async cleanup(hoursOld?: number): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hoursOld }),
    });

    return await response.json();
  }
}

export default HetznerNewsletterService;

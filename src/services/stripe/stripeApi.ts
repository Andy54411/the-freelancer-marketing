import { getAuth } from "firebase/auth";

interface StripeApiOptions {
  action: 'create_account' | 'upload_documents' | 'update_account' | 'create_payment' | 'create_payout' | 'get_account_status';
  data: any;
}

/**
 * Zentraler Helper für Stripe API Calls
 */
export async function callStripeApi({ action, data }: StripeApiOptions) {
  const auth = getAuth();
  const idToken = await auth.currentUser?.getIdToken();

  if (!idToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      action,
      data
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Beispiel-Funktionen für häufige Operationen
export async function createStripeAccount(data: {
  email: string;
  country: string;
  businessType: string;
  companyName: string;
  mcc?: string;
}) {
  return callStripeApi({
    action: 'create_account',
    data
  });
}

export async function uploadStripeDocuments(data: {
  accountId: string;
  files: {
    identity?: File;
    address?: File;
    business?: File;
  };
}) {
  return callStripeApi({
    action: 'upload_documents',
    data
  });
}

export async function createStripePayment(data: {
  amount: number;
  currency: string;
  customerId: string;
  accountId: string;
  description: string;
}) {
  return callStripeApi({
    action: 'create_payment',
    data
  });
}

export async function createStripePayout(data: {
  accountId: string;
  amount: number;
  currency?: string;
}) {
  return callStripeApi({
    action: 'create_payout',
    data
  });
}

export async function getStripeAccountStatus(accountId: string) {
  return callStripeApi({
    action: 'get_account_status',
    data: { accountId }
  });
}
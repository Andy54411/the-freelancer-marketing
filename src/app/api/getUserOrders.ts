// src/api/getUserOrders.ts
import { FIREBASE_FUNCTIONS_BASE_URL } from '@/lib/constants';

export const getUserOrders = async (
  userId: string,
  idToken: string,
  userType: 'customer' | 'provider' = 'customer',
  limit = 20,
  lastOrderId?: string
) => {
  // Use local API route in development, Cloud Function in production
  const isLocalDevelopment = process.env.NODE_ENV === 'development' ||
                           typeof window !== 'undefined' && window.location.hostname === 'localhost';

  const apiUrl = isLocalDevelopment
    ? '/api/getUserOrdersHTTP'
    : `${FIREBASE_FUNCTIONS_BASE_URL}/getUserOrdersHTTP`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ userType, limit, lastOrderId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.orders;
};

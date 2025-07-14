// src/api/getUserOrders.ts
import { FIREBASE_FUNCTIONS_BASE_URL } from '@/lib/constants';

export const getUserOrders = async (userId: string, idToken: string) => {
  const apiBaseUrl = FIREBASE_FUNCTIONS_BASE_URL;

  const response = await fetch(`${apiBaseUrl}/getUserOrders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.orders;
};

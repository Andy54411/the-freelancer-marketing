// src/api/getOrderParticipantDetails.ts

export const getOrderParticipantDetails = async (orderId: string, idToken: string) => {
  // KORRIGIERT: Verwende immer absolute URLs
  const apiUrl = '/api/getOrderParticipantDetails'; // Absolute path from domain root

  // CRITICAL: Validate orderId before making API call
  if (!orderId || orderId === 'undefined' || orderId === 'null') {
    throw new Error(`Invalid orderId: ${orderId}`);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return { provider: data.provider, customer: data.customer };
};

// src/api/getSingleOrder.ts

export const getSingleOrder = async (orderId: string, idToken: string) => {
  // KORRIGIERT: Verwende immer absolute URLs
  const apiUrl = '/api/getSingleOrder'; // Absolute path from domain root

  console.log('🔍 getSingleOrder API Call:', { orderId, apiUrl });

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
    console.error('❌ getSingleOrder API Error:', { status: response.status, errorData });
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.order;
};

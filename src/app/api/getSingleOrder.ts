// src/api/getSingleOrder.ts

export const getSingleOrder = async (orderId: string, idToken: string) => {
  // Use local API route in development, Cloud Function in production
  const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
                           typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  const apiUrl = isLocalDevelopment 
    ? '/api/getSingleOrder'
    : `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL}/getSingleOrder`;

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
  return data.order;
};

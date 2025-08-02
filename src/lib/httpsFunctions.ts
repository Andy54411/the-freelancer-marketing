import { auth } from '@/firebase/clients';
import { getFunctions, httpsCallable } from 'firebase/functions';

export async function callHttpsFunction(
  functionName: string,
  data: any,
  method: 'GET' | 'POST' = 'POST'
): Promise<any> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('🔐 callHttpsFunction - User UID:', user.uid);
  console.log('📡 callHttpsFunction - Function:', functionName);
  console.log('📊 callHttpsFunction - Data:', data);

  // Verwende direkte HTTP-Requests für alle Functions
  return await callHttpsFunctionDirect(functionName, data, method);
}

// Fallback für direkte HTTP-Requests (für ältere Functions)
async function callHttpsFunctionDirect(
  functionName: string,
  data: any,
  method: 'GET' | 'POST' = 'POST'
): Promise<any> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  // Special handling for getProviderOrders - use Next.js API proxy to avoid CORS issues
  if (functionName === 'getProviderOrders') {
    let url = '/api/get-provider-orders';
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (method === 'GET') {
      // For GET requests, add data as query parameters
      if (data) {
        const params = new URLSearchParams();
        Object.keys(data).forEach(key => {
          params.append(key, data[key]);
        });
        url += `?${params.toString()}`;
      }
    } else {
      // For POST requests, add data to body
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  }

  // For all other functions, use direct Firebase Functions calls
  const baseUrl = 'https://europe-west1-tilvo-f142f.cloudfunctions.net';
  let url = `${baseUrl}/${functionName}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (method === 'GET') {
    // For GET requests, add data as query parameters
    if (data) {
      const params = new URLSearchParams();
      Object.keys(data).forEach(key => {
        params.append(key, data[key]);
      });
      url += `?${params.toString()}`;
    }
  } else {
    // For POST requests, add data to body
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return result;
}

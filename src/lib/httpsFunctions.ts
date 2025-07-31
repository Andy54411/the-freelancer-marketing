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

  try {
    // Verwende Firebase Functions SDK für onCall functions
    const functions = getFunctions();
    const callableFunction = httpsCallable(functions, functionName);

    console.log('🚀 Calling Firebase Function via SDK:', functionName);
    const result = await callableFunction(data);

    console.log('✅ Function result:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('❌ Firebase Function call failed:', error);

    // Fallback zu HTTP-Request für ältere Functions die noch nicht onCall sind
    console.log('🔄 Falling back to HTTP request...');
    return await callHttpsFunctionDirect(functionName, data, method);
  }
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

import { auth } from "@/firebase/clients";

export async function callHttpsFunction(
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
  let options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
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

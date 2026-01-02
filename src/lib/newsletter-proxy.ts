// Zentrale Konfiguration für Newsletter-Proxy zum Hetzner-Server
export const HETZNER_NEWSLETTER_URL = process.env.HETZNER_WEBMAIL_URL || 'https://mail.taskilo.de';

export async function proxyToHetzner(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<{ data: unknown; status: number }> {
  const { method = 'GET', body, headers = {} } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${HETZNER_NEWSLETTER_URL}${path}`, fetchOptions);
  const data = await response.json();

  return { data, status: response.status };
}

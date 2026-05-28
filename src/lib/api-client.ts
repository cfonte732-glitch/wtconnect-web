import { getAccessToken } from './auth-client';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL manquant');
  }

  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: unknown }).error)
        : res.statusText;
    throw new ApiError(msg || 'Erreur API', res.status, body);
  }

  return body as T;
}

export type ConnectTenant = {
  id: string;
  name: string;
  role: string;
  default_carrier_code?: string;
};

export type ConnectMessage = {
  id: string;
  tenant_id: string;
  created_at: string;
  status: string;
  num_cde: string | null;
  payload_raw: unknown;
  payload_transformed?: unknown | null;
  errors?: unknown;
};

export async function fetchConnectTenants() {
  return apiFetch<{ items: ConnectTenant[] }>('/connect/tenants');
}

export async function fetchConnectMessages(params: { tenant_id: string; limit?: number; q?: string }) {
  const q = new URLSearchParams();
  q.set('tenant_id', params.tenant_id);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.q) q.set('q', params.q);
  return apiFetch<{ items: ConnectMessage[] }>(`/connect/messages?${q.toString()}`);
}

export async function fetchAuthSession() {
  return apiFetch<{
    user: { id: string; email?: string };
    memberships: { tenant_id: string; role: string }[];
  }>('/auth/session');
}

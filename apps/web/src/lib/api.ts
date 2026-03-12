import type { Alias, CreateRoomInput, Salon, SessionIdentity } from '@cos/shared';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3001';

interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new ApiClientError(
      response.status,
      payload?.code ?? 'HTTP_ERROR',
      payload?.message ?? 'Request failed.',
      payload?.details,
    );
  }

  return (await response.json()) as T;
};

export const api = {
  async getSession() {
    try {
      return await request<SessionIdentity>('/auth/me');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        return null;
      }

      throw error;
    }
  },
  createSession(email: string) {
    return request<SessionIdentity>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  logout() {
    return request<void>('/auth/logout', { method: 'POST' });
  },
  createAlias(pseudo: string) {
    return request<SessionIdentity>('/aliases', {
      method: 'POST',
      body: JSON.stringify({ pseudo }),
    });
  },
  searchAliases(query: string) {
    if (!query.trim()) {
      return Promise.resolve({ aliases: [] as Alias[] });
    }

    return request<{ aliases: Alias[] }>(`/aliases/directory?query=${encodeURIComponent(query)}`);
  },
  listRooms(alias: string) {
    return request<{ rooms: Salon[] }>(`/salons?alias=${encodeURIComponent(alias)}`);
  },
  createPrivateRoom(payload: CreateRoomInput) {
    return request<{ room: Salon }>('/salons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  inviteAlias(roomName: string, inviterAlias: string, invitedAlias: string) {
    return request<{ room: Salon }>(`/salons/${encodeURIComponent(roomName)}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ inviterAlias, invitedAlias }),
    });
  },
  updateFavorite(pseudo: string, salonFavori: string) {
    return request<{ alias: Alias; aliases: Alias[] }>('/aliases/favorite', {
      method: 'PATCH',
      body: JSON.stringify({ pseudo, salonFavori }),
    });
  },
};

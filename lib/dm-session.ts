import { randomUUID } from "crypto";

type SessionStore = {
  tokens: Map<string, number>;
};

const globalStore = globalThis as unknown as { __DM_SESSIONS?: SessionStore };

function getStore(): SessionStore {
  if (!globalStore.__DM_SESSIONS) {
    globalStore.__DM_SESSIONS = { tokens: new Map() };
  }
  return globalStore.__DM_SESSIONS;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export function createSession(adminKey: string) {
  const expected = process.env.DM_KEY ?? "dm-secret";
  if (adminKey !== expected) return null;
  const token = randomUUID();
  const now = Date.now();
  getStore().tokens.set(token, now);
  return { token, expiresAt: now + SESSION_TTL_MS };
}

export function validateSession(token: string | undefined | null) {
  if (!token) return false;
  const store = getStore();
  const createdAt = store.tokens.get(token);
  if (!createdAt) return false;
  if (Date.now() - createdAt > SESSION_TTL_MS) {
    store.tokens.delete(token);
    return false;
  }
  return true;
}

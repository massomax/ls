const LS_KEY = "lp_access_token";

let inMemoryToken: string | null = null;
let loadedFromStorage = false;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function ensureLoaded() {
  if (loadedFromStorage) return;
  loadedFromStorage = true;

  if (!canUseStorage()) return;

  const saved = window.localStorage.getItem(LS_KEY);
  inMemoryToken = saved && saved.length > 0 ? saved : null;
}

export function getAccessToken(): string | null {
  ensureLoaded();
  return inMemoryToken;
}

export function setAccessToken(
  token: string | null,
  opts?: { persist?: boolean },
) {
  inMemoryToken = token;

  if (canUseStorage()) {
    if (opts?.persist) {
      if (token) window.localStorage.setItem(LS_KEY, token);
      else window.localStorage.removeItem(LS_KEY);
    }
  }

  listeners.forEach((fn) => fn(inMemoryToken));
}

export function clearAccessToken(opts?: { persist?: boolean }) {
  setAccessToken(null, opts);
}

export function subscribeAccessToken(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

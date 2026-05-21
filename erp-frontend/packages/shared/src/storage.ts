export interface TokenStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

class BrowserStorage implements TokenStorage {
  getItem(key: string) {
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  removeItem(key: string) {
    localStorage.removeItem(key);
  }
}

let storage: TokenStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  ? new BrowserStorage()
  : {
      _data: {} as Record<string, string>,
      getItem(key: string) { return this._data[key] ?? null; },
      setItem(key: string, value: string) { this._data[key] = value; },
      removeItem(key: string) { delete this._data[key]; },
    };

export function setTokenStorage(s: TokenStorage) {
  storage = s;
}

export function getTokenStorage(): TokenStorage {
  return storage;
}

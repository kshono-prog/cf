// shims/async-storage.ts
type KV = [string, string | null];

const mem = new Map<string, string>();

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return mem.has(key) ? mem.get(key)! : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    mem.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    mem.delete(key);
  },
  clear: async (): Promise<void> => {
    mem.clear();
  },
  getAllKeys: async (): Promise<string[]> => {
    return Array.from(mem.keys());
  },
  multiGet: async (keys: string[]): Promise<KV[]> => {
    return keys.map((k) => [k, mem.has(k) ? mem.get(k)! : null]);
  },
  multiSet: async (kvs: [string, string][]): Promise<void> => {
    kvs.forEach(([k, v]) => mem.set(k, v));
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    keys.forEach((k) => mem.delete(k));
  },
};

export default AsyncStorage;

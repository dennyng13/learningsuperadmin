// Supabase client trỏ về project IELTS Practice (jcavqutyfvalaugneash)
// Admin Portal dùng chung backend với app Student.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jcavqutyfvalaugneash.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYXZxdXR5ZnZhbGF1Z25lYXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTkxNTAsImV4cCI6MjA4OTk5NTE1MH0._VuWQLCWnD4DO9FdNl4839oHDv3JPNAGUH7JZy-VtnM";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createSafeStorage(): StorageLike {
  const memory = new Map<string, string>();

  const fallback: StorageLike = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probe = "__lp_storage_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch (error) {
    console.warn("[supabase] localStorage unavailable, using in-memory auth storage", error);
  }

  return fallback;
}

const authStorage = createSafeStorage();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

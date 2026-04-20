// Supabase client trỏ về project IELTS Practice (jcavqutyfvalaugneash)
// Admin Portal dùng chung backend với app Student.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jcavqutyfvalaugneash.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYXZxdXR5ZnZhbGF1Z25lYXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTkxNTAsImV4cCI6MjA4OTk5NTE1MH0._VuWQLCWnD4DO9FdNl4839oHDv3JPNAGUH7JZy-VtnM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

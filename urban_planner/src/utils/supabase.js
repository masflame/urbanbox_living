import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_PROJECT_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Separate client for the "accounts / orders" Supabase project
const accountUrl =
  import.meta.env.VITE_ACCOUNT_PROJECT_URL ||
  import.meta.env.VITE_STORAGE_PROJECT_URL;
const accountKey =
  import.meta.env.VITE_ACCOUNT_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STORAGE_PUBLISHABLE_KEY;

export const accountSupabase =
  accountUrl && accountKey
    ? createClient(accountUrl, accountKey, {
        auth: {
          // This client is only used for inserting/updating orders with the
          // anon publishable key. Disable auth/session storage so it doesn't
          // fight the main client over the auth-token Web Lock, and give it
          // a distinct storage key so GoTrue doesn't warn about duplicates.
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'sb-urbanbox-account-auth',
        },
      })
    : null

export const ORDERS_TABLE =
  import.meta.env.VITE_ACCOUNT_ORDERS_TABLE || 'orders'

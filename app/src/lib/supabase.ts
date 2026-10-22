import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 環境変数が設定されていなければ null(ブラウザ内保存で動く) */
export const supabase: SupabaseClient | null =
  url && key && !url.includes("xxxxxxxx") ? createClient(url, key) : null;

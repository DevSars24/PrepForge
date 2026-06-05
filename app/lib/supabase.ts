import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export async function uploadEvaluationFile(file: File, folder: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("prepforge-uploads").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    console.error("Supabase upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("prepforge-uploads").getPublicUrl(path);
  return data.publicUrl;
}

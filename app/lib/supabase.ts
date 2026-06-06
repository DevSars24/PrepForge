import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrepForgeError, logDebugError, normalizeError } from "@/lib/debug";

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
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from("prepforge-uploads").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      throw new PrepForgeError({
        kind: "file_upload_error",
        component: "uploadEvaluationFile",
        message: `Supabase upload failed for "${file.name}": ${error.message}`,
        request: { path, fileName: file.name, fileSize: file.size, mimeType: file.type },
        response: error,
      });
    }

    const { data } = supabase.storage.from("prepforge-uploads").getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    logDebugError(normalizeError(error, { kind: "file_upload_error", component: "uploadEvaluationFile" }));
    return null;
  }
}

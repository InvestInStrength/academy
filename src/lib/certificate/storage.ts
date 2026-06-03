import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/**
 * Certificate asset storage. All assets are public-safe (same data as the
 * public verification page), so the `certificates` bucket is public and assets
 * are served by their public URL. Writes use the service-role client; the
 * service-role key never reaches the browser.
 */

export const CERTIFICATES_BUCKET = "certificates";

/** Stable per-certificate object paths. Regeneration overwrites in place. */
export function assetPath(
  certificateId: string,
  file: "official.pdf" | "official-preview.png" | "instagram-story.png",
): string {
  return `${certificateId}/${file}`;
}

/** Uploads (upsert) an asset and returns its public URL. Throws on failure. */
export async function uploadCertificateAsset(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const service = createSupabaseServiceRoleClient();
  const { error } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) {
    throw new Error(`Storage upload failed for ${path}: ${error.message}`);
  }
  const { data } = service.storage.from(CERTIFICATES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

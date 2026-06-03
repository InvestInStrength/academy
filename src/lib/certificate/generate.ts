import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import type { CertificateAssetType } from "@/types/database";

import { renderSvgToPng, pngToPdf, A4_LANDSCAPE_PT } from "./assets";
import { assetPath, uploadCertificateAsset } from "./storage";

/**
 * Renders and stores the official PDF + PNG preview for a certificate from its
 * frozen snapshot SVG, then upserts the `certificate_assets` rows (one current
 * row per type; regeneration overwrites the files at stable paths).
 *
 * Best-effort by contract: it never throws to the caller, so issuing a
 * certificate is never blocked by a render/upload failure. The certificate
 * ID + verification token stay valid; a failure is logged
 * (`certificate_generation_failed`) and surfaces as "pending/failed" in the UI.
 * Service-role only (Storage write + admin-RLS table).
 */

type SnapshotShape = { svg?: unknown } | null;

export type AssetGenerationResult = {
  ok: boolean;
  generated: CertificateAssetType[];
  error?: string;
};

export async function generateCertificateAssets(
  certificateId: string,
): Promise<AssetGenerationResult> {
  const service = createSupabaseServiceRoleClient();

  let participantId: string | null = null;
  let assignmentId: string | null = null;

  try {
    const { data: cert } = await service
      .from("certificates")
      .select("id, certificate_public_snapshot, certification_assignment_id")
      .eq("id", certificateId)
      .maybeSingle();

    if (!cert) {
      return { ok: false, generated: [], error: "Certificate not found." };
    }
    assignmentId = cert.certification_assignment_id;

    const { data: assignment } = await service
      .from("certification_assignments")
      .select("participant_id")
      .eq("id", cert.certification_assignment_id)
      .maybeSingle();
    participantId = assignment?.participant_id ?? null;

    const snapshot = cert.certificate_public_snapshot as SnapshotShape;
    const svg = typeof snapshot?.svg === "string" ? snapshot.svg : null;
    if (!svg) {
      throw new Error("Certificate snapshot has no SVG to render.");
    }

    // Render once; the PDF embeds the same PNG so the two always match.
    const { png, width, height } = await renderSvgToPng(svg);
    const pdf = await pngToPdf(png);

    const previewUrl = await uploadCertificateAsset(
      assetPath(certificateId, "official-preview.png"),
      png,
      "image/png",
    );
    const pdfUrl = await uploadCertificateAsset(
      assetPath(certificateId, "official.pdf"),
      pdf,
      "application/pdf",
    );

    const { error: upsertError } = await service
      .from("certificate_assets")
      .upsert(
        [
          {
            certificate_id: certificateId,
            asset_type: "official_png_preview",
            file_url: previewUrl,
            mime_type: "image/png",
            width,
            height,
            file_size: png.byteLength,
            generated_at: new Date().toISOString(),
          },
          {
            certificate_id: certificateId,
            asset_type: "official_pdf",
            file_url: pdfUrl,
            mime_type: "application/pdf",
            width: Math.round(A4_LANDSCAPE_PT.width),
            height: Math.round(A4_LANDSCAPE_PT.height),
            file_size: pdf.byteLength,
            generated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "certificate_id,asset_type" },
      );
    if (upsertError) throw new Error(upsertError.message);

    if (participantId) {
      await service.from("account_history").insert({
        participant_id: participantId,
        certification_assignment_id: assignmentId,
        event_type: "certificate_assets_generated",
        event_label: "Certificate assets generated",
        event_data: { assets: ["official_pdf", "official_png_preview"] },
        created_by_admin_id: null,
      });
    }

    return { ok: true, generated: ["official_pdf", "official_png_preview"] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (participantId) {
      await service.from("account_history").insert({
        participant_id: participantId,
        certification_assignment_id: assignmentId,
        event_type: "certificate_generation_failed",
        event_label: "Certificate asset generation failed",
        event_data: { error: message },
        created_by_admin_id: null,
      });
    }
    return { ok: false, generated: [], error: message };
  }
}

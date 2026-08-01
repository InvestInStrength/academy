import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
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
 * ID + verification token stay valid; a failure surfaces as "pending/failed"
 * in the UI. Service-role only (Storage write + admin-RLS table).
 *
 * Both callers discard the returned error, so every failure is written to the
 * structured log here. The `certificate_generation_failed` history event is
 * additional, not primary: it needs a participant to hang off, and the failure
 * that broke generation may be the very reason we never resolved one.
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
  let participantId: string | null = null;
  let assignmentId: string | null = null;

  // Outside the try in every earlier version, which broke the never-throws
  // contract on a missing service-role key: the throw escaped into
  // issueCertificate *after* the certificate row already existed.
  let service: ReturnType<typeof createSupabaseServiceRoleClient>;
  try {
    service = createSupabaseServiceRoleClient();
  } catch (error) {
    logger.error("certificate_assets_client_unavailable", { certificateId }, error);
    return { ok: false, generated: [], error: "Service client unavailable." };
  }

  try {
    const { data: cert, error: certError } = await service
      .from("certificates")
      .select("id, certificate_public_snapshot, certification_assignment_id")
      .eq("id", certificateId)
      .maybeSingle();

    if (!cert) {
      logger.error("certificate_assets_certificate_missing", { certificateId }, certError);
      return { ok: false, generated: [], error: "Certificate not found." };
    }
    assignmentId = cert.certification_assignment_id;

    const { data: assignment, error: assignmentError } = await service
      .from("certification_assignments")
      .select("participant_id")
      .eq("id", cert.certification_assignment_id)
      .maybeSingle();
    if (assignmentError) {
      logger.error(
        "certificate_assets_assignment_load_failed",
        { certificateId, assignmentId },
        assignmentError,
      );
    }
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
      const { error: historyError } = await service.from("account_history").insert({
        participant_id: participantId,
        certification_assignment_id: assignmentId,
        event_type: "certificate_assets_generated",
        event_label: "Certificate assets generated",
        event_data: { assets: ["official_pdf", "official_png_preview"] },
        created_by_admin_id: null,
      });
      if (historyError) {
        logger.error(
          "certificate_assets_history_write_failed",
          { certificateId, assignmentId },
          historyError,
        );
      }
    }

    return { ok: true, generated: ["official_pdf", "official_png_preview"] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error(
      "certificate_assets_generation_failed",
      { certificateId, assignmentId, historyRecorded: Boolean(participantId) },
      error,
    );

    if (participantId) {
      const { error: historyError } = await service.from("account_history").insert({
        participant_id: participantId,
        certification_assignment_id: assignmentId,
        event_type: "certificate_generation_failed",
        event_label: "Certificate asset generation failed",
        event_data: { error: message },
        created_by_admin_id: null,
      });
      if (historyError) {
        logger.error(
          "certificate_assets_failure_history_write_failed",
          { certificateId, assignmentId },
          historyError,
        );
      }
    }

    return { ok: false, generated: [], error: message };
  }
}

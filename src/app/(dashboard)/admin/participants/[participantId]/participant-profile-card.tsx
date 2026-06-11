"use client";

import { useState } from "react";

import type { Participant } from "@/types/database";
import { useT } from "@/lib/i18n/client";
import { Card, CardContent } from "@/components/ui/card";
import { ParticipantForm } from "../participant-form";

/** Two-letter initials for the avatar (first + last name parts). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Profile-style identity header for a participant: the data is shown read-only
 * (labelled rows) with a pen toggle that swaps in the inline edit form. Saving
 * collapses back to the read-only view, which reflects the revalidated data.
 */
export function ParticipantProfileCard({ participant }: { participant: Participant }) {
  const t = useT();
  const [editing, setEditing] = useState(false);

  const rows: { label: string; value: string | null }[] = [
    { label: t("admin.forms.field.full_name"), value: participant.full_name },
    {
      label: t("admin.forms.field.display_name"),
      value: participant.certificate_display_name,
    },
    { label: t("common.email"), value: participant.email },
  ];

  return (
    <Card>
      <CardContent className="space-y-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ice/40 text-lg font-bold text-brand-700">
              {initials(participant.full_name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {participant.full_name}
              </h2>
              <p className="truncate text-sm text-slate-500">
                {participant.email ?? t("admin.participants.no_email_yet")}
              </p>
            </div>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t("common.edit")}
              title={t("common.edit")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
          )}
        </div>

        {editing ? (
          <div className="border-t border-slate-100 pt-4">
            <ParticipantForm
              participant={participant}
              onSaved={() => setEditing(false)}
            />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-3 text-sm text-slate-500 hover:text-slate-900"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm text-slate-800">
                  {row.value?.trim() ? (
                    row.value
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

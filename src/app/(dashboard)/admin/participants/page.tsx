import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { Participant } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantForm } from "./participant-form";

export default async function ParticipantsPage() {
  const { supabase } = await requireAdmin();
  const { locale, t } = await getServerT();

  const { data } = await supabase
    .from("participants")
    .select("*")
    .order("created_at", { ascending: false });

  const participants: Participant[] = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.participants.title")}
        description={t("admin.participants.description")}
      />

      {/* Primary action on top: add a participant before scanning the list. */}
      <Card className="border-brand-200 ring-1 ring-brand-100">
        <CardHeader className="border-brand-100 bg-brand-50/60">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <CardTitle>{t("admin.participants.create_card_title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-w-2xl">
            <ParticipantForm />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin.participants.list_title", { count: participants.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {participants.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              {t("admin.participants.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 font-medium">{t("admin.participants.col_name")}</th>
                    <th className="px-5 py-2 font-medium">{t("admin.participants.col_email")}</th>
                    <th className="px-5 py-2 font-medium">{t("admin.participants.col_added")}</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr
                      key={participant.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/participants/${participant.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {participant.full_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {participant.email ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(participant.created_at, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
    <div>
      <PageHeader
        title={t("admin.participants.title")}
        description={t("admin.participants.description")}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("admin.participants.create_card_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

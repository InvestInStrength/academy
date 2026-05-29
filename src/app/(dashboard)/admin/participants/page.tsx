import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import type { Participant } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantForm } from "./participant-form";

export default async function ParticipantsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("participants")
    .select("*")
    .order("created_at", { ascending: false });

  const participants: Participant[] = data ?? [];

  return (
    <div>
      <PageHeader
        title="Participants"
        description="Candidates being certified. Each can hold one active assignment per questionnaire."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>All participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {participants.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No participants yet. Create your first one on the right.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 font-medium">Name</th>
                    <th className="px-5 py-2 font-medium">Email</th>
                    <th className="px-5 py-2 font-medium">Added</th>
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
                        {formatDate(participant.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create a participant</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

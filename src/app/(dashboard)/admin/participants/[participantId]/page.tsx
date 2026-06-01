import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import { getActiveLanguage } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/content";
import type {
  AccountHistoryEvent,
  AdminProfile,
  CertificationAssignment,
  Participant,
} from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { GuardedDeleteButton } from "@/components/admin/guarded-delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantForm } from "../participant-form";
import { deleteParticipant } from "../actions";
import { AssignmentsSection } from "./assignments-section";
import { HistorySection } from "./history-section";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  const { supabase } = await requireAdmin();
  const locale = await getActiveLanguage();

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .maybeSingle<Participant>();

  if (!participant) {
    notFound();
  }

  const [
    { data: assignmentData },
    { data: questionnaireData },
    { data: topicData },
    { data: historyData },
    { data: adminData },
  ] = await Promise.all([
    supabase
      .from("certification_assignments")
      .select("id, questionnaire_id, access_token, status, active, created_at")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("questionnaires")
      .select("id, title, title_de, title_en, course_id, active")
      .order("title"),
    supabase
      .from("course_topics")
      .select("id, title, title_de, title_en, course_id")
      .order("sort_order"),
    supabase
      .from("account_history")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false }),
    supabase.from("admin_profiles").select("id, email"),
  ]);

  const assignments = (assignmentData ?? []) as Pick<
    CertificationAssignment,
    "id" | "questionnaire_id" | "access_token" | "status" | "active" | "created_at"
  >[];

  const assignmentIds = assignments.map((a) => a.id);
  const { data: assignmentTopicData } = assignmentIds.length
    ? await supabase
        .from("certification_assignment_topics")
        .select("certification_assignment_id, topic_id")
        .in("certification_assignment_id", assignmentIds)
    : { data: [] };
  const { data: certificateData } = assignmentIds.length
    ? await supabase
        .from("certificates")
        .select(
          "certification_assignment_id, certificate_number, status, verification_token",
        )
        .in("certification_assignment_id", assignmentIds)
    : { data: [] };

  const history = (historyData ?? []) as AccountHistoryEvent[];
  const admins = (adminData ?? []) as Pick<AdminProfile, "id" | "email">[];
  const adminEmailById = new Map(
    admins.map((a) => [a.id, a.email ?? "admin"]),
  );

  return (
    <div>
      <Link
        href="/admin/participants"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to participants
      </Link>
      <div className="mt-3">
        <PageHeader
          title={participant.full_name}
          description={participant.email ?? "No email on file yet."}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Participant details</CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantForm participant={participant} />
            </CardContent>
          </Card>

          <HistorySection events={history} adminEmailById={adminEmailById} />

          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-red-700">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Delete is only allowed when the participant has no assignments.
              </p>
              <GuardedDeleteButton
                action={deleteParticipant}
                hidden={{ id: participant.id }}
                confirm={`Delete "${participant.full_name}"?`}
              >
                Delete participant
              </GuardedDeleteButton>
            </CardContent>
          </Card>
        </div>

        <AssignmentsSection
          participantId={participant.id}
          assignments={assignments}
          questionnaires={(questionnaireData ?? []).map((q) => ({
            id: q.id,
            title: pickLocalized(q, "title", locale) ?? q.title,
            course_id: q.course_id,
            active: q.active,
          }))}
          topics={(topicData ?? []).map((t) => ({
            id: t.id,
            title: pickLocalized(t, "title", locale) ?? t.title,
            course_id: t.course_id,
          }))}
          assignmentTopics={
            (assignmentTopicData ?? []) as {
              certification_assignment_id: string;
              topic_id: string;
            }[]
          }
          certificates={
            (certificateData ?? []) as {
              certification_assignment_id: string;
              certificate_number: string;
              status: "valid" | "revoked";
              verification_token: string;
            }[]
          }
        />
      </div>
    </div>
  );
}

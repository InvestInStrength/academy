import { certificationUrl, verificationUrl } from "@/lib/public-url";
import { formatDate } from "@/lib/utils";
import type { AssignmentStatus, CertificateStatus } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-button";
import { AssignmentCreateForm } from "./assignment-create-form";
import { AssignmentTopicsForm } from "./assignment-topics-form";
import { ManualPassForm } from "./manual-pass-form";
import { CopyLinkButton } from "./copy-link-button";
import { regenerateAccessLink, toggleAssignmentActive } from "../actions";

type Assignment = {
  id: string;
  questionnaire_id: string;
  access_token: string;
  status: AssignmentStatus;
  active: boolean;
  created_at: string;
};

type Questionnaire = { id: string; title: string; course_id: string; active: boolean };
type Topic = { id: string; title: string; course_id: string };
type AssignmentTopic = { certification_assignment_id: string; topic_id: string };
type CertificateInfo = {
  certification_assignment_id: string;
  certificate_number: string;
  status: CertificateStatus;
  verification_token: string;
};

type Props = {
  participantId: string;
  assignments: Assignment[];
  questionnaires: Questionnaire[];
  topics: Topic[];
  assignmentTopics: AssignmentTopic[];
  certificates: CertificateInfo[];
};

const statusTone: Record<AssignmentStatus, "neutral" | "warning" | "success" | "danger"> = {
  not_started: "neutral",
  in_progress: "warning",
  passed: "success",
  failed: "danger",
};

const statusLabel: Record<AssignmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  passed: "Passed",
  failed: "Failed",
};

export function AssignmentsSection({
  participantId,
  assignments,
  questionnaires,
  topics,
  assignmentTopics,
  certificates,
}: Props) {
  const questionnaireById = new Map(questionnaires.map((q) => [q.id, q]));
  const activeQuestionnaires = questionnaires.filter((q) => q.active);
  const certificateByAssignment = new Map(
    certificates.map((c) => [c.certification_assignment_id, c]),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create a certification assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {activeQuestionnaires.length === 0 ? (
            <p className="text-sm text-slate-500">
              No active questionnaires available. Create and activate one first.
            </p>
          ) : (
            <AssignmentCreateForm
              participantId={participantId}
              questionnaires={activeQuestionnaires}
              topics={topics}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No assignments yet. Create one above.
            </p>
          ) : (
            assignments.map((assignment) => {
              const questionnaire = questionnaireById.get(assignment.questionnaire_id);
              const courseTopics = topics.filter(
                (topic) => topic.course_id === questionnaire?.course_id,
              );
              const selectedTopicIds = assignmentTopics
                .filter((row) => row.certification_assignment_id === assignment.id)
                .map((row) => row.topic_id);
              const selectedTitles = courseTopics
                .filter((topic) => selectedTopicIds.includes(topic.id))
                .map((topic) => topic.title);
              const link = certificationUrl(assignment.access_token);

              return (
                <div key={assignment.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {questionnaire?.title ?? "(deleted questionnaire)"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Created {formatDate(assignment.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone[assignment.status]}>
                        {statusLabel[assignment.status]}
                      </Badge>
                      <Badge tone={assignment.active ? "success" : "neutral"}>
                        {assignment.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Personal access link
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="flex-1 break-all rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                        {link}
                      </code>
                      <CopyLinkButton url={link} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Certificate topics
                    </p>
                    <p className="text-sm text-slate-700">
                      {selectedTitles.length > 0 ? selectedTitles.join(", ") : "None selected"}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-brand-700 hover:underline">
                        Edit certificate topics
                      </summary>
                      <div className="mt-2 rounded-md border border-slate-100 p-3">
                        <AssignmentTopicsForm
                          assignmentId={assignment.id}
                          topics={courseTopics}
                          selectedTopicIds={selectedTopicIds}
                        />
                      </div>
                    </details>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Certificate
                    </p>
                    {(() => {
                      const cert = certificateByAssignment.get(assignment.id);
                      if (cert) {
                        return (
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-slate-800">
                              {cert.certificate_number}
                            </span>
                            <Badge tone={cert.status === "valid" ? "success" : "danger"}>
                              {cert.status === "valid" ? "Valid" : "Revoked"}
                            </Badge>
                            <a
                              href={verificationUrl(cert.verification_token)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-700 hover:underline"
                            >
                              Verify
                            </a>
                          </div>
                        );
                      }
                      if (assignment.status === "passed") {
                        return (
                          <p className="text-sm text-slate-500">Certificate pending…</p>
                        );
                      }
                      return (
                        <details>
                          <summary className="cursor-pointer text-sm text-brand-700 hover:underline">
                            Manually mark as passed
                          </summary>
                          <div className="mt-2 rounded-md border border-slate-100 p-3">
                            <ManualPassForm assignmentId={assignment.id} />
                          </div>
                        </details>
                      );
                    })()}
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <ActionButton
                      action={regenerateAccessLink}
                      hidden={{ id: assignment.id, participant_id: participantId }}
                      confirm="Regenerate the access link? The old link will stop working."
                    >
                      Regenerate link
                    </ActionButton>
                    <ActionButton
                      action={toggleAssignmentActive}
                      hidden={{
                        id: assignment.id,
                        participant_id: participantId,
                        active: String(!assignment.active),
                      }}
                      variant={assignment.active ? "danger" : "outline"}
                      confirm={
                        assignment.active
                          ? "Deactivate this assignment? The candidate's link stops working."
                          : undefined
                      }
                    >
                      {assignment.active ? "Deactivate" : "Reactivate"}
                    </ActionButton>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

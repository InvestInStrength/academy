import { certificationUrl, verificationUrl } from "@/lib/public-url";
import { formatDate } from "@/lib/utils";
import { getDictionary, t as rawT } from "@/lib/i18n/dict";
import type { AssignmentStatus, CertificateStatus, Locale } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-button";
import { AssignmentCreateForm } from "./assignment-create-form";
import { AssignmentTopicsForm } from "./assignment-topics-form";
import { ManualPassForm } from "./manual-pass-form";
import { CopyLinkButton } from "./copy-link-button";
import {
  regenerateAccessLink,
  regenerateCertificateAssets,
  toggleAssignmentActive,
} from "../actions";

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
  id: string;
  certification_assignment_id: string;
  certificate_number: string;
  status: CertificateStatus;
  verification_token: string;
  pdf_url: string | null;
  preview_url: string | null;
};

type Props = {
  participantId: string;
  locale: Locale;
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

export function AssignmentsSection({
  participantId,
  locale,
  assignments,
  questionnaires,
  topics,
  assignmentTopics,
  certificates,
}: Props) {
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) =>
    rawT(dict, key, params);

  const statusLabel: Record<AssignmentStatus, string> = {
    not_started: t("admin.assignments.status.not_started"),
    in_progress: t("admin.assignments.status.in_progress"),
    passed: t("admin.assignments.status.passed"),
    failed: t("admin.assignments.status.failed"),
  };

  const questionnaireById = new Map(questionnaires.map((q) => [q.id, q]));
  const activeQuestionnaires = questionnaires.filter((q) => q.active);
  const certificateByAssignment = new Map(
    certificates.map((c) => [c.certification_assignment_id, c]),
  );

  return (
    <div className="space-y-4">
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
            <div>
              <CardTitle>{t("admin.assignments.create_card")}</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {t("admin.assignments.create_hint")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeQuestionnaires.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("admin.assignments.no_active_questionnaires")}
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
          <CardTitle>{t("admin.assignments.list_title", { count: assignments.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              {t("admin.assignments.empty")}
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
                        {questionnaire?.title ?? t("admin.assignments.deleted_questionnaire")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t("admin.assignments.created_at", {
                          date: formatDate(assignment.created_at, locale),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone[assignment.status]}>
                        {statusLabel[assignment.status]}
                      </Badge>
                      <Badge tone={assignment.active ? "success" : "neutral"}>
                        {assignment.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {t("admin.assignments.personal_link")}
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
                      {t("admin.assignments.certificate_topics")}
                    </p>
                    <p className="text-sm text-slate-700">
                      {selectedTitles.length > 0
                        ? selectedTitles.join(", ")
                        : t("admin.assignments.none_selected")}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-brand-700 hover:underline">
                        {t("admin.assignments.edit_topics")}
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
                      {t("admin.assignments.certificate_label")}
                    </p>
                    {(() => {
                      const cert = certificateByAssignment.get(assignment.id);
                      if (cert) {
                        return (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium text-slate-800">
                                {cert.certificate_number}
                              </span>
                              <Badge tone={cert.status === "valid" ? "success" : "danger"}>
                                {cert.status === "valid"
                                  ? t("common.valid")
                                  : t("common.revoked")}
                              </Badge>
                              <a
                                href={verificationUrl(cert.verification_token)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-700 hover:underline"
                              >
                                {t("admin.assignments.verify")}
                              </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              {cert.pdf_url ? (
                                <a
                                  href={cert.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-700 hover:underline"
                                >
                                  {t("admin.assignments.download_pdf")}
                                </a>
                              ) : null}
                              {cert.preview_url ? (
                                <a
                                  href={cert.preview_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-700 hover:underline"
                                >
                                  {t("admin.assignments.download_preview")}
                                </a>
                              ) : null}
                              {!cert.pdf_url && !cert.preview_url && (
                                <span className="text-slate-400">
                                  {t("admin.assignments.assets_pending")}
                                </span>
                              )}
                              <ActionButton
                                action={regenerateCertificateAssets}
                                hidden={{
                                  certificate_id: cert.id,
                                  participant_id: participantId,
                                }}
                                variant="outline"
                              >
                                {t("admin.assignments.regenerate_assets")}
                              </ActionButton>
                            </div>
                          </div>
                        );
                      }
                      if (assignment.status === "passed") {
                        return (
                          <p className="text-sm text-slate-500">
                            {t("admin.assignments.certificate_pending")}
                          </p>
                        );
                      }
                      return (
                        <details>
                          <summary className="cursor-pointer text-sm text-brand-700 hover:underline">
                            {t("admin.assignments.manual_pass")}
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
                      confirm={t("admin.assignments.regenerate_confirm")}
                    >
                      {t("admin.assignments.regenerate_link")}
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
                          ? t("admin.assignments.deactivate_confirm")
                          : undefined
                      }
                    >
                      {assignment.active
                        ? t("admin.assignments.deactivate")
                        : t("admin.assignments.reactivate")}
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

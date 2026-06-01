import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { verificationUrl } from "@/lib/public-url";
import type { CertificateStatus } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { RevokeCertificateForm } from "./revoke-certificate-form";
import { SendCertificateEmailButton } from "./send-email-button";
import { reinstateCertificate } from "./actions";

type CertificateRow = {
  id: string;
  certificate_number: string;
  status: CertificateStatus;
  generated_at: string;
  verification_token: string;
  certification_assignment_id: string;
};

export default async function CertificatesPage() {
  const { supabase } = await requireAdmin();
  const { locale, t } = await getServerT();

  const { data: certData } = await supabase
    .from("certificates")
    .select(
      "id, certificate_number, status, generated_at, verification_token, certification_assignment_id",
    )
    .order("generated_at", { ascending: false });

  const certificates = (certData ?? []) as CertificateRow[];

  if (certificates.length === 0) {
    return (
      <div>
        <PageHeader
          title={t("admin.certificates.title")}
          description={t("admin.certificates.description")}
        />
        <PlaceholderPanel note={t("admin.certificates.empty")} />
      </div>
    );
  }

  const assignmentIds = [
    ...new Set(certificates.map((c) => c.certification_assignment_id)),
  ];
  const { data: assignments } = await supabase
    .from("certification_assignments")
    .select("id, participant_id, questionnaire_id")
    .in("id", assignmentIds);

  const participantIds = [...new Set((assignments ?? []).map((a) => a.participant_id))];
  const questionnaireIds = [...new Set((assignments ?? []).map((a) => a.questionnaire_id))];

  const [{ data: participants }, { data: questionnaires }] = await Promise.all([
    supabase.from("participants").select("id, full_name").in("id", participantIds),
    supabase.from("questionnaires").select("id, title").in("id", questionnaireIds),
  ]);

  const assignmentById = new Map((assignments ?? []).map((a) => [a.id, a]));
  const participantName = new Map((participants ?? []).map((p) => [p.id, p.full_name]));
  const questionnaireTitle = new Map((questionnaires ?? []).map((q) => [q.id, q.title]));

  return (
    <div>
      <PageHeader
        title={t("admin.certificates.title")}
        description={t("admin.certificates.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin.certificates.list_title", { count: certificates.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">{t("admin.certificates.col_certificate")}</th>
                <th className="px-5 py-2 font-medium">{t("admin.certificates.col_candidate")}</th>
                <th className="px-5 py-2 font-medium">{t("admin.certificates.col_assessment")}</th>
                <th className="px-5 py-2 font-medium">{t("admin.certificates.col_issued")}</th>
                <th className="px-5 py-2 font-medium">{t("admin.certificates.col_status")}</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate) => {
                const assignment = assignmentById.get(certificate.certification_assignment_id);
                return (
                  <tr key={certificate.id} className="border-b border-slate-50 align-top last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {certificate.certificate_number}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {assignment ? (participantName.get(assignment.participant_id) ?? "—") : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {assignment ? (questionnaireTitle.get(assignment.questionnaire_id) ?? "—") : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(certificate.generated_at, locale)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={certificate.status === "valid" ? "success" : "danger"}>
                        {certificate.status === "valid"
                          ? t("common.valid")
                          : t("common.revoked")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <a
                          href={verificationUrl(certificate.verification_token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-700 hover:underline"
                        >
                          {t("admin.certificates.verification_page")}
                        </a>
                        {certificate.status === "valid" ? (
                          <>
                            <SendCertificateEmailButton certificateId={certificate.id} />
                            <details>
                              <summary className="cursor-pointer text-xs text-red-700 hover:underline">
                                {t("admin.certificates.revoke")}
                              </summary>
                              <div className="mt-2 w-64 rounded-md border border-slate-100 p-3">
                                <RevokeCertificateForm certificateId={certificate.id} />
                              </div>
                            </details>
                          </>
                        ) : (
                          <ActionButton
                            action={reinstateCertificate}
                            hidden={{ id: certificate.id }}
                          >
                            {t("admin.certificates.reinstate")}
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

import { getCertificateByVerificationToken } from "@/lib/certification/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CertificateView } from "@/components/certificate/certificate-view";

export const dynamic = "force-dynamic";

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ verificationToken: string }>;
}) {
  const { verificationToken } = await params;
  const certificate = await getCertificateByVerificationToken(verificationToken);

  if (!certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Certificate not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            We couldn&apos;t verify a certificate for this link. Please check the
            code or QR you scanned.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { snapshot, status } = certificate;
  const revoked = status === "revoked";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Certificate {snapshot.certificate_number}</CardTitle>
          <Badge tone={revoked ? "danger" : "success"}>
            {revoked ? "Revoked" : "Valid"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {revoked && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              This certificate has been revoked and is no longer valid.
            </p>
          )}

          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Awarded to</dt>
              <dd className="font-medium text-slate-900">{snapshot.candidate_name}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Course</dt>
              <dd className="font-medium text-slate-900">{snapshot.course_title}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Completed</dt>
              <dd className="font-medium text-slate-900">
                {formatLongDate(snapshot.completion_date)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Certificate ID</dt>
              <dd className="font-medium text-slate-900">{snapshot.certificate_number}</dd>
            </div>
            {snapshot.topics.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-slate-400">Topics</dt>
                <dd className="font-medium text-slate-900">
                  {snapshot.topics.join(", ")}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <CertificateView svg={snapshot.svg} revoked={revoked} />
    </div>
  );
}

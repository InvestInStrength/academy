import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCandidateContext,
  getCertificateForAssignment,
} from "@/lib/certification/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificateView } from "@/components/certificate/certificate-view";
import { CertificateDownloads } from "@/components/certificate/certificate-downloads";
import { EmailCertificateButton } from "../email-certificate-button";

export const dynamic = "force-dynamic";

export default async function CandidateCertificatePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const context = await getCandidateContext(accessToken);

  if (!context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            This certification link isn&apos;t available.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!context.participant.email_confirmed) {
    redirect(`/certification/${accessToken}`);
  }
  if (context.assignment.status !== "passed") {
    redirect(`/certification/${accessToken}/result`);
  }

  const certificate = await getCertificateForAssignment(context.assignment.id);

  if (!certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Certificate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Your certificate is being prepared. Please check back shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  const revoked = certificate.status === "revoked";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {revoked && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              This certificate has been revoked and is no longer valid.
            </p>
          )}
          <CertificateView svg={certificate.snapshot.svg} revoked={revoked} />
          {!revoked && (
            <>
              <CertificateDownloads
                svg={certificate.snapshot.svg}
                certificateNumber={certificate.certificate_number}
              />
              <EmailCertificateButton accessToken={accessToken} />
            </>
          )}
          <p className="text-sm text-slate-500">
            Verify at:{" "}
            <a
              href={certificate.snapshot.verification_url}
              className="text-brand-700 hover:underline"
            >
              {certificate.snapshot.verification_url}
            </a>
          </p>
        </CardContent>
      </Card>

      <Link
        href={`/certification/${accessToken}`}
        className="block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back
      </Link>
    </div>
  );
}

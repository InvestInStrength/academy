import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyLookupForm } from "./verify-lookup-form";

export const metadata: Metadata = {
  title: "Verify a certificate — Invest in Strength",
};

export default function VerifyIndexPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify a certificate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter the certificate ID printed on the certificate, or scan its QR
          code, to confirm it is genuine and still valid.
        </p>
        <VerifyLookupForm />
      </CardContent>
    </Card>
  );
}

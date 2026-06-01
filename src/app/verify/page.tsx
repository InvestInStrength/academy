import type { Metadata } from "next";

import { getActiveLanguage, getDictionary, t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyLookupForm } from "./verify-lookup-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  return {
    title: `${t(dict, "verify.lookup_card_title")} — ${t(dict, "meta.brand")}`,
  };
}

export default async function VerifyIndexPage() {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  const tr = (key: string) => t(dict, key);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr("verify.lookup_card_title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">{tr("verify.lookup_intro")}</p>
        <VerifyLookupForm />
      </CardContent>
    </Card>
  );
}

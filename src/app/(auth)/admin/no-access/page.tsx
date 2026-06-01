import type { Metadata } from "next";

import { signOutAction } from "@/lib/auth/actions";
import { getActiveLanguage, getDictionary, t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  return {
    title: `${t(dict, "auth.no_access.title")} — ${t(dict, "meta.brand")}`,
  };
}

export default async function NoAccessPage() {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  const tr = (key: string) => t(dict, key);

  return (
    <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-6 h-20" />
        <Card>
          <CardHeader>
            <CardTitle>{tr("auth.no_access.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{tr("auth.no_access.body")}</p>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full">
                {tr("common.sign_out")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

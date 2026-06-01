import type { Metadata } from "next";

import { getActiveLanguage, getDictionary, t } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  return {
    title: `${t(dict, "auth.login.heading")} — ${t(dict, "meta.brand")}`,
  };
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  const tr = (key: string) => t(dict, key);

  return (
    <LocaleProvider locale={locale}>
      <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <Logo className="mx-auto h-24" />
            <h1 className="mt-4 text-xl font-extrabold text-slate-900">
              {tr("auth.login.heading")}
            </h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{tr("auth.login.card_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LoginForm redirectTo={redirectTo ?? "/admin"} />
            </CardContent>
          </Card>
        </div>
      </main>
    </LocaleProvider>
  );
}

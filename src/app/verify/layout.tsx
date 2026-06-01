import { getActiveLanguage, getDictionary, t } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/client";
import { Emblem } from "@/components/brand/logo";

export default async function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);

  return (
    <LocaleProvider locale={locale}>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-6 py-3">
          <Emblem className="h-8 w-8" />
          <div>
            <span className="block text-sm font-bold text-slate-900">
              {t(dict, "meta.brand")}
            </span>
            <span className="block text-xs text-slate-400">
              {t(dict, "verify.title")}
            </span>
          </div>
        </header>
        <main className="topo-surface flex flex-1 justify-center px-6 py-10">
          <div className="w-full max-w-3xl">{children}</div>
        </main>
      </div>
    </LocaleProvider>
  );
}

import { getActiveLanguage, getDictionary, t } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default async function HomePage() {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  const tr = (key: string) => t(dict, key);

  return (
    <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <Logo className="mx-auto h-36" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {tr("home.heading")}
        </h1>
        <p className="mt-4 text-base text-slate-600">{tr("home.intro")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/verify">{tr("home.verify_cta")}</ButtonLink>
          <ButtonLink href="/admin" variant="outline">
            {tr("home.admin_cta")}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

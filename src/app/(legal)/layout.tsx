import Link from "next/link";

import { getServerT } from "@/lib/i18n";
import { Emblem } from "@/components/brand/logo";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getServerT();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center border-b border-slate-200 bg-white px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Emblem className="h-8 w-8" />
          <span className="text-sm font-bold text-slate-900">
            {t("meta.brand")}
          </span>
        </Link>
      </header>
      <main className="topo-surface flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

import { getActiveLanguage, getDictionary, getServerT, t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getActiveLanguage());
  return {
    title: `${t(dict, "legal.impressum")} — ${t(dict, "meta.brand")}`,
  };
}

export default async function ImpressumPage() {
  const { t: tr } = await getServerT();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 py-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {tr("legal.impressum")}
          </h1>
          <address className="text-sm not-italic leading-relaxed text-slate-700">
            INVEST IN STRENGTH LLC
            <br />
            3833 POWERLINE RD STE 201
            <br />
            FORT LAUDERDALE, FL 33309
            <br />
            United States
          </address>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="block text-sm text-slate-500 hover:text-slate-900"
      >
        {tr("legal.back_home")}
      </Link>
    </div>
  );
}

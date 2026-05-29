import { Emblem } from "@/components/brand/logo";

export default function CertificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-6 py-3">
        <Emblem className="h-8 w-8" />
        <span className="text-sm font-bold text-slate-900">Invest in Strength</span>
      </header>
      <main className="topo-surface flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}

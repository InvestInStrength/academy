export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          Invest in Strength
        </p>
        <p className="text-xs text-slate-400">Certificate verification</p>
      </header>
      <main className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}

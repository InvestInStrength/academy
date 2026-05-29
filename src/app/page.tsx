import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function HomePage() {
  return (
    <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <Logo className="mx-auto h-36" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Certification Platform
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Issue, manage, and verify professional certifications. Candidates use a
          personal link to complete their assessment; certificates can be verified
          publicly by their certificate ID.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/verify"
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Verify a certificate
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Admin sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

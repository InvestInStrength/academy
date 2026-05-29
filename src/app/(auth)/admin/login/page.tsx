import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in — Invest in Strength",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Invest in Strength
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Admin sign in</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm redirectTo={redirectTo ?? "/admin"} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

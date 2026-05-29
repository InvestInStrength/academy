import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
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
    <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto h-24" />
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">Admin sign in</h1>
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

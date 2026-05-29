import type { Metadata } from "next";

import { signOutAction } from "@/lib/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "No access — Invest in Strength",
};

export default function NoAccessPage() {
  return (
    <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-6 h-20" />
        <Card>
          <CardHeader>
            <CardTitle>No admin access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Your account is signed in but is not an active administrator. Ask a
              superadmin to grant you access, then sign in again.
            </p>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — ignore silently.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? t("admin.assignments.copied") : t("admin.assignments.copy")}
    </Button>
  );
}

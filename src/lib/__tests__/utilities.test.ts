import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { cn, formatDate } from "@/lib/utils";
import { fieldErrorsFromZod } from "@/lib/form";
import { certificationUrl, verificationUrl } from "@/lib/public-url";

describe("cn (className joiner)", () => {
  it("joins truthy string values with single spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values (false, null, undefined, 0, empty string)", () => {
    expect(cn("a", false, "b", null, undefined, 0, "", "c")).toBe("a b c");
  });

  it("returns an empty string when every value is falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("formatDate", () => {
  it("renders an ISO timestamp as a short locale-stable date", () => {
    expect(formatDate("2026-06-15T10:00:00.000Z")).toMatch(
      /\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 2026/,
    );
  });
});

describe("fieldErrorsFromZod", () => {
  it("flattens validation errors to a { path: firstMessage } map", () => {
    const schema = z.object({
      name: z.string().min(1, { message: "Name is required." }),
      email: z.string().email({ message: "Invalid email." }),
    });
    const result = schema.safeParse({ name: "", email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(errors.name).toBe("Name is required.");
      expect(errors.email).toBe("Invalid email.");
    }
  });

  it("translates messages through the provided translator (dict-key messages)", () => {
    const schema = z.object({
      title: z.string().min(1, { message: "validation.title_required" }),
    });
    const result = schema.safeParse({ title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const translate = (key: string) =>
        key === "validation.title_required" ? "Titel ist erforderlich." : key;
      const errors = fieldErrorsFromZod(result.error, translate);
      expect(errors.title).toBe("Titel ist erforderlich.");
    }
  });

  it("uses the 'form' key when the error path is empty (top-level refine)", () => {
    const schema = z.object({ a: z.number() }).refine(() => false, {
      message: "Always fails.",
    });
    const result = schema.safeParse({ a: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(errors.form).toBe("Always fails.");
    }
  });

  it("keeps only the first error per path when several apply", () => {
    const schema = z.object({
      x: z.string().min(5, { message: "Too short." }).max(2, { message: "Too long." }),
    });
    const result = schema.safeParse({ x: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(errors.x).toBe("Too short.");
    }
  });

  it("uses dot-joined paths for nested errors", () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string().min(1, { message: "Required." }) })),
    });
    const result = schema.safeParse({ items: [{ name: "ok" }, { name: "" }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromZod(result.error);
      expect(errors["items.1.name"]).toBe("Required.");
    }
  });
});

describe("public URL helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("certificationUrl prepends NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://investinstrength.academy");
    expect(certificationUrl("abc123")).toBe(
      "https://investinstrength.academy/certification/abc123",
    );
  });

  it("verificationUrl prepends NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://investinstrength.academy");
    expect(verificationUrl("tok")).toBe(
      "https://investinstrength.academy/verify/tok",
    );
  });

  it("strips a trailing slash from the configured site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    expect(certificationUrl("t")).toBe("https://example.com/certification/t");
    expect(verificationUrl("t")).toBe("https://example.com/verify/t");
  });

  it("falls back to a relative path when NEXT_PUBLIC_SITE_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(certificationUrl("t")).toBe("/certification/t");
    expect(verificationUrl("t")).toBe("/verify/t");
  });
});

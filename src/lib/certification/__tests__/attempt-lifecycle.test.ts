import { describe, expect, it } from "vitest";

import { startOrResumeAttemptWith } from "../attempt-lifecycle-core";
import type { Locale } from "@/types/database";

/**
 * In-memory Supabase-shaped fake. Supports only the chained methods the
 * lifecycle helper actually calls:
 *   from("attempts")
 *     .select(...)
 *     .eq(...)
 *     .is(...)              // for submitted_at IS NULL
 *     .order(...)
 *     .limit(...)
 *     .maybeSingle()
 *   from("attempts")
 *     .insert(...)
 *     .select(...)
 *     .single()
 */

type AttemptRow = {
  id: string;
  certification_assignment_id: string;
  attempt_number: number;
  submitted_at: string | null;
  language: Locale;
  answers?: Record<string, string[]> | null;
};

type FakeResult = Promise<{
  data: AttemptRow | null;
  error: { message: string } | null;
}>;

/** The self-referential chained-query shape the lifecycle helper calls. */
type FakeQuery = {
  select(cols: string): FakeQuery;
  eq(col: keyof AttemptRow, value: unknown): FakeQuery;
  is(col: keyof AttemptRow, value: unknown): FakeQuery;
  order(col: keyof AttemptRow, opts: { ascending: boolean }): FakeQuery;
  limit(n: number): FakeQuery;
  maybeSingle(): FakeResult;
  single(): FakeResult;
  insert(
    row: Partial<AttemptRow> & {
      certification_assignment_id: string;
      attempt_number: number;
    },
  ): FakeQuery;
};

function makeFakeService(
  seed: AttemptRow[] = [],
  /** Models a concurrent attempt-start race: `raceWinner` is invisible to the
   * first lookup (the racing request has not inserted yet) and visible after
   * it, while the INSERT is rejected with `failInsertWith` — exactly what
   * migration 0008's `uniq_open_attempt_per_assignment` does to the loser. */
  opts: { failInsertWith?: string; raceWinner?: AttemptRow } = {},
) {
  const rows: AttemptRow[] = [...seed];
  let nextRowId = rows.length + 1;
  let lookups = 0;

  function builder() {
    const visible =
      opts.raceWinner && lookups >= 1 ? [...rows, opts.raceWinner] : rows.slice();
    let working: AttemptRow[] = visible;
    let mode: "query" | "insert" = "query";
    let insertedRow: AttemptRow | null = null;
    let insertError: { message: string } | null = null;

    const api: FakeQuery = {
      select(_cols: string) {
        return api;
      },
      eq(col: keyof AttemptRow, value: unknown) {
        working = working.filter((r) => (r as Record<string, unknown>)[col] === value);
        return api;
      },
      is(col: keyof AttemptRow, value: unknown) {
        if (value === null) {
          working = working.filter((r) => (r as Record<string, unknown>)[col] === null);
        }
        return api;
      },
      order(col: keyof AttemptRow, opts: { ascending: boolean }) {
        const asc = opts.ascending !== false;
        working.sort((a, b) => {
          const av = a[col] as number;
          const bv = b[col] as number;
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return asc ? cmp : -cmp;
        });
        return api;
      },
      limit(n: number) {
        working = working.slice(0, n);
        return api;
      },
      async maybeSingle() {
        if (mode === "insert") {
          return { data: insertedRow, error: null };
        }
        lookups += 1;
        return { data: working[0] ?? null, error: null };
      },
      async single() {
        if (mode === "insert") {
          return { data: insertedRow, error: insertError };
        }
        if (working.length === 0) {
          return { data: null, error: { message: "not found" } as { message: string } };
        }
        return { data: working[0], error: null };
      },
      insert(row: Partial<AttemptRow> & { certification_assignment_id: string; attempt_number: number }) {
        mode = "insert";
        if (opts.failInsertWith) {
          insertError = { message: opts.failInsertWith };
          insertedRow = null;
          return api;
        }
        insertedRow = {
          id: `attempt-${nextRowId++}`,
          certification_assignment_id: row.certification_assignment_id,
          attempt_number: row.attempt_number,
          submitted_at: null,
          language: row.language ?? "de",
        };
        rows.push(insertedRow);
        return api;
      },
    };
    return api;
  }

  return {
    rows,
    client: {
      from(_table: string) {
        return builder();
      },
    } as unknown as Parameters<typeof startOrResumeAttemptWith>[0],
  };
}

describe("startOrResumeAttemptWith", () => {
  it("creates a new attempt row when none exist for the assignment", async () => {
    const { client, rows } = makeFakeService();
    const result = await startOrResumeAttemptWith(client, "asgn-1", "de");
    expect(result.attempt_number).toBe(1);
    expect(result.language).toBe("de");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      certification_assignment_id: "asgn-1",
      attempt_number: 1,
      submitted_at: null,
      language: "de",
    });
  });

  it("resumes an existing in-progress attempt and ignores the current active language", async () => {
    const { client, rows } = makeFakeService([
      {
        id: "existing-de-attempt",
        certification_assignment_id: "asgn-1",
        attempt_number: 1,
        submitted_at: null,
        language: "de",
      },
    ]);
    // Global active language has flipped to "en" since the attempt began.
    const result = await startOrResumeAttemptWith(client, "asgn-1", "en");
    expect(result.id).toBe("existing-de-attempt");
    expect(result.language).toBe("de"); // frozen
    expect(rows).toHaveLength(1); // no new row inserted
  });

  it("hydrates persisted answers when resuming, and sanitizes garbage", async () => {
    const { client } = makeFakeService([
      {
        id: "resumable",
        certification_assignment_id: "asgn-1",
        attempt_number: 1,
        submitted_at: null,
        language: "de",
        answers: {
          "q-1": ["opt-a", "opt-a", "opt-b"], // duplicate de-duped
          "q-2": "not-an-array" as unknown as string[], // dropped
          "q-3": ["opt-c"],
        },
      },
    ]);
    const result = await startOrResumeAttemptWith(client, "asgn-1", "de");
    expect(result.answers).toEqual({
      "q-1": ["opt-a", "opt-b"],
      "q-3": ["opt-c"],
    });
  });

  it("defaults answers to an empty map on a freshly created attempt", async () => {
    const { client } = makeFakeService();
    const result = await startOrResumeAttemptWith(client, "asgn-1", "de");
    expect(result.answers).toEqual({});
  });

  it("creates a new attempt with the now-current language after the previous was submitted", async () => {
    const { client, rows } = makeFakeService([
      {
        id: "submitted-de-attempt",
        certification_assignment_id: "asgn-1",
        attempt_number: 1,
        submitted_at: "2026-06-01T10:00:00Z",
        language: "de",
      },
    ]);
    const result = await startOrResumeAttemptWith(client, "asgn-1", "en");
    expect(result.attempt_number).toBe(2);
    expect(result.language).toBe("en");
    expect(rows).toHaveLength(2);
    expect(rows[1].submitted_at).toBeNull();
  });

  it("resumes the winner's row when a concurrent start loses the insert race", async () => {
    // Both requests find no open attempt; the other inserts first, so this
    // insert violates uniq_open_attempt_per_assignment (migration 0008). The
    // loser must resume the winner's row, not 500 mid-assessment.
    const { client, rows } = makeFakeService([], {
      failInsertWith:
        'duplicate key value violates unique constraint "uniq_open_attempt_per_assignment"',
      raceWinner: {
        id: "winner-attempt",
        certification_assignment_id: "asgn-1",
        attempt_number: 1,
        submitted_at: null,
        language: "de",
        answers: { "q-1": ["opt-a"] },
      },
    });

    const result = await startOrResumeAttemptWith(client, "asgn-1", "en");
    expect(result.id).toBe("winner-attempt");
    expect(result.language).toBe("de"); // winner's frozen language wins
    expect(result.answers).toEqual({ "q-1": ["opt-a"] });
    expect(rows).toHaveLength(0); // loser inserted nothing
  });

  it("still throws when the insert fails and no open attempt exists to resume", async () => {
    const { client } = makeFakeService([], { failInsertWith: "connection reset" });
    await expect(startOrResumeAttemptWith(client, "asgn-1", "de")).rejects.toThrow(
      /Failed to start attempt/,
    );
  });

  it("scopes attempt_number by assignment — separate assignments get their own counter", async () => {
    const { client, rows } = makeFakeService([
      {
        id: "asgn-1-attempt-1",
        certification_assignment_id: "asgn-1",
        attempt_number: 1,
        submitted_at: "2026-06-01T10:00:00Z",
        language: "de",
      },
    ]);
    const result = await startOrResumeAttemptWith(client, "asgn-2", "de");
    expect(result.attempt_number).toBe(1);
    expect(rows).toHaveLength(2);
  });

  it("returns the highest-numbered in-progress row when multiple unsubmitted rows exist (defensive)", async () => {
    const { client } = makeFakeService([
      {
        id: "older",
        certification_assignment_id: "asgn-1",
        attempt_number: 1,
        submitted_at: null,
        language: "de",
      },
      {
        id: "newer",
        certification_assignment_id: "asgn-1",
        attempt_number: 2,
        submitted_at: null,
        language: "en",
      },
    ]);
    const result = await startOrResumeAttemptWith(client, "asgn-1", "de");
    expect(result.id).toBe("newer");
    expect(result.language).toBe("en");
  });
});

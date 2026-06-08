import { describe, expect, it } from "vitest";

import { hashCode } from "../email-verification-core";
import {
  startEmailVerificationWith,
  verifyEmailCodeWith,
  type VerificationTarget,
} from "../email-verification-data";

/**
 * In-memory Supabase-shaped fake covering the chains the verification
 * orchestration calls: update().eq()[.is()], insert(), and
 * select().eq().is().order().limit().maybeSingle(). The builder is thenable so a
 * terminal update/insert resolves when awaited; selects resolve via maybeSingle.
 */

type CodeRow = {
  id: string;
  participant_id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

type ParticipantRow = { id: string; email: string | null; email_confirmed: boolean };

type Seed = { participant?: Partial<ParticipantRow>; codes?: CodeRow[] };

function makeFake(seed: Seed = {}) {
  const db = {
    participant: {
      id: "p1",
      email: null,
      email_confirmed: false,
      ...seed.participant,
    } as ParticipantRow,
    codes: [...(seed.codes ?? [])] as CodeRow[],
    history: [] as Array<Record<string, unknown>>,
  };

  let inserted = 0;

  function from(table: string) {
    const state = {
      table,
      op: null as "select" | "update" | "insert" | null,
      payload: null as Record<string, unknown> | null,
      eqs: {} as Record<string, unknown>,
      isNull: {} as Record<string, boolean>,
      orderDesc: false,
    };

    function matchCodes(): CodeRow[] {
      let rows = db.codes;
      if (state.eqs.participant_id !== undefined) {
        rows = rows.filter((r) => r.participant_id === state.eqs.participant_id);
      }
      if (state.eqs.id !== undefined) rows = rows.filter((r) => r.id === state.eqs.id);
      if (state.isNull.consumed_at) rows = rows.filter((r) => r.consumed_at === null);
      return rows;
    }

    function runSelect(): CodeRow | null {
      if (state.table !== "email_verification_codes") return null;
      const rows = matchCodes()
        .slice()
        .sort((a, b) => {
          const cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
          return state.orderDesc ? -cmp : cmp;
        });
      return rows[0] ?? null;
    }

    function runTerminal() {
      if (state.op === "insert" && state.payload) {
        if (state.table === "email_verification_codes") {
          inserted += 1;
          db.codes.push({
            id: `c-new-${inserted}`,
            attempts: 0,
            consumed_at: null,
            created_at: new Date(2_000 + inserted).toISOString(),
            ...state.payload,
          } as CodeRow);
        } else if (state.table === "account_history") {
          db.history.push(state.payload);
        }
      } else if (state.op === "update" && state.payload) {
        if (state.table === "participants") {
          Object.assign(db.participant, state.payload);
        } else if (state.table === "email_verification_codes") {
          for (const row of matchCodes()) Object.assign(row, state.payload);
        }
      }
      return { data: null, error: null };
    }

    const builder = {
      update(payload: Record<string, unknown>) {
        state.op = "update";
        state.payload = payload;
        return builder;
      },
      insert(payload: Record<string, unknown>) {
        state.op = "insert";
        state.payload = payload;
        return builder;
      },
      select(_cols: string) {
        state.op = "select";
        return builder;
      },
      eq(col: string, val: unknown) {
        state.eqs[col] = val;
        return builder;
      },
      is(col: string, val: unknown) {
        if (val === null) state.isNull[col] = true;
        return builder;
      },
      order(_col: string, opts: { ascending: boolean }) {
        state.orderDesc = opts.ascending === false;
        return builder;
      },
      limit(_n: number) {
        return builder;
      },
      async maybeSingle() {
        return { data: runSelect(), error: null };
      },
      then(
        resolve: (value: { data: unknown; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(runTerminal()).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    db,
    client: { from } as unknown as Parameters<typeof verifyEmailCodeWith>[0],
  };
}

const target: VerificationTarget = { participantId: "p1", assignmentId: "a1" };

describe("startEmailVerificationWith", () => {
  it("stores the pending email, invalidates prior codes, inserts a fresh hashed code, and logs", async () => {
    const prior: CodeRow = {
      id: "old",
      participant_id: "p1",
      email: "old@x.com",
      code_hash: hashCode("000000"),
      attempts: 0,
      expires_at: new Date(5_000).toISOString(),
      consumed_at: null,
      created_at: new Date(1_000).toISOString(),
    };
    const { db, client } = makeFake({ codes: [prior] });

    await startEmailVerificationWith(client, target, "new@x.com", {
      code: "123456",
      nowMs: 10_000,
    });

    expect(db.participant.email).toBe("new@x.com");
    expect(db.participant.email_confirmed).toBe(false);
    expect(db.codes.find((c) => c.id === "old")?.consumed_at).not.toBeNull();

    const fresh = db.codes.find((c) => c.id !== "old");
    expect(fresh).toBeDefined();
    expect(fresh?.code_hash).toBe(hashCode("123456"));
    expect(fresh?.code_hash).not.toContain("123456");
    expect(fresh?.consumed_at).toBeNull();
    expect(fresh?.email).toBe("new@x.com");

    expect(db.history.some((h) => h.event_type === "email_submitted")).toBe(true);
  });
});

describe("verifyEmailCodeWith", () => {
  function seedOneCode(overrides: Partial<CodeRow> = {}) {
    const code: CodeRow = {
      id: "c1",
      participant_id: "p1",
      email: "u@x.com",
      code_hash: hashCode("123456"),
      attempts: 0,
      expires_at: new Date(20_000).toISOString(),
      consumed_at: null,
      created_at: new Date(1_000).toISOString(),
      ...overrides,
    };
    return makeFake({ codes: [code] });
  }

  it("confirms the email on the correct code, consumes it, and logs", async () => {
    const { db, client } = seedOneCode();
    const result = await verifyEmailCodeWith(client, target, "123456", { nowMs: 10_000 });
    expect(result).toEqual({ ok: true });
    expect(db.participant.email_confirmed).toBe(true);
    expect(db.codes[0].consumed_at).not.toBeNull();
    expect(db.history.some((h) => h.event_type === "email_confirmed")).toBe(true);
  });

  it("rejects a wrong code, increments attempts, leaves the email unconfirmed", async () => {
    const { db, client } = seedOneCode();
    const result = await verifyEmailCodeWith(client, target, "999999", { nowMs: 10_000 });
    expect(result).toEqual({ ok: false, reason: "invalid", attemptsRemaining: 4 });
    expect(db.codes[0].attempts).toBe(1);
    expect(db.participant.email_confirmed).toBe(false);
  });

  it("reports expired for a past-expiry code", async () => {
    const { db, client } = seedOneCode({ expires_at: new Date(5_000).toISOString() });
    const result = await verifyEmailCodeWith(client, target, "123456", { nowMs: 10_000 });
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(db.participant.email_confirmed).toBe(false);
  });

  it("reports too_many once the attempt cap is reached", async () => {
    const { client } = seedOneCode({ attempts: 5 });
    const result = await verifyEmailCodeWith(client, target, "123456", { nowMs: 10_000 });
    expect(result).toEqual({ ok: false, reason: "too_many" });
  });

  it("reports no_code when there is no outstanding code", async () => {
    const { client } = makeFake();
    const result = await verifyEmailCodeWith(client, target, "123456", { nowMs: 10_000 });
    expect(result).toEqual({ ok: false, reason: "no_code" });
  });

  it("ignores an already-consumed code", async () => {
    const { client } = seedOneCode({ consumed_at: new Date(2_000).toISOString() });
    const result = await verifyEmailCodeWith(client, target, "123456", { nowMs: 10_000 });
    expect(result).toEqual({ ok: false, reason: "no_code" });
  });

  it("verifies against the newest outstanding code only", async () => {
    const older: CodeRow = {
      id: "old",
      participant_id: "p1",
      email: "u@x.com",
      code_hash: hashCode("111111"),
      attempts: 0,
      expires_at: new Date(20_000).toISOString(),
      consumed_at: null,
      created_at: new Date(1_000).toISOString(),
    };
    const newer: CodeRow = {
      id: "new",
      participant_id: "p1",
      email: "u@x.com",
      code_hash: hashCode("222222"),
      attempts: 0,
      expires_at: new Date(20_000).toISOString(),
      consumed_at: null,
      created_at: new Date(2_000).toISOString(),
    };
    const { db, client } = makeFake({ codes: [older, newer] });

    // The OLD code's value must not work — only the newest row is checked.
    const wrong = await verifyEmailCodeWith(client, target, "111111", { nowMs: 10_000 });
    expect(wrong).toEqual({ ok: false, reason: "invalid", attemptsRemaining: 4 });

    const ok = await verifyEmailCodeWith(client, target, "222222", { nowMs: 10_000 });
    expect(ok).toEqual({ ok: true });
    expect(db.codes.find((c) => c.id === "new")?.consumed_at).not.toBeNull();
  });
});

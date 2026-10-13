/**
 * Key pool management for Tavily API keys stored in Cloudflare D1 (SQLite).
 *
 * Storage: a single `keys` table in D1 instead of KV. This removes the KV
 * free-plan operation quotas from the request hot path. In particular the KV
 * version called `kv.list()` on every pool pick; D1 replaces that with a single
 * indexed SELECT.
 *
 * Design follows tavily-hikari:
 * - The request hot path does NOT estimate/deduct credits. Key health comes
 *   from real upstream signals: HTTP 432 = quota exhausted (skip until next
 *   UTC month), HTTP 429 = transient cooldown (Retry-After), 401/403 = invalid.
 * - Keys are selected by least-recently-used (LRU) among healthy keys.
 * - Tavily /usage is only synced in the background for display purposes.
 */

export type KeyStatus = "active" | "exhausted";

export interface KeyState {
  status: KeyStatus;
  /** Unix seconds of the last time this key was picked. LRU ordering key. */
  lastUsedAt: number;
  /** Unix seconds when status changed to exhausted. Basis for monthly reset. */
  statusChangedAt: number;
  /** Unix seconds until which the key is cooled down (429 Retry-After). */
  cooldownUntil: number;
  /** Unix seconds when the key was added to the pool. */
  addedAt: number;
  /** Short management note set when the key was added. */
  note: string;
  /** Display-only credit limit, synced in the background. */
  creditLimit: number;
  /** Display-only remaining credit, synced in the background. */
  creditRemaining: number;
  /** Unix seconds of the last successful /usage sync. */
  creditSyncedAt: number;
}

export interface KeyInfo extends KeyState {
  apiKey: string;
  /** Masked display form, e.g. "tvly-1234...abcd". */
  mask: string;
}

export interface UsageSyncResult {
  mask: string;
  ok: boolean;
  error?: string;
}

export interface UsageSyncSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  results: UsageSyncResult[];
}

/** One row of the D1 `keys` table returned by a SELECT. */
interface KeysRow {
  api_key: string;
  status: string;
  last_used_at: number;
  status_changed_at: number;
  cooldown_until: number;
  added_at: number;
  note: string;
  credit_limit: number;
  credit_remaining: number;
  credit_synced_at: number;
}

const USAGE_BASE = "https://api.tavily.com/usage";

function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}

function monthStartUtcSecs(now: number): number {
  const d = new Date(now * 1000);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function maskKey(apiKey: string): string {
  if (apiKey.length <= 12) return `${apiKey.slice(0, 4)}...`;
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

function rowToState(row: KeysRow): KeyState {
  return {
    status: row.status === "exhausted" ? "exhausted" : "active",
    lastUsedAt: row.last_used_at ?? 0,
    statusChangedAt: row.status_changed_at ?? 0,
    cooldownUntil: row.cooldown_until ?? 0,
    addedAt: row.added_at ?? 0,
    note: row.note ?? "",
    creditLimit: row.credit_limit ?? 0,
    creditRemaining: row.credit_remaining ?? 0,
    creditSyncedAt: row.credit_synced_at ?? 0,
  };
}

/**
 * Query the Tavily /usage endpoint to get remaining credits for a key.
 * Returns { limit, remaining }; remaining is capped at >= 0.
 */
export async function queryUsage(
  apiKey: string
): Promise<{ limit: number; remaining: number }> {
  const res = await fetch(USAGE_BASE, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = (await res.text()).slice(0, 500);
    throw new Error(`Tavily API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    key: { usage: number; limit: number | null };
    account: { plan_limit: number; plan_usage: number };
  };

  const limit = Number(data.key?.limit ?? data.account?.plan_limit);
  const usage = Number(data.key?.usage);
  if (!Number.isFinite(limit) || !Number.isFinite(usage)) {
    throw new Error("Tavily usage response is missing numeric limit or usage fields");
  }
  return { limit, remaining: Math.max(0, limit - usage) };
}

/**
 * Lazy monthly reset: any key marked exhausted in a previous UTC month is
 * restored to active.
 */
export async function resetMonthly(db: D1Database): Promise<void> {
  const now = nowSecs();
  const monthStart = monthStartUtcSecs(now);
  await db
    .prepare(
      `UPDATE keys SET status = 'active', status_changed_at = ?1
       WHERE status = 'exhausted'
         AND status_changed_at > 0
         AND status_changed_at < ?2`
    )
    .bind(now, monthStart)
    .run();
}

/**
 * Pick the least-recently-used healthy key. Returns null if none available.
 * Resets monthly-exhausted keys lazily before selecting. Single indexed SELECT
 * + one UPDATE — no list()/get() fan-out like the previous KV implementation.
 */
export async function pickBestKey(db: D1Database, excluded: ReadonlySet<string> = new Set()): Promise<string | null> {
  const now = nowSecs();
  await resetMonthly(db);

  const rows = await db
    .prepare(
      `SELECT api_key FROM keys
       WHERE status = 'active' AND cooldown_until <= ?1
       ORDER BY last_used_at ASC, api_key ASC`
    )
    .bind(now)
    .all<{ api_key: string }>();

  const row = rows.results.find((candidate) => !excluded.has(candidate.api_key));

  if (!row) return null;

  await db
    .prepare(`UPDATE keys SET last_used_at = ?1 WHERE api_key = ?2`)
    .bind(now, row.api_key)
    .run();

  return row.api_key;
}

/**
 * Mark a key exhausted (HTTP 432 / 401 / 403). It is skipped for the rest of
 * the current UTC month and auto-recovers on the next monthly reset.
 */
export async function markExhausted(db: D1Database, apiKey: string): Promise<void> {
  await db
    .prepare(`UPDATE keys SET status = 'exhausted', status_changed_at = ?1 WHERE api_key = ?2`)
    .bind(nowSecs(), apiKey)
    .run();
}

/**
 * Set a transient cooldown (HTTP 429) until the given Unix seconds.
 * The cooldown only ever moves forward (max of existing and new).
 */
export async function setCooldown(db: D1Database, apiKey: string, cooldownUntil: number): Promise<void> {
  await db
    .prepare(`UPDATE keys SET cooldown_until = MAX(cooldown_until, ?1) WHERE api_key = ?2`)
    .bind(cooldownUntil, apiKey)
    .run();
}

/**
 * Add or restore a key. Queries Tavily for current remaining credit.
 * The optional `note` is a short management comment shown in the admin panel.
 */
export async function addKey(db: D1Database, apiKey: string, note = ""): Promise<KeyInfo> {
  const { limit, remaining } = await queryUsage(apiKey);
  const now = nowSecs();
  const row: KeysRow = {
    api_key: apiKey,
    status: "active",
    last_used_at: now,
    status_changed_at: now,
    cooldown_until: 0,
    added_at: now,
    note: note.trim().slice(0, 200),
    credit_limit: limit,
    credit_remaining: remaining,
    credit_synced_at: now,
  };

  await db
    .prepare(
      `INSERT OR REPLACE INTO keys
         (api_key, status, last_used_at, status_changed_at, cooldown_until,
          added_at, note, credit_limit, credit_remaining, credit_synced_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    )
    .bind(
      row.api_key, row.status, row.last_used_at, row.status_changed_at,
      row.cooldown_until, row.added_at, row.note, row.credit_limit,
      row.credit_remaining, row.credit_synced_at
    )
    .run();

  return { apiKey, mask: maskKey(apiKey), ...rowToState(row) };
}

/**
 * Delete a key.
 */
export async function deleteKey(db: D1Database, apiKey: string): Promise<void> {
  await db.prepare(`DELETE FROM keys WHERE api_key = ?1`).bind(apiKey).run();
}

/**
 * List all keys with their cached state (no Tavily API call).
 */
export async function listKeys(db: D1Database): Promise<KeyInfo[]> {
  const res = await db.prepare(`SELECT * FROM keys ORDER BY added_at ASC`).all<KeysRow>();
  if (!res.success) return [];
  return res.results.map((row) => ({
    apiKey: row.api_key,
    mask: maskKey(row.api_key),
    ...rowToState(row),
  }));
}

/**
 * Sync a single key's usage/credit from Tavily (display fields only).
 * On HTTP 432 the key is also marked exhausted.
 * Errors are swallowed so one bad key cannot break the whole sync run.
 */
export async function syncKeyUsage(db: D1Database, apiKey: string): Promise<UsageSyncResult> {
  try {
    const { limit, remaining } = await queryUsage(apiKey);
    await db
      .prepare(`UPDATE keys SET credit_limit = ?1, credit_remaining = ?2, credit_synced_at = ?3 WHERE api_key = ?4`)
      .bind(limit, remaining, nowSecs(), apiKey)
      .run();
    return { mask: maskKey(apiKey), ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/Tavily API error (401|403|432)/.test(message)) {
      await markExhausted(db, apiKey);
    } else if (/Tavily API error 429/.test(message)) {
      await setCooldown(db, apiKey, nowSecs() + 60);
    }
    return { mask: maskKey(apiKey), ok: false, error: message.slice(0, 300) };
  }
}

/**
 * Sync usage for all keys and return an aggregate result.
 * Used by the background scheduled handler and the admin "sync now" action.
 */
export async function syncAllUsage(db: D1Database): Promise<UsageSyncSummary> {
  const keys = await listKeys(db);
  const results: UsageSyncResult[] = [];
  for (let index = 0; index < keys.length; index += 4) {
    results.push(...await Promise.all(keys.slice(index, index + 4).map((key) => syncKeyUsage(db, key.apiKey))));
  }
  const succeeded = results.filter((result) => result.ok).length;
  return { attempted: results.length, succeeded, failed: results.length - succeeded, results };
}

/**
 * Per-process Telegram update deduplication.
 *
 * Telegram retries the webhook if our function takes too long to respond,
 * which can result in duplicate writes to the Google Sheet. This in-memory
 * Map suppresses retries within a 60-second window — enough to cover Telegram's
 * retry policy without holding state forever.
 *
 * The cache lives only for the Vercel function instance lifetime, which is fine:
 * Telegram retries within seconds, not hours.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 200;
const seen = new Map<string, number>();

/**
 * Returns true if `key` was already seen in the last TTL_MS. Records it either way.
 *
 * Recommended key: `${update_id}` for Telegram updates, or
 * `${chat_id}:${message_id}` if update_id isn't available.
 */
export function isDuplicateUpdate(key: string): boolean {
  const now = Date.now();

  if (seen.size > MAX_ENTRIES) {
    for (const [k, t] of seen) {
      if (now - t > TTL_MS) seen.delete(k);
    }
    while (seen.size > MAX_ENTRIES) {
      const oldest = seen.keys().next().value;
      if (oldest === undefined) break;
      seen.delete(oldest);
    }
  }

  const prev = seen.get(key);
  if (prev !== undefined && now - prev < TTL_MS) return true;

  seen.set(key, now);
  return false;
}

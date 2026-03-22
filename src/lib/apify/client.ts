/**
 * Apify client wrapper.
 *
 * Keeps a single ApifyClient instance per process, lazily initialised on
 * the first runActor call. Concurrent calls are all safe — the singleton is
 * set synchronously before any await so there is no race condition.
 *
 * Owned by: apify agent
 */

import { ApifyClient } from "apify-client";

/** Default actor run timeout in seconds (2 min). */
const DEFAULT_TIMEOUT_SECS = 120;

/** Max number of dataset items to fetch per run (safety cap). */
const MAX_DATASET_ITEMS = 200;

/** Module-level singleton — constructed once, reused for all actor calls. */
let _client: ApifyClient | null = null;

/**
 * Return the shared ApifyClient, constructing it on first call.
 * Throws early with a clear message if APIFY_TOKEN is missing.
 */
function getClient(): ApifyClient {
  if (_client) return _client;
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error(
      "APIFY_TOKEN environment variable is not set. " +
        "Add it to .env.local before running the pipeline."
    );
  }
  _client = new ApifyClient({ token });
  return _client;
}

/**
 * Run an Apify actor and return all dataset items.
 *
 * @param actorId   Full actor ID, e.g. "apify/website-content-crawler"
 * @param input     Actor input object (typed as-is; varies per actor)
 * @param timeoutSecs  Max seconds to wait for the run to finish
 * @param memoryMbytes  Memory to allocate for the run in MB (default: 256)
 * @returns         Array of raw dataset items (unknown shape — normalize downstream)
 */
export async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs: number = DEFAULT_TIMEOUT_SECS,
  memoryMbytes: number = 256
): Promise<unknown[]> {
  const client = getClient();

  const run = await client.actor(actorId).call(input, {
    timeout: timeoutSecs,
    memory: memoryMbytes,
  });

  if (run.status === "FAILED" || run.status === "ABORTED" || run.status === "TIMED-OUT") {
    throw new Error(
      `Actor "${actorId}" run ${run.id} ended with status: ${run.status}`
    );
  }

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: MAX_DATASET_ITEMS });

  return items;
}

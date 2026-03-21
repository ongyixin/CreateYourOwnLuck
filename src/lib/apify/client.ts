/**
 * Apify client wrapper.
 *
 * Keeps a single ApifyClient instance per process (no singleton needed at
 * hackathon scale — each call constructs a fresh client, which is fine).
 *
 * Owned by: apify agent
 */

import { ApifyClient } from "apify-client";

/** Default actor run timeout in seconds (2 min). */
const DEFAULT_TIMEOUT_SECS = 120;

/** Max number of dataset items to fetch per run (safety cap). */
const MAX_DATASET_ITEMS = 200;

/**
 * Build a configured ApifyClient, validating the token.
 * Throws early with a clear message if APIFY_TOKEN is missing.
 */
function buildClient(): ApifyClient {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error(
      "APIFY_TOKEN environment variable is not set. " +
        "Add it to .env.local before running the pipeline."
    );
  }
  return new ApifyClient({ token });
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
  const client = buildClient();

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

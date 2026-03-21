/**
 * GET /api/status/[id]
 *
 * SSE stream that emits StatusEvent JSON every 500ms for the given job.
 * The client should close the connection after receiving a "complete" or
 * "failed" event (the server also closes it automatically at that point).
 *
 * Event format: `data: <JSON>\n\n`
 *
 * Owned by: backend agent
 */

import type { NextRequest } from "next/server";
import type { StatusEvent } from "../../../../lib/types";
import { getJob } from "../../../../lib/pipeline/store";

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { id } = params;

  // Quick existence check before opening the stream
  const initial = getJob(id);
  if (!initial) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // ── Helpers ───────────────────────────────────────────────────────────

      function send(event: StatusEvent): void {
        const line = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(line));
      }

      function buildEvent(jobId: string): StatusEvent | null {
        const job = getJob(jobId);
        if (!job) return null;

        const event: StatusEvent = {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          stages: job.stages,
        };

        if (job.status === "complete" && job.report) {
          event.report = job.report;
        }

        if (job.error) {
          event.error = job.error;
        }

        return event;
      }

      // ── Polling loop ──────────────────────────────────────────────────────

      // Send the initial state immediately so the client doesn't wait 500ms
      const firstEvent = buildEvent(id);
      if (firstEvent) send(firstEvent);

      const intervalId = setInterval(() => {
        const event = buildEvent(id);

        if (!event) {
          // Job disappeared from store (shouldn't happen, but be safe)
          clearInterval(intervalId);
          controller.close();
          return;
        }

        send(event);

        // Terminal states: stop streaming
        if (event.status === "complete" || event.status === "failed") {
          clearInterval(intervalId);
          // Small delay so the final event is flushed before closing
          setTimeout(() => {
            try {
              controller.close();
            } catch {
              // Already closed — safe to ignore
            }
          }, 100);
        }
      }, 500);

      // ── Cleanup on client disconnect ──────────────────────────────────────

      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Nginx/proxy buffering so events are flushed immediately
      "X-Accel-Buffering": "no",
    },
  });
}

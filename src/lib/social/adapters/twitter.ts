import type { SocialConnection } from "@prisma/client";
import type { PublishableContent, PublishResult } from "@/lib/types";
import { ensureFreshToken } from "../token-refresh";

const TWITTER_MAX_CHARS = 280;

export async function publish(
  connection: SocialConnection,
  content: PublishableContent
): Promise<PublishResult> {
  const accessToken = await ensureFreshToken(connection);

  // Truncate to Twitter character limit if needed
  const text =
    content.text.length > TWITTER_MAX_CHARS
      ? content.text.slice(0, TWITTER_MAX_CHARS - 1) + "…"
      : content.text;

  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return {
      success: false,
      errorMessage: `Twitter post failed (${res.status}): ${errorText}`,
    };
  }

  const data = await res.json();
  const tweetId = data.data?.id as string | undefined;
  const externalUrl = tweetId
    ? `https://twitter.com/i/web/status/${tweetId}`
    : undefined;

  return { success: true, externalUrl };
}

export async function getProfile(
  connection: SocialConnection
): Promise<{ name: string; avatar?: string }> {
  return { name: connection.platformUsername };
}

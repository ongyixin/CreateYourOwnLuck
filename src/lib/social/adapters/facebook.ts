import type { SocialConnection } from "@prisma/client";
import type { PublishableContent, PublishResult } from "@/lib/types";
import { ensureFreshToken } from "../token-refresh";

export async function publish(
  connection: SocialConnection,
  content: PublishableContent
): Promise<PublishResult> {
  const accessToken = await ensureFreshToken(connection);
  const metadata = connection.metadata as Record<string, unknown> | null;

  // For page connections, use the stored page access token from metadata
  const pageToken = (metadata?.pageAccessToken as string | undefined) ?? accessToken;
  const pageId = connection.platformAccountId;

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: content.text,
      access_token: pageToken,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return {
      success: false,
      errorMessage: `Facebook post failed (${res.status}): ${errorText}`,
    };
  }

  const data = await res.json();
  const postId = data.id as string | undefined;
  const externalUrl = postId
    ? `https://www.facebook.com/${postId.replace("_", "/posts/")}`
    : undefined;

  return { success: true, externalUrl };
}

export async function getProfile(
  connection: SocialConnection
): Promise<{ name: string; avatar?: string }> {
  return { name: connection.platformUsername };
}

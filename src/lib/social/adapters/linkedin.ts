import type { SocialConnection } from "@prisma/client";
import type { PublishableContent, PublishResult } from "@/lib/types";
import { ensureFreshToken } from "../token-refresh";

export async function publish(
  connection: SocialConnection,
  content: PublishableContent
): Promise<PublishResult> {
  const accessToken = await ensureFreshToken(connection);

  // Build the LinkedIn UGC post payload
  const payload = {
    author: `urn:li:person:${connection.platformAccountId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content.text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return {
      success: false,
      errorMessage: `LinkedIn post failed (${res.status}): ${errorText}`,
    };
  }

  const data = await res.json();
  const postId = (data.id as string | undefined)?.split(":").pop();
  const externalUrl = postId
    ? `https://www.linkedin.com/feed/update/${data.id}/`
    : undefined;

  return { success: true, externalUrl };
}

export async function getProfile(
  connection: SocialConnection
): Promise<{ name: string; avatar?: string }> {
  return { name: connection.platformUsername };
}

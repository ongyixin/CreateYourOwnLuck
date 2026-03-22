/**
 * Ensures a SocialConnection has a valid, non-expired access token.
 * Refreshes the token if needed and updates the DB row.
 */

import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "./crypto";
import { getOAuthConfig } from "./oauth-config";
import type { SocialConnection } from "@prisma/client";

// Refresh threshold: if the token expires within 5 minutes, refresh now
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export async function ensureFreshToken(connection: SocialConnection): Promise<string> {
  const isExpiringSoon =
    connection.expiresAt &&
    new Date(connection.expiresAt).getTime() - Date.now() < REFRESH_THRESHOLD_MS;

  if (!isExpiringSoon) {
    return decryptToken(connection.accessToken);
  }

  if (!connection.refreshToken) {
    // No refresh token; return the current token and let the adapter fail
    return decryptToken(connection.accessToken);
  }

  const refreshed = await refreshToken(connection);
  return refreshed;
}

async function refreshToken(connection: SocialConnection): Promise<string> {
  const config = getOAuthConfig(connection.platform);
  const encryptedRefresh = connection.refreshToken!;
  const refreshToken = await decryptToken(encryptedRefresh);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (connection.platform === "TWITTER") {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
    body.delete("client_secret");
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed for ${connection.platform}: ${err}`);
  }

  const data = await res.json();
  const newAccessToken = data.access_token as string;
  const newRefreshToken = (data.refresh_token as string | undefined) ?? refreshToken;

  let newExpiresAt: Date | undefined;
  if (data.expires_in) {
    newExpiresAt = new Date(Date.now() + (data.expires_in as number) * 1000);
  }

  const [encryptedAccess, encryptedNewRefresh] = await Promise.all([
    encryptToken(newAccessToken),
    encryptToken(newRefreshToken),
  ]);

  await prisma.socialConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptedAccess,
      refreshToken: encryptedNewRefresh,
      expiresAt: newExpiresAt ?? connection.expiresAt,
    },
  });

  return newAccessToken;
}

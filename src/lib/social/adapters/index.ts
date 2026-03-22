import type { SocialConnection } from "@prisma/client";
import type { PublishableContent, PublishResult, SocialPlatform } from "@/lib/types";
import * as linkedin from "./linkedin";
import * as twitter from "./twitter";
import * as facebook from "./facebook";

export interface SocialAdapter {
  publish(connection: SocialConnection, content: PublishableContent): Promise<PublishResult>;
  getProfile(connection: SocialConnection): Promise<{ name: string; avatar?: string }>;
}

const adapters: Record<SocialPlatform, SocialAdapter> = {
  LINKEDIN: linkedin,
  TWITTER: twitter,
  FACEBOOK: facebook,
};

export function getAdapter(platform: SocialPlatform): SocialAdapter {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`No adapter for platform: ${platform}`);
  return adapter;
}

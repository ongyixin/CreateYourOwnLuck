/**
 * Tier constants and limits for FitCheck.
 * Bootloader = FREE, Series A = PRO, Series B = AGENCY
 */

export const TIER_RANK: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  AGENCY: 2,
};

export const TIER_LIMITS = {
  FREE:   { analyses: 1,         personas: 3,  competitors: 3  },
  PRO:    { analyses: Infinity,  personas: 5,  competitors: 3  },
  AGENCY: { analyses: Infinity,  personas: 10, competitors: 10 },
} as const;

export type UserTier = "FREE" | "PRO" | "AGENCY";

export function canAccessTier(userTier: UserTier, requiredTier: "PRO" | "AGENCY"): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
}

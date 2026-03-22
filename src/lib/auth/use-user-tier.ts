"use client";

import { useSession } from "next-auth/react";

const TIER_RANK: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  AGENCY: 2,
};

export function useUserTier() {
  const { data: session, status } = useSession();

  const tier = session?.user?.tier ?? "FREE";
  const role = session?.user?.role ?? "USER";
  const isAdmin = role === "ADMIN";
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  function canAccess(requiredTier: "PRO" | "AGENCY"): boolean {
    if (isAdmin) return true;
    return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
  }

  return { tier, role, isAdmin, isLoading, isAuthenticated, canAccess };
}

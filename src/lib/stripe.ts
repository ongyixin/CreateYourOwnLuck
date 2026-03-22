import Stripe from "stripe";

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
}

export const TIER_PRICE_MAP: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRO_PRICE_ID,
  AGENCY: process.env.STRIPE_AGENCY_PRICE_ID,
};

export function getPriceTierMap(): Record<string, "PRO" | "AGENCY"> {
  const map: Record<string, "PRO" | "AGENCY"> = {};
  if (process.env.STRIPE_PRO_PRICE_ID) map[process.env.STRIPE_PRO_PRICE_ID] = "PRO";
  if (process.env.STRIPE_AGENCY_PRICE_ID) map[process.env.STRIPE_AGENCY_PRICE_ID] = "AGENCY";
  return map;
}

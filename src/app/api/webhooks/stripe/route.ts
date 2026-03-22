import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, getPriceTierMap } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const PRICE_TIER_MAP = getPriceTierMap();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier as "PRO" | "AGENCY" | undefined;

      if (userId && tier) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            tierGrantedBy: null,
            tierExpiresAt: null,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (!user) break;

      const priceId = subscription.items.data[0]?.price?.id;
      const newTier = priceId ? PRICE_TIER_MAP[priceId] : undefined;

      if (newTier && subscription.status === "active") {
        await prisma.user.update({
          where: { id: user.id },
          data: { tier: newTier, stripeSubscriptionId: subscription.id },
        });
      } else if (
        subscription.status === "canceled" ||
        subscription.status === "unpaid" ||
        subscription.status === "past_due"
      ) {
        await prisma.user.update({
          where: { id: user.id },
          data: { tier: "FREE", stripeSubscriptionId: null },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { tier: "FREE", stripeSubscriptionId: null },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

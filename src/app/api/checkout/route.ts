import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { getStripe, TIER_PRICE_MAP } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const tier = body.tier as string;

  if (!tier || !TIER_PRICE_MAP[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, stripeCustomerId: true },
  });

  if (!user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: TIER_PRICE_MAP[tier], quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/analyze?upgraded=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/#pricing`,
    metadata: { userId: session.user.id, tier },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

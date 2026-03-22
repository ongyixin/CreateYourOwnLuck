import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { sendVerificationRequest } from "@/lib/auth/resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {}, // not used — custom sendVerificationRequest below
      from: process.env.EMAIL_FROM ?? "FitCheck <noreply@fitcheck.app>",
      sendVerificationRequest,
    }),
  ],

  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },

  callbacks: {
    async jwt({ token, trigger }) {
      // On sign-in or whenever we need fresh data, pull from DB
      if (trigger === "signIn" || trigger === "update" || !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: {
            role: true,
            tier: true,
            tierExpiresAt: true,
          },
        });
        if (dbUser) {
          // Auto-assign ADMIN role for the admin email.
          // Only set tier=AGENCY on first-time promotion (when role was USER).
          // After that, respect whatever tier is stored in DB to allow testing.
          if (token.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            if (dbUser.role !== "ADMIN") {
              await prisma.user.update({
                where: { id: token.sub! },
                data: { role: "ADMIN", tier: "AGENCY" },
              });
              token.role = "ADMIN";
              token.tier = "AGENCY";
              return token;
            }
            token.role = "ADMIN";
            token.tier = dbUser.tier;
            return token;
          }

          // Check if admin-granted tier has expired
          let effectiveTier = dbUser.tier;
          if (
            dbUser.tierExpiresAt &&
            new Date(dbUser.tierExpiresAt) < new Date()
          ) {
            effectiveTier = "FREE";
            // Clean up expired grant in background
            prisma.user
              .update({
                where: { id: token.sub! },
                data: { tier: "FREE", tierGrantedBy: null, tierExpiresAt: null },
              })
              .catch(() => {});
          }
          token.role = dbUser.role;
          token.tier = effectiveTier;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
        session.user.tier = (token.tier as "FREE" | "PRO" | "AGENCY") ?? "FREE";
      }
      return session;
    },
  },
};

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      tier: "FREE" | "PRO" | "AGENCY";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "ADMIN";
    tier?: "FREE" | "PRO" | "AGENCY";
  }
}

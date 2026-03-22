"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import ScanlineOverlay from "@/components/scanline-overlay";
import AnimatedLogo from "@/components/animated-logo";
import Link from "next/link";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogle = async () => {
    setLoading("google");
    await signIn("google", { callbackUrl });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    await signIn("email", { email, callbackUrl, redirect: false });
    setEmailSent(true);
    setLoading(null);
  };

  return (
    <div className="terminal-card border-neon-green glow-green text-center">
      <div className="font-mono text-[10px] text-neon-amber tracking-[0.3em] uppercase mb-2">
        AUTHENTICATION
      </div>
      <h1 className="font-mono text-xl font-bold text-foreground tracking-wider mb-1">
        SIGN IN
      </h1>
      <p className="font-mono text-xs text-muted-foreground mb-8">
        Access your FitCheck dashboard
      </p>

      {emailSent ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 border-2 border-neon-green rounded-sm mx-auto">
            <Mail className="w-5 h-5 text-neon-green" />
          </div>
          <p className="font-mono text-sm text-foreground">
            Check your email
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            A sign-in link has been sent to <strong className="text-neon-green">{email}</strong>
          </p>
          <button
            onClick={() => { setEmailSent(false); setEmail(""); }}
            className="font-mono text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-wider"
          >
            USE A DIFFERENT EMAIL
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            CONTINUE WITH GOOGLE
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email magic link */}
          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-background border-2 border-border focus:border-neon-green text-foreground font-mono text-xs px-3 py-2.5 rounded-sm outline-none transition-colors placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={loading !== null || !email.trim()}
              className="w-full flex items-center justify-center gap-2 border-2 border-neon-green text-neon-green font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:bg-neon-green hover:text-primary-foreground transition-all active:scale-95 disabled:opacity-50"
            >
              {loading === "email" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              SEND MAGIC LINK
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <ScanlineOverlay />

      <nav className="relative z-40 border-b border-border px-6 py-3">
        <Link href="/" className="mx-auto max-w-5xl flex items-center gap-2">
          <AnimatedLogo size={18} />
          <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
            FITCHECK<span className="blink">_</span>
          </span>
        </Link>
      </nav>

      <div className="relative z-20 flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense fallback={<div className="terminal-card border-neon-green"><div className="font-mono text-xs text-muted-foreground text-center">LOADING...</div></div>}>
            <SignInForm />
          </Suspense>
          <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground tracking-wider">
            By signing in, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Mail } from "lucide-react";
import ScanlineOverlay from "@/components/scanline-overlay";
import AnimatedLogo from "@/components/animated-logo";
import Link from "next/link";

export default function VerifyRequestPage() {
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
          <div className="terminal-card border-neon-green glow-green text-center">
            <div className="flex items-center justify-center w-14 h-14 border-2 border-neon-green rounded-sm mx-auto mb-4">
              <Mail className="w-6 h-6 text-neon-green" />
            </div>
            <h1 className="font-mono text-xl font-bold text-foreground tracking-wider mb-2">
              CHECK YOUR EMAIL
            </h1>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-6">
              A sign-in link has been sent to your email address.
              Click the link in the email to complete sign-in.
            </p>
            <Link
              href="/auth/signin"
              className="inline-block font-mono text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-wider"
            >
              BACK TO SIGN IN
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

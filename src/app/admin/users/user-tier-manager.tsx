"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const DURATION_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "Permanent", days: null },
];

export function UserTierManager({
  userId,
  currentTier,
  userEmail,
}: {
  userId: string;
  currentTier: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<"FREE" | "PRO" | "AGENCY">("PRO");
  const [duration, setDuration] = useState<number | null>(30);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGrant = async () => {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/tier`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, durationDays: duration }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] text-neon-green border border-neon-green px-2 py-0.5 hover:bg-neon-green hover:text-primary-foreground transition-all tracking-wider"
      >
        MANAGE TIER
      </button>
    );
  }

  return (
    <div className="space-y-2 min-w-[180px]">
      <div className="font-mono text-[9px] text-muted-foreground tracking-wider truncate max-w-[180px]">
        {userEmail}
      </div>
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value as "FREE" | "PRO" | "AGENCY")}
        className="w-full bg-background border border-border text-foreground font-mono text-[10px] px-2 py-1 rounded-sm outline-none"
      >
        <option value="FREE">FREE</option>
        <option value="PRO">PRO</option>
        <option value="AGENCY">AGENCY</option>
      </select>
      <select
        value={duration ?? ""}
        onChange={(e) => setDuration(e.target.value === "" ? null : parseInt(e.target.value))}
        className="w-full bg-background border border-border text-foreground font-mono text-[10px] px-2 py-1 rounded-sm outline-none"
      >
        {DURATION_OPTIONS.map((d) => (
          <option key={d.label} value={d.days ?? ""}>
            {d.label}
          </option>
        ))}
      </select>
      <div className="flex gap-1">
        <button
          onClick={handleGrant}
          disabled={loading}
          className="flex-1 bg-neon-green text-primary-foreground font-mono font-bold px-2 py-1 text-[9px] tracking-wider disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "SET"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 border border-border text-muted-foreground font-mono font-bold px-2 py-1 text-[9px] tracking-wider hover:border-neon-pink hover:text-neon-pink transition-all"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

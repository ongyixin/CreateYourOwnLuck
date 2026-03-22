import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [userCount, analysisCount, tierCounts] = await Promise.all([
    prisma.user.count(),
    prisma.analysis.count(),
    prisma.user.groupBy({ by: ["tier"], _count: { tier: true } }),
  ]);

  const tierMap = Object.fromEntries(tierCounts.map((t) => [t.tier, t._count.tier]));

  return (
    <div className="space-y-8">
      <div>
        <div className="font-mono text-[10px] text-neon-amber tracking-[0.4em] uppercase mb-1">ADMIN</div>
        <h1 className="font-mono text-2xl font-bold text-neon-green tracking-wider">&gt; DASHBOARD</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "TOTAL USERS", value: userCount, color: "text-neon-green" },
          { label: "ANALYSES RUN", value: analysisCount, color: "text-neon-cyan" },
          { label: "PRO SUBSCRIBERS", value: tierMap["PRO"] ?? 0, color: "text-neon-amber" },
          { label: "AGENCY SUBSCRIBERS", value: tierMap["AGENCY"] ?? 0, color: "text-neon-pink" },
        ].map((stat) => (
          <div key={stat.label} className="terminal-card border-border">
            <div className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">{stat.label}</div>
            <div className={`font-mono text-3xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

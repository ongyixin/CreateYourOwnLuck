import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [userCount, analysisCount, tierCounts, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.analysis.count(),
    prisma.user.groupBy({ by: ["tier"], _count: { tier: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, email: true, name: true, tier: true, role: true, createdAt: true },
    }),
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

      {/* Recent users */}
      <div className="terminal-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-sm font-bold text-foreground tracking-wider">RECENT SIGNUPS</h2>
          <a href="/admin/users" className="font-mono text-[10px] text-neon-green hover:underline tracking-wider">
            VIEW ALL →
          </a>
        </div>
        <div className="space-y-2">
          {recentUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="font-mono text-xs text-foreground">{user.email}</div>
                {user.name && (
                  <div className="font-mono text-[10px] text-muted-foreground">{user.name}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {user.role === "ADMIN" && (
                  <span className="font-mono text-[9px] text-neon-amber border border-neon-amber px-1.5 py-0.5 tracking-widest">ADMIN</span>
                )}
                <span className={`font-mono text-[9px] border px-1.5 py-0.5 tracking-widest ${
                  user.tier === "AGENCY" ? "text-neon-pink border-neon-pink" :
                  user.tier === "PRO" ? "text-neon-green border-neon-green" :
                  "text-muted-foreground border-border"
                }`}>
                  {user.tier}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { UserTierManager } from "./user-tier-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = searchParams.q ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const perPage = 25;

  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        tierGrantedBy: true,
        tierExpiresAt: true,
        stripeSubscriptionId: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] text-neon-amber tracking-[0.4em] uppercase mb-1">ADMIN</div>
        <h1 className="font-mono text-2xl font-bold text-neon-green tracking-wider">&gt; USERS</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">{total} total users</p>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by email or name..."
          className="flex-1 bg-background border-2 border-border focus:border-neon-green text-foreground font-mono text-xs px-3 py-2 rounded-sm outline-none transition-colors placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="border-2 border-neon-green text-neon-green font-mono font-bold px-4 py-2 rounded-sm text-xs tracking-wider hover:bg-neon-green hover:text-primary-foreground transition-all"
        >
          SEARCH
        </button>
      </form>

      {/* Table */}
      <div className="terminal-card border-border overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">EMAIL</th>
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">ROLE</th>
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">TIER</th>
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">GRANTED BY</th>
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">EXPIRES</th>
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">JOINED</th>
              <th className="text-left py-2 px-3 text-muted-foreground tracking-wider">MANAGE</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20">
                <td className="py-2 px-3">
                  <div className="text-foreground">{user.email}</div>
                  {user.name && <div className="text-muted-foreground text-[10px]">{user.name}</div>}
                </td>
                <td className="py-2 px-3">
                  {user.role === "ADMIN" ? (
                    <span className="text-neon-amber border border-neon-amber px-1.5 py-0.5 text-[9px] tracking-widest">ADMIN</span>
                  ) : (
                    <span className="text-muted-foreground">USER</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <span className={`border px-1.5 py-0.5 text-[9px] tracking-widest ${
                    user.tier === "AGENCY" ? "text-neon-pink border-neon-pink" :
                    user.tier === "PRO" ? "text-neon-green border-neon-green" :
                    "text-muted-foreground border-border"
                  }`}>
                    {user.tier}
                  </span>
                  {user.stripeSubscriptionId && (
                    <span className="ml-1 text-neon-cyan text-[9px]">STRIPE</span>
                  )}
                </td>
                <td className="py-2 px-3 text-muted-foreground text-[10px]">
                  {user.tierGrantedBy ?? "—"}
                </td>
                <td className="py-2 px-3 text-muted-foreground text-[10px]">
                  {user.tierExpiresAt
                    ? new Date(user.tierExpiresAt) < new Date()
                      ? <span className="text-neon-pink">EXPIRED</span>
                      : new Date(user.tierExpiresAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="py-2 px-3 text-muted-foreground text-[10px]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 px-3">
                  <UserTierManager
                    userId={user.id}
                    currentTier={user.tier}
                    userEmail={user.email ?? ""}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center font-mono text-xs">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/users?q=${query}&page=${p}`}
              className={`border px-2.5 py-1 ${
                p === page
                  ? "border-neon-green text-neon-green"
                  : "border-border text-muted-foreground hover:border-neon-green hover:text-neon-green"
              } transition-colors`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

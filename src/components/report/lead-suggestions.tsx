"use client";

import { Users, Globe, Building2, Radio, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import type { LeadSuggestions, CreatorChannel } from "@/lib/types";

const PLATFORM_VARIANTS: Record<string, "pink" | "purple" | "cyan" | "blue" | "green" | "amber"> = {
  Reddit: "pink",
  Slack: "purple",
  Discord: "purple",
  LinkedIn: "blue",
  Forum: "cyan",
  Twitter: "cyan",
};

function PlatformBadge({ platform }: { platform: string }) {
  const variant = PLATFORM_VARIANTS[platform] ?? "green";
  return <NeonBadge variant={variant}>{platform}</NeonBadge>;
}

const CHANNEL_ICONS: Record<CreatorChannel["type"], string> = {
  podcast: "🎙",
  newsletter: "📧",
  influencer: "⭐",
  youtube: "▶",
  other: "🔗",
};

interface LeadSuggestionsSectionProps {
  data: LeadSuggestions;
}

export function LeadSuggestionsSection({ data }: LeadSuggestionsSectionProps) {
  const customerTypes = data.customerTypes ?? [];
  const communities = data.communities ?? [];
  const companies = data.targetCompanyProfiles ?? [];
  const channels = data.creatorChannels ?? [];

  return (
    <div className="space-y-10">
      {/* Module header */}
      <div>
        <div className="module-header text-neon-pink">Module 04</div>
        <h2 className="font-mono text-neon-pink text-xl font-bold tracking-wider">LEAD SUGGESTIONS</h2>
      </div>

      {/* Target Customer Types */}
      {customerTypes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-neon-cyan" />
            <h3 className="font-mono text-neon-cyan text-sm font-bold tracking-wider">TARGET CUSTOMER TYPES</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {customerTypes.map((ct, i) => (
              <div key={i} className="terminal-card border-border hover:glow-cyan">
                <h4 className="font-mono text-foreground text-sm font-bold mb-2 tracking-wider">{ct.role.toUpperCase()}</h4>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ct.companySizes.map((size, j) => (
                    <NeonBadge key={j} variant="green">{size}</NeonBadge>
                  ))}
                  {ct.industries.map((ind, j) => (
                    <NeonBadge key={j} variant="purple">{ind}</NeonBadge>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{ct.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communities */}
      {communities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-neon-green" />
            <h3 className="font-mono text-neon-green text-sm font-bold tracking-wider">COMMUNITIES TO REACH</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {communities.map((c, i) => (
              <div key={i} className="terminal-card border-border hover:glow-green">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-foreground text-sm font-bold leading-snug tracking-wider">
                    {c.name.toUpperCase()}
                  </span>
                  <PlatformBadge platform={c.platform} />
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed mb-2">{c.rationale}</p>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-neon-green/60 hover:text-neon-green text-xs transition-colors w-fit font-mono"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    VISIT
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Company Profiles */}
      {companies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-neon-amber" />
            <h3 className="font-mono text-neon-amber text-sm font-bold tracking-wider">TARGET COMPANY PROFILES</h3>
          </div>
          <div className="space-y-3">
            {companies.map((co, i) => (
              <div key={i} className="terminal-card border-border hover:glow-amber">
                <p className="text-foreground text-sm leading-relaxed mb-2">{co.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {co.exampleTypes.map((type, j) => (
                    <NeonBadge key={j} variant="amber">{type}</NeonBadge>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{co.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creator Channels */}
      {channels.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-neon-purple" />
            <h3 className="font-mono text-neon-purple text-sm font-bold tracking-wider">CREATORS & CHANNELS</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map((ch, i) => (
              <div key={i} className="terminal-card border-border hover:glow-purple">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg leading-none" aria-hidden>
                    {CHANNEL_ICONS[ch.type] ?? CHANNEL_ICONS.other}
                  </span>
                  <span className="font-mono text-foreground text-sm font-bold tracking-wider">{ch.name.toUpperCase()}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed mb-2">{ch.rationale}</p>
                {ch.url && (
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-neon-purple/60 hover:text-neon-purple text-xs transition-colors w-fit font-mono"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    VISIT
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

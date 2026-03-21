/**
 * Lead Suggestions section — Section 4 of the FitCheck report.
 *
 * Displays:
 * - Target customer types (role + company sizes + industries)
 * - Communities to reach (with platform badge + optional link)
 * - Target company profiles
 * - Creator channels / influencers
 *
 * Owned by: report agent
 */

import { Users, Globe, Building2, Radio, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LeadSuggestions, CreatorChannel } from "@/lib/types";

// ─── Platform badge colors ─────────────────────────────────────────────────

const PLATFORM_STYLES: Record<string, string> = {
  Reddit: "bg-orange-950/50 border-orange-800/50 text-orange-400",
  Slack: "bg-purple-950/50 border-purple-800/50 text-purple-400",
  Discord: "bg-indigo-950/50 border-indigo-800/50 text-indigo-400",
  LinkedIn: "bg-blue-950/50 border-blue-800/50 text-blue-400",
  Forum: "bg-teal-950/50 border-teal-800/50 text-teal-400",
  Twitter: "bg-sky-950/50 border-sky-800/50 text-sky-400",
};

function PlatformBadge({ platform }: { platform: string }) {
  const style = PLATFORM_STYLES[platform] ?? "bg-zinc-800 border-zinc-700 text-zinc-400";
  return (
    <span
      className={cn("px-2 py-0.5 text-xs border rounded font-medium flex-shrink-0", style)}
    >
      {platform}
    </span>
  );
}

// ─── Channel type icon ─────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<CreatorChannel["type"], string> = {
  podcast: "🎙",
  newsletter: "📧",
  influencer: "⭐",
  youtube: "▶",
  other: "🔗",
};

// ─── Section header ────────────────────────────────────────────────────────

function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-white font-semibold text-sm">{label}</h3>
    </div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────

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
      {/* Target Customer Types */}
      {customerTypes.length > 0 && (
        <div>
          <SectionHead
            icon={<Users className="h-4 w-4 text-violet-400" />}
            label="Target Customer Types"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            {customerTypes.map((ct, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <h4 className="text-white text-sm font-semibold">{ct.role}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {ct.companySizes.map((size, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {size}
                      </Badge>
                    ))}
                    {ct.industries.map((ind, j) => (
                      <span
                        key={j}
                        className="px-2 py-0.5 bg-violet-950/40 text-violet-400/80 text-xs rounded border border-violet-900/30"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {ct.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Communities */}
      {communities.length > 0 && (
        <div>
          <SectionHead
            icon={<Globe className="h-4 w-4 text-violet-400" />}
            label="Communities to Reach"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {communities.map((c, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-white text-sm font-medium leading-snug">
                      {c.name}
                    </span>
                    <PlatformBadge platform={c.platform} />
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {c.rationale}
                  </p>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-400/60 hover:text-violet-400 text-xs transition-colors w-fit"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Visit
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Target Company Profiles */}
      {companies.length > 0 && (
        <div>
          <SectionHead
            icon={<Building2 className="h-4 w-4 text-violet-400" />}
            label="Target Company Profiles"
          />
          <div className="space-y-3">
            {companies.map((co, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {co.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {co.exampleTypes.map((type, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {co.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Creator Channels */}
      {channels.length > 0 && (
        <div>
          <SectionHead
            icon={<Radio className="h-4 w-4 text-violet-400" />}
            label="Creators &amp; Channels"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map((ch, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none" aria-hidden>
                      {CHANNEL_ICONS[ch.type] ?? CHANNEL_ICONS.other}
                    </span>
                    <span className="text-white text-sm font-medium">{ch.name}</span>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {ch.rationale}
                  </p>
                  {ch.url && (
                    <a
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-400/60 hover:text-violet-400 text-xs transition-colors w-fit"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Visit
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

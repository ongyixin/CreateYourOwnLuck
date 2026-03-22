"use client";

import { useState } from "react";
import {
  MessageSquare,
  Palette,
  Users,
  FlaskConical,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import type {
  GtmAssetRecord,
  GtmAgentType,
  MessagingAssetContent,
  CreativeAssetContent,
  OutreachAssetContent,
  GrowthAssetContent,
} from "@/lib/types";

// ──────────────────────────────────────────────────────────
// Tab configuration
// ──────────────────────────────────────────────────────────

const TABS: { id: GtmAgentType; label: string; Icon: typeof MessageSquare; color: string; activeClass: string }[] = [
  {
    id: "messaging",
    label: "MESSAGING",
    Icon: MessageSquare,
    color: "text-neon-cyan",
    activeClass: "border-neon-cyan text-neon-cyan",
  },
  {
    id: "creative",
    label: "CREATIVE",
    Icon: Palette,
    color: "text-neon-purple",
    activeClass: "border-neon-purple text-neon-purple",
  },
  {
    id: "outreach",
    label: "OUTREACH",
    Icon: Users,
    color: "text-neon-pink",
    activeClass: "border-neon-pink text-neon-pink",
  },
  {
    id: "growth",
    label: "GROWTH",
    Icon: FlaskConical,
    color: "text-neon-green",
    activeClass: "border-neon-green text-neon-green",
  },
];

// ──────────────────────────────────────────────────────────
// Clipboard copy button
// ──────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-neon-green" />
          <span className="text-neon-green">COPIED</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Expandable asset card wrapper
// ──────────────────────────────────────────────────────────

function AssetCard({
  title,
  accentClass,
  badgeColor,
  badgeLabel,
  status,
  children,
}: {
  title: string;
  accentClass: string;
  badgeColor: "cyan" | "purple" | "pink" | "green";
  badgeLabel: string;
  status: GtmAssetRecord["status"];
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("terminal-card border-l-4", accentClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <NeonBadge variant={badgeColor}>{badgeLabel}</NeonBadge>
          <h4 className="font-mono text-foreground text-sm font-bold tracking-wider leading-snug">
            {title.toUpperCase()}
          </h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === "generating" && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {status === "complete" && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
      {expanded && status === "complete" && (
        <div className="mt-4 space-y-4">{children}</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Messaging asset renderer
// ──────────────────────────────────────────────────────────

function MessagingAsset({ asset }: { asset: GtmAssetRecord }) {
  const content = asset.content as MessagingAssetContent;
  return (
    <AssetCard
      title={asset.title}
      accentClass="border-l-neon-cyan"
      badgeColor="cyan"
      badgeLabel="MESSAGING"
      status={asset.status}
    >
      {/* Copy rewrites */}
      {content.placements?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-cyan tracking-widest mb-2">
            COPY REWRITES ({content.placements.length})
          </p>
          <div className="space-y-3">
            {content.placements.map((p, i) => (
              <div key={i} className="space-y-2">
                <p className="font-mono text-[10px] text-muted-foreground tracking-widest">
                  {p.placement.toUpperCase()}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="p-3 bg-secondary rounded-sm border border-neon-pink/20">
                    <div className="font-mono text-[10px] text-neon-pink tracking-widest mb-1">
                      ✕ BEFORE
                    </div>
                    <p className="text-[12px] text-muted-foreground italic">{p.before}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-sm border border-neon-green/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-mono text-[10px] text-neon-green tracking-widest">
                        ✓ AFTER
                      </div>
                      <CopyButton text={p.after} />
                    </div>
                    <p className="text-[12px] text-foreground">{p.after}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">{p.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positioning statement */}
      {content.positioningStatement && (
        <div className="p-3 bg-secondary rounded-sm border border-neon-cyan/20">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] text-neon-cyan tracking-widest">
              POSITIONING STATEMENT
            </p>
            <CopyButton text={content.positioningStatement} />
          </div>
          <p className="text-sm text-foreground italic">&ldquo;{content.positioningStatement}&rdquo;</p>
        </div>
      )}

      {/* Value props */}
      {content.valueProps?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-cyan tracking-widest mb-2">
            VALUE PROPS
          </p>
          <div className="space-y-1">
            {content.valueProps.map((vp, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight className="h-3 w-3 text-neon-cyan mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{vp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tone guide */}
      {content.toneGuide && (
        <div className="p-3 bg-secondary rounded-sm">
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1">
            TONE GUIDE
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{content.toneGuide}</p>
        </div>
      )}
    </AssetCard>
  );
}

// ──────────────────────────────────────────────────────────
// Creative asset renderer
// ──────────────────────────────────────────────────────────

function CreativeAsset({ asset }: { asset: GtmAssetRecord }) {
  const content = asset.content as CreativeAssetContent;
  return (
    <AssetCard
      title={asset.title}
      accentClass="border-l-neon-purple"
      badgeColor="purple"
      badgeLabel={content.assetType?.toUpperCase().replace(/_/g, " ") ?? "CREATIVE"}
      status={asset.status}
    >
      <div className="space-y-3">
        {content.blocks?.map((block, i) => (
          <div key={i} className="p-3 bg-secondary rounded-sm border border-neon-purple/10">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] text-neon-purple tracking-widest">
                {block.label.toUpperCase()}
              </p>
              <CopyButton text={block.content} />
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {block.content}
            </p>
          </div>
        ))}
      </div>
      {content.notes && (
        <div className="p-3 bg-secondary rounded-sm border border-border">
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1">
            IMPLEMENTATION NOTES
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{content.notes}</p>
        </div>
      )}
    </AssetCard>
  );
}

// ──────────────────────────────────────────────────────────
// Outreach asset renderer
// ──────────────────────────────────────────────────────────

function OutreachAsset({ asset }: { asset: GtmAssetRecord }) {
  const content = asset.content as OutreachAssetContent;
  return (
    <AssetCard
      title={asset.title}
      accentClass="border-l-neon-pink"
      badgeColor="pink"
      badgeLabel={content.targetType?.toUpperCase() ?? "OUTREACH"}
      status={asset.status}
    >
      {/* Stakeholder profiles */}
      {content.stakeholderProfiles?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-pink tracking-widest mb-2">
            WHO TO TARGET
          </p>
          <div className="space-y-2">
            {content.stakeholderProfiles.map((sp, i) => (
              <div key={i} className="p-3 bg-secondary rounded-sm border border-neon-pink/10">
                <p className="text-sm font-bold text-foreground">{sp.role}</p>
                <p className="text-xs text-muted-foreground">{sp.companyType}</p>
                <p className="text-xs text-muted-foreground mt-1">{sp.whyTheyMatter}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      {content.templates?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-pink tracking-widest mb-2">
            MESSAGE TEMPLATES
          </p>
          <div className="space-y-3">
            {content.templates.map((tmpl, i) => (
              <div key={i} className="p-3 bg-secondary rounded-sm border border-neon-pink/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[10px] text-neon-pink tracking-widest">
                    {tmpl.channel.toUpperCase()}
                  </p>
                  <CopyButton text={tmpl.subject ? `Subject: ${tmpl.subject}\n\n${tmpl.body}` : tmpl.body} />
                </div>
                {tmpl.subject && (
                  <p className="text-xs font-bold text-foreground mb-1">
                    Subject: {tmpl.subject}
                  </p>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {tmpl.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up sequence */}
      {content.followUpSequence?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-pink tracking-widest mb-2">
            FOLLOW-UP SEQUENCE
          </p>
          <div className="space-y-1">
            {content.followUpSequence.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-mono text-[9px] border border-neon-pink text-neon-pink px-1.5 py-0.5 shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AssetCard>
  );
}

// ──────────────────────────────────────────────────────────
// Growth asset renderer
// ──────────────────────────────────────────────────────────

function GrowthAsset({ asset }: { asset: GtmAssetRecord }) {
  const content = asset.content as GrowthAssetContent;
  return (
    <AssetCard
      title={asset.title}
      accentClass="border-l-neon-green"
      badgeColor="green"
      badgeLabel={content.experimentType?.toUpperCase().replace(/_/g, " ") ?? "EXPERIMENT"}
      status={asset.status}
    >
      {/* Hypothesis */}
      {content.hypothesis && (
        <div className="p-3 bg-secondary rounded-sm border border-neon-green/20">
          <p className="font-mono text-[10px] text-neon-green tracking-widest mb-1">
            HYPOTHESIS
          </p>
          <p className="text-sm text-foreground italic">{content.hypothesis}</p>
        </div>
      )}

      {/* Control vs Variant */}
      <div className="grid sm:grid-cols-2 gap-2">
        {content.control && (
          <div className="p-3 bg-secondary rounded-sm border border-muted">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1">
              CONTROL
            </p>
            <p className="text-xs text-muted-foreground">{content.control}</p>
          </div>
        )}
        {content.variant && (
          <div className="p-3 bg-secondary rounded-sm border border-neon-green/20">
            <p className="font-mono text-[10px] text-neon-green tracking-widest mb-1">
              VARIANT
            </p>
            <p className="text-xs text-muted-foreground">{content.variant}</p>
          </div>
        )}
      </div>

      {/* Metrics + sample size */}
      <div className="grid sm:grid-cols-2 gap-2">
        {content.successMetric && (
          <div className="p-3 bg-secondary rounded-sm">
            <p className="font-mono text-[10px] text-neon-green tracking-widest mb-1">
              SUCCESS METRIC
            </p>
            <p className="text-xs text-foreground">{content.successMetric}</p>
          </div>
        )}
        {content.sampleSizeNote && (
          <div className="p-3 bg-secondary rounded-sm">
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1">
              SAMPLE SIZE
            </p>
            <p className="text-xs text-muted-foreground">{content.sampleSizeNote}</p>
          </div>
        )}
      </div>

      {/* Implementation steps */}
      {content.implementationSteps?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-green tracking-widest mb-2">
            IMPLEMENTATION
          </p>
          <div className="space-y-1">
            {content.implementationSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-neon-green shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}.
                </span>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy variants */}
      {content.copyVariants?.length > 0 && (
        <div>
          <p className="font-mono text-[10px] text-neon-green tracking-widest mb-2">
            COPY VARIANTS
          </p>
          <div className="space-y-2">
            {content.copyVariants.map((cv, i) => (
              <div key={i} className="p-3 bg-secondary rounded-sm border border-neon-green/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-mono text-[10px] text-neon-green tracking-widest">
                    {cv.label.toUpperCase()}
                  </p>
                  <CopyButton text={cv.copy} />
                </div>
                <p className="text-sm text-foreground">{cv.copy}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AssetCard>
  );
}

// ──────────────────────────────────────────────────────────
// Main gallery component
// ──────────────────────────────────────────────────────────

interface GtmAssetGalleryProps {
  assets: GtmAssetRecord[];
  streamingAgents?: Set<GtmAgentType>;
}

export function GtmAssetGallery({ assets, streamingAgents = new Set() }: GtmAssetGalleryProps) {
  const [activeTab, setActiveTab] = useState<GtmAgentType>("messaging");

  const assetsByAgent: Record<GtmAgentType, GtmAssetRecord[]> = {
    messaging: [],
    creative: [],
    outreach: [],
    growth: [],
  };
  for (const a of assets) {
    assetsByAgent[a.agent]?.push(a);
  }

  const visibleAssets = assetsByAgent[activeTab];
  const isStreaming = streamingAgents.has(activeTab);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const count = assetsByAgent[tab.id].length;
          const active = activeTab === tab.id;
          const { Icon } = tab;
          const streaming = streamingAgents.has(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-[11px] tracking-wider whitespace-nowrap transition-all",
                active
                  ? cn("border-b-2", tab.activeClass, "bg-secondary")
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {streaming ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {tab.label}
              {count > 0 && (
                <span className={cn("text-[9px]", active ? tab.color : "text-muted-foreground")}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Assets */}
      {visibleAssets.length === 0 && !isStreaming ? (
        <div className="text-center py-8 text-muted-foreground text-xs font-mono">
          NO ASSETS GENERATED FOR THIS CATEGORY
        </div>
      ) : (
        <div className="space-y-3">
          {isStreaming && visibleAssets.length === 0 && (
            <div className="flex items-center gap-2 terminal-card border-dashed">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-xs font-mono">
                Agent is working on this category...
              </p>
            </div>
          )}
          {visibleAssets.map((asset) => {
            if (asset.agent === "messaging") return <MessagingAsset key={asset.id} asset={asset} />;
            if (asset.agent === "creative") return <CreativeAsset key={asset.id} asset={asset} />;
            if (asset.agent === "outreach") return <OutreachAsset key={asset.id} asset={asset} />;
            if (asset.agent === "growth") return <GrowthAsset key={asset.id} asset={asset} />;
            return null;
          })}
        </div>
      )}
    </div>
  );
}

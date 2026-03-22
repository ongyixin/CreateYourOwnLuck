import { Globe, Building2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CompanyInfoData {
  companyName: string;
  websiteUrl: string;
  autonomousSetup: boolean;
}

interface CompanyInfoStepProps {
  data: CompanyInfoData;
  errors: Partial<Record<keyof CompanyInfoData, string>>;
  onChange: (data: CompanyInfoData) => void;
}

export function CompanyInfoStep({
  data,
  errors,
  onChange,
}: CompanyInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-xl font-semibold">Your company</h2>
        <p className="text-sm text-zinc-400">
          This is the only required information — everything else is optional.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            Company name
            <span className="text-violet-400">*</span>
          </Label>
          <Input
            id="companyName"
            placeholder="e.g. Acme Corp"
            value={data.companyName}
            onChange={(e) =>
              onChange({ ...data, companyName: e.target.value })
            }
            className={errors.companyName ? "border-destructive" : ""}
          />
          {errors.companyName && (
            <p className="text-xs text-red-400">{errors.companyName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="websiteUrl" className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-zinc-400" />
            Website URL
            <span className="text-violet-400">*</span>
          </Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://acmecorp.com"
            value={data.websiteUrl}
            onChange={(e) =>
              onChange({ ...data, websiteUrl: e.target.value })
            }
            className={errors.websiteUrl ? "border-destructive" : ""}
          />
          {errors.websiteUrl && (
            <p className="text-xs text-red-400">{errors.websiteUrl}</p>
          )}
          <p className="text-xs text-zinc-500">
            FitCheck will crawl this URL to analyze your brand presence.
          </p>
        </div>
      </div>

      {/* Autonomous setup toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onChange({ ...data, autonomousSetup: !data.autonomousSetup })}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange({ ...data, autonomousSetup: !data.autonomousSetup });
          }
        }}
        className={`flex items-start gap-3 rounded-sm border-2 p-4 cursor-pointer transition-all select-none ${
          data.autonomousSetup
            ? "border-neon-green/60 bg-neon-green/5"
            : "border-border hover:border-border/80"
        }`}
      >
        {/* Checkbox */}
        <div
          className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border-2 flex items-center justify-center transition-colors ${
            data.autonomousSetup
              ? "border-neon-green bg-neon-green"
              : "border-zinc-600"
          }`}
        >
          {data.autonomousSetup && (
            <svg className="h-2.5 w-2.5 text-black" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-foreground">
            <Zap className="h-3 w-3 text-neon-green" />
            AUTONOMOUS SETUP
          </div>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            Let our scrapers auto-configure materials, competitors, and sources based on your website. Skip straight to running your analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Globe, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CompanyInfoData {
  companyName: string;
  websiteUrl: string;
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
    </div>
  );
}

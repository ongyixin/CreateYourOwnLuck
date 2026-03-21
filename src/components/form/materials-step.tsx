import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface MaterialsData {
  extraMaterials: string;
}

interface MaterialsStepProps {
  data: MaterialsData;
  onChange: (data: MaterialsData) => void;
}

const MATERIAL_EXAMPLES = [
  "Pitch deck summary",
  "Marketing copy",
  "Product description",
  "Ad headlines",
  "Positioning statement",
];

export function MaterialsStep({ data, onChange }: MaterialsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Additional materials</h2>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            Optional
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          Paste any text that helps describe your brand — the more context,
          the richer the analysis.
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="extraMaterials"
          className="flex items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5 text-zinc-400" />
          Paste your materials
        </Label>
        <Textarea
          id="extraMaterials"
          placeholder={`Paste pitch deck content, marketing copy, product descriptions, or any other relevant text...\n\nExamples:\n• "We help startups find product-market fit faster..."\n• Homepage hero copy\n• Ad headlines you're running`}
          value={data.extraMaterials}
          onChange={(e) => onChange({ extraMaterials: e.target.value })}
          className="min-h-[180px] font-mono text-xs leading-relaxed"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs text-zinc-500">Works great with:</span>
          {MATERIAL_EXAMPLES.map((ex) => (
            <span
              key={ex}
              className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400"
            >
              {ex}
            </span>
          ))}
        </div>
      </div>

      {data.extraMaterials.length === 0 && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-500">
          Skipping this is fine — FitCheck will analyze your website and public
          web data automatically.
        </p>
      )}
    </div>
  );
}

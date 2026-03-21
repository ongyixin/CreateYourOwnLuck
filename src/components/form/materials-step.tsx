import { useRef, useState } from "react";
import { FileText, Upload, X, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";

    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadedFileName(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Failed to parse PDF (${res.status})`);
      onChange({ extraMaterials: body.text });
      setUploadedFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to parse PDF");
    } finally {
      setUploading(false);
    }
  }

  function clearUpload() {
    setUploadedFileName(null);
    setUploadError(null);
    onChange({ extraMaterials: "" });
  }

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
          Upload a PDF or paste any text that helps describe your brand — the more context,
          the richer the analysis.
        </p>
      </div>

      {/* PDF upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5 text-zinc-400" />
          Upload PDF
        </Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        {uploadedFileName ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-violet-400" />
            <span className="flex-1 truncate text-xs text-zinc-300">{uploadedFileName}</span>
            <button
              type="button"
              onClick={clearUpload}
              className="text-zinc-500 transition-colors hover:text-zinc-200"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting text…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Click to upload a PDF (pitch deck, one-pager, etc.)
              </>
            )}
          </button>
        )}
        {uploadError && (
          <p className="text-xs text-red-400">{uploadError}</p>
        )}
      </div>

      {/* Text input */}
      <div className="space-y-2">
        <Label
          htmlFor="extraMaterials"
          className="flex items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5 text-zinc-400" />
          {uploadedFileName ? "Extracted text (edit as needed)" : "Or paste your materials"}
        </Label>
        <Textarea
          id="extraMaterials"
          placeholder={`Paste pitch deck content, marketing copy, product descriptions, or any other relevant text...\n\nExamples:\n• "We help startups find product-market fit faster..."\n• Homepage hero copy\n• Ad headlines you're running`}
          value={data.extraMaterials}
          onChange={(e) => {
            if (uploadedFileName) setUploadedFileName(null);
            onChange({ extraMaterials: e.target.value });
          }}
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

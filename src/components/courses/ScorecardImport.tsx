import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { downscaleImage } from "@/utils/image";
import type { ScorecardExtractResult } from "@/types/golf";

interface ScorecardImportProps {
  onImported: (result: ScorecardExtractResult) => void;
}

export function ScorecardImport({ onImported }: ScorecardImportProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const { dataUrl } = await downscaleImage(file, {
        maxLongEdge: 1280,
        quality: 0.88,
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Sign in expired. Please sign in again.");
      }

      const url = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${url}/functions/v1/extract-scorecard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const body = (await res.json().catch(() => null)) as
        | (ScorecardExtractResult & { error?: string })
        | null;
      if (!res.ok || !body || body.error) {
        throw new Error(body?.error ?? `Extract failed (${res.status})`);
      }

      onImported(body);
      const confidence = Math.round((body.confidence ?? 0) * 100);
      show(`Scorecard parsed. Review before saving (${confidence}%).`, "success");
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Could not read scorecard photo",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <div className="rounded-lg border border-line bg-cream-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-charcoal">
              Import from scorecard photo
            </p>
            <p className="mt-1 text-xs text-charcoal-muted">
              Take or upload a photo. We will fill course details and holes for
              you to review.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            loading={busy}
            leadingIcon={!busy ? <Camera size={16} /> : undefined}
            className="shrink-0"
          >
            Photo
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-2 text-[11px] text-charcoal-muted">
          <Upload size={12} className="text-brass" />
          The image is downsized for OCR and is not stored.
        </p>
      </div>
    </>
  );
}

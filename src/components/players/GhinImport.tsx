import { useRef, useState } from "react";
import { Camera, Upload, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { downscaleImage } from "@/utils/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { GhinExtractResult } from "@/types/golf";

export interface GhinAcceptedValues {
  display_name: string;
  ghin_number: string | null;
  handicap_index: number | null;
  low_hi: number | null;
  home_club: string | null;
}

interface GhinImportProps {
  // Render label / description options
  buttonLabel?: string;
  // Called when the user confirms the parsed values
  onAccept: (values: GhinAcceptedValues) => Promise<void> | void;
  // Optional default name to seed when the OCR doesn't return one
  fallbackName?: string;
}

export function GhinImport({
  buttonLabel = "Import from screenshot",
  onAccept,
  fallbackName,
}: GhinImportProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GhinExtractResult | null>(null);
  const [editable, setEditable] = useState<GhinAcceptedValues | null>(null);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const { dataUrl } = await downscaleImage(file, {
        maxLongEdge: 1024,
        quality: 0.85,
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Sign in expired. Please sign in again.");
      }
      const url = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${url}/functions/v1/extract-ghin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const body = (await res.json().catch(() => null)) as
        | (GhinExtractResult & { error?: string })
        | null;
      if (!res.ok || !body || body.error) {
        throw new Error(body?.error ?? `Extract failed (${res.status})`);
      }
      setResult(body);
      setEditable({
        display_name: body.name?.trim() || fallbackName || "",
        ghin_number: body.ghin_number,
        handicap_index: body.handicap_index,
        low_hi: body.low_hi,
        home_club: body.home_club,
      });
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Could not read screenshot",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const onPick = () => inputRef.current?.click();

  const handleAccept = async () => {
    if (!editable) return;
    if (!editable.display_name.trim()) {
      show("Add a name before saving.", "error");
      return;
    }
    setSaving(true);
    try {
      await onAccept(editable);
      setResult(null);
      setEditable(null);
    } catch (err) {
      show(
        err instanceof Error ? err.message : "Could not save profile",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        onClick={onPick}
        loading={busy}
        leadingIcon={!busy ? <Camera size={16} /> : undefined}
      >
        {buttonLabel}
      </Button>

      <Modal
        open={!!result && !!editable}
        onClose={() => {
          if (!saving) {
            setResult(null);
            setEditable(null);
          }
        }}
        title="Confirm GHIN details"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null);
                setEditable(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAccept} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {editable ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs text-charcoal-muted">
              <Sparkles size={14} className="text-brass" />
              Parsed from your screenshot. Review and edit before saving.
              {result?.confidence != null ? (
                <span className="ml-auto rounded-full border border-line bg-cream-50 px-2 py-0.5 text-[11px] text-charcoal">
                  Confidence {Math.round((result.confidence ?? 0) * 100)}%
                </span>
              ) : null}
            </p>
            <Input
              label="Name"
              value={editable.display_name}
              onChange={(e) =>
                setEditable({ ...editable, display_name: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Handicap index"
                inputMode="decimal"
                value={
                  editable.handicap_index == null
                    ? ""
                    : String(editable.handicap_index)
                }
                onChange={(e) =>
                  setEditable({
                    ...editable,
                    handicap_index:
                      e.target.value.trim() === ""
                        ? null
                        : Number(e.target.value),
                  })
                }
              />
              <Input
                label="Low HI"
                inputMode="decimal"
                value={editable.low_hi == null ? "" : String(editable.low_hi)}
                onChange={(e) =>
                  setEditable({
                    ...editable,
                    low_hi:
                      e.target.value.trim() === ""
                        ? null
                        : Number(e.target.value),
                  })
                }
              />
            </div>
            <Input
              label="GHIN number"
              value={editable.ghin_number ?? ""}
              onChange={(e) =>
                setEditable({
                  ...editable,
                  ghin_number: e.target.value.trim() || null,
                })
              }
            />
            <Input
              label="Home club"
              value={editable.home_club ?? ""}
              onChange={(e) =>
                setEditable({
                  ...editable,
                  home_club: e.target.value.trim() || null,
                })
              }
            />
            <p className="flex items-center gap-2 rounded-md bg-cream-50 px-3 py-2 text-xs text-charcoal-muted">
              <Upload size={12} className="text-brass" />
              The screenshot was downsized and never stored on our servers.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

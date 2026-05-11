// Supabase Edge Function: extract-ghin
// Accepts a downsized screenshot (base64 data URL), forwards to OpenAI gpt-4o-mini
// with response_format=json_object, and returns a strict GHIN summary JSON.
//
// The image is never written to disk or any database.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExtractBody {
  imageBase64?: string;
}

interface GhinResult {
  name: string | null;
  ghin_number: string | null;
  handicap_index: number | null;
  low_hi: number | null;
  home_club: string | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an OCR assistant that extracts a single golfer's GHIN profile fields from a screenshot.
Return ONLY a JSON object with this exact shape (no prose, no markdown):
{
  "name": string | null,
  "ghin_number": string | null,
  "handicap_index": number | null,
  "low_hi": number | null,
  "home_club": string | null,
  "confidence": number
}
Rules:
- "handicap_index" and "low_hi" are decimals (e.g., 12.4). Use negative numbers for "plus" handicaps (e.g., "+1.2" -> -1.2).
- "ghin_number" is a digit string; strip non-digits.
- "confidence" is between 0 and 1 reflecting overall extraction certainty.
- If a field is not clearly visible, set it to null.
- Do not invent values.`;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

function clampConfidence(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function coerceString(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number") return String(v);
  return null;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.+\-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned.replace("+", ""));
    if (!Number.isFinite(n)) return null;
    return cleaned.startsWith("+") ? -Math.abs(n) : n;
  }
  return null;
}

function normalize(raw: any): GhinResult {
  return {
    name: coerceString(raw?.name),
    ghin_number: (() => {
      const s = coerceString(raw?.ghin_number);
      if (!s) return null;
      const digits = s.replace(/\D+/g, "");
      return digits.length > 0 ? digits : null;
    })(),
    handicap_index: coerceNumber(raw?.handicap_index),
    low_hi: coerceNumber(raw?.low_hi),
    home_club: coerceString(raw?.home_club),
    confidence: clampConfidence(raw?.confidence),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  if (!openaiKey) {
    return jsonResponse(
      { error: "Server missing OPENAI_API_KEY secret" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller has a valid Supabase session.
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ExtractBody;
  try {
    body = (await req.json()) as ExtractBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }
  const image = body.imageBase64;
  if (!image || typeof image !== "string") {
    return jsonResponse({ error: "imageBase64 required" }, { status: 400 });
  }
  // Accept either a full data URL or a raw base64 string.
  const imageUrl = image.startsWith("data:")
    ? image
    : `data:image/jpeg;base64,${image}`;

  // Soft cap to keep token usage predictable: ~1.5MB of base64 ≈ 1MB image.
  if (imageUrl.length > 2_500_000) {
    return jsonResponse({ error: "Image too large" }, { status: 413 });
  }

  let oaiRes: Response;
  try {
    oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the golfer's GHIN profile fields from this screenshot.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "low" },
              },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    return jsonResponse(
      { error: `Upstream request failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  if (!oaiRes.ok) {
    const text = await oaiRes.text();
    return jsonResponse(
      { error: `OpenAI ${oaiRes.status}: ${text.slice(0, 400)}` },
      { status: 502 },
    );
  }

  const payload = await oaiRes.json().catch(() => null);
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return jsonResponse({ error: "Empty OpenAI response" }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return jsonResponse(
      { error: "OpenAI did not return JSON" },
      { status: 502 },
    );
  }

  return jsonResponse(normalize(parsed));
});

// Supabase Edge Function: extract-scorecard
// Accepts a downsized scorecard photo (base64 data URL), forwards to OpenAI
// vision OCR, and returns normalized course + hole data.
//
// The image is never written to disk or any database.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExtractBody {
  imageBase64?: string;
}

interface ScorecardHole {
  hole_number: number;
  par: number | null;
  hcp_rating: number | null;
  yards: number | null;
}

interface ScorecardResult {
  course_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  num_holes: 9 | 18;
  tee_name: string | null;
  holes: ScorecardHole[];
  confidence: number;
  warnings: string[];
}

const SYSTEM_PROMPT = `You are an OCR assistant that extracts golf course data from a physical scorecard photo.
Return ONLY a JSON object with this exact shape (no prose, no markdown):
{
  "course_name": string | null,
  "city": string | null,
  "state": string | null,
  "country": string | null,
  "num_holes": 9 | 18,
  "tee_name": string | null,
  "holes": [
    {
      "hole_number": number,
      "par": number | null,
      "hcp_rating": number | null,
      "yards": number | null
    }
  ],
  "confidence": number,
  "warnings": string[]
}
Rules:
- Extract hole rows for holes 1-9 or 1-18 only.
- "par" must be 3, 4, 5, or 6. If unclear, use null.
- "hcp_rating" is the stroke index / handicap row for the hole. Use numbers 1-18 only. If unclear, use null.
- "yards" should come from the selected tee row. Prefer the tee row with the strongest visual emphasis, selected marker, or first complete men's/standard tee row. If no tee row is clearly selected, use the first complete yardage row and set "tee_name" if visible.
- If a value is not clearly visible, set it to null. Do not infer or invent values.
- "confidence" is between 0 and 1 reflecting overall extraction certainty.
- Add short warning strings for missing course name, missing holes, ambiguous tee row, duplicate handicap ratings, or low confidence.`;

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

function coerceInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  }
  return null;
}

function coerceNumHoles(v: unknown, holes: ScorecardHole[]): 9 | 18 {
  const n = coerceInt(v);
  if (n === 9 || n === 18) return n;
  const maxHole = Math.max(0, ...holes.map((h) => h.hole_number));
  return maxHole <= 9 ? 9 : 18;
}

function coerceWarnings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(coerceString)
    .filter((warning): warning is string => warning != null)
    .slice(0, 6);
}

function normalizeHole(raw: any): ScorecardHole | null {
  const holeNumber = coerceInt(
    raw?.hole_number ?? raw?.hole ?? raw?.number ?? raw?.no,
  );
  if (holeNumber == null || holeNumber < 1 || holeNumber > 18) return null;

  const parRaw = coerceInt(raw?.par);
  const hcpRaw = coerceInt(
    raw?.hcp_rating ?? raw?.handicap ?? raw?.hcp ?? raw?.stroke_index,
  );
  const yardsRaw = coerceInt(raw?.yards ?? raw?.yardage);

  return {
    hole_number: holeNumber,
    par: parRaw != null && parRaw >= 3 && parRaw <= 6 ? parRaw : null,
    hcp_rating: hcpRaw != null && hcpRaw >= 1 && hcpRaw <= 18 ? hcpRaw : null,
    yards: yardsRaw != null && yardsRaw > 0 ? yardsRaw : null,
  };
}

function normalizeHoles(raw: unknown): ScorecardHole[] {
  if (!Array.isArray(raw)) return [];
  const byHole = new Map<number, ScorecardHole>();
  for (const entry of raw) {
    const hole = normalizeHole(entry);
    if (hole) byHole.set(hole.hole_number, hole);
  }
  return Array.from(byHole.values()).sort(
    (a, b) => a.hole_number - b.hole_number,
  );
}

function addDerivedWarnings(result: ScorecardResult): string[] {
  const warnings = new Set(result.warnings);
  if (!result.course_name) warnings.add("Course name was not clearly visible.");

  const expected = result.num_holes;
  if (result.holes.length < expected) {
    warnings.add(`Only ${result.holes.length} of ${expected} holes were read.`);
  }

  const missingRequired = result.holes.filter(
    (h) => h.par == null || h.hcp_rating == null,
  );
  if (missingRequired.length > 0) {
    warnings.add("Some holes are missing par or handicap values.");
  }

  const hcps = result.holes
    .map((h) => h.hcp_rating)
    .filter((hcp): hcp is number => hcp != null);
  if (new Set(hcps).size !== hcps.length) {
    warnings.add("Duplicate handicap ratings were detected.");
  }

  if (result.confidence < 0.65) {
    warnings.add("Low confidence extraction. Review carefully.");
  }

  return Array.from(warnings).slice(0, 8);
}

function normalize(raw: any): ScorecardResult {
  const holes = normalizeHoles(raw?.holes);
  const numHoles = coerceNumHoles(raw?.num_holes, holes);
  const limitedHoles = holes.filter((h) => h.hole_number <= numHoles);
  const result: ScorecardResult = {
    course_name: coerceString(raw?.course_name ?? raw?.name),
    city: coerceString(raw?.city),
    state: coerceString(raw?.state ?? raw?.region),
    country: coerceString(raw?.country),
    num_holes: numHoles,
    tee_name: coerceString(raw?.tee_name ?? raw?.tee),
    holes: limitedHoles,
    confidence: clampConfidence(raw?.confidence),
    warnings: coerceWarnings(raw?.warnings),
  };
  return { ...result, warnings: addDerivedWarnings(result) };
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
  const model = Deno.env.get("SCORECARD_OCR_MODEL") ?? "gpt-4o-mini";

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
  const imageUrl = image.startsWith("data:")
    ? image
    : `data:image/jpeg;base64,${image}`;

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
        model,
        response_format: { type: "json_object" },
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the course and hole data from this scorecard photo.",
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

// Thin wrappers around the OpenGolfAPI public endpoints.
// The exact response shape is not guaranteed, so we normalize defensively.

const BASE_URL = "https://api.opengolfapi.org/v1";

export interface OpenGolfSearchResult {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface OpenGolfHole {
  hole_number: number;
  par: number | null;
  hcp_rating: number | null;
  yards: number | null;
}

export interface OpenGolfCourseDetail {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  num_holes: number;
  holes: OpenGolfHole[];
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number") return String(v);
  return null;
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Math.trunc(Number(v));
  }
  return null;
}

function pickArray(obj: Json, keys: string[]): unknown[] {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") {
    for (const k of keys) {
      const v = (obj as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function pickField(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

function parseHoleNumber(hole: unknown, fallback: number): number | null {
  const explicit = asInt(
    pickField(hole, [
      "hole_number",
      "number",
      "hole",
      "holeNumber",
      "hole_no",
      "hole_num",
      "sequence",
      "seq",
      "index",
    ]),
  );
  if (explicit != null) return explicit;

  // Some feeds only label holes as "Hole 1", "No. 2", etc.
  const label = asString(pickField(hole, ["name", "label", "title"]));
  if (label) {
    const match = label.match(/\d+/);
    if (match) return asInt(match[0]);
  }

  return fallback + 1;
}

async function fetchJson(url: string): Promise<Json> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`OpenGolfAPI ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Json;
}

export async function searchCourses(
  query: string,
  signal?: AbortSignal,
): Promise<OpenGolfSearchResult[]> {
  if (query.trim().length < 2) return [];
  const url = `${BASE_URL}/courses/search?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`OpenGolfAPI search ${res.status}`);
  }
  const body = (await res.json()) as Json;
  const list = pickArray(body, ["results", "courses", "data"]);
  const out: OpenGolfSearchResult[] = [];
  for (const item of list) {
    const id = asString(pickField(item, ["id", "course_id", "_id"]));
    const name = asString(pickField(item, ["name", "course_name"]));
    if (!id || !name) continue;
    out.push({
      id,
      name,
      city: asString(pickField(item, ["city", "town"])),
      state: asString(pickField(item, ["state", "region"])),
      country: asString(pickField(item, ["country"])),
    });
  }
  return out;
}

export async function getCourse(id: string): Promise<OpenGolfCourseDetail> {
  const body = await fetchJson(`${BASE_URL}/courses/${encodeURIComponent(id)}`);
  const root = (body && typeof body === "object" && "course" in body
    ? (body as Record<string, unknown>).course
    : body) as Json;

  const name =
    asString(pickField(root, ["name", "course_name"])) ?? "Unknown course";
  const numHoles =
    asInt(pickField(root, ["num_holes", "holes_count", "hole_count"])) ?? 18;

  const rawHoles = pickArray(root, ["holes", "course_holes", "scorecard"]);
  const holesByNumber = new Map<number, unknown>();
  rawHoles.forEach((hole, idx) => {
    const holeNumber = parseHoleNumber(hole, idx);
    if (holeNumber != null && !holesByNumber.has(holeNumber)) {
      holesByNumber.set(holeNumber, hole);
    }
  });

  const holes: OpenGolfHole[] = [];
  for (let i = 0; i < numHoles; i++) {
    const target = i + 1;
    const match = holesByNumber.get(target) ?? null;
    holes.push({
      hole_number: target,
      par: asInt(pickField(match, ["par"])),
      hcp_rating: asInt(
        pickField(match, [
          "hcp_rating",
          "handicap",
          "handicap_rating",
          "handicap_index",
          "hcp",
          "hdcp",
          "stroke",
          "stroke_index",
          "strokeIndex",
          "si",
          "index",
        ]),
      ),
      yards: asInt(
        pickField(match, [
          "yards",
          "yard",
          "yardage",
          "length",
          "distance",
          "distance_yards",
          "yards_total",
          "yds",
        ]),
      ),
    });
  }

  return {
    id: asString(pickField(root, ["id", "course_id", "_id"])) ?? id,
    name,
    city: asString(pickField(root, ["city", "town"])),
    state: asString(pickField(root, ["state", "region"])),
    country: asString(pickField(root, ["country"])),
    num_holes: numHoles === 9 ? 9 : 18,
    holes,
  };
}

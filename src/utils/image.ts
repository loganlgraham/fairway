// Client-side image downscale: long edge <= maxLongEdge, returned as JPEG data URL.
// Used to minimize the token budget for the GHIN vision call.

export interface DownscaleOptions {
  maxLongEdge?: number;
  quality?: number; // 0..1
  type?: "image/jpeg" | "image/webp";
}

export async function downscaleImage(
  file: File,
  {
    maxLongEdge = 1024,
    quality = 0.85,
    type = "image/jpeg",
  }: DownscaleOptions = {},
): Promise<{ dataUrl: string; bytes: number; width: number; height: number }> {
  const bitmap = await loadImage(file);
  const long = Math.max(bitmap.width, bitmap.height);
  const scale = long > maxLongEdge ? maxLongEdge / long : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);

  const dataUrl = canvas.toDataURL(type, quality);
  // base64 decoded length ≈ (len * 3) / 4
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Math.floor((base64.length * 3) / 4);

  if ("close" in bitmap && typeof bitmap.close === "function") {
    (bitmap as ImageBitmap).close();
  }
  return { dataUrl, bytes, width: w, height: h };
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to HTMLImageElement path
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Error ? e : new Error("Image load failed"));
    };
    img.src = url;
  });
}

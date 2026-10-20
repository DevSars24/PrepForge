import { PrepForgeError, logDebugError, normalizeError } from "@/lib/debug";

const DATALAB_API_URL = "https://www.datalab.to/api/v1/marker";
const DOCUMENT_PARSER_URL = process.env.DOCUMENT_PARSER_URL || "http://localhost:8000";

export type MarkerParseResult = {
  markdown: string;
  images: Array<{ name: string; data: string }>;
  metadata: Record<string, unknown>;
  pages: number;
  engine: "datalab-cloud" | "marker-microservice" | "fallback";
};

export function hasMarkerKey(): boolean {
  return Boolean(process.env.DATALAB_API_KEY && process.env.DATALAB_API_KEY.trim().length > 0);
}

/**
 * Poll Datalab Marker cloud request until complete
 */
async function pollDatalabResult(
  checkUrl: string,
  apiKey: string,
  maxAttempts = 40
): Promise<MarkerParseResult> {
  let delay = 1500;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, delay));

    const pollRes = await fetch(checkUrl, {
      headers: {
        "X-Api-Key": apiKey,
        "User-Agent": "PrepForge-NextJS/1.0",
      },
    });

    if (!pollRes.ok) continue;

    const data = await pollRes.json();
    const status = data.status;

    if (status === "complete") {
      const rawImages = data.images || {};
      const images: Array<{ name: string; data: string }> = [];

      if (typeof rawImages === "object" && rawImages !== null) {
        for (const [name, imgData] of Object.entries(rawImages)) {
          images.push({ name, data: String(imgData) });
        }
      }

      return {
        markdown: data.markdown || "",
        images,
        metadata: {
          runtime: data.runtime,
          qualityScore: data.parse_quality_score,
          langs: ["en", "hi"],
          ...(data.metadata || {}),
        },
        pages: Number(data.page_count) || 1,
        engine: "datalab-cloud",
      };
    } else if (status === "failed") {
      throw new Error(`Datalab Marker parsing failed: ${data.error || "Unknown error"}`);
    }

    delay = Math.min(delay * 1.25, 4000);
  }

  throw new Error("Datalab Marker polling exceeded timeout threshold (60s).");
}

/**
 * Parse document buffer using Datalab Marker API (Direct Cloud Route)
 */
async function parseWithDatalabCloud(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<MarkerParseResult> {
  const apiKey = process.env.DATALAB_API_KEY;
  if (!apiKey) {
    throw new PrepForgeError({
      kind: "api_error",
      component: "parseWithDatalabCloud",
      message: "DATALAB_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("langs", process.env.MARKER_LANGS || "en,hi");
  formData.append("extract_images", "true");
  formData.append("paginate", "true");

  const submitRes = await fetch(DATALAB_API_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "User-Agent": "PrepForge-NextJS/1.0",
    },
    body: formData,
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "");
    throw new PrepForgeError({
      kind: "api_error",
      component: "parseWithDatalabCloud",
      message: `Datalab submission failed (${submitRes.status}): ${errText.slice(0, 300)}`,
      statusCode: submitRes.status,
    });
  }

  const submitData = await submitRes.json();
  const checkUrl = submitData.request_check_url;
  if (!checkUrl) {
    throw new Error("Datalab response did not contain request_check_url.");
  }

  return await pollDatalabResult(checkUrl, apiKey);
}

/**
 * Parse document using the local Python DocumentParserService FastAPI microservice
 */
async function parseWithMicroservice(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<MarkerParseResult> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("mode", process.env.MARKER_MODE || "auto");

  const res = await fetch(`${DOCUMENT_PARSER_URL}/parse`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Microservice error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    markdown: data.markdown || "",
    images: data.images || [],
    metadata: data.metadata || {},
    pages: data.pages || 1,
    engine: "marker-microservice",
  };
}

/**
 * Universal Entry Point: Converts uploaded PDF or image file into structured Markdown.
 * Tries local Python microservice first, then falls back to Datalab Cloud API.
 */
export async function parseDocumentWithMarker(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<MarkerParseResult> {
  // 1. Try local FastAPI microservice if reachable
  try {
    const healthCheck = await fetch(`${DOCUMENT_PARSER_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (healthCheck.ok) {
      return await parseWithMicroservice(buffer, filename, mimeType);
    }
  } catch {
    // Microservice not running, proceed to direct cloud route
  }

  // 2. Direct Cloud Route via Datalab Marker API
  if (hasMarkerKey()) {
    try {
      return await parseWithDatalabCloud(buffer, filename, mimeType);
    } catch (cloudErr) {
      logDebugError(normalizeError(cloudErr, { kind: "api_error", component: "parseDocumentWithMarker.cloud" }));
      throw cloudErr;
    }
  }

  throw new PrepForgeError({
    kind: "api_error",
    component: "parseDocumentWithMarker",
    message: "No Marker service available. Configure DATALAB_API_KEY or start DocumentParserService.",
    statusCode: 503,
  });
}

import { Mistral } from "@mistralai/mistralai";
import { PrepForgeError } from "@/lib/debug";

function getClient() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return null;
  return new Mistral({ apiKey: key });
}

export function hasMistralKey() {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "mistralOCR.extractTextFromImage",
      message: "MISTRAL_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const response = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "image_url",
      imageUrl: `data:${mimeType};base64,${imageBase64}`,
    },
  });

  return response.pages.map((p: { markdown: string }) => p.markdown).join("\n\n");
}

export async function extractTextFromPDF(pdfBase64: string): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "mistralOCR.extractTextFromPDF",
      message: "MISTRAL_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const response = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: `data:application/pdf;base64,${pdfBase64}`,
    },
  });

  return response.pages.map((p: { markdown: string }) => p.markdown).join("\n\n");
}

/**
 * High-level helper: given base64 data + mimeType, pick the right OCR path.
 */
export async function mistralOCR(
  base64: string,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(base64);
  }
  return extractTextFromImage(base64, mimeType);
}

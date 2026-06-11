import { ocrAnswerSheets, ocrOmrSheet } from "@/lib/ai-grading";
import { fileToBase64, hasGeminiKey } from "@/lib/gemini";
import { hasMistralKey } from "@/lib/mistralOCR";
import { errorResponse, normalizeError } from "@/lib/debug";
import { scoreConfidence } from "../../../features/handwriting-fairness/ConfidenceScorer";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const mode = String(form.get("mode") || "answer");
    const files = form.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (mode === "confidence") {
      const file = files[0];
      const buffer = Buffer.from(await file.arrayBuffer());
      const confidenceResult = await scoreConfidence(buffer);
      return Response.json(confidenceResult);
    }

    if (!hasMistralKey() && !hasGeminiKey()) {
      return Response.json(
        { error: "No OCR API key configured. Set MISTRAL_API_KEY (preferred for OCR) or GEMINI_API_KEY in .env" },
        { status: 503 }
      );
    }

    const images = await Promise.all(files.map((file) => fileToBase64(file).then((data) => ({ ...data, name: file.name }))));

    if (mode === "omr") {
      const omr = await ocrOmrSheet(images);
      return Response.json({
        mode: "omr",
        answers: omr.answers,
        anomalies: omr.anomalies,
        text: omr.answers.join(" "),
        notes: omr.notes,
      });
    }

    const text = await ocrAnswerSheets(images);
    return Response.json({ mode: "answer", text });
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "pdf_scan_error", component: "ocr.POST" }));
  }
}

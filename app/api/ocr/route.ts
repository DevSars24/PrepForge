import { ocrAnswerSheets, ocrOmrSheet } from "@/lib/ai-grading";
import { fileToBase64, hasGeminiKey } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    if (!hasGeminiKey()) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey" },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const mode = String(form.get("mode") || "answer");
    const files = form.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
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
    console.error("OCR API error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "OCR failed" }, { status: 500 });
  }
}

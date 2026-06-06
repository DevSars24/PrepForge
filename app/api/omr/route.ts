import { ocrOmrSheet } from "@/lib/ai-grading";
import { saveOmrRecord } from "@/lib/evaluation-store";
import { fileToBase64, hasGeminiKey } from "@/lib/gemini";
import { evaluateCustomOmr } from "@/lib/evaluation";
import { uploadEvaluationFile } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const answerKeyText = String(form.get("answerKey") || "").trim();
    const responseText = String(form.get("responses") || "").trim();
    const files = form.getAll("omrFiles").filter((item): item is File => item instanceof File);

    if (!answerKeyText) {
      return Response.json(
        { error: "OMR answer key is required to check results." },
        { status: 400 }
      );
    }

    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/") || file.type === "application/pdf"
    );

    if (!responseText && !validFiles.length) {
      return Response.json(
        { error: "Please provide student OMR answers (as text) or upload a scanned OMR bubble sheet." },
        { status: 400 }
      );
    }

    let responses = responseText;

    if (validFiles.length && hasGeminiKey()) {
      const images = await Promise.all(validFiles.map((file) => fileToBase64(file)));
      const omr = await ocrOmrSheet(images);
      responses = omr.answers.join(" ");
    } else if (validFiles.length && !hasGeminiKey()) {
      return Response.json(
        {
          error: "GEMINI_API_KEY required for OMR image reading. Paste responses manually or add a free key.",
        },
        { status: 503 }
      );
    }

    const result = evaluateCustomOmr(answerKeyText, responses);
    const fileUrls = (
      await Promise.all(validFiles.map((file) => uploadEvaluationFile(file, "omr-sheets")))
    ).filter((url): url is string => Boolean(url));
    const saved = await saveOmrRecord({ answerKey: answerKeyText, responses, result, fileUrls });

    return Response.json({
      ...result,
      visionUsed: validFiles.length > 0 && hasGeminiKey(),
      parsedResponses: responses,
      savedId: saved?.id,
      fileUrls,
    });
  } catch (error) {
    console.error("OMR API error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "OMR evaluation failed" }, { status: 500 });
  }
}

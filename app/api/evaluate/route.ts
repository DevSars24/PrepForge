import { gradeWithGemini, mapAiGradingToResult, ocrAnswerSheets } from "@/lib/ai-grading";
import { saveEvaluationRecord } from "@/lib/evaluation-store";
import { fileToBase64, hasGeminiKey, isSupportedScanMimeType } from "@/lib/gemini";
import { hasMistralKey } from "@/lib/mistralOCR";
import { generateAnalysis } from "@/lib/hfAnalysis";
import { evaluateLocally, type Student } from "@/lib/evaluation";
import { uploadEvaluationFile } from "@/lib/supabase";
import { logDebugError, normalizeError } from "@/lib/debug";
import { scoreConfidence } from "../../../features/handwriting-fairness/ConfidenceScorer";

function buildDefaultStudent(): Student {
  return {
    name: "Unknown Student",
    roll: "N/A",
    stream: "JEE",
    subject: "General",
    answerText: "",
    omr: [],
  };
}

async function parseRequest(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const studentRaw = form.get("student");
    const student = studentRaw ? (JSON.parse(String(studentRaw)) as Student) : buildDefaultStudent();
    const answerText = String(form.get("answerText") || "");
    const rubricText = String(form.get("rubricText") || "");
    const files = form.getAll("answerFiles").filter((item): item is File => item instanceof File);
    const criteriaFiles = form.getAll("criteriaFiles").filter((item): item is File => item instanceof File);
    return { student, answerText, rubricText, files, criteriaFiles };
  }

  const body = (await req.json()) as {
    student?: Student;
    answerText?: string;
    rubricText?: string;
  };

  return {
    student: body.student || buildDefaultStudent(),
    answerText: body.answerText || "",
    rubricText: body.rubricText || "",
    files: [] as File[],
    criteriaFiles: [] as File[],
  };
}

export async function POST(req: Request) {
  let student: Student = buildDefaultStudent();
  try {
    const parsed = await parseRequest(req);
    student = parsed.student;
    const { answerText: inputText, files, criteriaFiles } = parsed;
    let rubricText = parsed.rubricText;

    if (!student.name || !student.roll || !student.stream) {
      return Response.json(
        { error: "Invalid student details. Name, Roll Number, and Stream are required." },
        { status: 400 }
      );
    }

    let answerText = inputText || student.answerText;
    let ocrUsed = false;

    // Filter out unsupported files in production
    const allScanFiles = [...files, ...criteriaFiles];
    const invalidFiles = allScanFiles.filter((file) => !isSupportedScanMimeType(file.type || ""));
    if (invalidFiles.length) {
      return Response.json(
        {
          error: `Unsupported upload type: ${invalidFiles.map((file) => `${file.name} (${file.type || "unknown"})`).join(", ")}`,
          debug: {
            kind: "file_upload_error",
            component: "evaluate.POST",
            request: { files: invalidFiles.map((file) => ({ name: file.name, type: file.type, size: file.size })) },
          },
        },
        { status: 400 }
      );
    }

    const validFiles = files;
    const validCriteriaFiles = criteriaFiles;

    if (!hasGeminiKey() && !hasMistralKey()) {
      const local = evaluateLocally(student, `${answerText}\n${rubricText}`);
      return Response.json({
        ...local,
        warning: "No AI API keys configured. Set GEMINI_API_KEY and/or MISTRAL_API_KEY. Get free keys at https://aistudio.google.com/apikey and https://console.mistral.ai/",
      });
    }

    let handwritingConfidence: number | undefined;
    let handwritingNeedsReview = false;
    let handwritingDetails: any[] = [];

    if (validFiles.length) {
      const confidencePromises = validFiles.map(async (file) => {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const confResult = await scoreConfidence(buffer);
          return {
            success: true,
            text: confResult.fullText,
            confResult,
          };
        } catch (err) {
          console.warn(`[PrepForge] scoreConfidence failed for ${file.name}, using fallback OCR:`, err);
          try {
            const base64Data = await fileToBase64(file);
            const fallbackText = await ocrAnswerSheets([{ ...base64Data, name: file.name }]);
            return {
              success: false,
              text: fallbackText,
            };
          } catch (fallbackErr) {
            console.error(`[PrepForge] Fallback OCR also failed for ${file.name}:`, fallbackErr);
            return {
              success: false,
              text: "",
            };
          }
        }
      });

      const confResults = await Promise.all(confidencePromises);
      const ocrText = confResults.map((r) => r.text).filter(Boolean).join("\n\n");
      answerText = [ocrText, answerText].filter(Boolean).join("\n\n");
      ocrUsed = true;

      const validRuns = confResults.filter((r) => r.success && r.confResult) as { success: true; text: string; confResult: any }[];
      if (validRuns.length > 0) {
        const avgConfidence = Math.round(
          validRuns.reduce((sum, r) => sum + r.confResult.pageConfidence, 0) / validRuns.length
        );
        handwritingConfidence = avgConfidence;
        handwritingNeedsReview = validRuns.some((r) => r.confResult.needsReview);
        handwritingDetails = validRuns.map((r, idx) => ({
          pageIndex: idx,
          pageConfidence: r.confResult.pageConfidence,
          needsReview: r.confResult.needsReview,
          flaggedWordCount: r.confResult.flaggedWordCount,
          redWordCount: r.confResult.redWordCount,
          recommendation: r.confResult.recommendation,
        }));
      }
    }

    if (validCriteriaFiles.length) {
      const criteriaImages = await Promise.all(validCriteriaFiles.map((file) => fileToBase64(file).then((data) => ({ ...data, name: file.name }))));
      const criteriaText = await ocrAnswerSheets(criteriaImages);
      rubricText = [rubricText, criteriaText].filter(Boolean).join("\n\n");
    }

    if (!answerText.trim()) {
      return Response.json(
        { error: "Answer text is empty. Please type an answer or upload readable sheets." },
        { status: 400 }
      );
    }

    const { grading, retrievalStage } = await gradeWithGemini({
      student,
      answerText,
      rubricText: rubricText || "Award step-wise marks for JEE/NEET descriptive answers.",
      stream: student.stream,
    });

    const result = mapAiGradingToResult(grading, student, {
      retrievalStage,
      ocrUsed,
    });

    if (handwritingConfidence !== undefined) {
      result.handwritingConfidence = handwritingConfidence;
      result.handwritingNeedsReview = handwritingNeedsReview;
      result.handwritingDetails = handwritingDetails;
    }

    // Generate HF strengths/gaps analysis (non-blocking — if it fails, we skip it)
    let hfAnalysis: string | undefined;
    try {
      hfAnalysis = await generateAnalysis(result as unknown as Record<string, unknown>);
    } catch (err) {
      console.warn("[PrepForge] HF analysis failed, skipping:", err);
    }

    const fileUrls = (
      await Promise.all([
        ...validFiles.map((file) => uploadEvaluationFile(file, "answer-sheets")),
        ...validCriteriaFiles.map((file) => uploadEvaluationFile(file, "rubrics")),
      ])
    ).filter((url): url is string => Boolean(url));

    const saved = await saveEvaluationRecord({
      student,
      answerText,
      rubricText,
      result,
      fileUrls,
    });

    return Response.json({
      ...result,
      hfAnalysis,
      savedId: saved?.id,
      fileUrls,
    });
  } catch (error) {
    const debug = normalizeError(error, { kind: "evaluation_error", component: "evaluate.POST" });
    logDebugError(debug);
    const local = evaluateLocally(student);
    return Response.json({
      ...local,
      warning: `Evaluation failed: ${debug.message}. Returned local fallback.`,
      debug,
    });
  }
}

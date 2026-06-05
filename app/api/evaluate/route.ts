import { gradeWithGemini, mapAiGradingToResult, ocrAnswerSheets } from "@/lib/ai-grading";
import { saveEvaluationRecord } from "@/lib/evaluation-store";
import { fileToBase64, hasGeminiKey } from "@/lib/gemini";
import { evaluateLocally, students, type Student } from "@/lib/evaluation";
import { uploadEvaluationFile } from "@/lib/supabase";

async function parseRequest(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const studentRaw = form.get("student");
    const student = studentRaw ? (JSON.parse(String(studentRaw)) as Student) : students[0];
    const answerText = String(form.get("answerText") || "");
    const rubricText = String(form.get("rubricText") || "");
    const files = form.getAll("answerFiles").filter((item): item is File => item instanceof File);
    return { student, answerText, rubricText, files };
  }

  const body = (await req.json()) as {
    student?: Student;
    answerText?: string;
    rubricText?: string;
  };

  return {
    student: body.student || students[0],
    answerText: body.answerText || "",
    rubricText: body.rubricText || "",
    files: [] as File[],
  };
}

export async function POST(req: Request) {
  try {
    const { student, answerText: inputText, rubricText, files } = await parseRequest(req);
    let answerText = inputText || student.answerText;
    let ocrUsed = false;

    if (!hasGeminiKey()) {
      const local = evaluateLocally(student, `${answerText}\n${rubricText}`);
      return Response.json({
        ...local,
        warning: "GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey",
      });
    }

    if (files.length) {
      const images = await Promise.all(files.map((file) => fileToBase64(file)));
      const ocrText = await ocrAnswerSheets(images);
      answerText = [ocrText, answerText].filter(Boolean).join("\n\n");
      ocrUsed = true;
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

    const fileUrls = (
      await Promise.all(files.map((file) => uploadEvaluationFile(file, "answer-sheets")))
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
      savedId: saved?.id,
      fileUrls,
    });
  } catch (error) {
    console.error("Evaluation API error:", error);
    const local = evaluateLocally(students[0]);
    return Response.json({
      ...local,
      warning: error instanceof Error ? `Gemini evaluation failed: ${error.message}` : "Gemini evaluation failed. Returned local fallback.",
    });
  }
}

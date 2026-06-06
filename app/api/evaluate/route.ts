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
  let student: Student = students[0];
  try {
    const parsed = await parseRequest(req);
    student = parsed.student;
    const { answerText: inputText, rubricText, files } = parsed;

    if (!student.name || !student.roll || !student.stream) {
      return Response.json(
        { error: "Invalid student details. Name, Roll Number, and Stream are required." },
        { status: 400 }
      );
    }

    let answerText = inputText || student.answerText;
    let ocrUsed = false;

    // Filter out unsupported files in production
    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/") || file.type === "application/pdf"
    );

    if (!hasGeminiKey()) {
      const local = evaluateLocally(student, `${answerText}\n${rubricText}`);
      return Response.json({
        ...local,
        warning: "GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey",
      });
    }

    if (validFiles.length) {
      const images = await Promise.all(validFiles.map((file) => fileToBase64(file)));
      const ocrText = await ocrAnswerSheets(images);
      answerText = [ocrText, answerText].filter(Boolean).join("\n\n");
      ocrUsed = true;
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

    const fileUrls = (
      await Promise.all(validFiles.map((file) => uploadEvaluationFile(file, "answer-sheets")))
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
    const local = evaluateLocally(student);
    return Response.json({
      ...local,
      warning: error instanceof Error ? `Gemini evaluation failed: ${error.message}` : "Gemini evaluation failed. Returned local fallback.",
    });
  }
}

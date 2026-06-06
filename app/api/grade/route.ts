import { gradeWithGemini, mapAiGradingToResult } from "@/lib/ai-grading";
import { hasGeminiKey } from "@/lib/gemini";
import { evaluateLocally, students, type Student } from "@/lib/evaluation";
import { errorResponse, normalizeError } from "@/lib/debug";

type Body = {
  student?: Student;
  answerText?: string;
  rubricText?: string;
  ocrUsed?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const student = body.student || students[0];
    const answerText = body.answerText?.trim() || student.answerText;
    const rubricText = body.rubricText?.trim() || "Award step-wise marks using standard JEE/NEET rubric.";

    if (!hasGeminiKey()) {
      const local = evaluateLocally(student, answerText);
      return Response.json({
        ...local,
        warning: "GEMINI_API_KEY missing. Returned local fallback grading.",
      });
    }

    const { grading, retrievalStage } = await gradeWithGemini({
      student,
      answerText,
      rubricText,
      stream: student.stream,
    });

    return Response.json(
      mapAiGradingToResult(grading, student, {
        retrievalStage,
        ocrUsed: Boolean(body.ocrUsed),
      })
    );
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "evaluation_error", component: "grade.POST" }));
  }
}

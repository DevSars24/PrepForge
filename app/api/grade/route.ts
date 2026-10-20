import { gradeWithGemini, mapAiGradingToResult } from "@/lib/ai-grading";
import { hasGeminiKey } from "@/lib/gemini";
import { hasGroqKey } from "@/lib/groq";
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

    if (!hasGroqKey() && !hasGeminiKey()) {
      const local = evaluateLocally(student, answerText);
      return Response.json({
        ...local,
        warning: "No AI keys configured (GROQ_API_KEY or GEMINI_API_KEY). Returned local fallback grading.",
      });
    }

    const { grading, retrievalStage, providerUsed } = await gradeWithGemini({
      student,
      answerText,
      rubricText,
      stream: student.stream,
    });

    return Response.json(
      mapAiGradingToResult(grading, student, {
        retrievalStage,
        ocrUsed: Boolean(body.ocrUsed),
        providerUsed,
      })
    );
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "evaluation_error", component: "grade.POST" }));
  }
}

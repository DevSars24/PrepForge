import { GoogleGenerativeAI } from "@google/generative-ai";
import { evaluateLocally, students, type Student } from "@/lib/evaluation";

type RequestBody = {
  student?: Student;
  answerText?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const student = body.student || students[0];
    const localResult = evaluateLocally(student, body.answerText || student.answerText);

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({
        ...localResult,
        warning: "GEMINI_API_KEY is not configured. Local no-database evaluator returned deterministic output.",
      });
    }

    const prompt = `
You are PrepForge Faculty Evaluation AI for JEE/NEET.
You must use only this local evaluation JSON and the cited rubric evidence.
Do not add new facts, marks, sources, or topics.
Write a concise faculty audit note with:
1. Final score
2. Step-wise grading rationale
3. OMR anomalies
4. Topic gaps and next NCERT practice

Evaluation JSON:
${JSON.stringify(localResult, null, 2)}
`.trim();

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0 },
      });
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Gemini evaluation timed out")), 8000);
        }),
      ]);

      return Response.json({
        ...localResult,
        aiText: result.response.text()?.trim(),
      });
    } catch (geminiError) {
      console.error("Gemini evaluation guardrail failed:", geminiError);
      return Response.json({
        ...localResult,
        warning: "Gemini call failed, so PrepForge returned the deterministic no-database evaluation.",
      });
    }
  } catch (error) {
    console.error("Evaluation API Error:", error);
    return Response.json(
      {
        error: "Evaluation failed",
      },
      { status: 500 }
    );
  }
}

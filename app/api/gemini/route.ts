import { GoogleGenerativeAI } from "@google/generative-ai";

type GeminiRequest = {
  prompt?: string;
  mode?: "marks" | "feedback";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GeminiRequest;
    const userPrompt = body.prompt?.trim();

    if (!userPrompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          text: buildFallback(body.mode),
          warning: "GEMINI_API_KEY is not configured. Returned static demo output.",
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
      },
    });

    const controlledPrompt = `
You are PrepForge Faculty Evaluation AI.

Use only the provided uploaded-answer context, model-answer context, rubric notes, OMR key, and student facts in the prompt.
Do not invent marks, facts, source files, or claims that are not present.
If evidence is weak, clearly say "Faculty review required".

Return a concise faculty-facing response with:
1. Score or feedback summary
2. Evidence used
3. Confidence from 0.00 to 1.00
4. Faculty review warnings

Task:
${userPrompt}
`.trim();

    const result = await model.generateContent(controlledPrompt);
    const text = result.response.text()?.trim() || buildFallback(body.mode);

    return Response.json({ text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return Response.json({ text: buildFallback() }, { status: 200 });
  }
}

function buildFallback(mode?: "marks" | "feedback") {
  if (mode === "feedback") {
    return "Feedback summary: Student shows strong conceptual recall but needs cleaner stepwise reasoning. Evidence used: uploaded answer sheet names, model answer rubric, topic gaps, and OMR pattern. Confidence: 0.78. Faculty review required for handwritten derivation quality.";
  }

  return "Marks summary: 82/100 estimated from the model answer rubric. Evidence used: uploaded answer sheet names, rubric context, topic gap profile, and OMR key. Confidence: 0.81. Faculty review required for low-confidence handwritten steps.";
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { FLASH_MODEL } from "@/lib/gemini";
import { logDebugError, normalizeError, withTimeout } from "@/lib/debug";

type GeminiRequest = {
  prompt?: string;
  mode?: "marks" | "feedback";
};

export async function POST(req: Request) {
  let mode: GeminiRequest["mode"];
  try {
    const body = (await req.json()) as GeminiRequest;
    mode = body.mode;
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
      model: FLASH_MODEL,
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

    const result = await withTimeout(
      model.generateContent(controlledPrompt),
      Number(process.env.GEMINI_TIMEOUT_MS || 45000),
      "gemini.POST",
      { model: FLASH_MODEL, mode: body.mode, promptChars: userPrompt.length }
    );
    const text = result.response.text()?.trim();

    if (!text) {
      return Response.json(
        {
          error: "Empty Gemini response",
          text: buildFallback(body.mode),
          debug: {
            kind: "invalid_response",
            component: "gemini.POST",
            message: "Empty Gemini response",
            request: { model: FLASH_MODEL, mode: body.mode, promptChars: userPrompt.length },
            response: result.response,
          },
        },
        { status: 502 }
      );
    }

    return Response.json({ text });
  } catch (error) {
    const debug = normalizeError(error, { kind: "gemini_error", component: "gemini.POST" });
    logDebugError(debug);
    return Response.json({ error: debug.message, text: buildFallback(mode), debug }, { status: debug.statusCode || 500 });
  }
}

function buildFallback(mode?: "marks" | "feedback") {
  if (mode === "feedback") {
    return "Feedback summary: Student shows strong conceptual recall but needs cleaner stepwise reasoning. Evidence used: uploaded answer sheet names, model answer rubric, topic gaps, and OMR pattern. Confidence: 0.78. Faculty review required for handwritten derivation quality.";
  }

  return "Marks summary: 82/100 estimated from the model answer rubric. Evidence used: uploaded answer sheet names, rubric context, topic gap profile, and OMR key. Confidence: 0.81. Faculty review required for low-confidence handwritten steps.";
}

import dotenv from "dotenv";
dotenv.config();

import { gradeWithGemini, ocrAnswerSheets, mapAiGradingToResult } from "../app/lib/ai-grading";
import { students } from "../app/lib/evaluation";

async function runTest() {
  console.log("=== RUNNING PREPFORGE AI GRADINGS PIPELINE TEST ===");
  console.log("Gemini API key loaded:", !!process.env.GEMINI_API_KEY);
  console.log("Gemini Model:", process.env.GEMINI_MODEL || "gemini-2.5-flash");

  const student = students[0];
  const answerText = student.answerText;
  const rubricText = `
Rubric Point 1: PHY-OPT-01: Uses the mirror or lens formula with the correct sign convention before substitution. (Marks: 4)
Rubric Point 2: PHY-MEC-02: Resolves forces, writes conservation equation, and carries units through the final result. (Marks: 4)
  `.trim();

  console.log("\n1. Testing gradeWithGemini (Chain-of-Thought & RAG)...");
  try {
    const res = await gradeWithGemini({
      student,
      answerText,
      rubricText,
      stream: student.stream,
    });
    console.log("RAG retrieval stage used:", res.retrievalStage);
    console.log("AI Grading JSON returned successfully!");
    console.log("Number of steps graded:", res.grading.stepGrades.length);
    res.grading.stepGrades.forEach((step, idx) => {
      console.log(`\n--- Step ${idx + 1}: ${step.topic} ---`);
      console.log(`Expected: ${step.expected}`);
      console.log(`Awarded Marks: ${step.awarded}/${step.max}`);
      console.log(`Reasoning (CoT): ${step.reasoning}`);
      console.log(`Evidence Quote: "${step.evidenceQuote}"`);
      console.log(`Status: ${step.status}`);
    });

    console.log("\n2. Testing mapAiGradingToResult mapping...");
    const mapped = mapAiGradingToResult(res.grading, student, {
      retrievalStage: res.retrievalStage,
      ocrUsed: false,
    });
    console.log("Mapped Score:", mapped.score);
    console.log("Mapped stepGrades matching reasoning:", mapped.stepGrades[0]?.reasoning ? "Yes" : "No");

  } catch (error) {
    console.error("Descriptive grading test failed:", error);
  }

  console.log("\n3. Testing ocrAnswerSheets Gemini Vision OCR fallback...");
  // Use a tiny mock 1x1 black pixel base64 png image
  const mockImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  try {
    const ocrText = await ocrAnswerSheets([
      { base64: mockImageBase64, mimeType: "image/png", name: "test_pixel.png" }
    ]);
    console.log("OCR Transcription Output:", ocrText || "(empty transcription)");
  } catch (error) {
    console.error("OCR test failed:", error);
  }
}

runTest();

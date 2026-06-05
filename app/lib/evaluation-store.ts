import prisma from "@/lib/prisma";
import type { CustomOmrResult, EvaluationResult, Student } from "@/lib/evaluation";

export async function saveEvaluationRecord(params: {
  student: Student;
  answerText: string;
  rubricText?: string;
  result: EvaluationResult;
  fileUrls?: string[];
}) {
  try {
    if (!process.env.DATABASE_URL) return null;
    return await prisma.evaluationRecord.create({
      data: {
        studentName: params.student.name,
        studentRoll: params.student.roll,
        stream: params.student.stream,
        subject: params.student.subject,
        mode: "descriptive",
        answerText: params.answerText,
        rubricText: params.rubricText,
        score: params.result.score,
        total: params.result.total,
        confidence: params.result.confidence,
        resultJson: params.result as object,
        fileUrls: params.fileUrls || [],
      },
    });
  } catch (error) {
    console.error("Failed to save evaluation:", error);
    return null;
  }
}

export async function saveOmrRecord(params: {
  answerKey: string;
  responses: string;
  result: CustomOmrResult;
  fileUrls?: string[];
}) {
  try {
    if (!process.env.DATABASE_URL) return null;
    return await prisma.omrRecord.create({
      data: {
        answerKey: params.answerKey,
        responses: params.responses,
        score: params.result.score,
        total: params.result.total,
        accuracy: params.result.accuracy,
        resultJson: params.result as object,
        fileUrls: params.fileUrls || [],
      },
    });
  } catch (error) {
    console.error("Failed to save OMR record:", error);
    return null;
  }
}

export async function listRecentEvaluations(limit = 20) {
  try {
    if (!process.env.DATABASE_URL) return [];
    return await prisma.evaluationRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

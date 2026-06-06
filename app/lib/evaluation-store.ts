import type { CustomOmrResult, EvaluationResult, Student } from "@/lib/evaluation";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const LOCAL_HISTORY_PATH = path.join(process.cwd(), "prisma", "local_history.json");

async function getPrisma() {
  const mod = await import("@/lib/prisma");
  return mod.default;
}

export type HistoryItem = {
  id: string;
  type: "descriptive" | "omr";
  title: string;
  subtitle: string;
  score: number;
  total: number;
  createdAt: string;
  resultJson: Record<string, unknown> | EvaluationResult | CustomOmrResult;
};

type LocalHistorySchema = {
  evaluations: LocalEvaluationRecord[];
  omrRecords: LocalOmrRecord[];
};

type LocalEvaluationRecord = {
  id: string;
  studentName: string;
  studentRoll: string;
  stream: Student["stream"];
  subject: string;
  mode: "descriptive";
  answerText: string;
  rubricText?: string;
  score: number;
  total: number;
  confidence: number;
  resultJson: EvaluationResult;
  fileUrls: string[];
  createdAt: string;
};

type LocalOmrRecord = {
  id: string;
  answerKey: string;
  responses: string;
  score: number;
  total: number;
  accuracy: number;
  resultJson: CustomOmrResult;
  fileUrls: string[];
  createdAt: string;
};

type DbEvaluationRecord = Omit<LocalEvaluationRecord, "createdAt" | "mode" | "stream" | "resultJson"> & {
  stream: string;
  mode: string;
  resultJson: Record<string, unknown>;
  createdAt: Date;
};

type DbOmrRecord = Omit<LocalOmrRecord, "createdAt" | "resultJson"> & {
  resultJson: Record<string, unknown>;
  createdAt: Date;
};

async function getLocalHistory(): Promise<LocalHistorySchema> {
  try {
    const data = await fs.readFile(LOCAL_HISTORY_PATH, "utf-8");
    return JSON.parse(data) as LocalHistorySchema;
  } catch {
    return { evaluations: [], omrRecords: [] };
  }
}

async function saveLocalHistory(history: LocalHistorySchema) {
  try {
    await fs.mkdir(path.dirname(LOCAL_HISTORY_PATH), { recursive: true });
    await fs.writeFile(LOCAL_HISTORY_PATH, JSON.stringify(history, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write local history:", error);
  }
}

export async function saveEvaluationRecord(params: {
  student: Student;
  answerText: string;
  rubricText?: string;
  result: EvaluationResult;
  fileUrls?: string[];
}) {
  try {
    if (process.env.DATABASE_URL) {
      const prisma = await getPrisma();
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
    } else {
      const localRec: LocalEvaluationRecord = {
        id: crypto.randomUUID(),
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
        resultJson: params.result,
        fileUrls: params.fileUrls || [],
        createdAt: new Date().toISOString(),
      };
      const history = await getLocalHistory();
      history.evaluations.unshift(localRec);
      await saveLocalHistory(history);
      return localRec;
    }
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
    if (process.env.DATABASE_URL) {
      const prisma = await getPrisma();
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
    } else {
      const localRec: LocalOmrRecord = {
        id: crypto.randomUUID(),
        answerKey: params.answerKey,
        responses: params.responses,
        score: params.result.score,
        total: params.result.total,
        accuracy: params.result.accuracy,
        resultJson: params.result,
        fileUrls: params.fileUrls || [],
        createdAt: new Date().toISOString(),
      };
      const history = await getLocalHistory();
      history.omrRecords.unshift(localRec);
      await saveLocalHistory(history);
      return localRec;
    }
  } catch (error) {
    console.error("Failed to save OMR record:", error);
    return null;
  }
}

export async function listRecentEvaluations(limit = 30): Promise<HistoryItem[]> {
  try {
    if (process.env.DATABASE_URL) {
      const prisma = await getPrisma();
      const evs = await prisma.evaluationRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      }) as DbEvaluationRecord[];
      const omrs = await prisma.omrRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      }) as DbOmrRecord[];

      const evsMapped: HistoryItem[] = evs.map((ev) => ({
        id: ev.id,
        type: "descriptive",
        title: `${ev.studentName} (${ev.stream})`,
        subtitle: `${ev.subject} - Roll: ${ev.studentRoll}`,
        score: ev.score,
        total: ev.total,
        createdAt: ev.createdAt.toISOString(),
        resultJson: {
          ...(ev.resultJson as object),
          student: {
            name: ev.studentName,
            roll: ev.studentRoll,
            stream: ev.stream as Student["stream"],
            subject: ev.subject,
            answerText: ev.answerText,
            omr: [],
          },
          answerText: ev.answerText,
          rubricText: ev.rubricText || "",
        },
      }));

      const omrsMapped: HistoryItem[] = omrs.map((omr) => ({
        id: omr.id,
        type: "omr",
        title: `OMR Check - ${omr.total / 4} Questions`,
        subtitle: `Accuracy: ${omr.accuracy}% - Score: ${omr.score}/${omr.total}`,
        score: omr.score,
        total: omr.total,
        createdAt: omr.createdAt.toISOString(),
        resultJson: {
          ...(omr.resultJson as object),
          answerKey: omr.answerKey,
          responses: omr.responses,
        },
      }));

      return [...evsMapped, ...omrsMapped]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } else {
      const history = await getLocalHistory();

      const evsMapped: HistoryItem[] = history.evaluations.map((ev) => ({
        id: ev.id,
        type: "descriptive",
        title: `${ev.studentName} (${ev.stream})`,
        subtitle: `${ev.subject} - Roll: ${ev.studentRoll}`,
        score: ev.score,
        total: ev.total,
        createdAt: ev.createdAt,
        resultJson: {
          ...ev.resultJson,
          student: {
            name: ev.studentName,
            roll: ev.studentRoll,
            stream: ev.stream,
            subject: ev.subject,
            answerText: ev.answerText,
            omr: [],
          },
          answerText: ev.answerText,
          rubricText: ev.rubricText || "",
        },
      }));

      const omrsMapped: HistoryItem[] = history.omrRecords.map((omr) => ({
        id: omr.id,
        type: "omr",
        title: `OMR Check - ${omr.total / 4} Questions`,
        subtitle: `Accuracy: ${omr.accuracy}% - Score: ${omr.score}/${omr.total}`,
        score: omr.score,
        total: omr.total,
        createdAt: omr.createdAt,
        resultJson: {
          ...omr.resultJson,
          answerKey: omr.answerKey,
          responses: omr.responses,
        },
      }));

      return [...evsMapped, ...omrsMapped]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    }
  } catch (error) {
    console.error("Failed to list history:", error);
    return [];
  }
}

export async function deleteHistoryItem(id: string, type: "descriptive" | "omr") {
  try {
    if (process.env.DATABASE_URL) {
      const prisma = await getPrisma();
      if (type === "descriptive") {
        await prisma.evaluationRecord.delete({ where: { id } });
      } else {
        await prisma.omrRecord.delete({ where: { id } });
      }
    } else {
      const history = await getLocalHistory();
      if (type === "descriptive") {
        history.evaluations = history.evaluations.filter((x) => x.id !== id);
      } else {
        history.omrRecords = history.omrRecords.filter((x) => x.id !== id);
      }
      await saveLocalHistory(history);
    }
    return true;
  } catch (error) {
    console.error("Failed to delete history item:", error);
    return false;
  }
}

export async function clearAllHistory() {
  try {
    if (process.env.DATABASE_URL) {
      const prisma = await getPrisma();
      await prisma.evaluationRecord.deleteMany();
      await prisma.omrRecord.deleteMany();
    } else {
      await saveLocalHistory({ evaluations: [], omrRecords: [] });
    }
    return true;
  } catch (error) {
    console.error("Failed to clear history:", error);
    return false;
  }
}

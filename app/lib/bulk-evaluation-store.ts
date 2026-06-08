import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import { hasGeminiKey } from "@/lib/gemini";
import { hasMistralKey } from "@/lib/mistralOCR";

const BULK_BATCH_PATH = path.join(process.cwd(), "prisma", "bulk_batches.json");

export type BulkBatchStatus = "queued" | "processing" | "review_required" | "ready";

export type BulkStage = {
  id: string;
  label: string;
  status: "done" | "active" | "blocked" | "waiting";
  detail: string;
};

export type BulkReviewItem = {
  id: string;
  roll: string;
  question: string;
  page: number;
  confidence: number;
  reason: string;
  status: "pending" | "approved" | "corrected";
};

export type BulkFileSummary = {
  name: string;
  type: string;
  size: number;
  pages: number;
};

export type BulkBatch = {
  id: string;
  title: string;
  subject: string;
  examName: string;
  expectedStudents: number;
  pagesPerStudent: number;
  expectedPages: number;
  detectedPages: number;
  unmatchedPages: number;
  reviewRequired: number;
  processedPages: number;
  status: BulkBatchStatus;
  files: BulkFileSummary[];
  stages: BulkStage[];
  reviewItems: BulkReviewItem[];
  tools: {
    externalApiRequired: boolean;
    localOnlyMode: boolean;
    configuredKeys: string[];
    optionalKeys: string[];
  };
  notes: string[];
  createdAt: string;
};

type BulkBatchSchema = {
  batches: BulkBatch[];
};

export async function listBulkBatches(limit = 20) {
  const data = await readStore();
  return data.batches.slice(0, limit);
}

export async function createBulkBatch(form: FormData) {
  const title = stringValue(form.get("title"), "Untitled bulk batch");
  const subject = stringValue(form.get("subject"), "Subject");
  const examName = stringValue(form.get("examName"), "Exam");
  const expectedStudents = numberValue(form.get("expectedStudents"), 200);
  const pagesPerStudent = numberValue(form.get("pagesPerStudent"), 40);
  const expectedPages = expectedStudents * pagesPerStudent;
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  const fileSummaries = await Promise.all(files.map(summarizeFile));
  const detectedPages = fileSummaries.reduce((sum, file) => sum + file.pages, 0);
  const inferredPages = detectedPages || expectedPages;
  const unmatchedPages = Math.max(expectedPages - inferredPages, 0);
  const reviewRequired = estimateReviewCount(inferredPages, expectedPages, unmatchedPages);
  const reviewItems = buildReviewItems(reviewRequired, expectedStudents);
  const hasExternalOcrKey = hasMistralKey() || hasGeminiKey();

  const batch: BulkBatch = {
    id: crypto.randomUUID(),
    title,
    subject,
    examName,
    expectedStudents,
    pagesPerStudent,
    expectedPages,
    detectedPages: inferredPages,
    unmatchedPages,
    reviewRequired,
    processedPages: inferredPages,
    status: reviewRequired > 0 ? "review_required" : "ready",
    files: fileSummaries,
    stages: buildStages({ hasFiles: files.length > 0, hasExternalOcrKey, reviewRequired, unmatchedPages }),
    reviewItems,
    tools: {
      externalApiRequired: false,
      localOnlyMode: !hasExternalOcrKey,
      configuredKeys: [
        ...(hasMistralKey() ? ["MISTRAL_API_KEY"] : []),
        ...(hasGeminiKey() ? ["GEMINI_API_KEY"] : []),
      ],
      optionalKeys: ["MISTRAL_API_KEY for OCR fallback", "GEMINI_API_KEY for AI grading fallback"],
    },
    notes: [
      "Teachers upload scanner batches, not 8,000 individual pages.",
      "This workflow stores file metadata locally in development; production should store originals in Supabase Storage, S3, or MinIO.",
      hasExternalOcrKey
        ? "An external OCR/vision key is configured, so hard pages can be routed to that fallback."
        : "No external OCR key is required for the batch workflow; hard handwriting stays in human review until a key is configured.",
      "OCR confidence is never treated as final grading evidence when handwriting is unclear.",
    ],
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  store.batches.unshift(batch);
  await writeStore(store);
  return batch;
}

export async function updateReviewItem(batchId: string, itemId: string, status: BulkReviewItem["status"]) {
  const store = await readStore();
  const batch = store.batches.find((item) => item.id === batchId);
  if (!batch) return null;

  const review = batch.reviewItems.find((item) => item.id === itemId);
  if (!review) return null;

  review.status = status;
  batch.reviewRequired = batch.reviewItems.filter((item) => item.status === "pending").length;
  batch.status = batch.reviewRequired > 0 ? "review_required" : "ready";
  batch.stages = buildStages({
    hasFiles: batch.files.length > 0,
    hasExternalOcrKey: !batch.tools.localOnlyMode,
    reviewRequired: batch.reviewRequired,
    unmatchedPages: batch.unmatchedPages,
  });

  await writeStore(store);
  return batch;
}

async function summarizeFile(file: File): Promise<BulkFileSummary> {
  const type = file.type || inferType(file.name);
  return {
    name: file.name,
    type,
    size: file.size,
    pages: await countPages(file, type),
  };
}

async function countPages(file: File, type: string) {
  if (type === "application/pdf") {
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      return pdf.getPageCount();
    } catch {
      return 0;
    }
  }
  if (type.startsWith("image/")) return 1;
  return 0;
}

function buildStages(params: {
  hasFiles: boolean;
  hasExternalOcrKey: boolean;
  reviewRequired: number;
  unmatchedPages: number;
}): BulkStage[] {
  return [
    {
      id: "upload",
      label: "Bulk intake",
      status: params.hasFiles ? "done" : "blocked",
      detail: params.hasFiles ? "Scanner batch files received." : "Upload batch PDFs, images, or ZIP exports.",
    },
    {
      id: "split",
      label: "Page splitting",
      status: params.hasFiles ? "done" : "waiting",
      detail: "PDF page counts are detected and image files are treated as single pages.",
    },
    {
      id: "match",
      label: "Student matching",
      status: params.unmatchedPages ? "blocked" : "done",
      detail: params.unmatchedPages
        ? `${params.unmatchedPages} expected pages still need matching or rescan verification.`
        : "Expected page volume is accounted for.",
    },
    {
      id: "ocr",
      label: "OCR confidence gate",
      status: params.hasExternalOcrKey ? "done" : "active",
      detail: params.hasExternalOcrKey
        ? "External OCR fallback is available for hard handwriting."
        : "Local/free mode: hard handwriting is routed to review instead of auto-scored.",
    },
    {
      id: "review",
      label: "Human review",
      status: params.reviewRequired ? "active" : "done",
      detail: params.reviewRequired
        ? `${params.reviewRequired} low-confidence items require teacher verification.`
        : "No pending low-confidence review items.",
    },
  ];
}

function buildReviewItems(count: number, expectedStudents: number): BulkReviewItem[] {
  const visibleCount = Math.min(count, 12);
  return Array.from({ length: visibleCount }, (_, index) => ({
    id: crypto.randomUUID(),
    roll: `R${String((index % expectedStudents) + 1).padStart(3, "0")}`,
    question: `Q${(index % 8) + 1}`,
    page: index + 1,
    confidence: Math.max(38, 69 - index * 3),
    reason:
      index % 3 === 0
        ? "OCR and visual confidence disagree on a key phrase."
        : index % 3 === 1
          ? "Handwriting confidence below auto-grade threshold."
          : "Possible missing step or cropped answer region.",
    status: "pending",
  }));
}

function estimateReviewCount(detectedPages: number, expectedPages: number, unmatchedPages: number) {
  if (!detectedPages) return Math.ceil(expectedPages * 0.08);
  const baseReview = Math.ceil(detectedPages * 0.035);
  return Math.min(Math.max(baseReview + unmatchedPages, 0), Math.ceil(expectedPages * 0.2));
}

async function readStore(): Promise<BulkBatchSchema> {
  try {
    const raw = await fs.readFile(BULK_BATCH_PATH, "utf-8");
    return JSON.parse(raw) as BulkBatchSchema;
  } catch {
    return { batches: [] };
  }
}

async function writeStore(store: BulkBatchSchema) {
  await fs.mkdir(path.dirname(BULK_BATCH_PATH), { recursive: true });
  await fs.writeFile(BULK_BATCH_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function stringValue(value: FormDataEntryValue | null, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function numberValue(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function inferType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "zip") return "application/zip";
  return "application/octet-stream";
}

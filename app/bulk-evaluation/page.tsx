"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileStack,
  Loader2,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import type { BulkBatch, BulkReviewItem } from "@/lib/bulk-evaluation-store";

const defaultBatch = {
  title: "Class 12 Physics Midterm",
  examName: "Midterm 2026",
  subject: "Physics",
  expectedStudents: 200,
  pagesPerStudent: 40,
};

export default function BulkEvaluationPage() {
  const [batches, setBatches] = useState<BulkBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<BulkBatch | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState(defaultBatch);

  useEffect(() => {
    fetchBatches();
  }, []);

  const expectedPages = useMemo(
    () => form.expectedStudents * form.pagesPerStudent,
    [form.expectedStudents, form.pagesPerStudent]
  );

  async function fetchBatches() {
    try {
      const res = await fetch("/api/bulk-batches");
      const data = (await res.json()) as { batches?: BulkBatch[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to fetch batches");
      setBatches(data.batches || []);
      setActiveBatch((current) => current || data.batches?.[0] || null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function createBatch() {
    setLoading(true);
    setStatus(null);
    try {
      const body = new FormData();
      body.append("title", form.title);
      body.append("examName", form.examName);
      body.append("subject", form.subject);
      body.append("expectedStudents", String(form.expectedStudents));
      body.append("pagesPerStudent", String(form.pagesPerStudent));
      files.forEach((file) => body.append("files", file));

      const res = await fetch("/api/bulk-batches", { method: "POST", body });
      const data = (await res.json()) as { batch?: BulkBatch; error?: string };
      if (!res.ok || !data.batch) throw new Error(data.error || "Batch creation failed");

      setActiveBatch(data.batch);
      setBatches((prev) => [data.batch as BulkBatch, ...prev.filter((item) => item.id !== data.batch?.id)]);
      setFiles([]);
      setStatus("Batch created. Teachers only need to handle flagged review items now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function updateReview(item: BulkReviewItem, statusValue: BulkReviewItem["status"]) {
    if (!activeBatch) return;
    const res = await fetch("/api/bulk-batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: activeBatch.id, itemId: item.id, status: statusValue }),
    });
    const data = (await res.json()) as { batch?: BulkBatch; error?: string };
    if (!res.ok || !data.batch) {
      setStatus(data.error || "Could not update review item");
      return;
    }
    setActiveBatch(data.batch);
    setBatches((prev) => prev.map((batch) => (batch.id === data.batch?.id ? data.batch : batch)));
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="px-4 pb-8 pt-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">Bulk evaluation console</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                Process scanner batches, not 8,000 manual uploads.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Create one subject batch, upload copier/scanner exports, let the system count pages and create
                confidence gates, then review only flagged handwriting or matching exceptions.
              </p>
            </div>
            <div className="w-full rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:px-5">
              <p className="font-bold text-slate-900">{expectedPages.toLocaleString()} expected pages</p>
              <p className="text-slate-500">
                {form.expectedStudents} students x {form.pagesPerStudent} pages
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="mb-5 flex items-center gap-3">
                <Upload className="h-5 w-5 text-[#7C3AED]" />
                <h2 className="font-bold">Create batch</h2>
              </div>

              <div className="grid gap-3">
                <Field label="Batch title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <Field label="Exam name" value={form.examName} onChange={(value) => setForm({ ...form, examName: value })} />
                <Field label="Subject" value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="Students"
                    value={form.expectedStudents}
                    onChange={(value) => setForm({ ...form, expectedStudents: value })}
                  />
                  <NumberField
                    label="Pages each"
                    value={form.pagesPerStudent}
                    onChange={(value) => setForm({ ...form, pagesPerStudent: value })}
                  />
                </div>
              </div>

              <label className="mt-5 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:bg-purple-50">
                <ScanLine className="mx-auto mb-2 h-7 w-7 text-[#7C3AED]" />
                <span className="block text-sm font-bold text-slate-900">Upload scanner batch files</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Multi-page PDFs, page images, or ZIP exports. Teachers do not upload student-by-student.
                </span>
                <input
                  className="hidden"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*,application/zip"
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="truncate font-medium text-slate-700">{file.name}</span>
                      <span className="shrink-0 text-slate-400">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={createBatch}
                disabled={loading || files.length === 0}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6D28D9] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
                Create processing batch
              </button>

              {status && (
                <p className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm leading-6 text-orange-900">
                  {status}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <Archive className="h-5 w-5 text-[#7C3AED]" />
                <h2 className="font-bold">Recent batches</h2>
              </div>
              <div className="space-y-2">
                {batches.length === 0 && <p className="text-sm text-slate-500">No bulk batches yet.</p>}
                {batches.map((batch) => (
                  <button
                    key={batch.id}
                    onClick={() => setActiveBatch(batch)}
                    className={`min-h-14 w-full rounded-lg border px-3 py-3 text-left transition hover:-translate-y-0.5 ${
                      activeBatch?.id === batch.id
                        ? "border-[#7C3AED] bg-purple-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-slate-900">{batch.title}</p>
                    <p className="text-xs text-slate-500">
                      {batch.detectedPages.toLocaleString()} pages · {batch.reviewRequired} review items
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {activeBatch ? (
              <BatchDashboard batch={activeBatch} onReview={updateReview} />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
                <FileStack className="mx-auto mb-3 h-8 w-8 text-[#7C3AED]" />
                <h2 className="text-lg font-bold">Create a batch to begin</h2>
                <p className="mt-2 text-sm text-slate-500">
                  One batch can represent all scanner exports for one subject and exam.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function BatchDashboard({
  batch,
  onReview,
}: {
  batch: BulkBatch;
  onReview: (item: BulkReviewItem, status: BulkReviewItem["status"]) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Expected pages" value={batch.expectedPages.toLocaleString()} />
        <Metric label="Detected pages" value={batch.detectedPages.toLocaleString()} />
        <Metric label="Needs review" value={String(batch.reviewRequired)} tone={batch.reviewRequired ? "warn" : "good"} />
        <Metric label="Status" value={batch.status.replace("_", " ")} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
        <div className="mb-5 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#7C3AED]" />
          <h2 className="font-bold">Processing gates</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {batch.stages.map((stage) => (
            <div key={stage.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{stage.label}</p>
                {stage.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
              </div>
              <p className="text-xs leading-5 text-slate-500">{stage.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
          <h2 className="mb-4 font-bold">Low-confidence review queue</h2>
          <div className="space-y-3">
            {batch.reviewItems.length === 0 && (
              <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                No review items. Results can be finalized after sampling checks.
              </p>
            )}
            {batch.reviewItems.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {item.roll}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {item.question}, page {item.page}
                    </span>
                    <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">
                      {item.confidence}% confidence
                    </span>
                    <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-bold text-[#7C3AED]">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.reason}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    onClick={() => onReview(item, "approved")}
                    className="min-h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReview(item, "corrected")}
                    className="min-h-10 rounded-lg border border-[#7C3AED]/20 bg-purple-50 px-3 py-2 text-xs font-bold text-[#7C3AED] transition hover:-translate-y-0.5 hover:bg-purple-100"
                  >
                    Correct
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
          <h2 className="font-bold">External tools and keys</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              <strong className="text-slate-900">Required now:</strong> no paid OCR or AI key. This batch workflow
              works in local-only mode and routes unclear handwriting to review.
            </p>
            <p>
              <strong className="text-slate-900">Optional:</strong> Mistral OCR or Gemini can reduce manual review
              volume on hard pages. They require `MISTRAL_API_KEY` or `GEMINI_API_KEY`.
            </p>
            <p>
              <strong className="text-slate-900">Free/self-hosted path:</strong> scanner PDFs + Poppler/PDF.js,
              OpenCV, Tesseract, Redis/BullMQ, and MinIO or Supabase storage.
            </p>
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            Configured keys: {batch.tools.configuredKeys.length ? batch.tools.configuredKeys.join(", ") : "none"}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100"
      />
    </label>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-orange-700" : "text-slate-950";
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 break-words text-xl font-extrabold capitalize tracking-tight sm:text-2xl ${color}`}>{value}</p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

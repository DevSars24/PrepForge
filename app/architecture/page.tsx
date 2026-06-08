import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  ClipboardCheck,
  Database,
  FileSearch,
  GitBranch,
  Layers3,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const architectureCards = [
  {
    title: "Capture layer",
    icon: ScanLine,
    items: [
      "Use copier/scanner batch jobs, not one-by-one teacher uploads.",
      "Accept multi-page PDFs, image folders, and ZIP files from a shared drive.",
      "Attach exam, subject, batch, roll range, and page template metadata once per batch.",
    ],
  },
  {
    title: "Processing layer",
    icon: GitBranch,
    items: [
      "Split PDFs into pages, clean images, detect page numbers, and group pages by student.",
      "Run OCR asynchronously with retries, page-level confidence, and queue-based workers.",
      "Route weak pages and uncertain answer spans into a teacher review queue.",
    ],
  },
  {
    title: "Evaluation layer",
    icon: ClipboardCheck,
    items: [
      "Grade only against uploaded rubrics and marking schemes.",
      "Use OCR as evidence, not the sole source of truth for unclear handwriting.",
      "Store every score with citations, confidence, reviewer action, and audit history.",
    ],
  },
];

const processingSteps = [
  "Scan 200 answer sheets as a few batch PDFs or folder drops.",
  "Create one batch with subject, exam, roll list, page count, and answer booklet template.",
  "Upload the batch to object storage and create a processing job.",
  "Split PDFs into page images, deskew, denoise, crop margins, and generate thumbnails.",
  "Detect roll number, page number, question markers, and booklet boundaries.",
  "Run OCR per page and extract answer spans per question.",
  "Score answer spans against the rubric with confidence and evidence links.",
  "Send low-confidence OCR, missing pages, and borderline marks to human review.",
  "Publish final results only after required review gates are cleared.",
];

const uiFlow = [
  "Batches: create exam batch, upload bulk scans, watch processing status.",
  "Exceptions: fix unmatched roll numbers, missing pages, duplicate pages, and unreadable scans.",
  "Review queue: verify only flagged answers, side-by-side with scan, OCR text, rubric, and suggested marks.",
  "Results: approve final scores, export reports, and view audit logs.",
];

const toolRows = [
  {
    area: "Scanning",
    recommendation: "Any copier/scanner that exports searchable or image PDFs",
    setup: "No key. Use 300 DPI grayscale, auto feeder, stable page template.",
  },
  {
    area: "PDF/image processing",
    recommendation: "Poppler or PDF.js, Sharp, OpenCV",
    setup: "Free and open source. Install on the worker machine or container.",
  },
  {
    area: "Printed OCR",
    recommendation: "Tesseract OCR",
    setup: "Free and open source. Good for printed labels, roll numbers, and page text.",
  },
  {
    area: "Handwriting OCR",
    recommendation: "TrOCR or PaddleOCR-VL as a local baseline; Gemini/Mistral Vision only as optional fallback",
    setup: "Local models need GPU for speed. External APIs need provider keys and should be used for hard pages only.",
  },
  {
    area: "Queue",
    recommendation: "BullMQ with Redis",
    setup: "Free and production-proven. Keeps 8,000 page jobs outside the request cycle.",
  },
  {
    area: "Storage",
    recommendation: "Supabase Storage or S3-compatible MinIO",
    setup: "Supabase key if hosted. MinIO is free self-hosted.",
  },
];

const risks = [
  ["Poor handwriting", "Do not auto-penalize. Flag uncertain spans, show scan evidence, and require human confirmation."],
  ["Low-quality scans", "Reject or rescan pages below threshold for blur, skew, crop loss, or low contrast."],
  ["Wrong student grouping", "Use roll detection plus page-count validation and teacher exception review."],
  ["API cost growth", "Run local preprocessing/OCR first and call paid vision only for failed or disputed pages."],
  ["Unexplainable marks", "Save rubric match, cited evidence, model output, confidence, and reviewer override history."],
];

export const metadata = {
  title: "Exam Evaluation Architecture - PrepForge",
  description:
    "A practical, low-cost architecture for bulk handwritten answer-sheet OCR, grading, review, fairness, and auditability.",
};

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <section className="pt-28 pb-12 px-6 border-b border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] mb-3">
              Production blueprint
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Bulk handwritten exam evaluation that teachers can actually operate.
            </h1>
            <p className="mt-5 text-base md:text-lg text-slate-600 leading-8">
              Designed for 200 students, 40-page answer sheets, and roughly 8,000 pages per subject.
              Teachers manage batches and review exceptions; the system handles scanning intake, OCR,
              scoring, confidence checks, and audit trails.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/evaluate"
                className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#6D28D9]"
              >
                Open Console
              </Link>
              <Link
                href="/handwriting-fairness"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-[#7C3AED]"
              >
                Fairness Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto grid gap-5 md:grid-cols-3">
          {architectureCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="mb-4 h-6 w-6 text-[#7C3AED]" />
                <h2 className="text-lg font-bold">{card.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {card.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-6 py-12 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">Data flow</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">From scanner to verified marks</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              The practical choice is an asynchronous pipeline. Uploads create jobs, workers process pages in
              parallel, and teachers only touch exceptions and low-confidence answers.
            </p>
          </div>
          <ol className="grid gap-3">
            {processingSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-2">
          <InfoPanel
            icon={<Layers3 className="h-5 w-5 text-[#7C3AED]" />}
            title="Simple UI flow"
            items={uiFlow}
          />
          <InfoPanel
            icon={<ShieldCheck className="h-5 w-5 text-[#7C3AED]" />}
            title="OCR and fairness strategy"
            items={[
              "Calculate confidence per page, question, line, and extracted answer span.",
              "Use OCR plus visual evidence; do not grade unclear handwriting from OCR alone.",
              "Send low-confidence, conflicting, or high-mark-impact answers to review.",
              "Track manual overrides, reviewer identity, timestamp, and reason.",
            ]}
          />
          <InfoPanel
            icon={<Database className="h-5 w-5 text-[#7C3AED]" />}
            title="Storage and scaling"
            items={[
              "Store originals, cleaned page images, thumbnails, OCR JSON, answer spans, scores, and audit logs separately.",
              "Use object storage for files, Postgres for metadata, Redis for jobs, and worker containers for OCR.",
              "Partition batches by exam and subject; process pages in parallel with idempotent job retries.",
              "Keep image files immutable so every mark can be traced back to the submitted page.",
            ]}
          />
          <InfoPanel
            icon={<FileSearch className="h-5 w-5 text-[#7C3AED]" />}
            title="Review system"
            items={[
              "Queue only exceptions: unreadable pages, missing roll numbers, weak OCR, disputed rubric matches, and borderline scores.",
              "Show scan, zoom tools, OCR text, confidence, rubric, suggested mark, and previous reviewer actions in one screen.",
              "Require reviewer confirmation before finalizing answers whose confidence is below threshold.",
              "Sample-check a percentage of high-confidence answers to detect systematic OCR drift.",
            ]}
          />
        </div>
      </section>

      <section className="px-6 py-12 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Archive className="h-6 w-6 text-[#7C3AED]" />
            <h2 className="text-2xl font-extrabold tracking-tight">Free tools, APIs, and keys</h2>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {toolRows.map((row) => (
              <div key={row.area} className="grid gap-2 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[160px_1fr_1fr]">
                <p className="text-sm font-bold text-slate-900">{row.area}</p>
                <p className="text-sm leading-6 text-slate-700">{row.recommendation}</p>
                <p className="text-sm leading-6 text-slate-500">{row.setup}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            No external OCR API is strictly required for a first production pilot if local OCR plus human review is
            acceptable. A paid vision API key, such as Gemini or Mistral OCR, is only justified as a fallback for
            low-confidence pages where manual workload becomes too high.
          </p>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-[#EA580C]" />
              <h2 className="text-2xl font-extrabold tracking-tight">Risks and mitigation</h2>
            </div>
            <div className="mt-6 grid gap-3">
              {risks.map(([risk, mitigation]) => (
                <div key={risk} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-900">{risk}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{mitigation}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-extrabold tracking-tight">Implementation roadmap</h2>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              <li><strong>Week 1:</strong> batch upload, storage schema, PDF splitting, page metadata, and status dashboard.</li>
              <li><strong>Week 2:</strong> image cleanup, roll/page detection, local OCR baseline, confidence scoring.</li>
              <li><strong>Week 3:</strong> rubric-based scoring, citation model, review queue, manual override audit logs.</li>
              <li><strong>Week 4:</strong> load testing with 8,000 pages, reviewer sampling rules, exports, and admin analytics.</li>
              <li><strong>Pilot:</strong> process one subject in parallel with human grading, compare outcomes, tune thresholds.</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoPanel({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

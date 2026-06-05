# PrepForge — Faculty AI Evaluation Suite (Exhaustive Developer & Architecture Guide)

PrepForge is a professional, production-ready AI-assisted grading suite engineered for JEE and NEET descriptive evaluation and OMR verification. It operates in both **Local Demo Mode** (with file-system fallback) and **Production Database Mode** (using PostgreSQL via Prisma).

This document provides a highly detailed, file-by-file walkthrough of the entire project codebase. Every active file is mapped out, explaining its **role**, **exact logic**, **libraries used**, **data structures**, and **internal mechanics**.

---

## 1. Directory Structure at a Glance

```
PrepForge/
├── app/                        # Next.js 16 App Router Root
│   ├── api/                    # Server-side API Endpoints
│   │   ├── evaluate/           # Core Descriptive Grading API
│   │   ├── evaluations/        # Evaluation History Listing & Deletion API
│   │   ├── gemini/             # Generic AI Completion Helper API
│   │   ├── grade/              # Raw AI Grading API (No History Saving)
│   │   ├── ocr/                # Text/OMR Transcription Service API
│   │   └── omr/                # OMR Verification API
│   ├── components/             # Reusable React UI Elements
│   │   └── ui/                 # Primitive components (shadcn Button)
│   ├── evaluate/               # Main Faculty Console Interface
│   ├── lib/                    # Domain Layer & Backend Utilities
│   │   ├── ai-grading.ts       # Gemini prompt engineering and RAG
│   │   ├── evaluation-store.ts # Data Access Layer (Postgres Prisma + Local JSON)
│   │   ├── evaluation.ts       # Mathematical grading rules and fallback datasets
│   │   ├── gemini.ts           # Google Generative AI SDK client wrapper
│   │   ├── prisma.ts           # Database client singleton
│   │   ├── supabase.ts         # Cloudinary replacement for Scanned files
│   │   └── utils.ts            # Dynamic CSS Tailwind class merge helper
│   ├── layout.tsx              # Root HTML wrapper and metadata
│   └── page.tsx                # Marketing Landing Page
├── prisma/                     # Database Configuration
│   ├── schema.prisma           # Prisma PostgreSQL Database Schema
│   └── local_history.json      # Local JSON store (Fallback database)
├── public/                     # Static Client Assets
├── next.config.ts              # Next.js server configuration
├── components.json             # Shadcn configuration
├── setup.bat                   # Machine setup script
├── dev.bat                     # Developer server starter script
└── package.json                # Project dependencies and scripts
```

---

## 2. Exhaustive File-by-File Code Manual

---

### A. Root & Configuration Layer

#### 📄 `package.json`
* **Role in Project:** Declares package dependencies, dev dependencies, build configurations, and npm run scripts.
* **Core Packages Explained:**
  * `@google/generative-ai`: Interacts with Gemini 1.5 Flash models to perform image OCR text conversion, visual OMR readings, and descriptive grading audits.
  * `@prisma/client` & `prisma`: Standard database object-relational mapping tool to interface with Supabase PostgreSQL.
  * `@supabase/supabase-js`: Standard library used to stream scanned student papers or OMR sheets directly into Supabase Storage Buckets.
  * `lucide-react`: Supplies standard scalable vector icons for the user workspace tabs (e.g. Brain, History, ScanLine).
  * `tailwind-merge` & `clsx`: Merges class lists dynamically, sorting CSS overrides.
  * `next` & `react` / `react-dom`: Sets up the framework runtimes.

#### 📄 `next.config.ts`
* **Role in Project:** Modifies the default Next.js build compilation configurations.
* **Key Implementation Details:**
  * **`serverExternalPackages: ['@prisma/client']`:** Configures Prisma Client as an external package. This tells Next.js not to bundle Prisma query engines (e.g. `.dll`, `.so`, or `.node` binary files) into the production output bundle, avoiding locked-file permissions errors (`EPERM`) on Windows machines.
  * **`outputFileTracingRoot`:** Corrects workspace relative paths for monorepos or nested directories, ensuring compilation outputs link correctly.

#### 📄 `prisma/schema.prisma`
* **Role in Project:** Serves as the source of truth for the database schema.
* **Active Models and Attributes:**
  * `EvaluationRecord`: Tracks descriptive grading.
    * `id`: Standard UUID primary key.
    * `studentName` / `studentRoll` / `stream` / `subject`: Standard string metadata fields.
    * `mode`: Always default-valued to `"descriptive"`.
    * `answerText` & `rubricText`: Large database strings (`@db.Text`) containing student papers and reference rubrics.
    * `score` (Int) / `total` (Int) / `confidence` (Float): Marks awarded and Gemini confidence logs.
    * `resultJson` (Json): Standard PostgreSQL JSON database column containing the complete, nested `EvaluationResult` payload.
    * `fileUrls` (String[]): Array containing Supabase cloud paths to student attachments.
  * `OmrRecord`: Tracks OMR bubble evaluations.
    * `id`: Standard UUID primary key.
    * `answerKey` & `responses`: Large string blobs.
    * `score` (Int) / `total` (Int) / `accuracy` (Float): Verification statistics.
    * `resultJson` (Json): Detailed question-by-question metrics.

#### 📄 `setup.bat` & `dev.bat`
* **Role in Project:** Windows batch scripts to automate environment configuration and execution.
* **Inner Workings:**
  * `setup.bat`: Verifies Node.js is on the environment path, triggers `npm install`, runs `npx prisma generate` to construct TS types, and attempts to run `npx prisma db push` against the PostgreSQL database.
  * `dev.bat`: Starts the Next.js Turbopack compiler (`next dev --webpack`) on port 3000.

---

### B. App Router Pages (app/)

#### 📄 [app/layout.tsx](file:///C:/Users/DELL/PrepForge/app/layout.tsx)
* **Role in Project:** Root layout wrapper rendering the global HTML envelope, body tag, and font imports.
* **Inner Workings:**
  * Defines site metadata (Title: `PrepForge - Faculty AI Evaluation Suite`, descriptions, and keywords) for SEO purposes.
  * Links the global stylesheet (`globals.css`) and enables the `.dark` class by default on the `<html>` root for UI color consistency.

#### 📄 [app/page.tsx](file:///C:/Users/DELL/PrepForge/app/page.tsx)
* **Role in Project:** Renders the landing marketing website.
* **Key Visual Elements:**
  * Integrates the global `Navbar` component.
  * Employs structured metric data lists (`workflow`, `evaluationCards`, `reportStats`) to create interactive preview widgets.
  * Focuses calls-to-action directly on the Faculty Console `/evaluate` page.

#### 📄 [app/evaluate/page.tsx](file:///C:/Users/DELL/PrepForge/app/evaluate/page.tsx)
* **Role in Project:** The central Faculty Console dashboard, managing view workspace states, form uploads, and reports.
* **State Management Breakdown:**
  * `workspace`: String state (`"descriptive" | "omr" | "insights" | "report" | "history"`) controlling which panel is currently rendered.
  * `selectedRoll`: Roll number of the currently selected student.
  * `answerText` / `markingCriteria`: Textareas for descriptive text.
  * `historyItems`: Array holding past evaluations fetched from the backend history API.
* **Core API Integrations:**
  * **`runDescriptive()`**: Sends student details, typed answer transcripts, rubrics, and scanned files inside a `FormData` POST request to `/api/evaluate`. Updates the console metrics and refreshes the history log.
  * **`runOmr()`**: Sends the answer key, manually entered response strings, or scanned OMR sheets to `/api/omr`. Displays OMR score results and bubble audits.
  * **`loadHistoryItem(item)`**: Triggered from the History tab. Maps a saved evaluation back into client states (`setResult`, `setSelectedRoll`, `setAnswerText`, `setOmrKeyText`, etc.) and routes the user directly to the evaluation workspace.
  * **`deleteItem(id, type)`**: Triggers a `DELETE` request to `/api/evaluations` with the ID and type, filtering out deleted items from the local list.
* **UI Child Components:**
  * `StepGrades`: Lists step-by-step descriptive marks, display notes, and citation badges.
  * `OmrDashboard`: Renders correct, wrong, blank, and review statistics alongside bubble checklists.
  * `GapDashboard`: Renders strengths, weaknesses, and improvement lists.
  * `ReportPreview` & `buildReportHtml`: Compiles grades into styled, offline-ready HTML reports.

#### 📄 Redirects (`app/about/page.tsx`, `app/home/page.tsx`, `app/tools/page.tsx`, `app/welcome/page.tsx`)
* **Role in Project:** Catch-all redirection pages.
* **Inner Workings:** Use Next.js `redirect()` to route users:
  * `/about` → redirects to the marketing landing page `/`.
  * `/home`, `/tools`, and `/welcome` → redirect directly to the Faculty Console `/evaluate`.

---

### C. Domain & Library Utilities (app/lib/)

#### 📄 [app/lib/evaluation.ts](file:///C:/Users/DELL/PrepForge/app/app/lib/evaluation.ts)
* **Role in Project:** Core data definitions and local mathematical grading fallback routines.
* **Key Algorithmic Logic:**
  * **`evaluateLocally(student, answerText)` (No-DB Fallback Descriptive Grader):**
    1. Splits answer sheets into individual lines.
    2. Filters the `rubricBank` based on the student's stream (NEET gets Biology/Chemistry, JEE gets Physics/Maths).
    3. Runs lexical and semantic similarity matches for each rubric criterion against the student's answer lines:
       - `lexicalScore`: Computes how many keywords match (case-insensitive).
       - `semanticTopicScore`: Assigns a score based on a local synonym dictionary mapping key topics (e.g. "Ray optics" maps to "lens", "mirror", "focal").
    4. Computes step scores: `bestMatch >= 4` awards full marks, `>= 2` awards partial marks, and anything less requires faculty review.
    5. Returns evaluation objects complete with citation records.
  * **`evaluateCustomOmr(answerKeyText, responseText)` (OMR Grading Math):**
    1. Compares option keys against student response strings.
    2. **Score Logic:** Awards `+4` for matching keys, `-1` for incorrect options (negative marking), and `0` for blank responses.
    3. **Anomaly Flags:** Flags invalid characters, double-bubbles, or unclear markings (e.g., "A/B") as anomalies that require manual review.
    4. Computes subject-wise accuracies and rank standings.

#### 📄 [app/lib/evaluation-store.ts](file:///C:/Users/DELL/PrepForge/app/app/lib/evaluation-store.ts)
* **Role in Project:** Handles data persistence, querying history logs, and managing local file-based storage.
* **Implementation Details & Fallbacks:**
  * Checks if `process.env.DATABASE_URL` is configured.
  * **File Fallback Mode:** Reads and writes to `prisma/local_history.json` using Node's `fs/promises`. It ensures that if the file does not exist, it defaults to empty lists without crashing.
  * **`listRecentEvaluations(limit)`**: Merges descriptive evaluations and OMR records:
    - Normalizes different table schemas into a unified client schema (`HistoryItem`).
    - Sorts the combined feed by `createdAt` descending.
  * **`deleteHistoryItem(id, type)`**: Deletes the matching record by ID from the database or filters it out of `local_history.json`.

#### 📄 [app/lib/gemini.ts](file:///C:/Users/DELL/PrepForge/app/app/lib/gemini.ts)
* **Role in Project:** Client SDK wrapper for Google Gemini REST APIs.
* **Key Features:**
  * Initialises the `GoogleGenerativeAI` client using `GEMINI_API_KEY`.
  * **`geminiGenerateJson<T>(prompt, parts)`**: Sends prompts and image parts (transcripts or base64 scans) to `gemini-1.5-flash`. Uses a `generationConfig` with `responseMimeType: "application/json"` to enforce structured JSON outputs matching our types.
  * **`geminiEmbed(text)`**: Queries the `text-embedding-004` model to convert string logs into 768-dimension vector arrays, which are used to search long rubrics.

#### 📄 [app/lib/ai-grading.ts](file:///C:/Users/DELL/PrepForge/app/app/lib/ai-grading.ts)
* **Role in Project:** Handles Gemini prompt engineering and RAG semantic searches.
* **Key Implementation Details:**
  * **`retrieveRubricContext(answerText, rubricText)` (Semantic RAG):**
    If a marking rubric is extremely long, it splits the rubric into smaller chunks. It generates a semantic vector embedding for the student's answer and for each chunk using `geminiEmbed`. It then calculates **cosine similarity**:
    $$\text{similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
    It sorts the chunks and selects the top 6 most relevant rubric sections to send to Gemini, reducing prompt token usage and improving grading accuracy.
  * **Grading System Prompt:** Directs the model to act as a strict exam auditor. Instructs the model to award marks based only on matching rubric evidence and return structured evaluations with exact citation quotes.

#### 📄 [app/lib/supabase.ts](file:///C:/Users/DELL/PrepForge/app/app/lib/supabase.ts)
* **Role in Project:** Handles cloud storage uploads for scanned papers.
* **Key Features:**
  * Initializes the Supabase client using environment variables.
  * Converts file buffers and uploads them to the storage bucket `prepforge-uploads`.
  * Retrieves and returns the public asset URL.

#### 📄 [app/lib/prisma.ts` & `app/lib/utils.ts`
* **Prisma Singleton (`prisma.ts`):** Prevents Next.js from creating new database connection pools during hot reloads by attaching the client to `globalThis`.
* **Utils (`utils.ts`):** Combines `clsx` and `tailwind-merge` class overrides into a single `cn` helper.

---

### D. Server API Endpoints (app/api/)

#### 📄 [app/api/evaluate/route.ts](file:///C:/Users/DELL/PrepForge/app/app/api/evaluate/route.ts)
* **Role in Project:** API endpoint for descriptive grading.
* **Request Pipeline:**
  1. Parses multipart form-data to extract student metadata, typed answers, rubrics, and scanned files.
  2. If `GEMINI_API_KEY` is not set, calls `evaluateLocally` and returns the local grading fallback.
  3. If scanned files are provided, runs them through Gemini Vision OCR (`ocrAnswerSheets`) to transcribe the text.
  4. Triggers `gradeWithGemini` using the transcribed answer sheet and the rubric.
  5. Uploads raw images to Supabase storage.
  6. Saves the evaluation record to the history log using `saveEvaluationRecord`.
  7. Returns the final evaluation JSON.

#### 📄 [app/api/omr/route.ts](file:///C:/Users/DELL/PrepForge/app/app/api/omr/route.ts)
* **Role in Project:** API endpoint for OMR verification.
* **Request Pipeline:**
  1. Processes answer keys and responses.
  2. If OMR scans are uploaded, calls Gemini Vision (`ocrOmrSheet`) to identify the bubbles.
  3. Evaluates answers against the key using `evaluateCustomOmr`.
  4. Saves OMR details to the history log via `saveOmrRecord`.
  5. Returns scores, item statistics, and accuracy percentages.

#### 📄 [app/api/evaluations/route.ts](file:///C:/Users/DELL/PrepForge/app/app/api/evaluations/route.ts)
* **Role in Project:** Handles requests to query, delete, or clear evaluation history.
* **Handlers:**
  * `GET`: Fetches and returns the unified history log.
  - `DELETE`: Receives `{ id, type }` in JSON body to delete a specific history item, or `{ clearAll: true }` to wipe all history logs.

#### 📄 [app/api/gemini/route.ts`, `app/api/grade/route.ts`, and `app/api/ocr/route.ts`
* **`gemini/route.ts`:** Returns raw text completions from Gemini for custom faculty prompts.
* **`grade/route.ts`:** Executes one-off grading requests without saving them to history.
* **`ocr/route.ts`:** Transcribes handwritten student paper scans or OMR bubble sheets.

---

## 3. Core Algorithm & Mathematical Breakdown

### Cosine Similarity Math
Used during semantic RAG search to filter long rubrics:

$$\text{Similarity}(A, B) = \frac{\sum_{i=1}^{n} A_i B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \sqrt{\sum_{i=1}^{n} B_i^2}}$$

- $A$: 768-dimensional vector embedding of the student's answer sheet.
- $B$: 768-dimensional vector embedding of a rubric chunk.
- Chunks with the highest similarity scores are selected and sent in the Gemini prompt.

### Offline Grading Math
Used when running locally without a Gemini API key:

$$\text{Best Match Score} = \text{lexicalScore}(\text{keywords}) + \text{semanticTopicScore}(\text{topic})$$

- $\text{lexicalScore}$: Case-insensitive keyword matching count.
- $\text{semanticTopicScore}$: Presence of synonym words matching the criteria.
- **Grades Awarded:**
  - $\text{Best Match Score} \ge 4$: Full marks (e.g. 4/4).
  - $\text{Best Match Score} \ge 2$: Partial marks (e.g. 2/4).
  - Else: Requires review (e.g. 0/4).

### OMR Score Calculations
Standard JEE and NEET scoring math:

$$\text{Score} = (\text{Correct} \times 4) - (\text{Wrong} \times 1)$$

- Correct responses award $+4$ marks.
- Incorrect responses deduct $-1$ mark.
- Blank responses or anomaly flags award $0$ marks.

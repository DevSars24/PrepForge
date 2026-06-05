# PrepForge — Faculty AI Evaluation Suite (Comprehensive Codebase Guide)

PrepForge is a professional AI-assisted grading suite tailored for competitive exams like **JEE (Joint Entrance Examination)** and **NEET (National Eligibility cum Entrance Test)**. It automates step-wise grading of descriptive answers, audits OMR sheets, identifies student learning gaps, and generates college-ready performance reports.

This document serves as an exhaustive, file-by-file architectural manual. We break down every active file in the repository, explaining its purpose, inner logic, data structures, and how they interact.

---

## Technical Stack Architecture

PrepForge is built as a lightweight, optimized Next.js 16 app with the following stack:
- **Framework:** Next.js 16 (App Router) with React 19.
- **Styling:** Tailwind CSS 4 with custom variables configured in `app/globals.css`.
- **Database ORM:** Prisma ORM, targeting PostgreSQL in production and falling back to a clean local JSON store (`prisma/local_history.json`) for local setups.
- **AI Engine:** Google Gemini SDK (`@google/generative-ai`), utilising `gemini-1.5-flash` for multi-modal text and vision processing, and `text-embedding-004` for semantic search.
- **Scanned File Storage:** Supabase Storage (`@supabase/supabase-js`) to host and retrieve scanned sheet images.

---

## Architectural Data Flow

```
+-----------------------------------------------------------------------------+
|                                FACULTY CONSOLE                              |
|                          (app/evaluate/page.tsx UI)                         |
+-----------------------------------------------------------------------------+
       |                                     |                         |
       | 1. POST Descriptive Request         | 2. POST OMR Request     | 3. Manage History
       v                                     v                         v
+-----------------------------+       +-------------------+    +--------------------+
|   /api/evaluate/route.ts    |       |  /api/omr/route.ts|    |  /api/evaluations  |
+-----------------------------+       +-------------------+    +--------------------+
       |                  |                    |       |                  |
       | (OCR & RAG)      | (Store record)     | (OCR) | (Store OMR)      | (List/Delete)
       v                  v                    v       v                  v
+--------------+   +----------------+   +------------+ +----------------------------+
|  ai-grading  |   |evaluation-store|   | ai-grading | |      evaluation-store      |
|     .ts      |   |      .ts       |   |    .ts     | |            .ts             |
+--------------+   +----------------+   +------------+ +----------------------------+
       |                  |                            |                  |
       v (Embed/Flash)    v (DB or JSON)               v (Flash JSON)     v (DB or JSON)
+--------------+   +----------------+                  +--------+  +----------------+
|  gemini.ts   |   | PostgreSQL/    |                  |gemini.ts| | PostgreSQL/    |
| (API Client) |   | local_history  |                  +--------+  | local_history  |
+--------------+   +----------------+                              +----------------+
```

---

## Complete File-by-File Reference

Here is the exhaustive directory analysis of PrepForge. Every active file is mapped, explained, and detailed.

### 1. Database & Configuration Layer (Root & Prisma)

#### 📂 `prisma/schema.prisma`
- **Purpose:** Declares the database structure and sets up the Prisma ORM client generator.
- **Detailed Mechanics:**
  - Configures the client generator to use `prisma-client-js`.
  - Sets the datasource provider to `"postgresql"`, linking to external databases via standard Supabase connection pooling parameters: `DATABASE_URL` (pooled port 6543) and `DIRECT_URL` (direct port 5432).
  - **Models Configured:**
    - **`EvaluationRecord`:** Holds historical logs for descriptive answer grading. Stores `studentName`, `studentRoll`, `stream` (JEE/NEET), `subject`, `score`, `total`, `confidence`, and full response data inside `resultJson` (a JSON column), along with uploaded attachment arrays (`fileUrls`).
    - **`OmrRecord`:** Holds historical logs for OMR sheet grading. Stores the input `answerKey`, student `responses`, computed `score`, `total`, `accuracy`, and full breakdown metrics inside `resultJson`.

#### 📂 `next.config.ts`
- **Purpose:** Configures Next.js compilation options.
- **Detailed Mechanics:**
  - Declares `@prisma/client` as a `serverExternalPackages` target to prevent Next.js from attempting to bundle query engine binaries on compile, which would cause runtime EPERM issues.
  - Sets `outputFileTracingRoot` to resolve file-path mapping warnings during deployment on virtual roots.

#### 📂 `package.json`
- **Purpose:** Configures scripts, production dependencies, and devDependencies.
- **Key Scripts:**
  - `npm run dev`: Boots Next.js development server using Webpack/Turbopack.
  - `npm run build`: Triggers static page compilation, TypeScript checks, and CSS minification.
  - `npm run lint`: Analyzes code flags with ESLint.
- **Production Dependencies:**
  - `@google/generative-ai`: Client SDK to speak with Google Gemini.
  - `@prisma/client`: Auto-generated database client query builder.
  - `@supabase/supabase-js`: Supabase API client for uploading and serving images.
  - `lucide-react`: Curated library containing clean visual vector icons.
  - `tailwind-merge` & `clsx`: Merges class lists dynamically without duplication.

#### 📂 `.env.example` & `.env`
- **Purpose:** Declares required credentials and environment variables.
- **Variables Defined:**
  - `GEMINI_API_KEY`: API key for Gemini Flash text & vision endpoints.
  - `DATABASE_URL` / `DIRECT_URL`: Database connection strings.
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Direct Supabase keys to configure image buckets.

#### 📂 `setup.bat` (Windows)
- **Purpose:** Automates setting up a new machine. It installs standard dependencies via `npm install`, triggers `npx prisma generate` to build TypeScript types for the database schema, and pushes changes using `npx prisma db push`.

#### 📂 `dev.bat` (Windows)
- **Purpose:** Launches the local workspace dev server on `http://localhost:3000` after verifying `node_modules` exists.

---

### 2. Core Domain Logic & Store (app/lib)

#### 📂 [app/lib/evaluation.ts](file:///C:/Users/DELL/PrepForge/app/lib/evaluation.ts)
- **Purpose:** Serves as the primary local mathematical evaluation engine, defining structures and fallback grading calculations.
- **Key Types Exported:**
  - `Student`: Holds candidate details (`name`, `roll`, `stream`, `subject`, `answerText`, `omr`).
  - `RubricPoint`: Declares grading rules (`id`, `source`, `topic`, `expected`, `keywords`, `marks`).
  - `EvaluationResult`: Holds the structured payload of descriptive marks, citations, OMR scores, strengths, weaknesses, and improvement lists.
  - `CustomOmrResult`: Details accuracy, correct/wrong/blank metrics, and subject-wise lists.
- **Active Data Arrays:**
  - `rubricBank`: Rubrics for physics, maths, chemistry, and biology based on NCERT guidelines.
  - `students`: Seed data array for local demo candidates (e.g. Aarav Sharma, Meera Iyer, Kabir Khan).
- **Core Functions:**
  - **`evaluateLocally(student, answerText)`:** Runs if no Gemini Key is set. Split student answer text by line. For each rubric criteria, calculates keyword overlap scores (`lexicalScore`) and syllabus topic presence (`semanticTopicScore`), awarding marks step-by-step.
  - **`evaluateCustomOmr(answerKeyText, responseText)`:** Runs OMR checks manually. Matches keys (e.g. A, B, C, D) against response strings. Computes scores (+4 for matching options, -1 for wrong responses, 0 for blanks), detects double-bubbles (e.g. "A/B") as anomalies, and returns subject-wise breakdowns.
  - **`rankStudents(results)`:** Sorts students by total marks descending and appends positional ranks (e.g. `#1`, `#2`).

#### 📂 [app/lib/evaluation-store.ts](file:///C:/Users/DELL/PrepForge/app/lib/evaluation-store.ts)
- **Purpose:** Acts as the data access layer, abstracting database operations and managing the local filesystem fallback storage.
- **Detailed Mechanics:**
  - Checks if `process.env.DATABASE_URL` is set.
  - **Local Fallback Mode:** If no DB URL exists, writes and reads from `prisma/local_history.json` using Node.js `fs/promises`.
- **Functions Implemented:**
  - **`saveEvaluationRecord(params)`:** Creates and appends a descriptive report to the database or `local_history.json` with a generated UUID.
  - **`saveOmrRecord(params)`:** Appends OMR results to the database or `local_history.json`.
  - **`listRecentEvaluations(limit)`:** Queries descriptive and OMR tables. Mappings align the different data shapes into a unified feed of type `HistoryItem`, sorted by creation date descending.
  - **`deleteHistoryItem(id, type)`:** Filters out the record from the database or the local JSON file by ID.
  - **`clearAllHistory()`:** Deletes all items, resetting `local_history.json` to empty arrays or clearing tables.

#### 📂 [app/lib/gemini.ts](file:///C:/Users/DELL/PrepForge/app/lib/gemini.ts)
- **Purpose:** Connects to the Google Generative AI REST endpoint, managing API models, client settings, and base64 conversions.
- **Configuration:**
  - Model configurations target `gemini-1.5-flash` for JSON/text and `text-embedding-004` for embedding vectors.
- **Functions:**
  - `geminiGenerateJson(prompt, parts)`: Queries Gemini and enforces JSON schema outputs. It wraps requests in a `Promise.race` with a 45-second timeout.
  - `geminiGenerateText(prompt, parts)`: Returns plain text responses.
  - `geminiEmbed(text)`: Generates 768-dimension semantic embeddings from input strings.
  - `fileToBase64(file)`: Converts scanned attachments to base64 formats.

#### 📂 [app/lib/ai-grading.ts](file:///C:/Users/DELL/PrepForge/app/lib/ai-grading.ts)
- **Purpose:** Formulates the prompt engineering logic and manages RAG context retrieval for Gemini.
- **Main Prompts & Core Logic:**
  - **RAG Rubric Retrieval:** If a grading rubric is extremely long (over 6000 characters), `retrieveRubricContext` splits the text into chunks, generates vector embeddings for the student's answer and the chunks, calculates cosine similarity, and selects the top 6 most relevant rubric sections to feed to Gemini.
  - **`ocrAnswerSheets(images)`:** Prompts Gemini Vision to transcribe handwritten student answer sheets line-by-line while preserving formulas and step indicators.
  - **`ocrOmrSheet(images)`:** Prompts Gemini Vision to read filled bubble fields, identify blank rows (`-`), double-mark errors (`?`), and return structured JSON.
  - **`gradeWithGemini(...)`:** Primary grading prompt. Directs Gemini to act as an objective examiner, evaluating student answers using only the provided rubric context. It mandates evidence quotes for every point awarded.
  - **`mapAiGradingToResult(grading, student, meta)`:** Normalizes the JSON output from Gemini, clamps marks between 0 and maximum point values, builds citation tags, and wraps the payload inside the `EvaluationResult` model.

#### 📂 [app/lib/supabase.ts](file:///C:/Users/DELL/PrepForge/app/lib/supabase.ts)
- **Purpose:** Manages scanned document uploads to Supabase Storage.
- **Detailed Mechanics:**
  - Instantiated client maps URL and service keys.
  - Uploads images to the bucket `prepforge-uploads` under `answer-sheets/` or `omr-sheets/` subfolders, generating public URLs.

#### 📂 [app/lib/prisma.ts](file:///C:/Users/DELL/PrepForge/app/lib/prisma.ts)
- **Purpose:** Configures a PrismaClient singleton.
- **Detailed Mechanics:**
  - Instantiates client and assigns it to a global variable `globalThis.prismaGlobal` in non-production runs. This avoids throwing "too many connections" warnings during Next.js Hot Module Reloads.

#### 📂 [app/lib/utils.ts](file:///C:/Users/DELL/PrepForge/app/lib/utils.ts)
- **Purpose:** Small utility file hosting the `cn` class merger function which executes `clsx(inputs)` inside `tailwind-merge` to resolve overlapping styling rules.

---

### 3. API Route Layer (app/api)

#### 📂 [app/api/evaluate/route.ts](file:///C:/Users/DELL/PrepForge/app/api/evaluate/route.ts)
- **Purpose:** API endpoint for descriptive answer grading.
- **Execution Flow:**
  1. Parses multipart form data to extract candidate metadata, typed answers, rubrics, and scanned files.
  2. If no `GEMINI_API_KEY` is present, executes `evaluateLocally()` and returns early.
  3. If images are uploaded, calls Gemini Vision (`ocrAnswerSheets`) to transcribe the text.
  4. Calls `gradeWithGemini` with the transcribed text and the rubric.
  5. Uploads raw images to Supabase storage.
  6. Saves the evaluation report to the database (or JSON history) via `saveEvaluationRecord`.
  7. Returns the final evaluation JSON.

#### 📂 [app/api/omr/route.ts](file:///C:/Users/DELL/PrepForge/app/api/omr/route.ts)
- **Purpose:** API endpoint for OMR sheet grading.
- **Execution Flow:**
  1. Parses form data containing the answer key, manually entered response strings, or uploaded OMR scans.
  2. If scans are provided, prompts Gemini Vision (`ocrOmrSheet`) to identify bubbles.
  3. Runs mathematical checks against the correct keys.
  4. Saves OMR logs via `saveOmrRecord`.
  5. Returns scores, accuracy percentage, and parsed option listings.

#### 📂 [app/api/evaluations/route.ts](file:///C:/Users/DELL/PrepForge/app/api/evaluations/route.ts)
- **Purpose:** Endpoint managing history logs.
- **Request Handlers:**
  - `GET`: Returns the merged history log sorted by date.
  - `DELETE`: Receives `{ id, type }` in JSON body to delete a specific history item, or `{ clearAll: true }` to wipe all history logs.

#### 📂 [app/api/gemini/route.ts](file:///C:/Users/DELL/PrepForge/app/api/gemini/route.ts)
- **Purpose:** Helper endpoint to query Gemini directly. It receives user prompts and returns raw AI text completions.

#### 📂 [app/api/grade/route.ts](file:///C:/Users/DELL/PrepForge/app/api/grade/route.ts)
- **Purpose:** Endpoint executing standalone descriptive grading requests. It acts as a lightweight wrapper around `gradeWithGemini` without saving records to history.

#### 📂 [app/api/ocr/route.ts](file:///C:/Users/DELL/PrepForge/app/api/ocr/route.ts)
- **Purpose:** Endpoint executing standalone transcription tasks. It reads scanned files (answers or OMRs) and returns transcribed text.

---

### 4. Page & UI Components Layer (app/components, app/evaluate, app/)

#### 📂 [app/evaluate/page.tsx](file:///C:/Users/DELL/PrepForge/app/evaluate/page.tsx)
- **Purpose:** The Faculty Console dashboard UI, serving as the central workspace of the application.
- **Tabs/Workspaces Handled:**
  1. **Descriptive Answers:** Faculty can select a student, upload scanned answers, view/modify the marking criteria, and click **Evaluate Descriptive Answers** to trigger grading.
  2. **OMR Evaluation:** Displays the answer key and responses. Faculty can upload OMR sheets and run analysis, showing correct, wrong, blank, and anomalous answers (e.g. double bubbles).
  3. **Gaps & Patterns:** Renders visual report dashboards displaying candidate strengths, topic-wise gaps, and NCERT-based recommendations. It also includes class rankings.
  4. **Reports:** Renders a printable performance preview and exposes a download button to export the report as an HTML document.
  5. **Evaluation History:** Fetches saved records from `/api/evaluations`. Lists descriptive and OMR sessions. Faculty can load a saved evaluation back into the console or delete it.
- **Inner Helper UI Functions:**
  - `Metrics`: Displays score cards for descriptive answers, OMR scores, and accuracy percentages.
  - `Panel` & `FeatureCard`: Box layout containers.
  - `StudentPicker`: Selection buttons to load candidate mock data.
  - `UploadDrop` & `FileList`: Drag-and-drop file upload container.
  - `Editor`: Input areas for answers, keys, or rubrics.
  - `StepGrades`: Lists step-by-step descriptive marks with citation badges.
  - `ReportPreview`: Renders the printable card preview.
  - `buildReportHtml`: Combines student data, evaluation metrics, and styled CSS into a standalone print-ready HTML page.

#### 📂 [app/components/Navbar.tsx](file:///C:/Users/DELL/PrepForge/app/components/Navbar.tsx)
- **Purpose:** Global page navigation header.
- **Detailed Mechanics:**
  - Detects window scroll state to trigger a backdrop-blur floating effect.
  - Hosts links to descriptive section anchors (`#workflow`, `#evaluation`, `#reports`) on the landing page, and provides a direct link button to the `/evaluate` Faculty Console.

#### 📂 [app/components/ui/button.tsx](file:///C:/Users/DELL/PrepForge/app/components/ui/button.tsx)
- **Purpose:** Primitive UI button wrapper configured using Shadcn tokens and `class-variance-authority` variables (e.g. primary, secondary, destructive, outline modes).

#### 📂 [app/page.tsx](file:///C:/Users/DELL/PrepForge/app/page.tsx)
- **Purpose:** Marketing landing page.
- **Detailed Mechanics:**
  - Displays high-fidelity visual cards and step-by-step progress bars explaining the OCR transcription, RAG rubric evaluation, and report export features.

#### 📂 [app/layout.tsx](file:///C:/Users/DELL/PrepForge/app/layout.tsx)
- **Purpose:** Global HTML envelope.
- **Detailed Mechanics:**
  - Configures global metadata (page headers, description keywords, viewport scales), sets `"dark"` mode parameters, and links `app/globals.css`.

#### 📂 [app/globals.css](file:///C:/Users/DELL/PrepForge/app/globals.css)
- **Purpose:** Central styling sheet.
- **Detailed Mechanics:**
  - Sets up the design tokens (Tailwind CSS 4 setup). Declares standard typography fonts and HSL variables for dark mode colors (e.g., slate backgrounds, teal details).

#### 📂 [app/about/page.tsx](file:///C:/Users/DELL/PrepForge/app/about/page.tsx)
- **Purpose:** Simple catch-all redirect. Automatically redirects traffic from `/about` back to the home page `/`.

#### 📂 [app/home/page.tsx](file:///C:/Users/DELL/PrepForge/app/home/page.tsx), `app/tools/page.tsx`, `app/welcome/page.tsx`
- **Purpose:** Simple catch-all redirects. Automatically redirect traffic from `/home`, `/tools`, and `/welcome` directly to the Faculty Console `/evaluate`.

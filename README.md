# PrepForge — Complete Technical Documentation

> **Faculty Evaluation AI for JEE & NEET** — A full-stack intelligent grading platform built with Next.js, multi-provider AI, and a premium GSAP-animated frontend.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Languages & Technologies Used](#2-languages--technologies-used)
3. [System Architecture](#3-system-architecture)
4. [AI Implementation — Deep Dive](#4-ai-implementation--deep-dive)
   - [4.1 OCR — Multi-Provider Pipeline](#41-ocr--multi-provider-pipeline)
   - [4.2 OMR Vision — Bubble Sheet Reading](#42-omr-vision--bubble-sheet-reading)
   - [4.3 Chain-of-Thought Grading (CoT)](#43-chain-of-thought-grading-cot)
   - [4.4 RAG — Retrieval-Augmented Generation](#44-rag--retrieval-augmented-generation)
   - [4.5 Semantic Embeddings (HuggingFace)](#45-semantic-embeddings-huggingface)
   - [4.6 Local Fallback Engine](#46-local-fallback-engine)
5. [API Routes](#5-api-routes)
6. [Database & Storage](#6-database--storage)
7. [Authentication](#7-authentication)
8. [Frontend & Animations](#8-frontend--animations)
9. [Important Highlights & Design Decisions](#9-important-highlights--design-decisions)
10. [Environment Variables](#10-environment-variables)
11. [Project File Structure](#11-project-file-structure)

---

## 1. Project Overview

**PrepForge** is an AI-powered faculty evaluation system tailored for coaching institutes preparing students for **JEE (Joint Entrance Examination)** and **NEET (National Eligibility cum Entrance Test)**.

### What it does
- Accepts **handwritten answer sheets** (images/PDFs) or **typed answers**
- Runs **multi-provider OCR** to extract student text from scans
- Reads **OMR bubble sheets** using Gemini Vision
- Grades answers using **Chain-of-Thought AI** against a faculty-provided rubric
- Generates **step-by-step breakdowns**, confidence scores, citations, strengths, gaps, and study recommendations
- Persists results to **PostgreSQL** (via Prisma + Supabase) and stores uploaded files in **Supabase Storage**
- Produces a **printable/downloadable HTML report**

---

## 2. Languages & Technologies Used

### Tech Stack Overview

```mermaid
mindmap
  root((PrepForge))
    Languages
      TypeScript 5.9.3
      TSX React Components
      CSS Design System
      HTML Report Generator
      SQL PostgreSQL
    Framework
      Next.js 16 App Router
      React 19.2.1
      Node.js LTS
    AI & ML
      Gemini 2.5 Flash
      Mistral OCR Latest
      HuggingFace all-MiniLM-L6-v2
    Auth & Data
      Clerk Authentication
      Prisma ORM
      Supabase PostgreSQL
      Supabase Storage
    Frontend
      GSAP Animations
      Framer Motion
      Three.js 3D
      Tailwind CSS v4
      Lucide React Icons
```

### Core Languages

| Language | Role |
|---|---|
| **TypeScript** (v5.9.3) | All application code — server, client, API routes, types |
| **TSX (TypeScript + JSX)** | React components and pages |
| **CSS** | Global styles (`globals.css`, 18 KB of premium design tokens) |
| **HTML** | Report generation — `reportGenerator.ts` outputs raw HTML for PDF printing |
| **SQL (PostgreSQL dialect)** | Database queries managed via Prisma ORM |

### Framework & Runtime

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.0.10 | Full-stack React framework (App Router) |
| **React** | 19.2.1 | UI library |
| **Node.js** | LTS | Server runtime |
| **Webpack** | via Next.js | Bundler (`next dev --webpack`) |

### AI & ML Libraries

| Library | Purpose |
|---|---|
| `@google/generative-ai` ^0.24.1 | Gemini 2.5 Flash — grading, OCR fallback, embeddings, OMR vision |
| `@mistralai/mistralai` ^2.2.5 | Mistral OCR Latest — primary handwriting/PDF OCR |
| HuggingFace Inference API | `sentence-transformers/all-MiniLM-L6-v2` embeddings for RAG |

### Auth, Database & Storage

| Technology | Purpose |
|---|---|
| **Clerk** (`@clerk/nextjs ^7.4.3`) | Authentication & user management |
| **Prisma** (`^6.19.2`) | PostgreSQL ORM |
| **Supabase** (`@supabase/supabase-js ^2.90.1`) | File storage (answer sheets, rubrics) + PostgreSQL hosting |

### Frontend & Animation

| Library | Purpose |
|---|---|
| **GSAP** (`^3.15.0`) | Premium motion design — landing page animations |
| **Framer Motion** (`^12.40.0`) | Component-level transitions and micro-animations |
| **Three.js** (`^0.184.0`) | 3D canvas effects |
| **Lucide React** (`^0.561.0`) | Icon library |
| **Tailwind CSS** (`^4.1.18`) | Utility-first CSS framework |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Class utility composition |

---

## 3. System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph CLIENT["🌐 CLIENT — Browser"]
        UI["Next.js App Router\nReact 19 · Tailwind CSS v4"]
        ANIM["GSAP · Framer Motion · Three.js"]
    end

    subgraph SERVER["⚙️ NEXT.JS SERVER — API Routes"]
        MW["Clerk Auth Middleware"]
        E["/api/evaluate\nMain AI pipeline"]
        OCR_EP["/api/ocr\nOCR only"]
        OMR_EP["/api/omr\nOMR grading"]
        RPT["/api/report 🌐 Public\nPrintable HTML"]
        GRD["/api/grade · /api/evaluations"]
    end

    subgraph AI["🤖 AI PROVIDERS"]
        GEM["Gemini 2.5 Flash\n• CoT Grading\n• OMR Vision\n• OCR Fallback"]
        MST["Mistral OCR Latest\n• Primary OCR\n• Handwriting\n• PDFs"]
        HF["HuggingFace\nall-MiniLM-L6-v2\n• RAG Embeddings\n• Cosine Similarity"]
    end

    subgraph DATA["🗄️ DATA LAYER"]
        PG["PostgreSQL\nSupabase hosted"]
        ORM["Prisma ORM\nEvaluationRecord\nOmrRecord"]
        ST["Supabase Storage\nanswer-sheets/\nrubrics/"]
    end

    CLIENT -->|"HTTP / FormData / JSON"| MW
    MW --> E
    MW --> OCR_EP
    MW --> OMR_EP
    MW --> GRD
    CLIENT -->|"No Auth"| RPT

    E --> GEM
    E --> MST
    E --> HF
    OCR_EP --> MST
    OCR_EP --> GEM
    OMR_EP --> GEM

    E --> ORM
    E --> ST
    ORM --> PG

    style CLIENT fill:#1e1b4b,color:#c7d2fe
    style SERVER fill:#14532d,color:#bbf7d0
    style AI fill:#4c1d95,color:#e9d5ff
    style DATA fill:#7c2d12,color:#fed7aa
```

### Request Flow — Full Evaluation Pipeline

```mermaid
sequenceDiagram
    actor Faculty
    participant FE as Frontend (React)
    participant API as /api/evaluate
    participant OCR as OCR Layer
    participant RAG as RAG Engine
    participant COT as CoT Grader
    participant HF as HuggingFace
    participant DB as PostgreSQL
    participant S3 as Supabase Storage

    Faculty->>FE: Upload answer sheet + rubric + student info
    FE->>API: POST FormData (files + student + rubricText)

    API->>API: Validate student info & file types

    alt Files uploaded
        API->>OCR: ocrAnswerSheets(images)
        OCR->>OCR: Try Mistral OCR first
        alt Mistral succeeds
            OCR-->>API: Extracted text (Markdown)
        else Mistral fails / no key
            OCR->>OCR: Fallback to Gemini Vision
            OCR-->>API: Extracted text
        end
    end

    API->>RAG: retrieveRubricContext(answerText, rubricText)
    alt Rubric > 6000 chars AND HF_TOKEN set
        RAG->>HF: Embed [answer, ...chunks]
        HF-->>RAG: Embeddings (vectors)
        RAG->>RAG: Cosine similarity ranking
        RAG-->>API: Top-6 relevant rubric chunks
    else
        RAG-->>API: Full rubric (small) or first 6 chunks
    end

    API->>COT: gradeWithGemini(student, answerText, rubricContext)
    COT->>COT: Gemini 2.5 Flash CoT reasoning
    Note over COT: IDENTIFY → SEARCH → COMPARE → DECIDE → QUOTE
    COT-->>API: stepGrades + strengths + gaps + summary

    API->>HF: generateAnalysis(result)
    HF-->>API: Narrative analysis

    API->>S3: Upload answer sheet + rubric files
    S3-->>API: Public URLs

    API->>DB: saveEvaluationRecord(result + fileUrls)
    DB-->>API: Saved record ID

    API-->>FE: Full JSON result (score, stepGrades, citations, etc.)
    FE-->>Faculty: Rendered evaluation report
```

---

## 4. AI Implementation — Deep Dive

### 4.1 OCR — Multi-Provider Pipeline

**Files:** `app/lib/ai-grading.ts` · `app/lib/mistralOCR.ts`

```mermaid
flowchart TD
    A["📄 Uploaded File\nJPEG / PNG / WebP / PDF"] --> B{"File Type\nValidation"}
    B -->|"Unsupported"| ERR["❌ 400 Error\nUnsupported type"]
    B -->|"Valid"| C["fileToBase64()\nConvert to Base64"]
    C --> D{"MISTRAL_API_KEY\nConfigured?"}

    D -->|"Yes"| E["🥇 Mistral OCR\nModel: mistral-ocr-latest\nBest for handwriting & PDFs"]
    E -->|"Success"| OUT["✅ Extracted Text\nMarkdown formatted"]
    E -->|"Fails"| F["⚠️ Warning logged\nFallback triggered"]

    D -->|"No"| F
    F --> G["🥈 Gemini Vision OCR\nModel: gemini-2.5-flash\nTemperature: 0"]
    G -->|"Success"| OUT
    G -->|"Also fails"| FATAL["❌ 503 Error\nNo OCR provider available"]

    OUT --> NEXT["📝 answerText ready\nfor RAG + Grading"]

    style E fill:#1e40af,color:#dbeafe
    style G fill:#7c3aed,color:#ede9fe
    style OUT fill:#166534,color:#dcfce7
    style ERR fill:#991b1b,color:#fee2e2
    style FATAL fill:#991b1b,color:#fee2e2
```

**Key design choices:**
- Mistral OCR is prioritized — specifically designed for handwriting, returns structured Markdown
- Gemini Vision is the universal fallback — handles JPEG, PNG, WebP, and PDF up to 12 MB
- File type validation runs before OCR (`isSupportedScanMimeType`)
- All images are converted to Base64 (`fileToBase64`) before AI providers receive them

---

### 4.2 OMR Vision — Bubble Sheet Reading

**File:** `app/lib/ai-grading.ts` — `ocrOmrSheet()`

```mermaid
flowchart LR
    IMG["📸 OMR Sheet\nImage / PDF"] --> GV["Gemini Vision\ngemini-2.5-flash\nStrict JSON Schema"]

    GV --> JSON["Structured JSON Response"]

    subgraph JSON["📦 Gemini JSON Response"]
        A["answers: A, B, -, ?, D ..."]
        B["anomalies: Q3 double bubble"]
        C["notes: readability comment"]
    end

    JSON --> SCORE["Scoring Engine\nevaluation.ts"]

    subgraph SCORE["🎯 OMR Scoring Rules"]
        S1["✅ Correct → +4 marks"]
        S2["❌ Wrong → -1 mark\nnegative marking"]
        S3["⬜ Blank → 0 marks"]
        S4["⚠️ Anomaly → 0 marks\nflagged for review"]
    end

    SCORE --> RESULT["OmrResult\nscore / total / accuracy\nsubjectWise breakdown"]

    style GV fill:#7c3aed,color:#ede9fe
    style RESULT fill:#166534,color:#dcfce7
```

**What Gemini returns for each OMR sheet:**
```typescript
{
  answers: ["A", "B", "-", "?", "D", ...],  // A/B/C/D, "-" blank, "?" ambiguous
  anomalies: ["Q3 double bubble", "Q7 faint mark"],
  notes: "Sheet is moderately legible; Q3 and Q7 need manual review."
}
```

---

### 4.3 Chain-of-Thought Grading (CoT)

**File:** `app/lib/ai-grading.ts` — `gradeWithGemini()`

```mermaid
flowchart TD
    IN["📥 Input\nstudent info + answerText\n+ rubricContext"] --> PROMPT["Build CoT Prompt\nfor Gemini 2.5 Flash\n🌡️ Temperature = 0"]

    PROMPT --> COT

    subgraph COT["🧠 Chain-of-Thought — For EACH Rubric Point"]
        direction LR
        I["1️⃣ IDENTIFY\nWhat does rubric expect?\nformula / concept / taxonomy"] --> S["2️⃣ SEARCH\nScan student answer\nfor evidence"]
        S --> C["3️⃣ COMPARE\nFormula correctness?\nMethod complete?\nArithmetic right?"]
        C --> D["4️⃣ DECIDE\nAward marks"]
        D --> Q["5️⃣ QUOTE\nExtract EXACT sentence\nas evidenceQuote"]
    end

    D --> STATUS

    subgraph STATUS["🏷️ Status Decision"]
        E1["earned\nFull match → full marks"]
        E2["partial\nMethod right, execution wrong"]
        E3["review\nWeak evidence → faculty check"]
    end

    COT --> SCHEMA["Gemini JSON Schema\nEnforces typed output\nresponseMimeType: application/json"]

    SCHEMA --> OUT

    subgraph OUT["📋 Per-Rubric Output"]
        F1["rubricId · topic · expected"]
        F2["awarded · max · confidence 0-1"]
        F3["status: earned / partial / review"]
        F4["reasoning — full CoT text"]
        F5["evidenceQuote — exact student text"]
        F6["citationSource — rubric reference"]
    end

    OUT --> AGG["Aggregate Result\nscore · strengths · gaps\nrecommendations · summary"]

    style I fill:#1e3a5f,color:#bfdbfe
    style S fill:#1e3a5f,color:#bfdbfe
    style C fill:#1e3a5f,color:#bfdbfe
    style D fill:#1e3a5f,color:#bfdbfe
    style Q fill:#1e3a5f,color:#bfdbfe
    style E1 fill:#166534,color:#dcfce7
    style E2 fill:#854d0e,color:#fef9c3
    style E3 fill:#991b1b,color:#fee2e2
    style AGG fill:#4a1d96,color:#ede9fe
```

**Temperature = 0** — Deterministic, consistent grading across evaluations.

---

### 4.4 RAG — Retrieval-Augmented Generation

**File:** `app/lib/ai-grading.ts` — `retrieveRubricContext()` · `chunkRubric()`

```mermaid
flowchart TD
    RUB["📄 Full Rubric Text\npotentially very long"] --> CHECK{"rubric.length\n> 6000 chars?"}

    CHECK -->|"No — small rubric"| FULL["Pass entire rubric\nto Gemini directly\nretrievalStage = FULL_RUBRIC"]

    CHECK -->|"Yes — too large"| CHUNK["chunkRubric()\nSplit by paragraph breaks\nMax 1200 chars per chunk"]

    CHUNK --> HF_CHECK{"HF_TOKEN\nconfigured?"}

    HF_CHECK -->|"Yes"| EMBED["HuggingFace Embeddings\nsentence-transformers\nall-MiniLM-L6-v2"]

    subgraph EMBED["🔢 Semantic Embedding"]
        direction LR
        EA["Embed studentAnswer\n(first 1000 chars)"]
        EB["Embed each chunk\n(up to 20 chunks)"]
    end

    EMBED --> COS["Cosine Similarity\nchunk vs answer\nfor every chunk"]
    COS --> SORT["Sort by similarity score\nDescending"]
    SORT --> TOP["Top-6 most relevant\nrubric chunks\nretrievalStage = EMBED_RAG"]

    HF_CHECK -->|"No"| FB["First 6 chunks\nby position\n(positional fallback)"]

    FULL --> GEMINI["📤 Gemini receives\nfocused rubric context"]
    TOP --> GEMINI
    FB --> GEMINI

    style GEMINI fill:#4a1d96,color:#ede9fe
    style TOP fill:#166534,color:#dcfce7
    style FULL fill:#1e40af,color:#dbeafe
```

**Retrieval stage** is tracked in `retrievalTrace`:
- `"EMBED_RAG"` — semantic retrieval was used (HuggingFace available)
- `"FULL_RUBRIC"` — rubric small enough to pass entirely

---

### 4.5 Semantic Embeddings (HuggingFace)

**Files:** `app/lib/hfEmbeddings.ts` · `app/lib/hfAnalysis.ts`

```mermaid
flowchart LR
    subgraph PURPOSE1["🎯 Purpose 1 — RAG Retrieval"]
        direction TB
        P1A["Student Answer"] --> HFA["HF API\nall-MiniLM-L6-v2"]
        P1B["Rubric Chunks\n(up to 20)"] --> HFA
        HFA --> VEC["Embedding Vectors\n384-dimensional"]
        VEC --> COS2["Cosine Similarity\npure TypeScript"]
        COS2 --> RANK["Ranked Chunks\nTop-6 returned"]
    end

    subgraph PURPOSE2["📊 Purpose 2 — Analysis Narrative"]
        direction TB
        P2A["EvaluationResult\nstrengths + gaps\nrecommendations"] --> GEN["generateAnalysis()"]
        GEN --> NAR["Text narrative\nhfAnalysis field"]
    end

    subgraph MATH["📐 Cosine Similarity Math"]
        direction TB
        M1["dot = Σ a_i × b_i"]
        M2["similarity = dot / (|a| × |b|)"]
        M3["Range: 0.0 → 1.0\n1.0 = identical meaning"]
    end

    style HFA fill:#f59e0b,color:#1c1917
    style RANK fill:#166534,color:#dcfce7
    style NAR fill:#1e40af,color:#dbeafe
```

---

### 4.6 Local Fallback Engine

**File:** `app/lib/evaluation.ts` — `evaluateLocally()`

```mermaid
flowchart TD
    TRIGGER{"AI API Keys\nConfigured?"} -->|"No"| LOCAL["🔄 Local Fallback Engine\nevaluateLocally()"]
    TRIGGER -->|"Yes"| AI_PATH["AI Pipeline\n(Gemini + Mistral)"]

    LOCAL --> LINES["Split answerText\ninto lines"]
    LINES --> LOOP["For each Rubric Point"]

    subgraph LOOP["🔁 Per-Rubric Scoring"]
        direction LR
        L1["lexicalScore()\nExact keyword matching\nfrom rubric bank"] --> FUSE["Fuse scores"]
        L2["semanticTopicScore()\nTopic synonym matching\ne.g. lens→Ray optics"] --> FUSE
    end

    FUSE --> AWARD["Award marks\nbased on fused score"]
    AWARD --> CONF["confidence = 0.34 + score × 0.16"]

    CONF --> OMR_BUILD["Build OmrItems\nfrom student.omr array"]

    OMR_BUILD --> COMBINE["Combine scores\nDescriptive 70% + OMR 30%\n= Final score / 100"]

    COMBINE --> TRACE

    subgraph TRACE["📍 Retrieval Trace Labels"]
        T1["INGEST → lines normalized"]
        T2["BM25 → keyword matches"]
        T3["VECTOR → synonym matching"]
        T4["FUSION → scores merged"]
        T5["GUARDRAIL → marks clamped"]
    end

    COMBINE --> RES["EvaluationResult\nalways returned\neven without APIs"]

    style LOCAL fill:#1e40af,color:#dbeafe
    style RES fill:#166534,color:#dcfce7
    style TRIGGER fill:#4a1d96,color:#ede9fe
```

---

## 5. API Routes

### Route Map

```mermaid
graph LR
    CLIENT["🌐 Client"] --> MW["Clerk Middleware"]

    MW -->|"🔒 Protected"| E["/api/evaluate\nPOST\nMain AI pipeline"]
    MW -->|"🔒 Protected"| O["/api/ocr\nPOST\nOCR only"]
    MW -->|"🔒 Protected"| OMR["/api/omr\nPOST\nOMR grading"]
    MW -->|"🔒 Protected"| G["/api/grade\nGET\nFetch result"]
    MW -->|"🔒 Protected"| EV["/api/evaluations\nGET\nList all"]
    MW -->|"🔒 Protected"| GEM["/api/gemini\nPOST\nDirect Gemini"]
    CLIENT -->|"🌐 Public\nno auth"| R["/api/report\nGET\nPrintable HTML"]

    style E fill:#166534,color:#dcfce7
    style R fill:#1e40af,color:#dbeafe
    style MW fill:#4a1d96,color:#ede9fe
```

### `/api/evaluate` — Request Format (multipart/form-data)

| Field | Type | Description |
|---|---|---|
| `student` | JSON string | `{ name, roll, stream, subject, batch?, examType?, section? }` |
| `answerText` | string | Typed answer (optional if files uploaded) |
| `rubricText` | string | Marking rubric text |
| `answerFiles` | File[] | Handwritten sheets (JPEG/PNG/WebP/PDF, max 12MB each) |
| `criteriaFiles` | File[] | Rubric/criteria documents |

### `/api/evaluate` — Response Format

```typescript
{
  score: number,           // 0-100
  total: 100,
  confidence: number,      // 0.0-1.0
  stepGrades: StepGrade[], // Per-rubric-point breakdown
  citations: Citation[],   // Evidence quotes from student answer
  omr: {
    score, total,
    items: OmrItem[],      // Per-question result
    anomalies: string[]
  },
  strengths: string[],
  gaps: string[],
  recommendations: string[],
  retrievalTrace: { stage: string, detail: string }[],
  summary: string,
  hfAnalysis?: string,     // HuggingFace narrative (if available)
  savedId?: string,        // PostgreSQL record ID
  fileUrls?: string[],     // Supabase storage URLs
  warning?: string         // Present only if fallback was used
}
```

---

## 6. Database & Storage

### Database Schema

```mermaid
erDiagram
    EvaluationRecord {
        String id PK "UUID auto-generated"
        String studentName
        String studentRoll
        String stream "JEE or NEET"
        String subject
        String mode "descriptive default"
        Text answerText
        Text rubricText "nullable"
        Int score
        Int total
        Float confidence
        Json resultJson "full EvaluationResult"
        StringArray fileUrls "Supabase URLs"
        DateTime createdAt "auto now"
    }

    OmrRecord {
        String id PK "UUID auto-generated"
        Text answerKey
        Text responses
        Int score
        Int total
        Float accuracy
        Json resultJson
        StringArray fileUrls
        DateTime createdAt "auto now"
    }
```

### Storage Architecture

```mermaid
flowchart LR
    subgraph UPLOAD["📤 File Upload Flow"]
        FILE["File\nJPEG/PNG/PDF"] --> B64["Buffer.from\narrayBuffer"]
        B64 --> PATH["path = folder/timestamp-filename"]
        PATH --> SB["Supabase Storage\nbucket: prepforge-uploads"]
    end

    subgraph BUCKETS["🪣 Bucket Structure"]
        SB --> AS["answer-sheets/\nStudent answer sheets"]
        SB --> RB["rubrics/\nFaculty marking rubrics"]
    end

    subgraph SAVE["💾 After Upload"]
        AS --> URL["Public URL returned"]
        RB --> URL
        URL --> PG["Stored in fileUrls[]\nin PostgreSQL record"]
    end

    style SB fill:#1e40af,color:#dbeafe
    style PG fill:#166534,color:#dcfce7
```

---

## 7. Authentication

### Clerk Auth Flow

```mermaid
flowchart TD
    REQ["Incoming Request"] --> MW["Clerk Middleware\nmiddleware.ts"]

    MW --> CHECK{"Is Public Route?"}

    subgraph PUBLIC["🌐 Public Routes"]
        P1["/"]
        P2["/about/(.*)"]
        P3["/sign-in/(.*)"]
        P4["/sign-up/(.*)"]
        P5["/api/report/(.*)"]
    end

    CHECK -->|"Yes — public"| ALLOW["✅ Allow through\nno auth needed"]
    CHECK -->|"No — protected"| TOKEN{"Valid Clerk\nSession Token?"}

    TOKEN -->|"Valid"| SERVE["✅ Serve protected resource\n/evaluate, /home, /tools\n/api/evaluate, /api/ocr etc."]
    TOKEN -->|"Invalid / Missing"| REDIRECT["🔒 Redirect to /sign-in"]

    style ALLOW fill:#166534,color:#dcfce7
    style SERVE fill:#166534,color:#dcfce7
    style REDIRECT fill:#991b1b,color:#fee2e2
    style MW fill:#4a1d96,color:#ede9fe
```

---

## 8. Frontend & Animations

### Page Structure

```mermaid
graph TD
    ROOT["/\nLanding Page\nGSAP + Three.js Hero\n59 KB"] --> SIGNIN["/sign-in\nClerk Auth"]
    ROOT --> SIGNUP["/sign-up\nClerk Auth"]
    ROOT --> ABOUT["/about\nAbout Page"]

    SIGNIN --> HOME["/home\nDashboard\nPost-login"]
    SIGNUP --> HOME
    HOME --> EVAL["/evaluate\nMain Evaluation UI\nFile upload + results"]
    HOME --> TOOLS["/tools\nAdditional Tools"]

    style ROOT fill:#4a1d96,color:#ede9fe
    style HOME fill:#1e40af,color:#dbeafe
    style EVAL fill:#166534,color:#dcfce7
```

### Animation Stack

```mermaid
flowchart LR
    subgraph GSAP["🎬 GSAP — Landing Page"]
        G1["Timeline sequences"]
        G2["ScrollTrigger\nscroll-linked effects"]
        G3["Stagger animations\nfeature cards"]
        G4["Hero entrance\nsmooth reveals"]
    end

    subgraph FM["✨ Framer Motion — App-wide"]
        F1["Page transitions"]
        F2["Mount/unmount\nanimations"]
        F3["Hover & tap\ngesture responses"]
    end

    subgraph THREE["🌐 Three.js — 3D Canvas"]
        T1["3D mesh objects\nhero section"]
        T2["WebGL canvas"]
    end

    subgraph CSS["🎨 Design System — globals.css 18KB"]
        C1["Design tokens"]
        C2["Dark mode first"]
        C3["Glassmorphism cards"]
        C4["Indigo/purple gradients"]
        C5["Inter typography"]
    end

    style GSAP fill:#166534,color:#dcfce7
    style FM fill:#1e40af,color:#dbeafe
    style THREE fill:#7c2d12,color:#fed7aa
    style CSS fill:#4a1d96,color:#ede9fe
```

---

## 9. Important Highlights & Design Decisions

### Fallback Chain — System Never Fails

```mermaid
flowchart LR
    A["User uploads\nfile"] --> B{"Mistral\nOCR"}
    B -->|"✅ Success"| OUT["📝 Extracted Text"]
    B -->|"❌ Fail / No Key"| C{"Gemini\nVision OCR"}
    C -->|"✅ Success"| OUT
    C -->|"❌ Fail / No Key"| D["Local Lexical\nEngine\nevaluateLocally()"]
    D --> OUT2["📊 Local Result\nwith warning flag"]

    OUT --> GRADE{"Gemini\nCoT Grading"}
    GRADE -->|"✅ Success"| RESULT["🏆 AI Graded Result"]
    GRADE -->|"❌ Fail"| D
    D --> RESULT2["🏆 Fallback Result\nalways returned"]

    style RESULT fill:#166534,color:#dcfce7
    style RESULT2 fill:#854d0e,color:#fef9c3
    style D fill:#1e40af,color:#dbeafe
```

### Exponential Backoff + Timeout

```mermaid
sequenceDiagram
    participant CALLER as API Route
    participant RETRY as retryWithExponentialBackoff
    participant TIMEOUT as withTimeout(45s)
    participant GEMINI as Gemini API

    CALLER->>RETRY: Call AI function (retries=3)
    RETRY->>TIMEOUT: Wrap with 45s timeout
    TIMEOUT->>GEMINI: API Request

    alt Success
        GEMINI-->>TIMEOUT: Response
        TIMEOUT-->>RETRY: Resolved
        RETRY-->>CALLER: Result ✅
    else Timeout / 5xx Error
        GEMINI--xTIMEOUT: Timeout / Server Error
        TIMEOUT-->>RETRY: Error
        RETRY->>RETRY: Wait 1000ms (×2 each retry)
        RETRY->>TIMEOUT: Retry attempt 2
        TIMEOUT->>GEMINI: API Request
        GEMINI-->>TIMEOUT: Response
        RETRY-->>CALLER: Result ✅
    else 4xx Client Error (no retry)
        GEMINI--xTIMEOUT: 400/401/403
        TIMEOUT-->>RETRY: Client Error
        RETRY-->>CALLER: Throw immediately ❌
    end
```

### Evidence-Backed Grading

```mermaid
flowchart TD
    MARK["Award a Mark"] --> EVIDENCE{"evidenceQuote\npresent?"}
    EVIDENCE -->|"Yes — exact quote from student"| AWARD["✅ Mark Awarded\nFully auditable"]
    EVIDENCE -->|"No evidence found"| REVIEW["⚠️ status = review\nawarded = 0\nFlagged for faculty"]

    AWARD --> CONF["confidence score\n0.0 → 1.0"]
    REVIEW --> CONF

    CONF --> CLAMP["clamp(awarded, 0, max)\nMarks never exceed rubric max"]

    style AWARD fill:#166534,color:#dcfce7
    style REVIEW fill:#854d0e,color:#fef9c3
    style CLAMP fill:#1e40af,color:#dbeafe
```

### TypeScript Type Safety

```mermaid
flowchart LR
    subgraph TYPES["📐 Type System"]
        T1["Student\nname · roll · stream · subject"]
        T2["EvaluationResult\nscore · stepGrades · citations"]
        T3["StepGrade\nrubricId · awarded · confidence"]
        T4["OmrItem\nquestion · selected · correct · score"]
        T5["PrepForgeError\nkind · component · message"]
    end

    subgraph SCHEMA["🔷 Gemini Schema mirrors Types"]
        S1["aiGradingSchema\nSchemaType.OBJECT"]
        S2["omrVisionSchema\nSchemaType.OBJECT"]
    end

    TYPES -.->|"mirrors"| SCHEMA

    subgraph ERRORS["🛡️ Error Kinds"]
        E1["gemini_error"]
        E2["timeout"]
        E3["file_upload_error"]
        E4["invalid_response"]
        E5["parsing_error"]
        E6["evaluation_error"]
    end

    style TYPES fill:#1e40af,color:#dbeafe
    style SCHEMA fill:#4a1d96,color:#ede9fe
    style ERRORS fill:#991b1b,color:#fee2e2
```

---

## 10. Environment Variables

```env
# AI Providers
GEMINI_API_KEY=              # Google Gemini (get at aistudio.google.com/apikey)
GEMINI_MODEL=gemini-2.5-flash   # Model override
GEMINI_TIMEOUT_MS=45000      # Request timeout in ms
MISTRAL_API_KEY=             # Mistral (console.mistral.ai) -- primary OCR
HF_TOKEN=                    # HuggingFace -- RAG embeddings + analysis

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database (Supabase PostgreSQL)
DATABASE_URL=                # Pooled connection URL (runtime)
DIRECT_URL=                  # Direct connection URL (migrations)

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Minimum Config Required

```mermaid
graph LR
    subgraph REQUIRED["✅ Minimum to Run"]
        R1["GEMINI_API_KEY"]
        R2["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]
        R3["CLERK_SECRET_KEY"]
    end

    subgraph OPTIONAL["⚡ Optional — Adds Features"]
        O1["MISTRAL_API_KEY\nBetter handwriting OCR"]
        O2["HF_TOKEN\nSemantic RAG + analysis"]
        O3["DATABASE_URL + DIRECT_URL\nPersist evaluations"]
        O4["SUPABASE_* keys\nFile storage"]
    end

    subgraph WITHOUT["🔄 Without Optional Keys"]
        W1["No Mistral → Gemini Vision OCR"]
        W2["No HF → positional chunk retrieval"]
        W3["No DB → results not saved"]
        W4["No Supabase → no file URLs"]
    end

    OPTIONAL -->|"missing"| WITHOUT

    style REQUIRED fill:#166534,color:#dcfce7
    style OPTIONAL fill:#1e40af,color:#dbeafe
    style WITHOUT fill:#854d0e,color:#fef9c3
```

---

## 11. Project File Structure

```mermaid
graph TD
    ROOT["PrepForge/"]

    ROOT --> APP["app/"]
    ROOT --> PRISMA["prisma/schema.prisma\nDB models"]
    ROOT --> MW2["middleware.ts\nClerk auth"]
    ROOT --> PKG["package.json"]
    ROOT --> ENV[".env"]

    APP --> API["api/"]
    APP --> LIB["lib/"]
    APP --> COMP["components/"]
    APP --> PAGES["Pages"]
    APP --> CSS["globals.css\n18 KB design system"]
    APP --> LAY["layout.tsx\nClerk provider"]
    APP --> LAND["page.tsx\nLanding — 59 KB\nGSAP + Three.js"]

    API --> A1["evaluate/route.ts\nMain AI endpoint"]
    API --> A2["ocr/route.ts"]
    API --> A3["omr/route.ts"]
    API --> A4["grade/route.ts"]
    API --> A5["evaluations/route.ts"]
    API --> A6["report/route.ts\nPublic"]
    API --> A7["gemini/route.ts"]

    LIB --> L1["gemini.ts\nClient + retry + timeout"]
    LIB --> L2["mistralOCR.ts\nImages & PDFs"]
    LIB --> L3["hfEmbeddings.ts\nVectors + cosine sim"]
    LIB --> L4["hfAnalysis.ts\nNarrative generation"]
    LIB --> L5["ai-grading.ts\nFull AI pipeline"]
    LIB --> L6["evaluation.ts\nTypes + local fallback"]
    LIB --> L7["evaluation-store.ts\nPrisma CRUD"]
    LIB --> L8["reportGenerator.ts\nHTML report builder"]
    LIB --> L9["supabase.ts\nFile upload"]
    LIB --> L10["debug.ts\nPrepForgeError + utils"]

    PAGES --> PG1["evaluate/page.tsx"]
    PAGES --> PG2["home/page.tsx"]
    PAGES --> PG3["tools/page.tsx"]
    PAGES --> PG4["about/page.tsx"]
    PAGES --> PG5["sign-in/ sign-up/"]

    style A1 fill:#166534,color:#dcfce7
    style L5 fill:#4a1d96,color:#ede9fe
    style LAND fill:#7c2d12,color:#fed7aa
    style L1 fill:#1e40af,color:#dbeafe
```

---

## Summary

```mermaid
graph TB
    subgraph CORE["🏗️ Core Platform"]
        C1["Next.js 16 App Router\nFull-stack TypeScript"]
        C2["React 19 + Tailwind v4\nPremium UI"]
    end

    subgraph AI_SUM["🤖 AI Engine"]
        A1["Gemini 2.5 Flash\nCoT Grading + OMR Vision"]
        A2["Mistral OCR Latest\nHandwriting + PDFs"]
        A3["HuggingFace MiniLM\nSemantic RAG"]
    end

    subgraph DATA_SUM["🗄️ Data Layer"]
        D1["Clerk\nAuthentication"]
        D2["Supabase PostgreSQL\nPersistence"]
        D3["Supabase Storage\nFile Management"]
    end

    subgraph DESIGN["✨ Design Principles"]
        P1["Auditability\nevery mark has evidence quote"]
        P2["Reliability\nmulti-provider fallback chain"]
        P3["Academic Accuracy\nJEE/NEET-aware CoT + schemas"]
        P4["Always Functional\nlocal engine without APIs"]
    end

    CORE --> AI_SUM
    AI_SUM --> DATA_SUM
    CORE --> DESIGN

    style CORE fill:#1e3a5f,color:#bfdbfe
    style AI_SUM fill:#4a1d96,color:#ede9fe
    style DATA_SUM fill:#166534,color:#dcfce7
    style DESIGN fill:#7c2d12,color:#fed7aa
```

---


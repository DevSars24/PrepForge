# PrepForge: System Design & Architecture

> **Intelligent evaluation and assessment engine for Indian competitive and board exams (Boards, JEE & NEET)**
>
> Next.js App Router · Multi-model AI routing · Deterministic math guardrails · Zero-shot classification

---

## Table of Contents

1. [Executive Summary & Core Objectives](#1-executive-summary--core-objectives)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [End-to-End Request Lifecycle](#3-end-to-end-request-lifecycle)
4. [Multi-Model AI Routing & Fallback Topology](#4-multi-model-ai-routing--fallback-topology)
5. [Latency Profiling & Performance SLAs](#5-latency-profiling--performance-slas)
6. [Deterministic Math Engine & Guardrails](#6-deterministic-math-engine--guardrails)
7. [Full-Paper Evaluation Pipeline (Q1 to End)](#7-full-paper-evaluation-pipeline-q1-to-end)
8. [Multi-Stream Syllabus Specialization](#8-multi-stream-syllabus-specialization)
9. [Data Architecture & Persistence Strategy](#9-data-architecture--persistence-strategy)
10. [Engineering Trade-offs & Design Rationales](#10-engineering-trade-offs--design-rationales)
11. [Failure Modes & Graceful Degradation](#11-failure-modes--graceful-degradation)
12. [Security, Authentication & Data Isolation](#12-security-authentication--data-isolation)

---

## 1. Executive Summary & Core Objectives

### The Problem

Indian high-stakes examinations (**CBSE/State Boards, JEE Main/Advanced, NEET-UG**) assess students through a mix of **1-mark objective questions (Section A MCQs)** and **rigorous multi-step descriptive derivations (Sections B, C, D and E)**.

Generic LLM grading suffers from four recurring failures:

1. **Math hallucinations and arithmetic errors.** LLMs often declare a correct derivation wrong because of tokenization artifacts.
2. **False deductions.** Marks are deducted for "calculation errors" even when the student's numbers and units match the answer key.
3. **Question skips.** Early MCQs (Q1–Q16) are skipped and grading jumps straight to the large subjective questions.
4. **Latency bottlenecks.** Full-page multimodal vision evaluation often takes 25–40 seconds per student, which breaks real-time teacher workflows.

### PrepForge's Solution

PrepForge is a specialized evaluation engine that combines:

- **Fast multi-model AI routing:** Groq Llama-3.3-70B as primary, Gemini 2.5 Flash as fallback.
- **Deterministic math verification:** Math.js with a 2% tolerance.
- **Quote-grounded guardrails:** every cited quote must exist in the student's transcript.

It grades the entire paper sequentially from Question 1 onwards, sanitizes OCR noise, enforces strict deduction proofs, and supports manual faculty overrides.

---

## 2. High-Level System Architecture

The diagram below shows the main system components and their boundaries.

```mermaid
graph TB
    subgraph Client_Layer ["Client Tier (Browser / React 19)"]
        UI["PrepForge Frontend (Next.js 16)"]
        Upload["File Uploader (Images / PDF / Scans)"]
        OCR_Clean["Smart OCR Sanitizer & Paste Interceptor"]
        ResultUI["Descriptive Result Cards & Dual-Pane View"]
        ConfigModal["Student Configurator (Boards / JEE / NEET)"]
    end

    subgraph Edge_Gateway ["Edge & Gateway Tier"]
        Middleware["Next.js Proxy Middleware (Clerk Auth)"]
        APIRoute["/api/evaluate (Multipart Form Parser)"]
        OMRRoute["/api/omr (Bubble Sheet Engine)"]
        PatchRoute["/api/evaluations (Teacher Overrides)"]
    end

    subgraph Core_Services ["Application Core Services"]
        OCR_Router["Multi-Provider OCR Pipeline"]
        RAG_Engine["Hybrid RAG Retriever (BM25 + HF Embeddings)"]
        AI_Router["Multi-Model Inference Router"]
        Guardrails["Deterministic Guardrail & Math Verifier"]
        HF_Classifier["HF Zero-Shot Domain Classifier"]
    end

    subgraph AI_Providers ["External AI & Inference Tier"]
        Groq["Groq Cloud (Llama-3.3-70b-versatile)<br/>~400 tokens/sec"]
        Gemini["Google Gemini (gemini-2.5-flash)<br/>Vision OCR & Schema Fallback"]
        Mistral["Mistral OCR / Marker Engine<br/>Document Layout Parser"]
        HF["Hugging Face Inference API<br/>BAAI/bge-small + BART MNLI"]
    end

    subgraph Data_Tier ["Data & Storage Layer"]
        PrismaORM["Prisma ORM Client"]
        Postgres[("Supabase PostgreSQL / SQLite Local")]
        S3Bucket[("Supabase Storage / Answer Sheet Scans")]
    end

    UI --> Middleware --> APIRoute
    Upload --> APIRoute
    APIRoute --> OCR_Router
    OCR_Router --> Mistral
    OCR_Router --> Gemini
    APIRoute --> RAG_Engine --> HF
    APIRoute --> AI_Router
    AI_Router --> Groq
    AI_Router --> Gemini
    AI_Router --> Guardrails
    Guardrails --> APIRoute
    APIRoute --> HF_Classifier --> HF
    APIRoute --> PrismaORM --> Postgres
    APIRoute --> S3Bucket
    APIRoute --> ResultUI
```

---

## 3. End-to-End Request Lifecycle

When a teacher submits student sheets or typed transcripts, the system runs an automated multi-stage pipeline.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Faculty / Teacher
    participant UI as PrepForge UI (Client)
    participant API as /api/evaluate Route
    participant OCR as OCR Pipeline
    participant RAG as Hybrid Rubric RAG
    participant Router as AI Model Router
    participant Guard as Math & Deduction Guardrails
    participant Classifier as HF Subject Classifier
    participant DB as Persistence (DB + Storage)

    Teacher->>UI: Upload scans or paste answer sheet, set stream (Boards/JEE/NEET)
    UI->>UI: cleanTranscriptText() normalizes math, arrows, strips table borders
    UI->>API: POST /api/evaluate (FormData: files, rubric, student metadata)

    opt Scans uploaded (PDF / Image)
        API->>OCR: ocrAnswerSheets()
        Note over OCR: Marker Engine, then Mistral OCR, then Gemini Vision fallback
        OCR-->>API: Transcribed text (sanitized plain Unicode)
    end

    API->>RAG: retrieveRubricContext(answerText, rubricText)
    Note over RAG: If rubric > 6000 chars, retrieve top-6 chunks via HF embeddings
    RAG-->>API: Focused rubric criteria

    API->>Router: executeGradingCall(CoT structured prompt)
    activate Router
    Router->>Router: Try primary: Groq Llama-3.3-70B
    alt Groq success
        Router-->>API: Raw JSON grading
    else Groq rate limit or error
        Router->>Router: Fallback: Google Gemini 2.5 Flash
        Router-->>API: Raw JSON grading
    end
    deactivate Router

    API->>Guard: applyGuardrailsToGradingResponse()
    Note over Guard: 1. Sanitize math to Unicode<br/>2. Math.js evaluate() with 2% tolerance<br/>3. Filter false deductions (isFalseDeductionError)<br/>4. Ground citations in student transcript
    Guard-->>API: Verified, guardrailed grading object

    par Domain classification & counselor insight
        API->>Classifier: classifySubjectDomain(text, stream)
        Classifier-->>API: Domain, confidence, difficulty
    and Storage persistence
        API->>DB: saveEvaluationRecord() (Prisma + Supabase)
        DB-->>API: Record ID
    end

    API-->>UI: 200 OK with full result payload
    UI->>Teacher: Render interactive cards, dual-pane compare, section filters
```

---

## 4. Multi-Model AI Routing & Fallback Topology

PrepForge does not rely on a single model. Academic grading needs both **sub-second-class inference speed** and **reliable JSON schema adherence**, so a hierarchical multi-model router is used.

```mermaid
flowchart TD
    Start["Incoming Grading Request"] --> OCRCheck{"Are files images / PDFs?"}

    OCRCheck -- Yes --> OCR1["Marker Document Engine"]
    OCR1 -- Failure --> OCR2["Mistral OCR API"]
    OCR2 -- Failure --> OCR3["Gemini 2.5 Flash Vision"]
    OCR3 --> OCRSanitize["cleanTranscriptText()<br/>Unicode Normalization"]
    OCR1 -- Success --> OCRSanitize
    OCR2 -- Success --> OCRSanitize
    OCRCheck -- No --> TextDirect["Direct Student Text"]

    OCRSanitize --> PromptBuilder["buildGradingPrompt()<br/>Q1 to End, CoT, Unicode Math"]
    TextDirect --> PromptBuilder

    PromptBuilder --> PrimaryInference{"Groq API key configured?"}
    PrimaryInference -- Yes --> CallGroq["Groq Cloud: Llama-3.3-70b-versatile<br/>~380-450 tokens/sec"]
    PrimaryInference -- No --> GeminiFallback
    CallGroq -- Success --> ValidateJSON{"Zod schema &<br/>deduction check"}
    CallGroq -- "Error / Rate limit" --> GeminiFallback["Gemini 2.5 Flash<br/>(Structured JSON Schema)"]

    GeminiFallback -- Success --> ValidateJSON
    GeminiFallback -- Error --> DeterministicFallback["Deterministic Local Rule Engine<br/>(BM25 Lexical + Rubric Bank)"]

    ValidateJSON -- "Schema invalid / vague errors" --> RetryPrompt["One-shot retry with<br/>targeted error feedback"]
    RetryPrompt --> CallGroq
    ValidateJSON -- Valid --> GuardrailEngine["Math.js & False Deduction Verifier"]
    DeterministicFallback --> GuardrailEngine
    GuardrailEngine --> OutputReady["Structured EvaluationResult ready"]
```

### Provider Responsibilities

| Role | Primary | Fallback 1 | Fallback 2 | Why this choice |
| :--- | :--- | :--- | :--- | :--- |
| **Document OCR** | Marker Engine (local / Datalab) | Mistral OCR | Gemini 2.5 Flash Vision | Marker preserves tables and math; Mistral specializes in handwriting; Gemini handles complex rotations. |
| **Grading inference** | Groq (Llama-3.3-70B) | Gemini 2.5 Flash | Deterministic local engine | Groq produces a complete 30-question grading JSON in under 2.5 s; Gemini guarantees strict schema typing. |
| **Embeddings & RAG** | HF `bge-small-en-v1.5` | Lexical BM25 chunking | Full-context ingest | 384-dim embeddings run in ~120 ms; BM25 guarantees keyword matches for laws (e.g. Kirchhoff, Snell). |
| **Classification** | HF `bart-large-mnli` | Groq prompt | Deterministic map | Zero-shot NLI maps mixed Physics/Chemistry content without manual prompt drift. |

---

## 5. Latency Profiling & Performance SLAs

Latency is a primary constraint for institutional adoption. Waiting 30 seconds after uploading a test sheet breaks the faculty workflow, so every stage is optimized.

```mermaid
gantt
    title Typical end-to-end evaluation latency (P50 path, milliseconds)
    dateFormat x
    axisFormat %S.%L s

    section OCR (if scans uploaded)
    Marker / Mistral OCR (1.8 s)          :active, ocr, 0, 1800

    section Sanitization and RAG
    cleanTranscriptText (12 ms)           :active, clean, 1800, 1812
    HF embedding retrieval (180 ms)       :active, rag, 1812, 1992

    section Structured grading
    Groq Llama-3.3-70B (2.1 s)            :active, groq, 1992, 4092
    Gemini fallback path (3.8 s)          :crit, gem, 1992, 5792

    section Guardrails
    Math.js tolerance check (35 ms)       :active, math, 4092, 4127
    Deduction proof verifier (20 ms)      :active, ded, 4127, 4147

    section Parallel classification and storage
    HF domain classification (280 ms)     :active, cls, 4147, 4427
    Supabase storage and DB write (150 ms) :active, db, 4147, 4297
```

### Quantitative Latency Breakdown

| Sub-system | P50 | P95 | Cold start | Optimization technique |
| :--- | ---: | ---: | ---: | :--- |
| **OCR (Marker / Mistral)** | 1,800 ms | 4,200 ms | ~500 ms | Base64 streaming, direct PDF buffer parsing, image compression |
| **Text sanitizer (`cleanTranscriptText`)** | 12 ms | 25 ms | 0 ms | Synchronous regex pipeline, single-pass string transforms |
| **RAG embeddings (`hfEmbeddings`)** | 180 ms | 450 ms | ~1,200 ms | Top-6 chunk cosine pruning; bypassed if rubric < 6,000 characters |
| **Grading (Groq Llama-3.3-70B)** | 2,100 ms | 3,400 ms | 0 ms | LPUs deliver ~400 tok/s; structured system prompts avoid CoT bloat |
| **Grading fallback (Gemini Flash)** | 3,800 ms | 6,800 ms | ~400 ms | Native SDK schema constraint (`responseSchema: structuredGradingGeminiSchema`) |
| **Math guardrail (`verifyNumeric`)** | 35 ms | 60 ms | 0 ms | In-process `mathjs` AST evaluation with 2% tolerance |
| **Persistence (Supabase / Prisma)** | 150 ms | 380 ms | ~200 ms | Parallel `Promise.all` alongside classification |
| **Total turnaround (text)** | **~2.5 s** | **~4.2 s** | n/a | Real-time response for live teacher grading |
| **Total turnaround (full scan)** | **~4.3 s** | **~8.5 s** | n/a | Complete grading of an entire handwritten sheet |

---

## 6. Deterministic Math Engine & Guardrails

LLMs excel at linguistic reasoning but are prone to floating-point and algebraic mistakes. PrepForge applies a **deterministic verification layer** on top of every model output.

```mermaid
flowchart LR
    LLM_Output["Raw LLM output<br/>(marks_awarded, errors, student_final_answer)"] --> Sanitizer["Unicode Math Sanitizer<br/>(LaTeX to Unicode)"]
    Sanitizer --> ASTParser["Math.js Expression Parser<br/>(Unit & Symbol Normalizer)"]

    ASTParser --> ValueCheck{"Numeric answer within<br/>2% of expected?"}

    ValueCheck -- "Yes (numerically correct)" --> BlockCalcErr["Block any 'calculation error' deductions"]
    BlockCalcErr --> RestoreMarks["Restore full calculation marks<br/>in rubric_breakdown"]
    RestoreMarks --> UnitGuard{"Unit correct?<br/>(e.g. photons/s)"}
    UnitGuard -- Yes --> FullMarks["Award 100% marks<br/>(needs_review = false)"]
    UnitGuard -- "No / missing" --> CapDeduction["Cap unit deduction<br/>at max 0.5 mark"]

    ValueCheck -- "No (different value)" --> FalseDeductionFilter{"isFalseDeductionError<br/>(student, expected)"}
    FalseDeductionFilter -- "student wrote == expected" --> DropError["Drop step from errors[]<br/>(prevents false callouts)"]
    FalseDeductionFilter -- "Real discrepancy" --> ValidDeduction["Keep error record in<br/>deduction breakdown"]

    DropError --> CitationCheck["Verify quote grounding<br/>in student transcript"]
    ValidDeduction --> CitationCheck
    CapDeduction --> CitationCheck
    FullMarks --> CitationCheck
```

### Key Guardrail Invariants

**1. The 2% arithmetic rule (`isWithinTolerance`)**

$$
\frac{\lvert \text{actual} - \text{expected} \rvert}{\max\left(\lvert \text{expected} \rvert,\ 10^{-15}\right)} \le 0.02
$$

If this holds, the AI is barred from claiming the student miscalculated.

**2. False-deduction elimination (`isFalseDeductionError`)**

A deduction item is dropped from `errors[]` when either condition holds:

$$
\text{normalize}(S_{\text{student}}) = \text{normalize}(S_{\text{expected}})
$$

$$
\lvert V_{\text{student}} - V_{\text{expected}} \rvert \le 0.02 \cdot V_{\text{expected}}
$$

Correct student work never appears inside a red deduction box.

**3. Capped unit penalty**

If the numerical value is correct but the unit is omitted (for example `1.01 × 10⁴` written without `photons/s`), the system enforces a maximum deduction of **0.5 marks**, preventing catastrophic mark drops.

**4. Quote grounding (`isQuoteGrounded`)**

Every quotation cited by the AI is matched against the raw OCR transcript using 3-word sliding n-grams. If a citation is hallucinated, it is pruned and the question's confidence score is reduced by **0.15**.

---

## 7. Full-Paper Evaluation Pipeline (Q1 to End)

Indian examinations require handling the full set of questions sequentially.

```mermaid
graph TD
    Paper["Complete Student Paper Upload"] --> Parser["Question Boundary & Section Segmenter"]

    Parser --> SecA["Section A: Objective & MCQs<br/>(Q1 to Q16)"]
    Parser --> SecB["Section B: Short Answer<br/>(Q17 to Q21, 2 marks)"]
    Parser --> SecC["Section C: Numerical & Analytical<br/>(Q22 to Q28, 3 marks)"]
    Parser --> SecD["Section D: Case-Based Derivations<br/>(Q29 to Q30, 4 marks)"]
    Parser --> SecE["Section E: Long Structured Proofs<br/>(Q31 to Q33, 5 marks)"]

    subgraph SecA_Logic ["Section A Processing"]
        SecA --> MCQCmp["Compare selected option with answer key<br/>e.g. (B) spherical surfaces"]
        MCQCmp -- Match --> Award1["marks_awarded: 1<br/>met: true"]
        MCQCmp -- Mismatch --> Award0["marks_awarded: 0<br/>error: Expected (D), wrote (B)"]
    end

    subgraph Descriptive_Logic ["Sections B-E Processing"]
        SecB --> StepParser["Multi-criterion breakdown"]
        SecC --> StepParser
        SecD --> StepParser
        SecE --> StepParser
        StepParser --> Step1["1. Formula / governing law<br/>e.g. Kirchhoff loop rule"]
        StepParser --> Step2["2. Intermediate substitution & values<br/>e.g. i1, i2"]
        StepParser --> Step3["3. Final answer with proper units<br/>e.g. 0.625 A"]
    end

    Award1 --> Aggregator["Summary Aggregator & Section Score Matrix"]
    Award0 --> Aggregator
    Step1 --> Aggregator
    Step2 --> Aggregator
    Step3 --> Aggregator
    Aggregator --> OutputCards["Section-filtered descriptive result cards"]
```

---

## 8. Multi-Stream Syllabus Specialization

PrepForge configures its domain context according to the student's academic stream.

```mermaid
flowchart LR
    Stream{{"Student Stream"}}
    Stream --> Boards["Boards<br/>CBSE & State Intermediate"]
    Stream --> JEE["JEE<br/>Main & Advanced"]
    Stream --> NEET["NEET<br/>NEET-UG Medical Entrance"]
```

| Stream | Curriculum | Format emphasis | Domain labels | Section rule |
| :--- | :--- | :--- | :--- | :--- |
| **Boards** | CBSE & State Intermediate | Detailed theory, diagrams, standard units | Current Electricity, Optics, Vectors, Organic | Mandatory step marking, definition citations |
| **JEE** | JEE Main & JEE Advanced | Multi-concept physics, advanced calculus, physical chemistry | Mechanics, Electromagnetism, Calculus, Kinetics | 2% tolerance on multi-step arithmetic, vector signs |
| **NEET** | NEET-UG Medical Entrance | NCERT factual accuracy, biological nomenclature, units | Physiology, Genetics, Ecology, Physical Optics | Zero tolerance on incorrect bio-terms, standard half-life |

---

## 9. Data Architecture & Persistence Strategy

The system uses a dual-tier persistence model: **PostgreSQL (via Prisma ORM)** for production and **local SQLite / in-memory fallback** for zero-dependency offline mode.

```mermaid
erDiagram
    EvaluationRecord {
        string id PK
        string userId
        string studentName
        string rollNumber
        string stream "Boards, JEE or NEET"
        string subject
        int score "0 to 100"
        float confidence "0.0 to 1.0"
        json resultJson "Full EvaluationResult object"
        datetime createdAt
        datetime updatedAt
    }

    TeacherOverride {
        string id PK
        string evaluationId FK
        string questionNo
        float originalMarks
        float newMarks
        string teacherName
        string reason
        datetime overriddenAt
    }

    AuditLog {
        string id PK
        string evaluationId FK
        string action "CREATED, OVERRIDDEN or REPORT_EXPORTED"
        string actorEmail
        datetime timestamp
    }

    EvaluationRecord ||--o{ TeacherOverride : "has overrides"
    EvaluationRecord ||--o{ AuditLog : "tracks audit trail"
```

---

## 10. Engineering Trade-offs & Design Rationales

Each major architectural choice is grounded in an explicit trade-off.

| Component | Choice made | Alternative considered | Trade-off / rationale |
| :--- | :--- | :--- | :--- |
| **AI inference** | Groq Llama-3.3-70B as primary | Gemini-only or GPT-4o | **Latency vs tooling.** GPT-4o takes 8–14 s for 30 questions; Groq takes ~2.1 s (~400 tok/s). We give up native multimodal vision in primary inference for an order-of-magnitude speedup, and isolate OCR into a dedicated first stage. |
| **Math representation** | Plain-text Unicode (`×`, `÷`, `·`, `→`, `10⁴`) | LaTeX (`\frac`, `\times`, `$...$`) | **Robustness vs typesetting.** Raw LaTeX is easily corrupted inside JSON strings (`\times` becomes a tab plus `imes`, `\frac` becomes a form-feed plus `rac`). Unicode survives every database, JSON parser and clipboard. |
| **Arithmetic verification** | Math.js AST + 2% tolerance | LLM self-consistency voting | **Determinism vs API cost.** Three parallel LLM checks triple API cost and quadruple latency. `math.evaluate()` in Node.js takes ~35 ms and gives deterministic results. |
| **Rubric ingestion** | Hybrid RAG (embed only if rubric > 6k chars) | Always embed / vector DB | **Simplicity vs scale.** About 90% of rubrics fit within 4,000 characters. Sending the full rubric into Llama-3.3's 128k context removes retrieval misses at negligible latency cost. |
| **State management** | React state + server-action sync | Redux Toolkit / Zustand | **Zero overhead.** The grading workflow is mostly transactional; local React state with optimistic updates and background REST persistence gives the smallest bundle. |

---

## 11. Failure Modes & Graceful Degradation

PrepForge degrades gracefully across several layers.

```mermaid
stateDiagram-v2
    [*] --> CheckKeys: Request received

    CheckKeys --> RunGroq: GROQ_API_KEY present
    CheckKeys --> RunGemini: Only GEMINI_API_KEY present
    CheckKeys --> OfflineMode: No AI keys in .env

    RunGroq --> Guardrails: 200 OK
    RunGroq --> RunGemini: 429 rate limit or timeout

    RunGemini --> Guardrails: 200 OK
    RunGemini --> OfflineMode: 503 or quota exceeded

    OfflineMode --> Output: Synthetic rubric evaluation with Offline Mode banner
    Guardrails --> Output: Apply math and false-deduction guards, render dashboard
    Output --> [*]
```

1. **Zero-key offline mode.** With no API keys configured, PrepForge boots the deterministic keyword and syllabus-node rule engine and scores answers locally, so teachers are never blocked.
2. **OCR failure mode.** If Marker or Mistral fails (for example on corrupt file headers), the request transparently falls back to Gemini Vision base64 chunk processing.
3. **Structured schema repair.** If a model returns malformed JSON, a targeted one-shot retry passes the exact schema-failure trace back to the model for correction.

---

## 12. Security, Authentication & Data Isolation

1. **Clerk JWT authentication.** All `/evaluate`, `/api/*` and history endpoints are protected by `@clerk/nextjs` middleware, with automatic redirects to `/sign-in`.
2. **Tenant and student isolation.** Evaluation records in PostgreSQL and SQLite are indexed by `userId`. Faculty can only view, patch or delete evaluations created within their own authorized session.
3. **Third-party inference data handling.** Answer text sent to Groq and Gemini should be covered by ephemeral inference with prompt-data retention disabled, where enterprise tiers support it.
4. **File type enforcement.** The upload gateway permits only `image/jpeg`, `image/png`, `image/webp` and `application/pdf`, up to 5 MB, and rejects executable or unverified MIME types before anything is written to disk.

---

*Authored by the PrepForge Engineering Core Team. Designed for high-concurrency educational institution deployments.*

<div align="center">

```
██████╗ ██████╗ ███████╗██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██████╔╝██████╔╝█████╗  ██████╔╝█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██╔═══╝ ██╔══██╗██╔══╝  ██╔═══╝ ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██║     ██║  ██║███████╗██║     ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

### AI-Powered Faculty Evaluation Suite

**Automated grading platform for JEE & NEET descriptive exams and OMR sheets**

[![Next.js](https://img.shields.io/badge/Next.js_15+-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini_1.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [AI Pipeline Deep Dive](#-ai-pipeline-deep-dive)
- [Feature Walkthrough](#-feature-walkthrough)
- [Database Schema & Data Flow](#-database-schema--data-flow)
- [Project File Structure](#-project-file-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Offline Fallback System](#-offline-fallback-system)

---

## 🎯 Overview

Manually checking JEE/NEET descriptive papers, applying correct marking rubrics, and scanning OMR sheets for anomalies is **extremely time-consuming and inconsistent** for faculty.

**PrepForge makes this entire process 90% faster and fully digital.**

| Problem | PrepForge Solution |
|---|---|
| Manual rubric application is error-prone | AI matches answers to exact rubric chunks via semantic similarity |
| Evaluator bias in scoring | Every mark backed by an exact student quote as evidence |
| OMR scanning requires specialized hardware | Vision AI reads OMR images directly from a phone photo |
| No analytics on student performance | Auto-generated strength/gap profiles with NCERT revision plans |
| Internet/API failures halt grading | Offline regex-based fallback evaluator built in |

---

## 🏗️ System Architecture

### High-Level System Design

```mermaid
graph TB
    subgraph CLIENT["🖥️ Client Layer — Next.js 15+ App Router"]
        UI_HOME["🏠 Home Page<br/>(app/home/page.tsx)"]
        UI_WELCOME["👋 Welcome Page<br/>(app/welcome/)"]
        UI_TOOLS["🛠️ Tools Console<br/>(app/tools/)"]
        UI_LIB["📚 Shared Library<br/>(app/lib/)"]
    end

    subgraph API["⚡ API Layer — Next.js Route Handlers"]
        API_EVAL["POST /api/evaluate<br/>Descriptive Grading"]
        API_OMR["POST /api/omr<br/>OMR Sheet Processing"]
        API_EMBED["POST /api/embed<br/>Vector Embedding Pipeline"]
        API_REPORT["GET /api/report<br/>PDF/HTML Report Generation"]
    end

    subgraph AI["🧠 AI Engine Layer"]
        GEMINI_VISION["👁️ gemini-1.5-flash<br/>Vision + OCR + Evaluation"]
        EMBED_MODEL["📐 text-embedding-004<br/>768-dim Vector Embeddings"]
        LOCAL_EVAL["🔧 Local Evaluator<br/>Regex + Synonym Fallback"]
    end

    subgraph DB["🗄️ Data Layer"]
        SUPABASE_DB["🐘 PostgreSQL<br/>(Supabase hosted)"]
        SUPABASE_STORAGE["📦 Supabase Storage<br/>Answer Sheet Images"]
        LOCAL_DB["💾 dev.db<br/>Local SQLite (offline)"]
        PRISMA["🔷 Prisma ORM<br/>(schema.prisma)"]
    end

    CLIENT --> API
    API --> AI
    AI --> DB
    PRISMA --> SUPABASE_DB
    PRISMA --> LOCAL_DB
    GEMINI_VISION -->|"API Down?"| LOCAL_EVAL
```

---

### Request Lifecycle — Descriptive Evaluation

```mermaid
sequenceDiagram
    participant F as 🧑‍🏫 Faculty
    participant UI as Next.js UI<br/>(app/tools/)
    participant API as API Route<br/>(/api/evaluate)
    participant STORE as Supabase Storage
    participant EMB as Embedding Service<br/>(text-embedding-004)
    participant GEM as Gemini 1.5 Flash
    participant DB as PostgreSQL<br/>(via Prisma)

    F->>UI: Upload answer sheet image + rubric
    UI->>STORE: Store image securely
    STORE-->>UI: Return image URL
    UI->>API: POST { imageUrl, rubric, studentId }

    API->>EMB: Embed student answer text
    API->>EMB: Embed rubric chunks (split into segments)
    EMB-->>API: 768-dim vectors for each

    API->>API: Cosine similarity → select Top-6 rubric chunks

    API->>GEM: Send image + top-6 rubric chunks
    Note over GEM: responseMimeType: "application/json"
    GEM-->>API: Structured JSON { stepBreakdown, evidenceQuotes, confidenceScore }

    API->>DB: Save evaluation record (Prisma)
    API-->>UI: Return full evaluation result
    UI-->>F: Display step-by-step marks + evidence
```

---

### Request Lifecycle — OMR Sheet Processing

```mermaid
sequenceDiagram
    participant F as 🧑‍🏫 Faculty
    participant UI as OMR Console
    participant API as /api/omr
    participant GEM as Gemini Vision
    participant DB as PostgreSQL

    F->>UI: Upload OMR bubble sheet photo
    UI->>API: POST { omrImageUrl, answerKey, markingScheme }

    API->>GEM: Analyze OMR image with vision model
    GEM-->>API: { bubbleMap, anomalies[], ambiguousMarks[] }

    API->>API: Apply marking formula<br/>correct×(+4) + wrong×(-1) + blank×(0)

    Note over API: Flag anomalies:<br/>• Double-filled bubbles<br/>• Faint/ambiguous marks<br/>• Missing roll number

    API->>DB: Save OMR result
    API-->>UI: Score + anomaly report
    UI-->>F: Display result + flagged cells
```

---

## 🧠 AI Pipeline Deep Dive

### RAG (Retrieval-Augmented Generation) Pipeline

```mermaid
flowchart LR
    subgraph INPUT["📥 Inputs"]
        ANS["Student Answer\n(text / image)"]
        RUB["Full Marking Rubric\n(can be very long)"]
    end

    subgraph CHUNK["✂️ Chunking"]
        SPLIT["Split rubric into\nsmall topic chunks"]
    end

    subgraph EMBED["📐 Embedding — text-embedding-004"]
        EA["Embed\nAnswer → Vector A\n(768 dimensions)"]
        EB["Embed each\nRubric Chunk → Vector B₁...Bₙ\n(768 dimensions each)"]
    end

    subgraph MATCH["🔍 Cosine Similarity Match"]
        COS["Similarity = (A·B) / (‖A‖ × ‖B‖)\nCompute for all chunks"]
        TOP6["Select Top-6\nmost relevant chunks"]
    end

    subgraph EVAL["🤖 Gemini Evaluation"]
        PROMPT["Build focused prompt:\nAnswer + Top-6 Rubric Chunks"]
        JSON["Generate structured JSON\n(responseMimeType: application/json)"]
    end

    subgraph OUT["📤 Output"]
        STEPS["Step-by-step marks\n(awarded vs max)"]
        QUOTES["Evidence quotes\nfrom student answer"]
        CONF["Confidence score\n(0.0 – 1.0)"]
    end

    ANS --> EA
    RUB --> SPLIT --> EB
    EA --> COS
    EB --> COS
    COS --> TOP6 --> PROMPT
    ANS --> PROMPT
    PROMPT --> JSON
    JSON --> STEPS
    JSON --> QUOTES
    JSON --> CONF
```

---

### AI Evaluation JSON Contract

```mermaid
classDiagram
    class EvaluationResult {
        +StepBreakdown[] stepBreakdown
        +number totalAwarded
        +number totalMax
        +number confidenceScore
        +string feedback
        +StudentProfile studentProfile
    }

    class StepBreakdown {
        +string step
        +number maxMarks
        +number awardedMarks
        +string evidenceQuote
        +string reasoning
    }

    class StudentProfile {
        +string[] strengths
        +string[] weakAreas
        +RevisionPlan revisionPlan
    }

    class RevisionPlan {
        +string[] ncertChapters
        +number recommendedPYQs
        +string[] priorityTopics
    }

    EvaluationResult "1" --> "*" StepBreakdown
    EvaluationResult "1" --> "1" StudentProfile
    StudentProfile "1" --> "1" RevisionPlan
```

---

### Fail-Safe Mode Decision Tree

```mermaid
flowchart TD
    START(["Faculty submits evaluation"]) --> CHECK_API{Gemini API\nreachable?}

    CHECK_API -->|"✅ Yes"| CHECK_KEY{API Key\nvalid & active?}
    CHECK_KEY -->|"✅ Yes"| USE_GEMINI["Use Gemini 1.5 Flash\n(Full AI evaluation)"]
    CHECK_KEY -->|"❌ No"| FALLBACK

    CHECK_API -->|"❌ No"| FALLBACK(["🔧 Switch to Local Evaluator"])

    FALLBACK --> REGEX["Regex keyword matching\nagainst rubric terms"]
    FALLBACK --> SYNONYM["Synonym matching\n(expanded term dictionary)"]

    REGEX --> APPROX["Approximate score calculation"]
    SYNONYM --> APPROX

    USE_GEMINI --> FULL_RESULT(["✅ Full structured JSON result\nwith evidence quotes + confidence"])
    APPROX --> PARTIAL_RESULT(["⚠️ Approximate result\nmarked as offline-mode"])
```

---

## 🛠️ Feature Walkthrough

### Complete Feature Map

```mermaid
mindmap
  root((PrepForge))
    Descriptive Console
      Upload answer sheet image
      Paste raw typed text
      Define custom rubric
      AI step-by-step evaluation
      Evidence quote per step
      Confidence score display
    OMR Console
      Upload bubble sheet photo
      Auto bubble detection
      Negative marking engine
        +4 correct
        -1 wrong
        0 blank
      Anomaly flagging
        Double-filled
        Faint marks
        Missing roll no
    Analytics Dashboard
      Evaluation history
      Dynamic graphs
      Reload past evaluations
      Delete records
    Student Profile
      Strengths analysis
      Weak areas detection
      NCERT chapter mapping
      PYQ count recommendation
    Reports
      One-click generation
      HTML format
      PDF format
      Parent-ready output
```

---

### OMR Marking Logic

```mermaid
flowchart LR
    subgraph BUBBLE["Bubble State Detection"]
        FILLED["✅ Correctly filled"]
        WRONG["❌ Wrong answer"]
        BLANK["⬜ Not attempted"]
        DOUBLE["⚠️ Double-filled → Anomaly"]
        FAINT["⚠️ Faint mark → Anomaly"]
    end

    subgraph SCORE["Score Calculation"]
        CORRECT_MARK["+4 marks"]
        WRONG_MARK["-1 mark"]
        BLANK_MARK["0 marks"]
    end

    subgraph FLAGS["Anomaly Flags"]
        FLAG_DOUBLE["Flag: DOUBLE_MARK"]
        FLAG_FAINT["Flag: AMBIGUOUS_MARK"]
        FLAG_MISSING["Flag: MISSING_IDENTIFIER"]
    end

    FILLED --> CORRECT_MARK
    WRONG --> WRONG_MARK
    BLANK --> BLANK_MARK
    DOUBLE --> FLAG_DOUBLE
    FAINT --> FLAG_FAINT
```

---

## 🗄️ Database Schema & Data Flow

### Entity Relationship Diagram

```mermaid
erDiagram
    FACULTY {
        string id PK
        string name
        string email
        string institution
        datetime createdAt
    }

    STUDENT {
        string id PK
        string name
        string rollNumber
        string class
        string subject
    }

    EVALUATION {
        string id PK
        string facultyId FK
        string studentId FK
        string type
        float totalMarks
        float awardedMarks
        float confidenceScore
        string mode
        datetime evaluatedAt
    }

    STEP_BREAKDOWN {
        string id PK
        string evaluationId FK
        string stepName
        float maxMarks
        float awardedMarks
        string evidenceQuote
        string reasoning
    }

    OMR_RESULT {
        string id PK
        string evaluationId FK
        int totalCorrect
        int totalWrong
        int totalBlank
        float finalScore
        json anomalies
    }

    STUDENT_PROFILE {
        string id PK
        string studentId FK
        string[] strengths
        string[] weakAreas
        string[] ncertChapters
        int recommendedPYQs
        datetime updatedAt
    }

    FACULTY ||--o{ EVALUATION : "conducts"
    STUDENT ||--o{ EVALUATION : "receives"
    EVALUATION ||--o{ STEP_BREAKDOWN : "contains"
    EVALUATION ||--o| OMR_RESULT : "has"
    STUDENT ||--o| STUDENT_PROFILE : "has"
```

---

### Data Storage Decision Flow

```mermaid
flowchart TD
    REQ(["Incoming Request"]) --> ENV{NODE_ENV?}

    ENV -->|"production"| SUPA_CHECK{Supabase\nconnection OK?}
    ENV -->|"development"| LOCAL_CHECK{dev.db\nSQLite local}

    SUPA_CHECK -->|"✅ Yes"| PRISMA_PROD["Prisma → PostgreSQL\n(Supabase cloud)"]
    SUPA_CHECK -->|"❌ No"| JSON_FALLBACK["Local JSON\nfile-based storage"]

    LOCAL_CHECK --> PRISMA_DEV["Prisma → dev.db\n(local SQLite)"]

    PRISMA_PROD --> STORE_IMAGES["Images → Supabase Storage Buckets"]
    PRISMA_DEV --> STORE_LOCAL["Images → /public folder"]
```

---

## 📁 Project File Structure

```
PrepForge/
│
├── 📁 app/                          # Next.js 15 App Router root
│   ├── 📁 home/
│   │   └── page.tsx                 # Main dashboard/home page
│   ├── 📁 lib/                      # Shared server-side utilities
│   │   ├── gemini.ts                # Gemini AI client + config
│   │   ├── embeddings.ts            # text-embedding-004 + cosine similarity
│   │   ├── local-evaluator.ts       # Offline regex fallback evaluator
│   │   ├── prisma.ts                # Prisma ORM singleton client
│   │   └── supabase.ts              # Supabase client (DB + Storage)
│   ├── 📁 tools/                    # Evaluation consoles (core feature)
│   │   ├── descriptive/             # Descriptive answer evaluation UI
│   │   └── omr/                     # OMR sheet evaluation UI
│   ├── 📁 welcome/                  # Onboarding / landing page
│   ├── favicon.ico
│   ├── globals.css                  # Global Tailwind + custom styles
│   ├── layout.tsx                   # Root layout (dark glassmorphic theme)
│   └── page.tsx                     # Entry route → redirects to /home
│
├── 📁 prisma/
│   └── schema.prisma                # DB schema (Faculty, Student, Evaluation...)
│
├── 📁 public/                       # Static assets
│
├── 📁 node_modules/                 # Dependencies
│
├── .env                             # Local secrets (gitignored)
├── .env.example                     # Template for environment setup
├── .gitignore
├── components.json                  # shadcn/ui component registry config
├── dev.bat                          # Windows: quick dev server start
├── dev.db                           # Local SQLite database (offline mode)
├── eslint.config.mjs
├── next-env.d.ts                    # Next.js TypeScript declarations
├── next.config.ts                   # Next.js configuration
├── package.json                     # Dependencies & scripts
├── package-lock.json
├── postcss.config.mjs               # PostCSS for Tailwind
├── setup.bat                        # Windows: first-time project setup
├── tsconfig.json                    # TypeScript compiler config
└── tsconfig.tsbuildinfo             # TS incremental build cache
```

---

### Module Dependency Graph

```mermaid
graph LR
    subgraph PAGES["📄 Pages (app/)"]
        PAGE_HOME["home/page.tsx"]
        PAGE_WELCOME["welcome/page.tsx"]
        PAGE_TOOLS["tools/page.tsx"]
        LAYOUT["layout.tsx"]
    end

    subgraph LIB["📚 lib/ — Shared Utilities"]
        GEMINI_LIB["gemini.ts\nAI Client"]
        EMBED_LIB["embeddings.ts\nVector Math"]
        LOCAL_LIB["local-evaluator.ts\nOffline Fallback"]
        PRISMA_LIB["prisma.ts\nDB Client"]
        SUPA_LIB["supabase.ts\nStorage + Auth"]
    end

    subgraph EXTERNAL["🌐 External Services"]
        GEMINI_API["Google Gemini API\ngemini-1.5-flash\ntext-embedding-004"]
        SUPA_API["Supabase\nPostgreSQL + Storage"]
    end

    subgraph LOCAL["💾 Local"]
        SQLITE["dev.db\nSQLite"]
        JSON_DB["JSON file store\nultimate fallback"]
    end

    PAGE_TOOLS --> GEMINI_LIB
    PAGE_TOOLS --> EMBED_LIB
    PAGE_TOOLS --> PRISMA_LIB
    PAGE_TOOLS --> SUPA_LIB

    GEMINI_LIB --> GEMINI_API
    GEMINI_LIB -->|"API down"| LOCAL_LIB
    EMBED_LIB --> GEMINI_API

    PRISMA_LIB --> SUPA_API
    PRISMA_LIB -->|"offline"| SQLITE
    PRISMA_LIB -->|"no DB"| JSON_DB

    SUPA_LIB --> SUPA_API

    LAYOUT --> PAGE_HOME
    LAYOUT --> PAGE_WELCOME
    LAYOUT --> PAGE_TOOLS
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15+ App Router | Full-stack React framework |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Glassmorphic dark-mode UI |
| **Components** | shadcn/ui (`components.json`) | Headless accessible component library |
| **AI Vision + Eval** | `gemini-1.5-flash` | Handwritten OCR, OMR reading, structured evaluation |
| **AI Embeddings** | `text-embedding-004` | 768-dim semantic vectors for RAG |
| **AI SDK** | `@google/generative-ai` | Official Google AI Node.js SDK |
| **ORM** | Prisma | Type-safe DB queries and migrations |
| **Database (prod)** | PostgreSQL on Supabase | Cloud-hosted relational DB |
| **Database (dev)** | SQLite (`dev.db`) | Local zero-setup development DB |
| **Storage** | Supabase Storage Buckets | Secure student image management |
| **Offline Fallback** | Custom regex + synonym engine | Evaluation when AI/DB unavailable |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **Git**
- A **Supabase** project (for cloud DB + storage)
- A **Google AI API key** (for Gemini)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/prepforge.git
cd PrepForge

# 2. Install all dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your actual keys (see below)
```

### Windows Quick Start

```bat
# First-time setup (runs npm install + prisma migrate)
setup.bat

# Start dev server
dev.bat
```

### Database Setup

```bash
# Generate Prisma client from schema
npx prisma generate

# Run migrations (creates tables in PostgreSQL or dev.db)
npx prisma migrate dev --name init

# (Optional) View database in browser UI
npx prisma studio
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be routed to the Welcome page, then Home dashboard.

---

## 🔐 Environment Variables

Create a `.env` file (use `.env.example` as template):

```env
# ── Google Generative AI ──────────────────────────────
GOOGLE_GENERATIVE_AI_API_KEY=AIza...your_key_here

# ── Supabase (Cloud PostgreSQL + Storage) ────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role_key

# ── Prisma Database ───────────────────────────────────
# Cloud (production):
DATABASE_URL=postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres

# Local dev (SQLite — no setup required):
# DATABASE_URL=file:./dev.db
```

> **Tip:** For local development without Supabase, simply use `DATABASE_URL=file:./dev.db` — Prisma will use the included `dev.db` SQLite file automatically.

---

## 🛡️ Offline Fallback System

PrepForge **never goes down**. When external services are unavailable, it degrades gracefully:

```mermaid
graph TD
    A(["Evaluation Request"]) --> B{Gemini API\navailable?}
    B -->|Yes| C["Full AI Evaluation\n✅ Evidence quotes\n✅ Confidence score\n✅ NCERT profile"]
    B -->|No| D{Database\navailable?}
    D -->|PostgreSQL| E["Cloud DB\n(Supabase)"]
    D -->|No cloud| F["Local SQLite\n(dev.db)"]
    D -->|No DB at all| G["JSON file store\n(ultimate fallback)"]
    B -->|No| H["Local Evaluator\n⚠️ Regex keyword matching\n⚠️ Synonym expansion\n⚠️ Approximate score only"]
    H --> I(["Result flagged:\nmode: 'offline-approximate'"])
    C --> J(["Result:\nmode: 'ai-full'"])
```

---

## 📦 NPM Scripts

```bash
npm run dev        # Start Next.js development server (hot reload)
npm run build      # Build optimized production bundle
npm run start      # Start production server
npm run lint       # Run ESLint on all TypeScript/TSX files

npx prisma studio  # Open visual DB browser at localhost:5555
npx prisma migrate dev   # Apply schema changes to DB
npx prisma generate      # Regenerate Prisma client after schema edit
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built for the educators shaping India's future engineers and doctors.**

</div>


---

## 📦 Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npx prisma studio  # Open Prisma DB GUI
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ for the educators shaping India's future engineers and doctors.

</div>

---



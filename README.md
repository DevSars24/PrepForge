# PrepForge: AI-Powered Faculty Evaluation Suite

An automated grading platform designed specifically for JEE & NEET descriptive exams and OMR sheets.

---

## 🎯 The Big Picture (Founder Pitch)

Manually checking descriptive papers (JEE/NEET), applying correct marking rubrics, and scanning OMR sheets for anomalies is an extremely time-consuming and inconsistent process for faculty. PrepForge makes this entire workflow **90% faster** and fully digital. The platform transcribes handwritten answers, grades them against exact institutional rubrics with step-by-step scoring and evidence citations, and generates automated analytics reports.

---

## 🧠 1. How and Where AI is Used (Core AI Stack)

PrepForge is built on the **Google Generative AI (Gemini)** standard stack.

### Multimodal Vision OCR (`gemini-1.5-flash`)

- **Handwritten OCR** — When faculty uploads a photo of a student's written answer sheet, the Gemini Vision model completely transcribes it into digital text. It accurately extracts complex mathematical formulas, scientific notations, diagrams, and units.
- **Visual OMR Reading** — Processes OMR bubble sheet images to detect filled bubbles, double-filled answers, and faint/ambiguous marks, raising anomaly alerts automatically.

### Semantic RAG (Retrieval-Augmented Generation)

When marking rubrics are lengthy, the system breaks them into small chunks and uses vector similarity to find the most relevant sections:

1. Input rubric is split into small chunks.
2. Student answers and rubric chunks are embedded using `text-embedding-004` into **768-dimensional vectors**.
3. **Cosine Similarity** is computed to find the best-matching rubric chunks per sub-topic:

$$\text{Similarity}(A, B) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

4. The **top-6 matching chunks** are passed to Gemini for grading — reducing token cost and keeping evaluation 100% target-oriented.

### Strict Structured JSON Evaluation

Gemini's `generationConfig` enforces `responseMimeType: "application/json"`, ensuring responses always follow a strict schema:

- **Step-by-Step Marks** — How many marks were awarded per step (max vs. awarded).
- **Evidence Quotes** — The exact lines the student wrote that earned marks (no AI hallucinations).
- **Confidence Score** — The AI's self-reported evaluation accuracy (0.0 to 1.0).

### Fail-Safe Offline Mode (No-DB / No-AI Fallback)

If the Gemini API is down or the key is inactive, the application does not crash. The system automatically shifts to a **Local Evaluator** that uses regular expression keyword-matching and synonym-matching algorithms to perform approximate evaluation calculations.

---

## 🛠️ 2. Key Platform Features

### Dual Evaluation Console

- **Descriptive Console** — Grades written/subjective papers by matching direct images or raw typed text against custom grading rubrics using AI evaluation.
- **OMR Console** — Auto-grades with negative marking calculation (e.g., JEE/NEET format: `+4` for correct, `-1` for incorrect, `0` for blank/unmarked) and flags anomalies.

### Granular Citation and Evidence Tracking

For every step scored on a checked answer, the platform displays the student's **exact quote** from their real copy on the interface. This eliminates grading bias and gives students proof-based feedback.

### Strengths & Gaps Analysis (NCERT Focus)

Once evaluation is complete, AI generates a detailed student profile covering:
- Weak areas and strengths
- Targeted revision guidelines (e.g., which NCERT chapters to read and how many PYQs to solve)

### Interactive Dashboard & Unified History

A Next.js-based live console where all descriptive and OMR evaluation history is saved. Faculty can reload past evaluations, check dynamic graphs, or delete records directly.

### Instantly Downloadable Offline Reports

Faculty can generate a print-friendly **HTML/PDF report card** in a single click — ready to share directly with parents or save to a database.

---

## ⚙️ 3. Technologies Used (Under the Hood)

| Layer | Technology |
|---|---|
| **Frontend & Backend** | Next.js 15+ (App Router) + TypeScript + Tailwind CSS |
| **Design System** | Glassmorphic aesthetic, dark mode support |
| **AI Engine** | `@google/generative-ai` SDK — `gemini-1.5-flash` (OCR, OMR, logic verification), `text-embedding-004` (semantic context matching) |
| **Database (Production)** | PostgreSQL hosted on Supabase via Prisma ORM |
| **Database (Offline)** | Local JSON file-based utility |
| **Storage** | Supabase Storage Buckets for securely uploading and managing student scanned images |

---

## 🗂️ Project Structure

```
PrepForge/
├── app/
│   ├── home/
│   │   └── page.tsx          # Home page
│   ├── lib/                  # Shared utilities & helpers
│   ├── tools/                # Tool-specific logic (evaluate, OMR, etc.)
│   ├── welcome/              # Onboarding / welcome flow
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Entry page
├── node_modules/
├── prisma/                   # Prisma ORM schema & migrations
├── public/                   # Static assets
├── .env                      # Environment variables (API keys, DB URL)
├── .env.example              # Environment variable template
├── .gitignore
├── components.json           # shadcn/ui component config
├── dev.bat                   # Windows dev startup script
├── dev.db                    # Local SQLite/JSON database (offline mode)
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── setup.bat                 # Windows setup script
├── tsconfig.json
└── tsconfig.tsbuildinfo
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use local JSON mode for offline)
- Google Generative AI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/PrepForge.git
cd PrepForge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your GEMINI_API_KEY, DATABASE_URL, SUPABASE_URL, etc.

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

On Windows, you can also run:

```bat
setup.bat   # First-time setup
dev.bat     # Start dev server
```

### Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Generative AI API key |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## 📄 License

This project is proprietary. All rights reserved.

---

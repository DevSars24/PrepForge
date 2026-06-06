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

![Next.js](https://img.shields.io/badge/Next.js_15+-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

---

## 🎯 Overview

Manually checking JEE/NEET descriptive papers, applying correct marking rubrics, and scanning OMR sheets for anomalies is **extremely time-consuming and inconsistent** for faculty.

**PrepForge makes this entire process 90% faster and fully digital.**

The platform:
- 📝 Transcribes subjective handwritten answers using AI vision
- ⚖️ Grades them against exact institutional rubrics
- 🔢 Delivers step-by-step marks with citations and evidence
- 📊 Auto-generates detailed analytics reports

---

## 🧠 Core AI Stack

### 🔍 Multimodal Vision OCR — `gemini-1.5-flash`

| Feature | Description |
|---|---|
| **Handwritten OCR** | Converts student answer sheet photos into fully digital text, accurately extracting mathematical formulas, scientific notations, diagrams, and units |
| **Visual OMR Reading** | Detects filled bubbles, flags double-filled answers and faint/ambiguous marks, raises anomaly alerts |

---

### 🧩 Semantic RAG — Retrieval-Augmented Generation

When marking rubrics are lengthy, PrepForge uses a smart chunking + semantic search pipeline:

```
Student Answer  ──┐
                  ├──► text-embedding-004 ──► 768-dim Vectors
Rubric Chunks   ──┘                                  │
                                                      ▼
                                          Cosine Similarity Match
                                                      │
                                                      ▼
                                          Top-6 Relevant Chunks
                                                      │
                                                      ▼
                                            Gemini Evaluation
```

**Cosine Similarity Formula:**

$$\text{Similarity}(A, B) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

> Selecting only the top-6 most relevant rubric chunks reduces token cost and keeps grading 100% targeted.

---

### 📋 Strict Structured JSON Evaluation

`responseMimeType: "application/json"` is enforced in Gemini's `generationConfig`, guaranteeing structured output every time:

```json
{
  "stepBreakdown": [
    {
      "step": "Newton's Second Law Statement",
      "maxMarks": 2,
      "awardedMarks": 2,
      "evidenceQuote": "Force equals mass times acceleration..."
    }
  ],
  "totalAwarded": 8,
  "totalMax": 10,
  "confidenceScore": 0.94,
  "feedback": "Strong conceptual understanding demonstrated."
}
```

| Field | Purpose |
|---|---|
| `stepBreakdown` | Per-step marks awarded vs. maximum |
| `evidenceQuote` | Exact student line that earned marks — **no hallucinations** |
| `confidenceScore` | AI's self-reported evaluation confidence (0.0 – 1.0) |

---

### 🛡️ Fail-Safe Offline Mode

If the Gemini API is unavailable, the application **does not shut down**. It automatically shifts to a **Local Evaluator** powered by:

- Regular expression keyword-matching
- Synonym-matching algorithms

This ensures approximate evaluation is always available, even without internet or API access.

---

## 🛠️ Key Features

### ⚡ Dual Evaluation Console

```
┌─────────────────────────┬─────────────────────────┐
│   DESCRIPTIVE CONSOLE   │      OMR CONSOLE        │
│                         │                         │
│  • Upload answer images │  • Auto bubble detect   │
│  • Paste typed text     │  • Negative marking     │
│  • Custom rubric input  │    (+4 / -1 / 0)        │
│  • AI step-by-step eval │  • Anomaly flagging     │
└─────────────────────────┴─────────────────────────┘
```

---

### 🔎 Granular Citation & Evidence Tracking

Every mark awarded is backed by the **exact quote** from the student's answer sheet — displayed directly in the evaluation interface.

- ✅ Zero evaluator bias
- ✅ Full transparency for students and parents
- ✅ Dispute-proof audit trail

---

### 📈 Strengths & Gaps Analysis — NCERT Focus

Once evaluation is complete, AI generates a full student profile:

- 🟢 **Strengths** — Topics with high conceptual clarity
- 🔴 **Weak Areas** — Topics needing revision
- 📚 **Revision Plan** — Specific NCERT chapters + recommended PYQ count

---

### 🗂️ Interactive Dashboard & Unified History

- Live Next.js console with descriptive and OMR history
- Reload past evaluations with dynamic graphs
- Delete records directly from the dashboard

---

### 📄 Instantly Downloadable Reports

Generate a **print-friendly HTML/PDF report card** in one click — ready to share with parents or save to the database.

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15+ (App Router), TypeScript, Tailwind CSS |
| **Design System** | Glassmorphic dark mode UI |
| **AI Engine** | `gemini-1.5-flash` (OCR, OMR, evaluation), `text-embedding-004` (semantic RAG) |
| **SDK** | `@google/generative-ai` |
| **Database (Prod)** | PostgreSQL on Supabase via Prisma ORM |
| **Database (Offline)** | Local JSON file-based utility |
| **Storage** | Supabase Storage Buckets (secure image management) |

---

## 🗂️ Project Structure

```
prepforge/
├── app/                        # Next.js App Router
│   ├── (dashboard)/
│   │   ├── descriptive/        # Descriptive evaluation console
│   │   ├── omr/                # OMR evaluation console
│   │   └── history/            # Evaluation history & analytics
│   └── api/
│       ├── evaluate/           # Gemini evaluation endpoints
│       ├── omr/                # OMR processing endpoints
│       └── embed/              # RAG embedding pipeline
├── lib/
│   ├── ai/
│   │   ├── gemini.ts           # Gemini client & config
│   │   ├── embeddings.ts       # text-embedding-004 + cosine similarity
│   │   └── local-evaluator.ts  # Offline fallback engine
│   ├── db/
│   │   └── prisma.ts           # Prisma ORM client
│   └── storage/
│       └── supabase.ts         # Supabase storage client
├── components/                 # Reusable UI components
├── prisma/
│   └── schema.prisma           # Database schema
└── public/
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase project)
- Google Generative AI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/prepforge.git
cd prepforge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_postgresql_connection_string
```

### Database Setup

```bash
# Run Prisma migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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



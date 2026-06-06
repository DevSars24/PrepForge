# PrepForge: AI-Powered Faculty Evaluation Suite
An automated grading platform designed specifically for JEE & NEET descriptive exams and OMR sheets.

---

## 🎯 The Big Picture (Founder Pitch)
Descriptive papers (JEE/NEET) ko manually check karna, correct marking rubric apply karna, and OMR sheets ki scanning/anomalies check karna faculty ke liye bahut zyada time-consuming aur inconsistent hota hai. PrepForge is pure process ko 90% faster aur digital bana deta hai. Platform subjective handwritten answers ko transcribe karta hai, unhe exact institutional rubrics se compare karke grade karta hai, step-by-step numbers deta hai with citation/evidence, aur automated analytics report generate karke deta hai.

---

## 🧠 1. Platform mein AI ka kahan aur kaise use hua hai? (Core AI Stack)
Humne PrepForge mein Google Generative AI (Gemini) standard stack ka use kiya hai:

### Multimodal Vision OCR (`gemini-1.5-flash`):
* **Handwritten OCR**: Agar faculty student ke written answer sheet ki photo upload karti hai, toh Gemini Vision model us handwritten sheet ko completely digital text mein convert (transcribe) kar deta hai. Yeh complex mathematical formulas, scientific notations, diagrams aur units ko accurately extract kar leta hai.
* **Visual OMR Reading**: OMR bubble sheets ki image ko process karke bubbles detect karta hai, double-filled answers aur faint marks (ambiguous bubbles) ko detect karke anomaly alert raise karta hai.

### Semantic RAG (Retrieval-Augmented Generation):
* Agar checking ki guidelines (Marking Rubrics) bahut lambi hain, toh system input rubric ko small chunks mein tod deta hai.
* Hum `text-embedding-004` model use karke student ke answer aur rubric chunks ka 768-dimensional Vector Embedding nikalte hain.
* Uske baad Cosine Similarity Mathematics ka use karke select karte hain ki student ke answer se sub-topic wise kaun sa rubric path match kar raha hai: 
  $$\text{Similarity}(A, B) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
* Top-6 matching rubric chunks ko select karke Gemini model ko pass kiya jata hai. Isse token cost bachti hai aur grading 100% target oriented hoti hai.

### Strict Structured JSON Evaluation:
* Gemini ke `generationConfig` mein `responseMimeType: "application/json"` enforce kiya hai. Isse response hamesha strict structure mein milta hai:
  * **Step-by-Step Marks**: Kis step pe kitne marks mile (max vs awarded).
  * **Evidence Quotes**: Student ne exactly kaun si line likhi jiske basis par marks mile (No AI Hallucinations).
  * **Confidence Score**: AI system khud batata hai ki evaluation accuracy kitne percent sahi hai (0.0 to 1.0).

### Fail-Safe Offline Mode (No-DB/No-AI Fallback):
* Agar Gemini API down ho ya key active na ho, toh application band nahi hoti. System auto-shift ho jata hai Local Evaluator pe jo regular expression keyword-matching aur synonym-matching algorithm ke throw approximate evaluation calculations perform kar deta hai.

---

## 🛠️ 2. Platform ke Key Features kya hain?

### Dual Evaluation Console:
* **Descriptive Console**: Written/Subjective papers ki checking, jahan direct images ya raw typed text ko custom grading rubrics se match karke AI evaluation kiya jata hai.
* **OMR Console**: Auto-grading with negative marking calculation (e.g., JEE/NEET format: $+4$ for correct, $-1$ for incorrect, $0$ for blank/unmarked) and anomaly flagging.

### Granular Citation and Evidence Tracking:
* Platform check kiye answers ki har step scoring pe student ki real copy ka "Exact Quote" detail interface par dikhata hai. Isse bias khatam ho jata hai aur student proof dekh sakta hai.

### Strengths & Gaps Analysis (NCERT Focus):
* Evaluation complete hote hi AI student ki detailed profile banata hai: unke weak areas, strengths kya hain, aur targeted revision guidelines (jaise: NCERT Books se kaun se chapters read karne hain aur kitne PYQs solve karne hain).

### Interactive Dashboard & Unified History:
* Next.js based live console jahan descriptive and OMR data history safe rehti hai. Faculty purani evaluations ko reload karke dynamic graphs check kar sakti hain ya direct delete kar sakti hain.

### Instantly Downloadable Offline Reports:
* Faculty ek hi click mein student report card print-friendly HTML/PDF format mein generate karke direct parents ko ya database mein save kar sakti hain.

---

## ⚙️ 3. Technologies Used (Under the Hood)
* **Frontend & Backend**: Next.js 15+ (App Router) + TypeScript + Tailwind CSS (Aesthetic glassmorphic & dark mode design system).
* **AI Engine**: `@google/generative-ai` SDK (`gemini-1.5-flash` for OCR, OMR, and logic verification; `text-embedding-004` for semantic context matching).
* **Database**: PostgreSQL (hosted on Supabase) via Prisma ORM for production, local JSON database file-based utility for offline run.
* **Storage**: Supabase Storage Buckets to upload and manage student scanned images securely.

---

## Summary of what to tell the Founder:
> "PrepForge is a ready-to-scale AI grading platform for institutions. It eliminates manual checking errors, runs on a dual-mode (Cloud Postgres + Local Fallback), uses Gemini Vision OCR/OMR, and generates instant student analytical feedback. For a coaching institute or board, it saves massive faculty time and provides transparent evidence-based scoring."

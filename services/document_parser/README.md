# PrepForge Document Parser Service (Datalab Marker & marker-pdf)

A high-performance, production-ready document scanning and parsing microservice for PrepForge. Built with **Datalab Marker** and the official **marker-pdf** Python API, featuring bilingual Hindi + English OCR, LaTeX mathematical formula extraction, Supabase caching, and multi-tier fallbacks.

---

## 🌟 Key Features

1. **Dual-Engine Architecture**:
   - **Cloud High-Speed Engine**: Powered by Datalab Marker API with automated polling and status streaming.
   - **Local Self-Hosted Engine**: Official `marker-pdf` Python API supporting GPU (`balanced` mode) and CPU (`fast` mode).
2. **Bilingual Hindi + English OCR**:
   - Native support for mixed Devanagari Hindi and English technical textbooks, exam question papers, and handwritten solutions.
3. **Structured Markdown & LaTeX**:
   - Accurately converts complex fraction notations, integrals, square roots, matrices, and chemical equations into standard LaTeX math blocks (`$$ ... $$`).
4. **Content-Addressable Deduplication & Caching**:
   - Computes SHA-256 fingerprint for every incoming document.
   - Lookups cached results from Supabase table `marker_document_cache` (with instant local disk fallback).
5. **Multi-Tier Robustness & Fallback**:
   - Datalab Marker / Marker-pdf (Primary) ➔ Surya OCR / Layout (Secondary) ➔ PaddleOCR (Tertiary).
6. **Memory-Efficient Singleton**:
   - Loads models once into memory; prevents PyTorch out-of-memory errors on concurrent jobs.

---

## 📦 Installation & Setup

### 1. Python Environment Setup
```bash
# Create dedicated virtual environment (recommended Python 3.10 - 3.12)
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Install core parser requirements
pip install -r services/document_parser/requirements.txt
```

### 2. Optional: Local GPU/CUDA Acceleration
If you plan to run local `marker-pdf` on your NVIDIA GPU without cloud API:
```bash
# Install PyTorch with CUDA 12.1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Install marker-pdf & Surya
pip install marker-pdf surya-ocr
```

---

## ⚙️ Environment Variables

Add to your `.env` file:

```env
# Datalab Hosted Marker API Key
DATALAB_API_KEY=WeP0fEyfveF0d7sg8NOd8Zz5qfz9dSc7yr3dQjeBhRQ

# Compute Device & Mode ('auto', 'cuda', or 'cpu')
TORCH_DEVICE=auto
MARKER_MODE=auto

# Language Code ('en,hi' for Hindi + English bilingual support)
MARKER_LANGS=en,hi

# Microservice URL (defaults to http://localhost:8000)
DOCUMENT_PARSER_URL=http://localhost:8000
```

---

## 🚀 Running the Microservice

### Start FastAPI Microservice:
```bash
python services/document_parser/run_server.py
```
Or directly using Uvicorn:
```bash
uvicorn services.document_parser.api:app --host 0.0.0.0 --port 8000 --workers 1
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 Python API Usage

### Single Document Parsing:
```python
import asyncio
from services.document_parser.parser_service import DocumentParserService

async def main():
    service = DocumentParserService()
    
    # Parse PDF or image file (auto-detects GPU/CPU and handles cache)
    result = await service.parse_document("path/to/answer_sheet.pdf", mode="auto")
    
    print(f"Pages: {result['pages']}")
    print(f"Markdown:\n{result['markdown']}")
    print(f"Extracted Figures: {len(result['images'])}")

asyncio.run(main())
```

### Batch Upload Processing:
```python
async def batch_process():
    service = DocumentParserService()
    files = ["sheet1.pdf", "sheet2.pdf", "sheet3.pdf"]
    
    # Concurrently parse with worker semaphore
    results = await service.parse_batch(files, mode="auto", concurrency=3)
    for res in results:
        print(f"Done: {res['pages']} pages")
```

---

## 🌐 Supabase Storage Integration Example

To parse a file uploaded to Supabase Storage:

```python
import asyncio
from services.document_parser.parser_service import DocumentParserService
from supabase import create_client

# Download file from Supabase storage or pass public URL
supabase = create_client("https://your-ref.supabase.co", "your-key")
res = supabase.storage.from_("answer-sheets").download("sheet-123.pdf")

with open("temp.pdf", "wb") as f:
    f.write(res)

service = DocumentParserService()
parsed = asyncio.run(service.parse_document("temp.pdf"))
```

Or via HTTP:
```bash
curl -X POST "http://localhost:8000/parse-url" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://guhgxwyyfqetpyfrbgff.supabase.co/storage/v1/object/public/answer-sheets/sample.pdf"}'
```

---

## 🧠 Feeding Marker Markdown into Groq / Gemini for JEE/NEET Evaluation

Once Marker converts handwritten answers into structured Markdown + LaTeX formulas, you pass the output directly into PrepForge's Groq / Gemini multi-model evaluator:

```typescript
import { parseDocumentWithMarker } from "@/lib/marker";
import { gradeWithGemini } from "@/lib/ai-grading";

// 1. Scan uploaded answer sheet with Marker
const markerResult = await parseDocumentWithMarker(fileBuffer, "student_answer.pdf", "application/pdf");

// 2. Feed clean Markdown (with LaTeX math) into Groq / Gemini Evaluator
const evaluation = await gradeWithGemini({
  student: {
    name: "Aman Sharma",
    roll: "JEE-2026-401",
    stream: "JEE",
    subject: "Physics",
    answerText: markerResult.markdown,
    omr: [],
  },
  answerText: markerResult.markdown,
  rubricText: `Rubric:
  1. Lens formula 1/f = 1/v - 1/u with sign convention (4 marks)
  2. Resolving normal forces and acceleration (4 marks)`,
  stream: "JEE"
});

console.log(`Evaluated via: ${evaluation.providerUsed}`);
console.log(`Score: ${evaluation.grading.stepGrades}`);
```

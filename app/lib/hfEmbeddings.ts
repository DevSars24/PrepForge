import { PrepForgeError } from "@/lib/debug";

const HF_ROUTER_EMBED_API =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";

export function hasHfToken(): boolean {
  return Boolean(process.env.HF_TOKEN && process.env.HF_TOKEN.trim().length > 0);
}

/**
 * Call HuggingFace inference API to generate dense vector embeddings
 */
async function embed(texts: string[]): Promise<number[][]> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "hfEmbeddings.embed",
      message: "HF_TOKEN is not configured",
      statusCode: 503,
    });
  }

  const res = await fetch(HF_ROUTER_EMBED_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "hfEmbeddings.embed",
      message: `HuggingFace embeddings API returned ${res.status}: ${errText.slice(0, 500)}`,
      statusCode: res.status,
    });
  }

  return res.json();
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * High-accuracy lexical overlap / keyword TF-IDF scoring fallback
 * used if HuggingFace neural embeddings are warming up or token is invalid
 */
function lexicalSimilarity(query: string, document: string): number {
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const queryTokens = new Set(tokenize(query));
  const docTokens = tokenize(document);
  if (!queryTokens.size || !docTokens.length) return 0;

  let matches = 0;
  for (const token of docTokens) {
    if (queryTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.sqrt(docTokens.length * queryTokens.size);
}

/**
 * Chunk the rubric text and return the top-K most relevant chunks
 * compared to the student answer, using HuggingFace embeddings
 * with intelligent lexical ranking fallback.
 */
export async function getTopRubricChunks(
  studentAnswer: string,
  rubric: string,
  topK = 6
): Promise<string[]> {
  // Split rubric into meaningful chunks (~300 chars each)
  const chunks = rubric
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      if (block.length <= 300) return [block];
      const parts: string[] = [];
      for (let i = 0; i < block.length; i += 300) {
        parts.push(block.slice(i, i + 300));
      }
      return parts;
    });

  if (!chunks.length) return [rubric];

  // If rubric is small enough, return all chunks
  if (rubric.length <= 3000) return chunks.slice(0, topK);

  // Try HuggingFace neural embeddings if token is configured
  if (hasHfToken()) {
    try {
      const allTexts = [studentAnswer.slice(0, 1000), ...chunks.slice(0, 20)];
      const embeddings = await embed(allTexts);
      const answerEmbed = embeddings[0];
      const chunkEmbeds = embeddings.slice(1);

      return chunks
        .slice(0, 20)
        .map((chunk, i) => ({
          chunk,
          score: cosineSimilarity(answerEmbed, chunkEmbeds[i]),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((x) => x.chunk);
    } catch (error) {
      console.warn(
        "[PrepForge:hfEmbeddings] Neural embedding failed, falling back to lexical matching:",
        error instanceof Error ? error.message : error
      );
    }
  }

  // Fallback: Lexical keyword similarity ranking
  return chunks
    .slice(0, 20)
    .map((chunk) => ({
      chunk,
      score: lexicalSimilarity(studentAnswer, chunk),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.chunk);
}

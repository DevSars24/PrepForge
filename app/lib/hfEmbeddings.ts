import { PrepForgeError } from "@/lib/debug";

const HF_EMBED_API =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";

export function hasHfToken() {
  return Boolean(process.env.HF_TOKEN);
}

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

  const res = await fetch(HF_EMBED_API, {
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
 * Chunk the rubric text and return the top-K most relevant chunks
 * compared to the student answer, using HuggingFace embeddings.
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
      // Further split long blocks
      const parts: string[] = [];
      for (let i = 0; i < block.length; i += 300) {
        parts.push(block.slice(i, i + 300));
      }
      return parts;
    });

  if (!chunks.length) return [rubric];

  // If rubric is small enough, just return all chunks
  if (rubric.length <= 3000) return chunks.slice(0, topK);

  // Embed answer + all chunks in one batch
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
}

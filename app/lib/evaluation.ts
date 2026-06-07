export type Stream = "JEE" | "NEET";

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
};

export type Student = {
  name: string;
  roll: string;
  stream: Stream;
  subject: string;
  answerText: string;
  omr: string[];
  batch?: string;
  examType?: string;
  section?: string;
};

export type RubricPoint = {
  id: string;
  source: string;
  topic: string;
  expected: string;
  keywords: string[];
  marks: number;
};

export type Citation = {
  id: string;
  source: string;
  line: number;
  excerpt: string;
};

export type StepGrade = {
  rubricId: string;
  topic: string;
  expected: string;
  awarded: number;
  max: number;
  confidence: number;
  status: "earned" | "partial" | "review";
  note: string;
  reasoning?: string;
  citations: Citation[];
};

export type OmrItem = {
  question: number;
  selected: string;
  correct: string;
  score: number;
  status: "correct" | "wrong" | "blank" | "anomaly";
  confidence: number;
  flag?: string;
};

export type EvaluationResult = {
  score: number;
  total: number;
  confidence: number;
  stepGrades: StepGrade[];
  citations: Citation[];
  omr: {
    score: number;
    total: number;
    items: OmrItem[];
    anomalies: string[];
  };
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  retrievalTrace: { stage: string; detail: string }[];
  summary: string;
  aiText?: string;
  warning?: string;
};

export type CustomOmrResult = {
  score: number;
  total: number;
  accuracy: number;
  correct: number;
  wrong: number;
  blank: number;
  anomalies: string[];
  subjectWise: { subject: string; score: number; total: number; accuracy: number }[];
  items: OmrItem[];
};

export const answerKey = ["A", "B", "C", "D", "B", "A", "C", "D", "A", "B"];

export const rubricBank: RubricPoint[] = [
  {
    id: "PHY-OPT-01",
    source: "Model Answer p.2 line 15",
    topic: "Ray optics",
    expected: "Uses the mirror or lens formula with the correct sign convention before substitution.",
    keywords: ["mirror formula", "lens formula", "sign convention", "focal length", "image distance"],
    marks: 4,
  },
  {
    id: "PHY-MEC-02",
    source: "Rubric p.1 line 8",
    topic: "Mechanics",
    expected: "Resolves forces, writes conservation equation, and carries units through the final result.",
    keywords: ["force", "conservation", "energy", "momentum", "unit"],
    marks: 4,
  },
  {
    id: "MAT-CAL-03",
    source: "Model Answer p.3 line 4",
    topic: "Calculus",
    expected: "Shows derivative or integration step before simplifying the final numeric answer.",
    keywords: ["differentiate", "integrate", "derivative", "integral", "limit"],
    marks: 4,
  },
  {
    id: "CHE-ORG-04",
    source: "NCERT Chemistry p.214 line 21",
    topic: "Aromatic substitution",
    expected: "Names the electrophile and explains directing effect or resonance stabilization.",
    keywords: ["aromatic", "electrophile", "resonance", "directing", "substitution"],
    marks: 4,
  },
  {
    id: "BIO-PLANT-05",
    source: "NCERT Biology p.34 line 12",
    topic: "Plant kingdom",
    expected: "Uses exact NCERT taxonomy and differentiates bryophytes, pteridophytes, gymnosperms, and angiosperms.",
    keywords: ["bryophyte", "pteridophyte", "gymnosperm", "angiosperm", "taxonomy"],
    marks: 4,
  },
  {
    id: "CHE-KIN-06",
    source: "Rubric p.4 line 10",
    topic: "Chemical kinetics",
    expected: "States rate law, order, and half-life relationship with correct units.",
    keywords: ["rate law", "order", "half-life", "kinetics", "unit"],
    marks: 4,
  },
];

export const students: Student[] = [
  {
    name: "Sample Student A",
    roll: "JEE-2026-014",
    stream: "JEE",
    subject: "Physics + Maths",
    answerText:
      "Line 1: Used lens formula and sign convention for ray optics.\nLine 2: Substituted focal length and image distance, but one negative sign is missed.\nLine 3: Differentiated the function before simplifying the final value.\nLine 4: Wrote conservation of energy with units.",
    omr: ["A", "B", "C", "D", "B", "A", "C", "D", "A", "B"],
  },
  {
    name: "Sample Student B",
    roll: "NEET-2026-021",
    stream: "NEET",
    subject: "Biology + Chemistry",
    answerText:
      "Line 1: Plant kingdom answer mentions bryophyte, pteridophyte and angiosperm examples.\nLine 2: Chemical kinetics solution gives rate law and first order half-life.\nLine 3: Aromatic substitution mentions electrophile but misses directing effect.\nLine 4: Biology diagram labels are mostly NCERT aligned.",
    omr: ["C", "B", "C", "A", "D", "A", "B", "D", "A", "C"],
  },
  {
    name: "Sample Student C",
    roll: "JEE-2026-033",
    stream: "JEE",
    subject: "Physics + Chemistry",
    answerText:
      "Line 1: Mechanics answer resolves force but skips conservation equation.\nLine 2: Aromatic substitution is named without resonance explanation.\nLine 3: Ray optics formula is present, sign convention is unclear.\nLine 4: Final answers are written with few units.",
    omr: ["B", "B", "A", "D", "C", "A", "C", "B", "A", "D"],
  },
];

const topicPractice: Record<string, string> = {
  "Ray optics": "Revise NCERT sign convention, then solve 12 lens and mirror PYQs.",
  Mechanics: "Write the governing law before substitution and label units in every line.",
  Calculus: "Practice derivative and integration steps with one intermediate line visible.",
  "Aromatic substitution": "Make a table of electrophiles, directing effects, and resonance cases.",
  "Plant kingdom": "Review NCERT taxonomy charts and diagram labels for 20 minutes daily.",
  "Chemical kinetics": "Create a rate-law and half-life formula sheet, then solve mixed numericals.",
};

export function evaluateLocally(student: Student, answerText = student.answerText): EvaluationResult {
  const lines = answerText.split(/\n+/).filter(Boolean);
  const relevantRubric = rubricBank.filter((point) => student.stream === "NEET" ? point.id.startsWith("BIO") || point.id.startsWith("CHE") : !point.id.startsWith("BIO"));

  const stepGrades = relevantRubric.map((point) => {
    const matchedLines = lines
      .map((line, index) => ({ line, lineNumber: index + 1, score: lexicalScore(line, point.keywords) + semanticTopicScore(line, point.topic) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    const best = matchedLines[0]?.score || 0;
    const confidence = Math.min(0.97, 0.34 + best * 0.16);
    const awarded = best >= 4 ? point.marks : best >= 2 ? Math.round(point.marks / 2) : best >= 1 ? 1 : 0;
    const status: StepGrade["status"] = awarded === point.marks ? "earned" : awarded > 0 ? "partial" : "review";
    const citations = matchedLines.map((item, index) => ({
      id: `${point.id}-S${index + 1}`,
      source: point.source,
      line: item.lineNumber,
      excerpt: item.line.replace(/^Line\s+\d+:\s*/i, ""),
    }));

    return {
      rubricId: point.id,
      topic: point.topic,
      expected: point.expected,
      awarded,
      max: point.marks,
      confidence,
      status,
      note:
        status === "earned"
          ? "Rubric requirement is supported by answer evidence."
          : status === "partial"
            ? "Some rubric evidence is present, but one required step is incomplete."
            : "Faculty review required because the answer evidence is weak or missing.",
      citations,
    };
  });

  const omrItems = buildOmr(student.omr);
  const descriptiveScore = stepGrades.reduce((sum, grade) => sum + grade.awarded, 0);
  const descriptiveTotal = stepGrades.reduce((sum, grade) => sum + grade.max, 0);
  const normalizedDescriptive = Math.round((descriptiveScore / Math.max(1, descriptiveTotal)) * 70);
  const normalizedOmr = Math.max(0, Math.round((omrItems.reduce((sum, item) => sum + item.score, 0) / 40) * 30));
  const score = normalizedDescriptive + normalizedOmr;
  const confidence = average([...stepGrades.map((grade) => grade.confidence), ...omrItems.map((item) => item.confidence)]);
  const gaps = stepGrades.filter((grade) => grade.status !== "earned").map((grade) => grade.topic);
  const strengths = stepGrades.filter((grade) => grade.status === "earned").map((grade) => grade.topic);
  const citations = stepGrades.flatMap((grade) => grade.citations);

  return {
    score,
    total: 100,
    confidence,
    stepGrades,
    citations,
    omr: {
      score: omrItems.reduce((sum, item) => sum + item.score, 0),
      total: answerKey.length * 4,
      items: omrItems,
      anomalies: omrItems.filter((item) => item.status === "anomaly").map((item) => item.flag || `Q${item.question} needs review`),
    },
    strengths: strengths.length ? strengths : ["Answer presentation"],
    gaps: gaps.length ? [...new Set(gaps)] : ["No major gap detected"],
    recommendations: [...new Set(gaps)].map((gap) => topicPractice[gap] || `Assign targeted NCERT practice for ${gap}.`),
    retrievalTrace: [
      { stage: "INGEST", detail: `${lines.length} OCR lines normalized from ${student.roll}.` },
      { stage: "BM25", detail: "Exact formula, NCERT term, and rubric keyword matches scored locally." },
      { stage: "VECTOR", detail: "Semantic topic overlap approximated with syllabus-node synonyms for no-DB mode." },
      { stage: "FUSION", detail: "Keyword and semantic scores fused to select citation-backed evidence." },
      { stage: "GUARDRAIL", detail: "Marks are awarded only when a rubric point has matching answer evidence." },
    ],
    summary: `${student.name} scored ${score}/100 with ${(confidence * 100).toFixed(0)}% confidence. ${gaps.length ? `Priority gaps: ${[...new Set(gaps)].join(", ")}.` : "No major topic gaps detected."}`,
  };
}

export function evaluateCustomOmr(answerKeyText: string, responseText: string): CustomOmrResult {
  const key = parseAnswers(answerKeyText, answerKey);
  const responses = parseAnswers(responseText, []);
  const items = key.map((correct, index) => {
    const selected = responses[index] || "-";
    if (selected === "-") {
      return { question: index + 1, selected, correct, score: 0, status: "blank" as const, confidence: 0.92 };
    }
    if (selected.includes("/") || selected.length > 1 || !["A", "B", "C", "D"].includes(selected)) {
      return {
        question: index + 1,
        selected,
        correct,
        score: 0,
        status: "anomaly" as const,
        confidence: 0.45,
        flag: `Q${index + 1} has an invalid, double, or unclear response`,
      };
    }
    const isCorrect = selected === correct;
    return {
      question: index + 1,
      selected,
      correct,
      score: isCorrect ? 4 : -1,
      status: isCorrect ? "correct" as const : "wrong" as const,
      confidence: isCorrect ? 0.96 : 0.88,
    };
  });
  const score = items.reduce((sum, item) => sum + item.score, 0);
  const total = key.length * 4;
  const correct = items.filter((item) => item.status === "correct").length;
  const wrong = items.filter((item) => item.status === "wrong").length;
  const blank = items.filter((item) => item.status === "blank").length;
  const anomalies = items.filter((item) => item.status === "anomaly").map((item) => item.flag || `Q${item.question} needs review`);

  const subjectWise = ["Physics", "Chemistry", "Biology/Maths"].map((subject, groupIndex) => {
    const group = items.filter((_, index) => index % 3 === groupIndex);
    const groupScore = group.reduce((sum, item) => sum + item.score, 0);
    const groupTotal = group.length * 4;
    return {
      subject,
      score: groupScore,
      total: groupTotal,
      accuracy: group.length ? Math.round((group.filter((item) => item.status === "correct").length / group.length) * 100) : 0,
    };
  });

  return {
    score,
    total,
    accuracy: key.length ? Math.round((correct / key.length) * 100) : 0,
    correct,
    wrong,
    blank,
    anomalies,
    subjectWise,
    items,
  };
}

export function rankStudents(results: { student: Student; result: EvaluationResult }[]) {
  return [...results]
    .sort((a, b) => b.result.score - a.result.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function buildOmr(answers: string[]): OmrItem[] {
  return answerKey.map((correct, index) => {
    const selected = answers[index] || "";
    if (!selected || selected === "-") {
      return { question: index + 1, selected: "-", correct, score: 0, status: "blank", confidence: 0.92 };
    }
    if (selected.includes("/") || selected.length > 1) {
      return { question: index + 1, selected, correct, score: 0, status: "anomaly", confidence: 0.48, flag: `Q${index + 1} has a double or unclear bubble` };
    }
    const isCorrect = selected === correct;
    return {
      question: index + 1,
      selected,
      correct,
      score: isCorrect ? 4 : -1,
      status: isCorrect ? "correct" : "wrong",
      confidence: isCorrect ? 0.96 : 0.88,
    };
  });
}

function parseAnswers(text: string, fallback: string[]) {
  const matches = text
    .toUpperCase()
    .split(/[\s,;|]+/)
    .map((value) => value.replace(/^\d+[:.)-]?/, ""))
    .filter(Boolean);
  const answers = matches.length ? matches : fallback;
  return answers.map((answer) => answer.trim());
}

function lexicalScore(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function semanticTopicScore(text: string, topic: string) {
  const normalized = text.toLowerCase();
  const map: Record<string, string[]> = {
    "Ray optics": ["lens", "mirror", "focal", "image"],
    Mechanics: ["force", "energy", "momentum", "unit"],
    Calculus: ["differentiat", "integrat", "limit"],
    "Aromatic substitution": ["aromatic", "electrophile", "resonance"],
    "Plant kingdom": ["plant", "bryophyte", "angiosperm", "taxonomy"],
    "Chemical kinetics": ["rate", "half-life", "order"],
  };
  return (map[topic] || []).reduce((score, word) => score + (normalized.includes(word) ? 1 : 0), 0);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

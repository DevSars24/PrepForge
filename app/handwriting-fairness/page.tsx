import HandwritingDashboard from "../../features/handwriting-fairness/HandwritingDashboard";

export const metadata = {
  title: "Handwriting Fairness System — PrepForge",
  description:
    "AI-powered handwriting analysis, confidence scoring, and teacher review to ensure fair grading for all students.",
};

export default function HandwritingFairnessPage() {
  return <HandwritingDashboard />;
}

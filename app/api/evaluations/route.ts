import { listRecentEvaluations } from "@/lib/evaluation-store";

export async function GET() {
  const records = await listRecentEvaluations(30);
  return Response.json({ records });
}

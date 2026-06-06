import { listRecentEvaluations, deleteHistoryItem, clearAllHistory } from "@/lib/evaluation-store";
import { errorResponse, normalizeError } from "@/lib/debug";

export async function GET() {
  try {
    const records = await listRecentEvaluations(40);
    return Response.json({ records });
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "api_error", component: "evaluations.GET" }));
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    
    if (body.clearAll) {
      const ok = await clearAllHistory();
      if (!ok) throw new Error("Failed to clear history");
      return Response.json({ success: true });
    }

    const { id, type } = body;
    if (!id || !type) {
      return Response.json({ error: "Missing id or type" }, { status: 400 });
    }

    const ok = await deleteHistoryItem(id, type);
    if (!ok) throw new Error("Failed to delete history item");
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "api_error", component: "evaluations.DELETE" }));
  }
}

import {
  createBulkBatch,
  listBulkBatches,
  updateReviewItem,
  type BulkReviewItem,
} from "@/lib/bulk-evaluation-store";
import { errorResponse, normalizeError } from "@/lib/debug";

export async function GET() {
  try {
    const batches = await listBulkBatches();
    return Response.json({ batches });
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "api_error", component: "bulk-batches.GET" }));
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const batch = await createBulkBatch(form);
    return Response.json({ batch });
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "api_error", component: "bulk-batches.POST" }));
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      batchId?: string;
      itemId?: string;
      status?: BulkReviewItem["status"];
    };

    if (!body.batchId || !body.itemId || !body.status) {
      return Response.json({ error: "Missing batchId, itemId, or status" }, { status: 400 });
    }

    const batch = await updateReviewItem(body.batchId, body.itemId, body.status);
    if (!batch) {
      return Response.json({ error: "Batch or review item not found" }, { status: 404 });
    }

    return Response.json({ batch });
  } catch (error) {
    return errorResponse(normalizeError(error, { kind: "api_error", component: "bulk-batches.PATCH" }));
  }
}

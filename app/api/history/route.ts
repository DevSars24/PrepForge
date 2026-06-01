import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Database not connected — return empty history
    return NextResponse.json([]);
  } catch (error) {
    console.error("HISTORY_API_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId)
      return new NextResponse("Unauthorized", { status: 401 });

    // Database not connected — return placeholder response
    return NextResponse.json(
      { message: "Score saving will be available once database is connected." },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("SAVE_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

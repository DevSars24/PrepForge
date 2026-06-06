import { NextRequest, NextResponse } from "next/server";
import { generateReportHTML } from "@/lib/reportGenerator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const html = generateReportHTML(body);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

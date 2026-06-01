import { NextResponse } from "next/server";

export async function GET() {
    // Database not connected — return empty blogs list
    return NextResponse.json([]);
}

export async function POST() {
    return NextResponse.json(
        { message: "Blog creation will be available once database is connected." },
        { status: 503 }
    );
}

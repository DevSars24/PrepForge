import { NextResponse } from "next/server";

export async function GET() {
    // Database not connected — return empty leaderboard with coming-soon message
    return NextResponse.json({
        message: "Leaderboard will be available once database is connected.",
        data: []
    });
}

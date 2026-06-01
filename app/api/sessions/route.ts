import { NextResponse } from "next/server";
import { STATIC_SESSIONS } from "@/lib/staticSessions";

// GET all sessions
export async function GET() {
    try {
        // Return only scheduled and live sessions, sorted by time
        const sessions = STATIC_SESSIONS
            .filter(s => s.status === "scheduled" || s.status === "live")
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

        return NextResponse.json(sessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
}

// POST - Create new session (coming soon — DB not connected yet)
export async function POST() {
    return NextResponse.json(
        { message: "Session creation will be available once database is connected." },
        { status: 503 }
    );
}

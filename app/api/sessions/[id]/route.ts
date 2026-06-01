import { NextResponse } from "next/server";
import { STATIC_SESSIONS, getSessionById } from "@/lib/staticSessions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET single session
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const session = getSessionById(id);

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error("Error fetching session:", error);
        return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
    }
}

// PUT - Update session (coming soon)
export async function PUT() {
    return NextResponse.json(
        { message: "Session updates will be available once database is connected." },
        { status: 503 }
    );
}

// DELETE - Delete session (coming soon)
export async function DELETE() {
    return NextResponse.json(
        { message: "Session deletion will be available once database is connected." },
        { status: 503 }
    );
}

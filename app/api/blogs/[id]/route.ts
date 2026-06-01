import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE() {
    return NextResponse.json(
        { message: "Blog deletion will be available once database is connected." },
        { status: 503 }
    );
}

export async function PUT() {
    return NextResponse.json(
        { message: "Blog updates will be available once database is connected." },
        { status: 503 }
    );
}

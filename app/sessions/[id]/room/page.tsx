import { currentUser } from "@clerk/nextjs/server";
import { getSessionById } from "@/lib/staticSessions";
import { notFound, redirect } from "next/navigation";
import VideoRoom from "@/components/VideoRoom";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: PageProps) {
    const { id } = await params;

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const session = getSessionById(id);

    if (!session) return notFound();

    // Only allow joining if session is live
    if (session.status !== "live") {
        redirect(`/sessions/${id}`);
    }

    const participantName = user.firstName || user.emailAddresses[0]?.emailAddress || "Aspirant";

    return (
        <VideoRoom
            roomName={session.roomName}
            sessionId={session.id}
            participantName={participantName}
        />
    );
}

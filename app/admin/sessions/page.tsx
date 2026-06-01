import { currentUser } from "@clerk/nextjs/server";
import { STATIC_SESSIONS, StaticSession } from "@/lib/staticSessions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Calendar, Clock, Users, Radio, Play, GraduationCap, DatabaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const ADMIN_EMAIL = "saurabhsingh100605@gmail.com";

export default async function AdminSessionsPage() {
    const user = await currentUser();

    if (!user || user.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) {
        redirect("/");
    }

    const sessions = [...STATIC_SESSIONS].sort(
        (a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime()
    );

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(date));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "live": return "bg-green-500/20 text-green-400 border-green-500/30";
            case "ended": return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
            default: return "bg-purple-500/20 text-purple-400 border-purple-500/30";
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0A1E] text-white">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-20">
                {/* DB Notice Banner */}
                <div className="mb-8 flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-semibold">
                    <DatabaseIcon size={16} className="flex-shrink-0" />
                    <span>
                        Database not connected yet — showing static demo sessions. Create/delete will be enabled once NeonDB is connected.
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                            <Radio size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Admin Panel</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black">Live Sessions</h1>
                    </div>

                    <Button
                        disabled
                        className="bg-purple-600/50 cursor-not-allowed text-white/50 font-bold rounded-full px-6"
                        title="Available once DB is connected"
                    >
                        <Plus className="mr-2 w-4 h-4" /> New Session (DB needed)
                    </Button>
                </div>

                {/* Sessions List */}
                <div className="space-y-4">
                    {sessions.map((session: StaticSession) => (
                        <div key={session.id} className="bg-[#16133A]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${getStatusColor(session.status)}`}>
                                            {session.status}
                                        </span>
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                                            session.stream === "JEE" 
                                                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                                : session.stream === "NEET"
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                        }`}>
                                            {session.stream}
                                        </span>
                                        {session.status === "live" && (
                                            <span className="flex items-center gap-1 text-green-400 text-xs animate-pulse">
                                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                Live Now
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-1">{session.title}</h3>
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <GraduationCap size={13} className="text-purple-400" />
                                        <span className="text-purple-400 text-xs font-semibold">{session.hostName} · {session.hostCollege}</span>
                                    </div>

                                    {session.description && (
                                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{session.description}</p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {formatDate(session.scheduledAt)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {session.duration} mins
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users size={12} />
                                            Max {session.maxParticipants}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {session.status === "live" && (
                                        <Link href={`/sessions/${session.id}/room`}>
                                            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-full px-4">
                                                <Play size={14} className="mr-1" /> Join Room
                                            </Button>
                                        </Link>
                                    )}
                                    <Button
                                        variant="outline"
                                        disabled
                                        className="text-xs text-zinc-500 border-zinc-700 cursor-not-allowed rounded-full px-4"
                                        title="Available once DB is connected"
                                    >
                                        Delete (DB needed)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {sessions.length === 0 && (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                            <Radio className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <p className="text-zinc-500 font-mono text-sm uppercase">No sessions available</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

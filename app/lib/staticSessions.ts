// Static sessions data — replaces Prisma/NeonDB temporarily
// These represent real-style mentor sessions from IIT/AIIMS alumni

export interface StaticSession {
  id: string;
  title: string;
  description: string;
  roomName: string;
  scheduledAt: Date;
  duration: number;
  status: string; // "scheduled" | "live" | "ended"
  hostEmail: string;
  hostName: string;
  hostCollege: string;
  maxParticipants: number;
  stream: "JEE" | "NEET" | "BOTH";
  createdAt: Date;
  updatedAt: Date;
}

export const STATIC_SESSIONS: StaticSession[] = [
  {
    id: "session-001",
    title: "How I Cracked JEE Advanced in First Attempt",
    description:
      "Join Arjun Mehta (IIT Bombay, AIR 47) for an open AMA about his JEE journey. We'll cover time-table strategy, how to handle Physics waves + optics, and how to stay consistent for 2 years. Bring your questions!",
    roomName: "prepforge-room-001",
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    duration: 90,
    status: "scheduled",
    hostEmail: "arjun.mehta@example.com",
    hostName: "Arjun Mehta",
    hostCollege: "IIT Bombay — AIR 47 (JEE Advanced 2023)",
    maxParticipants: 100,
    stream: "JEE",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "session-002",
    title: "NEET Biology Strategy — Score 360/360",
    description:
      "Priya Sharma (AIIMS Delhi, AIR 12) breaks down the exact NCERT chapters to focus on, how to handle assertion-reason questions, and the revision technique she used in the last 30 days before NEET. Special focus on Genetics & Ecology.",
    roomName: "prepforge-room-002",
    scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    duration: 60,
    status: "scheduled",
    hostEmail: "priya.sharma@example.com",
    hostName: "Priya Sharma",
    hostCollege: "AIIMS Delhi — AIR 12 (NEET 2023)",
    maxParticipants: 150,
    stream: "NEET",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "session-003",
    title: "JEE Mains Chemistry — Organic in 30 Days",
    description:
      "Rohit Gupta (IIT Delhi, AIR 112) shares his proven method for tackling GOC, named reactions, and mechanism-based questions. He'll also share his notes PDF for Organic Chemistry short-cuts.",
    roomName: "prepforge-room-003",
    scheduledAt: new Date(Date.now() - 30 * 60 * 1000), // started 30 min ago — LIVE
    duration: 75,
    status: "live",
    hostEmail: "rohit.gupta@example.com",
    hostName: "Rohit Gupta",
    hostCollege: "IIT Delhi — AIR 112 (JEE Advanced 2022)",
    maxParticipants: 80,
    stream: "JEE",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "session-004",
    title: "NEET Physics: Electrostatics & Magnetism Masterclass",
    description:
      "Sneha Rao (JIPMER Puducherry, AIR 38) dives deep into the most feared topics of NEET Physics. She covers the exact formula shortcuts, previous year analysis (2018-2024), and shares how she scored 180/180 in Physics.",
    roomName: "prepforge-room-004",
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    duration: 90,
    status: "scheduled",
    hostEmail: "sneha.rao@example.com",
    hostName: "Sneha Rao",
    hostCollege: "JIPMER Puducherry — AIR 38 (NEET 2023)",
    maxParticipants: 120,
    stream: "NEET",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "session-005",
    title: "Mock Test Analysis & Rank Improvement Techniques",
    description:
      "Vikram Singh (IIT Madras, AIR 89) and Ananya Joshi (AIIMS Delhi, AIR 21) host a joint session on how to analyse mock tests, what mistakes to avoid, and how they improved from Rank 2000 → top 100 in the last 3 months.",
    roomName: "prepforge-room-005",
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    duration: 120,
    status: "scheduled",
    hostEmail: "vikram.singh@example.com",
    hostName: "Vikram Singh & Ananya Joshi",
    hostCollege: "IIT Madras AIR 89 + AIIMS Delhi AIR 21",
    maxParticipants: 200,
    stream: "BOTH",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function getSessionById(id: string): StaticSession | undefined {
  return STATIC_SESSIONS.find((s) => s.id === id);
}
